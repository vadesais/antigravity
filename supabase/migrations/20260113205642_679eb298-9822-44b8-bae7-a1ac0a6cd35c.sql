-- Add slug column to profiles for unique showcase URLs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create function to generate unique slug from store name
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from store_name or use a random string
  IF NEW.store_name IS NOT NULL AND NEW.store_name != '' THEN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(NEW.store_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
  ELSE
    base_slug := 'store';
  END IF;
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'store';
  END IF;
  
  new_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = new_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS generate_slug_on_insert ON public.profiles;
CREATE TRIGGER generate_slug_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.generate_profile_slug();

-- Create trigger to update slug when store_name changes (optional)
DROP TRIGGER IF EXISTS update_slug_on_name_change ON public.profiles;
CREATE TRIGGER update_slug_on_name_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.store_name IS DISTINCT FROM OLD.store_name AND NEW.slug = OLD.slug)
  EXECUTE FUNCTION public.generate_profile_slug();

-- Add RLS policy for public access to profiles by slug (for showcase)
CREATE POLICY "Anyone can view profile by slug"
ON public.profiles FOR SELECT
USING (slug IS NOT NULL AND is_blocked = false);

-- Update existing profiles to have slugs
UPDATE public.profiles 
SET slug = lower(regexp_replace(regexp_replace(COALESCE(store_name, 'store-' || substr(id::text, 1, 8)), '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;