const fs = require('fs');
const file = 'c:/Users/jorge/Documents/SGC/sgc-gruponew/src/pages/Aprovacoes.tsx';
let data = fs.readFileSync(file, 'utf8');

// Atividades
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_atividade'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 font-semibold text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_atividades', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 font-semibold text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_atividade'\) && \(\s*<Button variant="destructive"/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_atividades', 'excluir') && (
<Button variant="destructive"`);

// Vendas
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_venda'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_venda'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 font-semibold text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 font-semibold text-destructive`);

data = data.replace(/canDelete={hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_venda'\)}/g, 
  `canDelete={hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'excluir')}`);

// Cotacoes
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_cotacao'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_comercial', 'aprovar_cotacao'\) && \(\s*<Button size="icon" variant="outline" className="h-8 w-8 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_cotacoes', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive`);


// Acesso
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_acesso'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_acesso'\) && \(\s*<Button variant="destructive"/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'excluir') && (
<Button variant="destructive"`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_acesso'\) && \(\s*<Button size="icon" variant="outline" className="h-8 w-8 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_acesso', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive`);


// Alteracoes
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'avaliar_correcao'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_alteracoes', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'avaliar_correcao'\) && \(\s*<Button size="icon" variant="outline" className="h-8 w-8 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_alteracoes', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive`);


// MFA
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_mfa'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_mfa', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_mfa'\) && \(\s*<Button size="icon" variant="outline" className="h-8 w-8 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_mfa', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive`);


// Senhas
data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_senha'\) && \(\s*<Button size="sm" variant="outline" className="gap-1\.5 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'excluir') && (
<Button size="sm" variant="outline" className="gap-1.5 text-destructive`);

data = data.replace(/hasCargoPermission\(myCargoPerms, 'aprovacao_admin', 'aprovar_senha'\) && \(\s*<Button size="icon" variant="outline" className="h-8 w-8 text-destructive/g, 
  `hasCargoPermission(myCargoPerms, 'aprovacao_admin_senha', 'excluir') && (
<Button size="icon" variant="outline" className="h-8 w-8 text-destructive`);

// General replaces for aprovar
data = data.replace(/'aprovacao_comercial', 'aprovar_atividade'/g, "'aprovacao_atividades', 'aprovar'");
data = data.replace(/'aprovacao_comercial', 'aprovar_venda'/g, "'aprovacao_vendas', 'aprovar'");
data = data.replace(/'aprovacao_comercial', 'aprovar_cotacao'/g, "'aprovacao_cotacoes', 'aprovar'");
data = data.replace(/'aprovacao_admin', 'aprovar_acesso'/g, "'aprovacao_admin_acesso', 'aprovar'");
data = data.replace(/'aprovacao_admin', 'avaliar_correcao'/g, "'aprovacao_alteracoes', 'aprovar'");
data = data.replace(/'aprovacao_admin', 'aprovar_mfa'/g, "'aprovacao_admin_mfa', 'aprovar'");
data = data.replace(/'aprovacao_admin', 'aprovar_senha'/g, "'aprovacao_admin_senha', 'aprovar'");
data = data.replace(/canEdit={hasCargoPermission\(myCargoPerms, 'aprovacao_vendas', 'aprovar'\)}/g, "canEdit={hasCargoPermission(myCargoPerms, 'aprovacao_vendas', 'aprovar')}");


fs.writeFileSync(file, data);
console.log('Done!');
