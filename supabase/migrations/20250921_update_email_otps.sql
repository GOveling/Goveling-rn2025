-- Update email_otps table to support enhanced email functionality
ALTER TABLE public.email_otps 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'confirmation',
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '10 minutes');

-- Create index for efficient cleanup of expired OTPs
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON public.email_otps(expires_at);

-- Add a comment for clarity
COMMENT ON TABLE public.email_otps IS 'Store email verification codes with expiration';
COMMENT ON COLUMN public.email_otps.type IS 'Type of OTP: confirmation, password_reset, etc.';
COMMENT ON COLUMN public.email_otps.expires_at IS 'When this OTP expires (default 10 minutes)';
