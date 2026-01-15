-- Remover a política que permite visualização global de óculos ativos
DROP POLICY IF EXISTS "Anyone can view active glasses" ON public.glasses;

-- Criar nova política que permite visualização pública, mas apenas para óculos ativos de lojas não bloqueadas
-- Esta política será usada pela vitrine pública (usuários não autenticados)
CREATE POLICY "Anyone can view active glasses by store"
ON public.glasses
FOR SELECT
USING (
  active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = glasses.store_id 
    AND profiles.is_blocked = false
  )
);