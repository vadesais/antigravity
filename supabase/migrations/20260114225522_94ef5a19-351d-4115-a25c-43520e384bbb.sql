-- Create function to prevent multiple master role creation
CREATE OR REPLACE FUNCTION public.prevent_master_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'master' THEN
    -- Check if a master already exists (excluding current row in case of update)
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE role = 'master' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Cannot create additional master users - only one master allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce single master
CREATE TRIGGER enforce_single_master
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_master_creation();

-- Also update RLS policy to prevent masters from creating master roles (defense in depth)
DROP POLICY IF EXISTS "Masters can create roles" ON public.user_roles;
CREATE POLICY "Masters can create non-master roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'master') AND
  role != 'master'
);