-- Execute este script no SQL Editor do seu Supabase Dashboard
-- para habilitar a funcionalidade de múltiplos WhatsApps.

-- 1. Adicionar controle de quantos números a loja pode ter (Padrão: 1)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_slots INTEGER DEFAULT 1;

-- 2. Adicionar coluna para armazenar a lista de contatos (JSON)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_contacts JSONB DEFAULT '[]'::jsonb;

-- 3. Adicionar coluna nos óculos para vincular a um contato específico (Opcional)
ALTER TABLE public.glasses 
ADD COLUMN IF NOT EXISTS whatsapp_contact_id TEXT;

-- Comentário: A coluna antiga 'wa_number' será mantida para compatibilidade,
-- mas os novos dados serão salvos em 'whatsapp_contacts'.
