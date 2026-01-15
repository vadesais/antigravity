-- Create categories table for custom store categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, name)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view own categories
CREATE POLICY "Admins can view own categories"
ON public.categories FOR SELECT
TO authenticated
USING (store_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Policy: Admins can create categories
CREATE POLICY "Admins can create categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (store_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Policy: Admins can delete own categories
CREATE POLICY "Admins can delete own categories"
ON public.categories FOR DELETE
TO authenticated
USING (store_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Policy: Masters can view all categories
CREATE POLICY "Masters can view all categories"
ON public.categories FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Index for performance
CREATE INDEX idx_categories_store_id ON public.categories(store_id);

-- Function to create default categories for new profiles
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (store_id, name) VALUES
    (NEW.id, 'Grau Masculino'),
    (NEW.id, 'Grau Feminino'),
    (NEW.id, 'Solar Masculino'),
    (NEW.id, 'Solar Feminino'),
    (NEW.id, 'Infantil');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories
CREATE TRIGGER on_profile_created_categories
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- Populate categories for existing stores
INSERT INTO public.categories (store_id, name)
SELECT id, unnest(ARRAY['Grau Masculino', 'Grau Feminino', 'Solar Masculino', 'Solar Feminino', 'Infantil'])
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE store_id = profiles.id
);
