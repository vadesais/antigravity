-- Migration: Add Model Creation Module
-- Description: Adiciona suporte ao módulo de criação de modelos com IA

-- 1. Adicionar coluna de permissão em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS allow_model_creation BOOLEAN DEFAULT FALSE;

-- 2. Criar tabela de gerações de modelos
CREATE TABLE IF NOT EXISTS model_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Configuração
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('ai', 'photo')),
  glasses_image_url TEXT NOT NULL,
  
  -- Modo IA
  model_description TEXT,
  scenario_description TEXT,
  
  -- Modo Foto
  user_photo_url TEXT,
  keep_background BOOLEAN DEFAULT TRUE,
  
  -- Resultado
  result_image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Criar tabela de limites de geração
CREATE TABLE IF NOT EXISTS model_generation_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Limites
  daily_limit INTEGER DEFAULT 10,
  monthly_limit INTEGER DEFAULT 100,
  
  -- Uso atual
  daily_count INTEGER DEFAULT 0,
  monthly_count INTEGER DEFAULT 0,
  
  -- Reset
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  last_monthly_reset DATE DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_model_generations_profile_created 
  ON model_generations(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_generations_user_created 
  ON model_generations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_generations_status 
  ON model_generations(status);

-- 5. Habilitar Row Level Security
ALTER TABLE model_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_generation_limits ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para model_generations

-- Usuários podem ver suas próprias gerações
DROP POLICY IF EXISTS "Users can view own generations" ON model_generations;
CREATE POLICY "Users can view own generations"
  ON model_generations FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem criar gerações para seu profile
DROP POLICY IF EXISTS "Users can create own generations" ON model_generations;
CREATE POLICY "Users can create own generations"
  ON model_generations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = profile_id 
      AND allow_model_creation = true
    )
  );

-- Usuários podem atualizar suas próprias gerações
DROP POLICY IF EXISTS "Users can update own generations" ON model_generations;
CREATE POLICY "Users can update own generations"
  ON model_generations FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Políticas RLS para model_generation_limits

-- Usuários podem ver seus próprios limites
DROP POLICY IF EXISTS "Users can view own limits" ON model_generation_limits;
CREATE POLICY "Users can view own limits"
  ON model_generation_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = profile_id 
      AND allow_model_creation = true
    )
  );

-- 8. Função para criar limites automaticamente quando módulo é habilitado
CREATE OR REPLACE FUNCTION create_model_generation_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.allow_model_creation = true AND OLD.allow_model_creation = false THEN
    INSERT INTO model_generation_limits (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para criar limites automaticamente
DROP TRIGGER IF EXISTS create_limits_on_enable ON profiles;
CREATE TRIGGER create_limits_on_enable
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_model_generation_limits();

-- 10. Função para resetar contadores diários
CREATE OR REPLACE FUNCTION reset_daily_generation_counts()
RETURNS void AS $$
BEGIN
  UPDATE model_generation_limits
  SET 
    daily_count = 0,
    last_daily_reset = CURRENT_DATE,
    updated_at = NOW()
  WHERE last_daily_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentários para documentação
COMMENT ON TABLE model_generations IS 'Armazena gerações de modelos com IA';
COMMENT ON TABLE model_generation_limits IS 'Controla limites de uso do módulo de criação de modelos';
COMMENT ON COLUMN profiles.allow_model_creation IS 'Habilita módulo de criação de modelos para o cliente';
