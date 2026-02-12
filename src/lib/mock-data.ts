export interface Consultor {
  id: string;
  nome_completo: string;
  apelido: string;
  email: string;
  cargo: string;
  perfil: 'consultor' | 'supervisor' | 'gerente' | 'administrador';
  avatar_url?: string;
  percentMeta: number;
  mesesAbaixo: number;
  ligacoes: number;
  mensagens: number;
  cotacoes_enviadas: number;
  cotacoes_fechadas: number;
  follow_up: number;
  faturamento: number;
  meta_faturamento: number;
  supervisor_nome: string;
  supervisor_email: string;
  gerente_nome: string;
  gerente_email: string;
}

export const currentUser: Consultor = {
  id: '1',
  nome_completo: 'Carlos Eduardo Silva',
  apelido: 'Carlos',
  email: 'carlos@gruponew.com.br',
  cargo: 'Consultor de Vendas',
  perfil: 'gerente',
  percentMeta: 112,
  mesesAbaixo: 0,
  ligacoes: 47,
  mensagens: 23,
  cotacoes_enviadas: 18,
  cotacoes_fechadas: 6,
  follow_up: 12,
  faturamento: 84500,
  meta_faturamento: 75000,
  supervisor_nome: 'Ricardo Tavares',
  supervisor_email: 'ricardo.tavares@gruponew.com.br',
  gerente_nome: 'Fernanda Lopes',
  gerente_email: 'fernanda.lopes@gruponew.com.br',
};

export const consultores: Consultor[] = [
  currentUser,
  {
    id: '2', nome_completo: 'Ana Paula Ferreira', apelido: 'Ana', email: 'ana@gruponew.com.br',
    cargo: 'Consultor de Vendas', perfil: 'consultor', percentMeta: 215, mesesAbaixo: 0,
    ligacoes: 68, mensagens: 45, cotacoes_enviadas: 32, cotacoes_fechadas: 14, follow_up: 20,
    faturamento: 161250, meta_faturamento: 75000,
    supervisor_nome: 'Ricardo Tavares', supervisor_email: 'ricardo.tavares@gruponew.com.br',
    gerente_nome: 'Fernanda Lopes', gerente_email: 'fernanda.lopes@gruponew.com.br',
  },
  {
    id: '3', nome_completo: 'Roberto Mendes', apelido: 'Beto', email: 'beto@gruponew.com.br',
    cargo: 'Consultor de Vendas', perfil: 'consultor', percentMeta: 95, mesesAbaixo: 0,
    ligacoes: 35, mensagens: 18, cotacoes_enviadas: 14, cotacoes_fechadas: 4, follow_up: 8,
    faturamento: 71250, meta_faturamento: 75000,
    supervisor_nome: 'Ricardo Tavares', supervisor_email: 'ricardo.tavares@gruponew.com.br',
    gerente_nome: 'Fernanda Lopes', gerente_email: 'fernanda.lopes@gruponew.com.br',
  },
  {
    id: '4', nome_completo: 'Juliana Costa', apelido: 'Ju', email: 'ju@gruponew.com.br',
    cargo: 'Consultor de Vendas', perfil: 'consultor', percentMeta: 65, mesesAbaixo: 1,
    ligacoes: 22, mensagens: 10, cotacoes_enviadas: 8, cotacoes_fechadas: 2, follow_up: 5,
    faturamento: 48750, meta_faturamento: 75000,
    supervisor_nome: 'Ricardo Tavares', supervisor_email: 'ricardo.tavares@gruponew.com.br',
    gerente_nome: 'Fernanda Lopes', gerente_email: 'fernanda.lopes@gruponew.com.br',
  },
  {
    id: '5', nome_completo: 'Pedro Almeida', apelido: 'Pedro', email: 'pedro@gruponew.com.br',
    cargo: 'Consultor de Vendas', perfil: 'consultor', percentMeta: 155, mesesAbaixo: 0,
    ligacoes: 55, mensagens: 30, cotacoes_enviadas: 25, cotacoes_fechadas: 10, follow_up: 15,
    faturamento: 116250, meta_faturamento: 75000,
    supervisor_nome: 'Ricardo Tavares', supervisor_email: 'ricardo.tavares@gruponew.com.br',
    gerente_nome: 'Fernanda Lopes', gerente_email: 'fernanda.lopes@gruponew.com.br',
  },
  {
    id: '6', nome_completo: 'Mariana Souza', apelido: 'Mari', email: 'mari@gruponew.com.br',
    cargo: 'Consultor de Vendas', perfil: 'consultor', percentMeta: 42, mesesAbaixo: 3,
    ligacoes: 12, mensagens: 5, cotacoes_enviadas: 4, cotacoes_fechadas: 1, follow_up: 3,
    faturamento: 31500, meta_faturamento: 75000,
    supervisor_nome: 'Ricardo Tavares', supervisor_email: 'ricardo.tavares@gruponew.com.br',
    gerente_nome: 'Fernanda Lopes', gerente_email: 'fernanda.lopes@gruponew.com.br',
  },
  {
    id: '7', nome_completo: 'Lucas Oliveira', apelido: 'Lucas', email: 'lucas@gruponew.com.br',
    cargo: 'Consultor de Vendas', perfil: 'consultor', percentMeta: 78, mesesAbaixo: 2,
    ligacoes: 30, mensagens: 14, cotacoes_enviadas: 11, cotacoes_fechadas: 3, follow_up: 7,
    faturamento: 58500, meta_faturamento: 75000,
    supervisor_nome: 'Ricardo Tavares', supervisor_email: 'ricardo.tavares@gruponew.com.br',
    gerente_nome: 'Fernanda Lopes', gerente_email: 'fernanda.lopes@gruponew.com.br',
  },
];

export interface Venda {
  id: string;
  consultor_nome: string;
  nome_titular: string;
  modalidade: string;
  status: 'analise' | 'pendente' | 'aprovado' | 'recusado';
  created_at: string;
  vidas: number;
  valor?: number;
}

export const vendas: Venda[] = [
  { id: '1', consultor_nome: 'Ana Paula', nome_titular: 'José da Silva', modalidade: 'PF', status: 'analise', created_at: '2026-02-12', vidas: 1, valor: 850 },
  { id: '2', consultor_nome: 'Carlos', nome_titular: 'Maria Oliveira', modalidade: 'Familiar', status: 'analise', created_at: '2026-02-11', vidas: 4, valor: 2400 },
  { id: '3', consultor_nome: 'Pedro', nome_titular: 'TechCorp Ltda', modalidade: 'PME Multi', status: 'pendente', created_at: '2026-02-10', vidas: 6, valor: 4200 },
  { id: '4', consultor_nome: 'Beto', nome_titular: 'Ana Santos', modalidade: 'PF', status: 'aprovado', created_at: '2026-02-09', vidas: 1, valor: 720 },
  { id: '5', consultor_nome: 'Ana Paula', nome_titular: 'Grupo ABC S.A.', modalidade: 'Empresarial', status: 'pendente', created_at: '2026-02-08', vidas: 15, valor: 12500 },
  { id: '6', consultor_nome: 'Ju', nome_titular: 'Família Pereira', modalidade: 'Familiar', status: 'aprovado', created_at: '2026-02-07', vidas: 3, valor: 1800 },
];
