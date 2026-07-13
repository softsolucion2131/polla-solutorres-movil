
CREATE TABLE public.programa (
  idprog BIGSERIAL PRIMARY KEY,
  idhip VARCHAR(6) NOT NULL REFERENCES public.hipodromos(idhip) ON DELETE CASCADE,
  carrera INT NOT NULL,
  fechac DATE NOT NULL,
  horac VARCHAR(20),
  nrocab INT NOT NULL DEFAULT 0,
  cabgan VARCHAR(2) NOT NULL DEFAULT '0',
  divgan NUMERIC(14,2) DEFAULT 0,
  divgand NUMERIC(14,2) DEFAULT 0,
  cabpla INT NOT NULL DEFAULT 0,
  divpla NUMERIC(14,2) NOT NULL DEFAULT 0,
  divplad NUMERIC(14,2) NOT NULL DEFAULT 0,
  cabpla2 INT NOT NULL DEFAULT 0,
  divpla2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  divplad2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  cabshow3 INT NOT NULL DEFAULT 0,
  divshow NUMERIC(14,2) NOT NULL DEFAULT 0,
  divshowd NUMERIC(14,2) NOT NULL DEFAULT 0,
  divshow2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  divshowd2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  divshow3 NUMERIC(14,2) NOT NULL DEFAULT 0,
  divshowd3 NUMERIC(14,2) NOT NULL DEFAULT 0,
  bloquea_ok BOOLEAN NOT NULL DEFAULT false,
  conf_ok BOOLEAN NOT NULL DEFAULT false,
  empate BOOLEAN DEFAULT false,
  valida_polla BOOLEAN DEFAULT false,
  nro_valida INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idhip, fechac, carrera)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programa TO authenticated;
GRANT ALL ON public.programa TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.programa_idprog_seq TO authenticated;
GRANT ALL ON SEQUENCE public.programa_idprog_seq TO service_role;

ALTER TABLE public.programa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programa_select_authenticated" ON public.programa
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "programa_admin_all" ON public.programa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER programa_set_updated_at BEFORE UPDATE ON public.programa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.detprog (
  id BIGSERIAL PRIMARY KEY,
  idprog BIGINT NOT NULL REFERENCES public.programa(idprog) ON DELETE CASCADE,
  nroejem VARCHAR(2) NOT NULL,
  nombreeje VARCHAR(150),
  ret_ok BOOLEAN NOT NULL DEFAULT false,
  divgan NUMERIC(14,2) NOT NULL DEFAULT 0,
  divgand NUMERIC(14,2) NOT NULL DEFAULT 0,
  divplace NUMERIC(14,2) DEFAULT 0,
  divplaced NUMERIC(14,2) NOT NULL DEFAULT 0,
  divshow NUMERIC(14,2) NOT NULL DEFAULT 0,
  bloquea_ok BOOLEAN NOT NULL DEFAULT false,
  puntos_especiales INT DEFAULT 0,
  carrera INT NOT NULL,
  nro_valida SMALLINT DEFAULT 0,
  idhip VARCHAR(6) NOT NULL,
  fechac DATE NOT NULL,
  valida_polla BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.detprog TO authenticated;
GRANT ALL ON public.detprog TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.detprog_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.detprog_id_seq TO service_role;

ALTER TABLE public.detprog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detprog_select_authenticated" ON public.detprog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "detprog_admin_all" ON public.detprog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER detprog_set_updated_at BEFORE UPDATE ON public.detprog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_detprog_prog ON public.detprog(idprog);
CREATE INDEX idx_detprog_lookup ON public.detprog(idhip, fechac, carrera);
