-- 1. Criar enum para roles (master = cria usuários, admin = óticas publicam óculos)
CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'user');

-- 2. Tabela de profiles (dados da ótica/usuário)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT,
  store_logo_url TEXT,
  store_color TEXT DEFAULT '#2563eb',
  phone TEXT,
  allow_camera BOOLEAN DEFAULT true,
  allow_image BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de roles (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Tabela de óculos
CREATE TABLE public.glasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT,
  category TEXT,
  image_url TEXT NOT NULL,
  buy_link TEXT,
  is_custom BOOLEAN DEFAULT false,
  ar_config JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glasses ENABLE ROW LEVEL SECURITY;

-- 6. Função security definer para verificar role (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 7. Função para obter o profile_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 8. Policies para PROFILES
-- Masters podem ver todos os profiles
CREATE POLICY "Masters can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Usuários podem ver seu próprio profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Masters podem criar profiles
CREATE POLICY "Masters can create profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Masters podem atualizar qualquer profile
CREATE POLICY "Masters can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Usuários podem atualizar seu próprio profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Masters podem deletar profiles
CREATE POLICY "Masters can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- 9. Policies para USER_ROLES
-- Masters podem ver todas as roles
CREATE POLICY "Masters can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Usuários podem ver sua própria role
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Masters podem criar roles (não pode criar outros masters - lógica na aplicação)
CREATE POLICY "Masters can create roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Masters podem deletar roles
CREATE POLICY "Masters can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- 10. Policies para GLASSES
-- Qualquer pessoa pode ver óculos ativos (vitrine pública)
CREATE POLICY "Anyone can view active glasses"
ON public.glasses FOR SELECT
USING (active = true);

-- Admins podem ver todos os seus óculos (incluindo inativos)
CREATE POLICY "Admins can view own glasses"
ON public.glasses FOR SELECT
TO authenticated
USING (store_id = public.get_user_profile_id(auth.uid()));

-- Masters podem ver todos os óculos
CREATE POLICY "Masters can view all glasses"
ON public.glasses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Admins podem criar óculos na sua loja
CREATE POLICY "Admins can create glasses"
ON public.glasses FOR INSERT
TO authenticated
WITH CHECK (
  store_id = public.get_user_profile_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
);

-- Admins podem atualizar seus próprios óculos
CREATE POLICY "Admins can update own glasses"
ON public.glasses FOR UPDATE
TO authenticated
USING (
  store_id = public.get_user_profile_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
);

-- Masters podem atualizar qualquer óculos
CREATE POLICY "Masters can update any glasses"
ON public.glasses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Admins podem deletar seus próprios óculos
CREATE POLICY "Admins can delete own glasses"
ON public.glasses FOR DELETE
TO authenticated
USING (
  store_id = public.get_user_profile_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
);

-- Masters podem deletar qualquer óculos
CREATE POLICY "Masters can delete any glasses"
ON public.glasses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- 11. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_glasses_updated_at
BEFORE UPDATE ON public.glasses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Trigger para criar profile automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, store_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'store_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Criar bucket para imagens dos óculos
INSERT INTO storage.buckets (id, name, public)
VALUES ('glasses-images', 'glasses-images', true);

-- 14. Policies para storage
-- Qualquer pessoa pode ver imagens (público)
CREATE POLICY "Public can view glasses images"
ON storage.objects FOR SELECT
USING (bucket_id = 'glasses-images');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload glasses images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'glasses-images');

-- Usuários autenticados podem atualizar suas imagens
CREATE POLICY "Authenticated users can update glasses images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'glasses-images');

-- Usuários autenticados podem deletar imagens
CREATE POLICY "Authenticated users can delete glasses images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'glasses-images');