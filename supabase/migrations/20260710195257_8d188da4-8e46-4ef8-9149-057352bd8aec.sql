
-- Allow anon to read agencies for the signup dropdown
GRANT SELECT ON public.agencies TO anon;
CREATE POLICY agencies_select_anon ON public.agencies FOR SELECT TO anon USING (activo = true);

-- Update handle_new_user to persist agency_id from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _agency_id integer;
BEGIN
  BEGIN
    _agency_id := NULLIF(NEW.raw_user_meta_data->>'agency_id', '')::integer;
  EXCEPTION WHEN others THEN
    _agency_id := NULL;
  END;

  INSERT INTO public.profiles (id, email, name, agency_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    _agency_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
