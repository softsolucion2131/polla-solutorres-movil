
CREATE TYPE public.polla_estado AS ENUM ('proceso', 'ganador', 'pagado', 'perdedor');

CREATE TABLE public.pollas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id integer REFERENCES public.agencies(id),
  idhip text NOT NULL REFERENCES public.hipodromos(idhip),
  fechac date NOT NULL,
  combinacion jsonb NOT NULL,
  combinaciones integer NOT NULL DEFAULT 1,
  monto numeric(14,2) NOT NULL DEFAULT 0,
  puntos integer NOT NULL DEFAULT 0,
  lugar integer,
  premio numeric(14,2) NOT NULL DEFAULT 0,
  estado public.polla_estado NOT NULL DEFAULT 'proceso',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pollas TO authenticated;
GRANT ALL ON public.pollas TO service_role;

ALTER TABLE public.pollas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players view own pollas" ON public.pollas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Agency views its pollas" ON public.pollas
  FOR SELECT TO authenticated USING (
    agency_id IS NOT NULL AND agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin views all pollas" ON public.pollas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Players insert own pollas" ON public.pollas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agency updates its pollas" ON public.pollas
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (agency_id IS NOT NULL AND agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()))
  );

CREATE TRIGGER set_pollas_updated_at BEFORE UPDATE ON public.pollas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX pollas_user_idx ON public.pollas(user_id);
CREATE INDEX pollas_agency_idx ON public.pollas(agency_id);
CREATE INDEX pollas_hip_fecha_idx ON public.pollas(idhip, fechac);
