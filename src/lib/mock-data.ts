export interface Consultor {
  id: string;
  codigo: string;
  nome_completo: string;
  apelido: string;
  email: string;
  cargo: 'Consultor de Vendas' | 'Supervisor' | 'Gerente';
  nivel_acesso: 'usuario' | 'administrador';
  perfil: 'consultor' | 'supervisor' | 'gerente' | 'administrador';
  avatar_url?: string;
  // Dados pessoais
  cpf: string;
  rg: string;
  celular: string;
  endereco: string;
  numero_emergencia_1: string;
  numero_emergencia_2: string;
  // Líderes
  supervisor_nome: string;
  supervisor_email: string;
  gerente_nome: string;
  gerente_email: string;
  // Performance
  percentMeta: number;
  mesesAbaixo: number;
  ligacoes: number;
  mensagens: number;
  cotacoes_enviadas: number;
  cotacoes_fechadas: number;
  follow_up: number;
  faturamento: number;
  meta_faturamento: number;
}

export const currentUser: Consultor = {
  id: '1',
  codigo: '9BITHABD',
  nome_completo: 'Carlos Eduardo Silva',
  apelido: 'Carlos',
  email: 'carlos@gruponew.com.br',
  cargo: 'Consultor de Vendas',
  nivel_acesso: 'usuario',
  perfil: 'gerente',
  cpf: '477.021.708-08',
  rg: '53.830.099-1',
  celular: '(11) 9 8777-6045',
  endereco: 'Viela Aristides de Oliveira, 140 - Vl. Júlia, São Paulo - SP',
  numero_emergencia_1: '(11) 9 9445-9950',
  numero_emergencia_2: '(11) 9 7396-3312',
  supervisor_nome: 'João Rodrigues',
  supervisor_email: 'joao.rodrigues@gruponew.com.br',
  gerente_nome: 'Rafaella Ferreira',
  gerente_email: 'rafaella.ferreira@gruponew.com.br',
  percentMeta: 112,
  mesesAbaixo: 0,
  ligacoes: 47,
  mensagens: 23,
  cotacoes_enviadas: 18,
  cotacoes_fechadas: 6,
  follow_up: 12,
  faturamento: 84500,
  meta_faturamento: 75000,
};

export const consultores: Consultor[] = [
  currentUser,
  {
    id: '2', codigo: 'A2KFPQ01', nome_completo: 'Ana Paula Ferreira', apelido: 'Ana', email: 'ana@gruponew.com.br',
    cargo: 'Consultor de Vendas', nivel_acesso: 'usuario', perfil: 'consultor',
    cpf: '321.654.987-00', rg: '12.345.678-9', celular: '(11) 9 1234-5678',
    endereco: 'Rua das Flores, 200 - Centro, São Paulo - SP',
    numero_emergencia_1: '(11) 9 8888-7777', numero_emergencia_2: '(11) 9 6666-5555',
    supervisor_nome: 'João Rodrigues', supervisor_email: 'joao.rodrigues@gruponew.com.br',
    gerente_nome: 'Rafaella Ferreira', gerente_email: 'rafaella.ferreira@gruponew.com.br',
    percentMeta: 215, mesesAbaixo: 0, ligacoes: 68, mensagens: 45, cotacoes_enviadas: 32,
    cotacoes_fechadas: 14, follow_up: 20, faturamento: 161250, meta_faturamento: 75000,
  },
  {
    id: '3', codigo: 'B3RMPQ02', nome_completo: 'Roberto Mendes', apelido: 'Beto', email: 'beto@gruponew.com.br',
    cargo: 'Consultor de Vendas', nivel_acesso: 'usuario', perfil: 'consultor',
    cpf: '111.222.333-44', rg: '11.222.333-4', celular: '(11) 9 2222-3333',
    endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    numero_emergencia_1: '(11) 9 4444-5555', numero_emergencia_2: '(11) 9 6666-7777',
    supervisor_nome: 'João Rodrigues', supervisor_email: 'joao.rodrigues@gruponew.com.br',
    gerente_nome: 'Rafaella Ferreira', gerente_email: 'rafaella.ferreira@gruponew.com.br',
    percentMeta: 95, mesesAbaixo: 0, ligacoes: 35, mensagens: 18, cotacoes_enviadas: 14,
    cotacoes_fechadas: 4, follow_up: 8, faturamento: 71250, meta_faturamento: 75000,
  },
  {
    id: '4', codigo: 'C4JCPQ03', nome_completo: 'Juliana Costa', apelido: 'Ju', email: 'ju@gruponew.com.br',
    cargo: 'Consultor de Vendas', nivel_acesso: 'usuario', perfil: 'consultor',
    cpf: '555.666.777-88', rg: '55.666.777-8', celular: '(11) 9 3333-4444',
    endereco: 'Rua Augusta, 500 - Consolação, São Paulo - SP',
    numero_emergencia_1: '(11) 9 1111-2222', numero_emergencia_2: '(11) 9 3333-4444',
    supervisor_nome: 'João Rodrigues', supervisor_email: 'joao.rodrigues@gruponew.com.br',
    gerente_nome: 'Rafaella Ferreira', gerente_email: 'rafaella.ferreira@gruponew.com.br',
    percentMeta: 65, mesesAbaixo: 1, ligacoes: 22, mensagens: 10, cotacoes_enviadas: 8,
    cotacoes_fechadas: 2, follow_up: 5, faturamento: 48750, meta_faturamento: 75000,
  },
  {
    id: '5', codigo: 'D5PAPQ04', nome_completo: 'Pedro Almeida', apelido: 'Pedro', email: 'pedro@gruponew.com.br',
    cargo: 'Consultor de Vendas', nivel_acesso: 'usuario', perfil: 'consultor',
    cpf: '999.888.777-66', rg: '99.888.777-6', celular: '(11) 9 5555-6666',
    endereco: 'Rua Oscar Freire, 300 - Jardins, São Paulo - SP',
    numero_emergencia_1: '(11) 9 7777-8888', numero_emergencia_2: '(11) 9 9999-0000',
    supervisor_nome: 'João Rodrigues', supervisor_email: 'joao.rodrigues@gruponew.com.br',
    gerente_nome: 'Rafaella Ferreira', gerente_email: 'rafaella.ferreira@gruponew.com.br',
    percentMeta: 155, mesesAbaixo: 0, ligacoes: 55, mensagens: 30, cotacoes_enviadas: 25,
    cotacoes_fechadas: 10, follow_up: 15, faturamento: 116250, meta_faturamento: 75000,
  },
  {
    id: '6', codigo: 'E6MSPQ05', nome_completo: 'Mariana Souza', apelido: 'Mari', email: 'mari@gruponew.com.br',
    cargo: 'Consultor de Vendas', nivel_acesso: 'usuario', perfil: 'consultor',
    cpf: '444.333.222-11', rg: '44.333.222-1', celular: '(11) 9 8888-9999',
    endereco: 'Rua Haddock Lobo, 150 - Cerqueira César, São Paulo - SP',
    numero_emergencia_1: '(11) 9 0000-1111', numero_emergencia_2: '(11) 9 2222-3333',
    supervisor_nome: 'João Rodrigues', supervisor_email: 'joao.rodrigues@gruponew.com.br',
    gerente_nome: 'Rafaella Ferreira', gerente_email: 'rafaella.ferreira@gruponew.com.br',
    percentMeta: 42, mesesAbaixo: 3, ligacoes: 12, mensagens: 5, cotacoes_enviadas: 4,
    cotacoes_fechadas: 1, follow_up: 3, faturamento: 31500, meta_faturamento: 75000,
  },
  {
    id: '7', codigo: 'F7LOPQ06', nome_completo: 'Lucas Oliveira', apelido: 'Lucas', email: 'lucas@gruponew.com.br',
    cargo: 'Consultor de Vendas', nivel_acesso: 'usuario', perfil: 'consultor',
    cpf: '777.888.999-00', rg: '77.888.999-0', celular: '(11) 9 4444-5555',
    endereco: 'Av. Brasil, 800 - Jardim América, São Paulo - SP',
    numero_emergencia_1: '(11) 9 6666-7777', numero_emergencia_2: '(11) 9 8888-9999',
    supervisor_nome: 'João Rodrigues', supervisor_email: 'joao.rodrigues@gruponew.com.br',
    gerente_nome: 'Rafaella Ferreira', gerente_email: 'rafaella.ferreira@gruponew.com.br',
    percentMeta: 78, mesesAbaixo: 2, ligacoes: 30, mensagens: 14, cotacoes_enviadas: 11,
    cotacoes_fechadas: 3, follow_up: 7, faturamento: 58500, meta_faturamento: 75000,
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
