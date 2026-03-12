-- Remover restrição de tipo dos leads para permitir modalidades dinâmicas
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_tipo_check;
