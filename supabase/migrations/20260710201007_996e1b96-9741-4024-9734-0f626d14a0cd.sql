
CREATE TYPE public.transfer_status AS ENUM ('pendiente', 'aprobado', 'rechazado');

CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id integer NOT NULL REFERENCES public.agencies(id),
  bank_id integer REFERENCES public.banks(id),
  reference text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  capture_url text,
  status public.transfer_status NOT NULL DEFAULT 'pendiente',
  observations text DEFAULT 'Pendiente',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfers_user ON public.transfers(user_id);
CREATE INDEX idx_transfers_agency ON public.transfers(agency_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);

GRANT SELECT, INSERT, UPDATE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY transfers_select_own ON public.transfers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY transfers_insert_own ON public.transfers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pendiente');

CREATE POLICY transfers_select_agency ON public.transfers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency')
    AND agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY transfers_update_agency ON public.transfers
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency')
    AND agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agency')
    AND agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY transfers_admin_all ON public.transfers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.apply_transfer_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprobado' AND OLD.status <> 'aprobado' THEN
    UPDATE public.profiles
      SET balance = balance + NEW.amount
      WHERE id = NEW.user_id;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rechazado' AND OLD.status <> 'rechazado' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfers_status_change
  BEFORE UPDATE OF status ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.apply_transfer_status_change();
