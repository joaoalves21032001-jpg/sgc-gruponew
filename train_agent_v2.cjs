const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const rules = `
Funcionalidade: Cadastro de Produtos no Inventário
1. Cenários de Permissão e Acesso
Cenário 1.1: Validação de perfil "Visualizador" (Sem acesso de criação)
Dado que o usuário está autenticado no sistema
E possui apenas a permissão de "VISUALIZADOR" ativa para "Inventário > Subguia Produtos"
Quando o usuário acessa a guia "Inventário" e clica na subguia "Produtos"
Então o botão "+ Novo Produto" NÃO deve estar visível na interface
E o usuário não deve conseguir acessar o modal de criação

2. Cenários de Validação de Campos (Caminhos Tristes)
Cenário 2.1: Tentativa de salvar sem informar o Nome do Produto
Dado que o usuário com permissão de Editor abriu o modal "Novo Produto"
E seleciona a opção "Companhia Exemplo" no menu "Selecione a companhia"
Mas deixa o campo "Nome do produto" vazio
Quando o usuário clica no botão "Salvar"
Então o sistema deve manter o modal aberto
E exibir uma mensagem de erro alertando que o nome do produto é obrigatório
E nenhum registro deve ser criado no banco de dados

Cenário 2.2: Tentativa de salvar sem selecionar a Companhia
Dado que o usuário com permissão de Editor abriu o modal "Novo Produto"
E preenche o campo "Nome do produto" com "Produto Teste"
Mas deixa o menu "Selecione a companhia" em seu estado padrão (vazio)
Quando o usuário clica no botão "Salvar"
Então o sistema deve manter o modal aberto
E exibir uma mensagem de erro alertando que a companhia é obrigatória
E nenhum registro deve ser criado no banco de dados

Cenário 2.3: Tentativa de salvar com todos os campos em branco
Dado que o usuário com permissão de Editor abriu o modal "Novo Produto"
E não preenche o campo "Nome do produto"
E não seleciona nenhuma opção no menu "Selecione a companhia"
Quando o usuário clica no botão "Salvar"
Então o sistema deve manter o modal aberto
E exibir validações de erro para ambos os campos obrigatórios

3. Cenários de Desistência / Cancelamento
Cenário 3.1: Cancelamento da ação usando o botão "Cancelar"
Dado que o usuário com permissão de Editor abriu o modal "Novo Produto"
E preenche o campo "Nome do produto" com "Produto Descartado"
Quando o usuário clica no botão "Cancelar" (branco)
Então o modal deve ser fechado imediatamente
E os dados digitados devem ser descartados
E a lista de produtos na tela de fundo não deve sofrer alterações

Cenário 3.2: Cancelamento da ação usando o ícone "X"
Dado que o usuário com permissão de Editor abriu o modal "Novo Produto"
Quando o usuário clica no ícone "X" no canto superior direito do modal
Então o modal deve ser fechado imediatamente
E a ação de criação deve ser cancelada sem salvar nenhum dado

4. Cenários de Regra de Negócio
Cenário 4.1: Tentativa de cadastrar um produto duplicado
Dado que o produto "Produto A" já existe vinculado à "Companhia X"
E o usuário com permissão de Editor abre o modal "Novo Produto"
Quando o usuário preenche "Nome do produto" com "Produto A"
E seleciona a "Companhia X"
E clica em "Salvar"
Então o sistema deve barrar a criação
E exibir uma mensagem informando que "Já existe um produto com este nome nesta companhia".
`;

async function main() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@sgc.com',
      password: '19212527121973aA@'
    });

    if (error || !data.session) {
      console.error("Erro de login:", error);
      process.exit(1);
    }

    console.log('Logged in successfully!');
    console.log('Sending request to edge function...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/copilot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'embed_knowledge',
        categoria: 'Inventário: Regras de Cadastro de Produtos (Gherkin)',
        content: rules
      })
    });
    
    const responseText = await response.text();
    if (!response.ok) {
       console.error("HTTP ERROR:", response.status, responseText);
       process.exit(1);
    }

    console.log("================ SUCCESS ================");
    console.log(responseText);
  } catch (err) {
    console.error("Caught exception:", err);
    process.exit(1);
  }
}

main();
