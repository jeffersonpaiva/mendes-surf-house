-- 2026-09-07-vendas-camisas.sql
-- Tela "Vendas" (controle de vendas das camisas da surf trip) + primeira
-- diferenciação de papel de usuário (admin vs. vendedor) no RLS.
--
-- IMPORTANTE: rodar no SQL Editor do Supabase (projeto mendes-surf-house).
-- Idempotente (pode rodar mais de uma vez sem erro).
--
-- O que este script faz, em ordem:
--   1. Cria tabela `usuarios_perfis` (mapeia cada login pra um papel:
--      'admin' ou 'vendedor') e preenche como 'admin' todo usuário que já
--      existir em auth.users hoje (preserva o acesso de quem já usa o app).
--   2. Cria a função `fn_papel_atual()`, que lê o papel do usuário logado.
--   3. Cria a tabela `pedidos_camisas` (pedidos de camisa da surf trip).
--   4. Habilita RLS em `usuarios_perfis` e `pedidos_camisas`.
--   5. RESTRINGE o acesso às tabelas `alunos`, `movimentacoes`, `pacotes`,
--      `configuracoes` para SÓ admin (troca a policy permissiva atual,
--      qualquer que seja o nome dela, por uma que exige papel = 'admin').
--      Isso é o que torna o acesso do "vendedor" realmente restrito à tela
--      de vendas — não é só uma questão de esconder o menu no app, é um
--      bloqueio de verdade no banco (RLS é a única camada de autorização
--      deste projeto — ver docs/memory/ARCHITECTURE.md).
--
-- Depois de rodar: para criar o login do vendedor, crie o usuário
-- manualmente em Authentication → Users no painel do Supabase (mesmo fluxo
-- já usado para o admin — não há self-signup no app), pegue o UUID dele
-- (coluna "id" na lista de usuários) e rode:
--
--   insert into usuarios_perfis (id, papel)
--   values ('COLE-AQUI-O-UUID-DO-USUARIO', 'vendedor')
--   on conflict (id) do update set papel = excluded.papel;

-- ────────────────────────────────────────────────────────────────
-- 1. Papel do usuário
-- ────────────────────────────────────────────────────────────────

create table if not exists usuarios_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null default 'admin' check (papel in ('admin', 'vendedor')),
  nome text,
  criado_em timestamptz not null default now()
);

-- Todo usuário que já existe hoje vira admin (preserva o acesso atual —
-- só o administrador usava o sistema até aqui).
insert into usuarios_perfis (id, papel)
select id, 'admin' from auth.users
on conflict (id) do nothing;

-- 2. Função que devolve o papel do usuário autenticado (ou 'admin' se por
-- algum motivo não tiver linha em usuarios_perfis — evita trancar o
-- administrador fora do próprio sistema por esquecimento de cadastro).
-- security definer + search_path fixo: padrão recomendado do Supabase para
-- funções usadas dentro de policy de RLS, evita problema de recursão de
-- policy e de search_path malicioso.
create or replace function fn_papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select papel from usuarios_perfis where id = auth.uid()),
    'admin'
  );
$$;

alter table usuarios_perfis enable row level security;

drop policy if exists "usuario ve o proprio perfil" on usuarios_perfis;
create policy "usuario ve o proprio perfil" on usuarios_perfis
  for select using (auth.uid() = id);

-- Sem policy de insert/update/delete: papel é atribuído manualmente pelo
-- administrador via SQL Editor (mesma convenção de "não há self-signup" já
-- usada para criar login).

-- ────────────────────────────────────────────────────────────────
-- 3. Pedidos de camisa (surf trip)
-- ────────────────────────────────────────────────────────────────

create table if not exists pedidos_camisas (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  modelo text not null check (modelo in ('Surf Trip', 'WSL Pipa')),
  cor text not null check (cor in ('Branco', 'Marrom', 'Azul', 'Preto')),
  tamanho text not null check (tamanho in ('P', 'M', 'G')),
  tipo_venda text not null default 'Venda' check (tipo_venda in ('Venda', 'Staff')),
  modalidade text not null check (modalidade in ('Encomenda', 'Pronta entrega')),
  forma_pagamento text not null check (forma_pagamento in ('Pix', 'Crédito', 'Débito', 'Staff')),
  valor numeric(10,2) not null check (valor >= 0),
  desconto numeric(10,2) not null default 0 check (desconto >= 0),
  entregue boolean not null default false,
  data_entrega date,
  observacao text,
  registrado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function fn_pedidos_camisas_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_pedidos_camisas_atualizado_em on pedidos_camisas;
create trigger trg_pedidos_camisas_atualizado_em
  before update on pedidos_camisas
  for each row execute function fn_pedidos_camisas_atualizado_em();

-- Índices: busca por nome do cliente (trigram, igual à busca de aluno) +
-- ordenação/keyset determinística pra paginação (criado_em desc, id desc —
-- mais recente primeiro, igual ao histórico de aluno).
create extension if not exists pg_trgm;

create index if not exists idx_pedidos_cliente_trgm
  on pedidos_camisas using gin (cliente_nome gin_trgm_ops);

create index if not exists idx_pedidos_criado_id
  on pedidos_camisas (criado_em desc, id desc);

alter table pedidos_camisas enable row level security;

drop policy if exists "autenticados leem pedidos" on pedidos_camisas;
create policy "autenticados leem pedidos" on pedidos_camisas
  for select using (auth.role() = 'authenticated');

drop policy if exists "autenticados criam pedidos" on pedidos_camisas;
create policy "autenticados criam pedidos" on pedidos_camisas
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "autenticados atualizam pedidos" on pedidos_camisas;
create policy "autenticados atualizam pedidos" on pedidos_camisas
  for update using (auth.role() = 'authenticated');

-- Sem policy de delete: ninguém apaga pedido pelo app (mesma filosofia de
-- não apagar histórico usada em `movimentacoes` — um pedido errado deve ser
-- corrigido pela edição, não excluído).

-- ────────────────────────────────────────────────────────────────
-- 4. Restringir alunos/movimentacoes/pacotes/configuracoes a admin
-- ────────────────────────────────────────────────────────────────
-- Remove TODAS as policies existentes de cada tabela (não dependemos de
-- saber o nome exato da policy antiga) e recria só com policy exigindo
-- papel = 'admin'. O "vendedor" continua autenticado (passa em
-- auth.role() = 'authenticated'), mas fn_papel_atual() = 'vendedor' barra o
-- acesso a estas 4 tabelas — só a tela de Vendas (pedidos_camisas) fica
-- disponível pra esse papel.

do $$
declare
  pol record;
  tabela text;
begin
  foreach tabela in array array['alunos', 'movimentacoes', 'pacotes', 'configuracoes']
  loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tabela
    loop
      execute format('drop policy %I on public.%I', pol.policyname, tabela);
    end loop;

    execute format(
      'create policy "somente admin" on public.%I for all using (fn_papel_atual() = %L) with check (fn_papel_atual() = %L)',
      tabela, 'admin', 'admin'
    );
  end loop;
end $$;
