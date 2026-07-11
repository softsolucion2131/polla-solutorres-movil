
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pendiente','aprobado','rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id integer REFERENCES public.agencies(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  bank_id integer REFERENCES public.banks(id) ON DELETE SET NULL,
  account_number varchar(30) NOT NULL,
  account_holder varchar(120),
  identity_card varchar(20),
  status public.withdrawal_status NOT NULL DEFAULT 'pendiente',
  reference_payment varchar(30),
  observations text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Jugador: ve sus propios retiros
CREATE POLICY "withdrawals_select_own" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Jugador: crea sus propios retiros
CREATE POLICY "withdrawals_insert_own" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Agencia: ve los retiros de su agencia
CREATE POLICY "withdrawals_select_agency" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency')
    AND agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

-- Agencia: actualiza retiros de su agencia
CREATE POLICY "withdrawals_update_agency" ON public.withdrawals
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency')
    AND agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agency')
    AND agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

-- Admin: todo
CREATE POLICY "withdrawals_admin_all" ON public.withdrawals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aplicar cambios de saldo al aprobar/rechazar
CREATE OR REPLACE FUNCTION public.apply_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status = 'aprobado' AND OLD.status <> 'aprobado' THEN
    UPDATE public.profiles
      SET balance = balance - NEW.amount
      WHERE id = NEW.user_id;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rechazado' AND OLD.status = 'aprobado' THEN
    -- devolver saldo si estaba previamente aprobado
    UPDATE public.profiles
      SET balance = balance + NEW.amount
      WHERE id = NEW.user_id;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rechazado' AND OLD.status <> 'rechazado' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_withdrawals_status_change
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.apply_withdrawal_status_change();
