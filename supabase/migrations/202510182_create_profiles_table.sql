-- Crea la tabla profiles mínima para que las migraciones funcionen
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    full_name text,
    display_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
