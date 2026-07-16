
CREATE OR REPLACE FUNCTION public.siguiente_no_retirado(
  _idhip text,
  _fechac date,
  _carrera integer,
  _nro text
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nros integer[];
  max_n integer;
  cur integer;
  i integer;
BEGIN
  SELECT array_agg((nroejem)::int ORDER BY (nroejem)::int)
    INTO nros
  FROM public.detprog
  WHERE idhip = _idhip AND fechac = _fechac AND carrera = _carrera
    AND COALESCE(ret_ok, false) = false;

  IF nros IS NULL OR array_length(nros, 1) = 0 THEN RETURN NULL; END IF;

  SELECT COALESCE(MAX((nroejem)::int), 0) INTO max_n
  FROM public.detprog
  WHERE idhip = _idhip AND fechac = _fechac AND carrera = _carrera;

  IF max_n = 0 THEN RETURN NULL; END IF;

  cur := (_nro)::int;
  FOR i IN 1..max_n LOOP
    IF cur = ANY(nros) THEN RETURN cur::text; END IF;
    cur := cur + 1;
    IF cur > max_n THEN cur := 1; END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.siguiente_no_retirado(text, date, integer, text) TO authenticated;
