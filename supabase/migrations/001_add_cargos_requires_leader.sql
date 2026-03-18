-- Script para adicionar a coluna requires_leader na tabela cargos
-- Isso permite configurar se um cargo específico exige a vinculação a um Supervisor ou Gerente
-- Exemplo: Diretores ou Administradores do sistema podem ser marcados com requires_leader = false

ALTER TABLE public.cargos
ADD COLUMN IF NOT EXISTS requires_leader boolean DEFAULT true;

-- Adiciona comentário para documentação no banco de dados
COMMENT ON COLUMN public.cargos.requires_leader IS 'Define se o usuário com este cargo precisa obrigatoriamente ter um Supervisor/Gerente vinculado.';

-- Atualiza cargos que historicamente já não precisavam de líder para facilitar a transição
UPDATE public.cargos
SET requires_leader = false
WHERE lower(nome) LIKE '%supervisor%'
   OR lower(nome) LIKE '%gerente%'
   OR lower(nome) LIKE '%diretor%'
   OR lower(nome) LIKE '%admin%';
