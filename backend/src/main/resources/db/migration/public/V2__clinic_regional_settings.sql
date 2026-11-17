ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS default_language VARCHAR(10);

UPDATE public.clinics SET country = 'BO' WHERE country IS NULL;
UPDATE public.clinics SET timezone = 'America/La_Paz' WHERE timezone IS NULL;
UPDATE public.clinics SET default_language = 'es' WHERE default_language IS NULL;

ALTER TABLE public.clinics ALTER COLUMN country SET NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN timezone SET NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN default_language SET NOT NULL;
