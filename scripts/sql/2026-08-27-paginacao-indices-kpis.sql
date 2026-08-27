-- =====================================================================
-- Paginação por cursor (keyset) da lista de alunos e do histórico
-- + KPIs do Dashboard calculados no banco.
--
-- Rode este script INTEIRO no SQL Editor do Supabase (projeto
-- mendes-surf-house). Idempotente: pode rodar mais de uma vez sem erro.
-- Depois de rodar, atualize docs/memory/DATABASE.md se algo aqui mudar
-- (já foi atualizado nesta mesma leva de alterações).
-- =====================================================================

-- 1) Busca por nome (`ilike '%termo%'`, curinga nas duas pontas) via
--    índice trigram. Um índice comum (btree) só ajuda busca "começa com" —
--    pra "contém" (o comportamento do campo de busca, igual sempre foi)
--    precisa de pg_trgm pra não virar sequential scan quando a tabela
--    crescer.
create extension if not exists pg_trgm;

create index if not exists idx_alunos_nome_trgm
  on public.alunos using gin (nome gin_trgm_ops);

-- 2) Ordenação/keyset determinístico da lista de alunos: nome asc, id asc
--    como desempate. Garante que a paginação por cursor nunca pula nem
--    duplica um aluno entre páginas, mesmo havendo dois alunos com nomes
--    idênticos.
create index if not exists idx_alunos_nome_id
  on public.alunos (nome, id);

-- 3) Ordenação/keyset determinístico do histórico de um aluno (tela "Ver
--    histórico completo"): filtra por aluno_id e ordena por data desc,
--    registrado_em desc, id desc — um único índice composto cobre filtro +
--    ordenação + keyset.
create index if not exists idx_movimentacoes_aluno_data
  on public.movimentacoes (aluno_id, data desc, registrado_em desc, id desc);

-- 4) KPIs do topo do Dashboard (alunos ativos, aulas disponíveis, aulas do
--    mês, sem aulas) calculados inteiramente no Postgres, numa função RPC —
--    evita trazer a tabela de alunos inteira pro navegador só pra
--    somar/contar. `stable` porque só lê dado, não escreve nada.
--    Mesma regra de negócio de antes (ver calcularKpis() removida do
--    frontend): aulasDisponiveis soma o saldo de TODOS os alunos (não só
--    os ativos); semAulas conta quem tem saldo <= 0.
create or replace function public.fn_dashboard_kpis()
returns table (
  alunos_ativos integer,
  aulas_disponiveis bigint,
  aulas_no_mes bigint,
  sem_aulas integer
)
language sql
stable
as $$
  select
    count(*) filter (where a.status = 'Ativo')::int as alunos_ativos,
    coalesce(sum(s.saldo), 0)::bigint as aulas_disponiveis,
    coalesce((
      select sum(m.saida)
      from public.movimentacoes m
      where m.tipo = 'AULA'
        and m.data >= date_trunc('month', current_date)
    ), 0)::bigint as aulas_no_mes,
    count(*) filter (where coalesce(s.saldo, 0) <= 0)::int as sem_aulas
  from public.alunos a
  left join public.vw_saldo_alunos s on s.aluno_id = a.id;
$$;

grant execute on function public.fn_dashboard_kpis() to authenticated;
