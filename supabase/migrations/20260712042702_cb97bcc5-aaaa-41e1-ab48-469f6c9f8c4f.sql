
CREATE TABLE public.hipodromos (
  idhip varchar(6) PRIMARY KEY,
  nomhip varchar(50) NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  nrocarreras integer NOT NULL DEFAULT 10,
  nrocaballos integer NOT NULL DEFAULT 8,
  acumulado numeric(14,2) NOT NULL DEFAULT 0,
  porc_retener numeric(5,2) NOT NULL DEFAULT 0,
  porc_primer_lugar numeric(5,2) NOT NULL DEFAULT 0,
  porc_segundo_lugar numeric(5,2) NOT NULL DEFAULT 0,
  porc_tercer_lugar numeric(5,2) NOT NULL DEFAULT 0,
  porc_acumulado numeric(5,2) NOT NULL DEFAULT 0,
  cos_bol numeric(14,2) NOT NULL DEFAULT 0,
  divmax numeric(14,2) NOT NULL DEFAULT 0,
  empate numeric(14,2) NOT NULL DEFAULT 0,
  tipo integer NOT NULL DEFAULT 0,
  venxcar numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hipodromos TO authenticated;
GRANT ALL ON public.hipodromos TO service_role;

ALTER TABLE public.hipodromos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver hipodromos"
  ON public.hipodromos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins pueden insertar hipodromos"
  ON public.hipodromos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins pueden actualizar hipodromos"
  ON public.hipodromos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins pueden eliminar hipodromos"
  ON public.hipodromos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER hipodromos_set_updated_at
  BEFORE UPDATE ON public.hipodromos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.hipodromos (idhip, nomhip, activo, nrocarreras, nrocaballos, porc_retener, porc_primer_lugar, porc_segundo_lugar, porc_tercer_lugar, porc_acumulado, cos_bol, tipo) VALUES
('002', 'VALENCIA', true, 10, 8, 0, 0, 0, 0, 0, 100, 0),
('GP', 'GULFSTREAM PARK', true, 10, 8, 0, 0, 0, 0, 0, 100, 1),
('RINC', 'LA RINCONADA', true, 10, 8, 0, 0, 0, 0, 0, 100, 0),
('004', 'CHARLES TOWN', false, 10, 8, 30.84, 46.44, 15.81, 6.91, 0, 100, 1),
('006', 'DELTA DOWNS', false, 10, 8, 4.86, 46.96, 15.99, 7.09, 25.10, 100, 1),
('HI', 'HORSESHOE INDIANAPOLIS', false, 12, 12, 15, 50, 20, 10, 5, 100, 1)
ON CONFLICT (idhip) DO NOTHING;
