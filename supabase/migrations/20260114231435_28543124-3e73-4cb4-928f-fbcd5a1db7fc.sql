-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan text DEFAULT '1_month',
ADD COLUMN IF NOT EXISTS allow_visagismo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_ai boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;