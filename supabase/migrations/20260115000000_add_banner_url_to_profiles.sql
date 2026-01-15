-- Add banner_url column to profiles table for store customization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add WhatsApp configuration columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wa_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wa_number TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wa_message TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.banner_url IS 'URL for the store banner image displayed at the top of the vitrine';
COMMENT ON COLUMN public.profiles.wa_enabled IS 'Enable WhatsApp buy button integration';
COMMENT ON COLUMN public.profiles.wa_number IS 'WhatsApp number for buy button (format: country code + number)';
COMMENT ON COLUMN public.profiles.wa_message IS 'Default message template for WhatsApp buy button';
