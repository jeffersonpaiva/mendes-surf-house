# DATABASE.md

**Importante:** não existe sistema de migration versionado no repositório do app
(sem Prisma/Drizzle/Supabase CLI migrations). O schema foi criado rodando scripts
`.sql` avulsos diretamente no SQL Editor do painel do Supabase, fora do controle
de versão do código. Este arquivo é a reconstituição do schema a partir do que o
código (`src/lib/queries.js`) espera encontrar — trate como a melhor fonte de
verdade disponível no repositório, mas **confirme no Supabase (Table
Editor/SQL Editor) antes de qualquer alteração estrutural**, e depois de alterar,
atualize este arquivo.

## Banco

Postgres gerenciado pelo Supabase. Projeto: `mendes-surf-house` (região São Paulo,
`sa-east-1`).

## Tabelas

### `alunos`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `nome` | text, not null | único (case/espaço-insensível, via índice) |
| `telefone` | text, nullable | opcional — nem todo aluno tem telefone próprio |
| `nome_responsavel` | text, nullable | preenchido quando o aluno é menor de idade |
| `telefone_responsavel` | text, nullable | idem |
| `status` | text, not null, default `'Ativo'` | valores: `'Ativo'` / `'Inativo'` |
| `data_cadastro` | date, default `current_date` | |
| `observacao` | text, nullable | |
| `criado_em` | timestamptz, default `now()` | |

Índice único em `lower(trim(nome))` — impede duas linhas com o mesmo nome
(ignorando maiúsculas/espaços). O frontend também checa isso antes de inserir
(`criarAluno()` em `queries.js`), então o índice é uma segunda camada de defesa,
não a única.

### `movimentacoes`

A fonte única de verdade do saldo de cada aluno. Nenhuma outra tabela ou coluna
guarda saldo.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid, PK | |
| `data` | date, not null, default `current_date` | data do evento (aula/compra) |
| `aluno_id` | uuid, not null, FK → `alunos(id)` on delete restrict | |
| `tipo` | text, not null | `'PACOTE'` \| `'AULA'` \| `'AJUSTE'` |
| `descricao` | text, not null | ex: nome do pacote, "Aula realizada" |
| `entrada` | integer, not null, default 0, check ≥ 0 | aulas somadas ao saldo |
| `saida` | integer, not null, default 0, check ≥ 0 | aulas subtraídas do saldo |
| `saldo_apos` | integer, not null | **snapshot histórico**, não usado para recálculo |
| `observacao` | text, nullable | |
| `registrado_em` | timestamptz, default `now()` | timestamp real do lançamento (auditoria) |
| `valor_pago` | numeric(10,2), nullable | preparado para controle financeiro; não usado no frontend ainda |
| `forma_pagamento` | text, nullable | idem — 'Pix', 'Dinheiro', 'Cartão'... texto livre, não usado no frontend ainda |

O saldo do aluno é sempre `SUM(entrada) - SUM(saida)` desta tabela, filtrando por
`aluno_id`. Ver view `vw_saldo_alunos`.

### `pacotes`

Catálogo de pacotes/planos vendáveis.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid, PK | |
| `nome` | text, not null | |
| `quantidade` | integer, not null, check > 0 | aulas que o pacote concede |
| `ativo` | boolean, not null, default true | permite "aposentar" um pacote sem apagar histórico |
| `valor` | numeric(10,2), nullable | preço sugerido/atual (pré-preenche o formulário; o valor cobrado de fato fica em `movimentacoes.valor_pago`) |
| `categoria` | text, nullable | agrupamento no dropdown: `'Nacional'`, `'Internacional'`, `'One to One'`, `'Avulso'` |

Catálogo atual (preços em produção, ver `docs/memory/DECISIONS.md` sobre por que
o valor histórico não recalcula quando o preço muda):

| Categoria | Nome | Aulas | Valor |
|---|---|---|---|
| Nacional | Boooa | 4 | R$ 200 |
| Nacional | Isaaaa | 8 | R$ 320 |
| Nacional | Instigado | 12 | R$ 460 |
| Internacional | Boooa Internacional | 4 | R$ 280 |
| Internacional | Isaaaa Internacional | 8 | R$ 600 |
| Internacional | Instigado Internacional | 12 | R$ 900 |
| One to One | Programa Base | 4 | R$ 440 |
| One to One | Programa Evolução | 8 | R$ 840 |
| One to One | Programa Performance | 14 | R$ 1.330 |
| Avulso | Aula avulsa | 1 | R$ 70 |

Existe também a opção **"Personalizado / Recorrente"** nos modais do app — não é
uma linha em `pacotes`, é tratada especialmente no código
(`pacoteId === 'PERSONALIZADO'`), pedindo a quantidade de aulas direto no
formulário.

### `configuracoes`

Tabela chave/valor simples.

| Coluna | Tipo |
|---|---|
| `parametro` | text, PK |
| `valor` | text |

Parâmetros conhecidos: `dias_inatividade` (default `'60'`), `nome_escola`
(`'Mendes Surf House'`). **Atenção:** essa tabela existia na versão Apps Script
para controlar a regra automática de "aluno inativo após X dias sem atividade" —
essa regra **não foi portada** para o app Supabase/React ainda (ver
`docs/memory/CURRENT_STATE.md`, seção Pendências). Hoje `status` em `alunos` é
mantido manualmente.

## Views

### `vw_saldo_alunos`

Por aluno: `saldo` (entrada − saída), `total_adquirido`, `total_realizadas`,
`ultima_aula`, `pacote_atual` (descrição da última movimentação tipo `PACOTE`).
Usada por `fetchSaldoAluno()`.

### `vw_dashboard_alunos`

Join de `alunos` + `vw_saldo_alunos`, adicionando `situacao_pacote`
(`'Com aulas disponíveis'` se saldo > 0, senão `'Sem aulas'`). É a fonte direta do
Dashboard (`fetchDashboard()` faz só um `select * from vw_dashboard_alunos`).

### `vw_financeiro_mensal`

Soma de `valor_pago` por mês, só de movimentações tipo `PACOTE` com
`valor_pago` preenchido. **Preparada mas não consumida pelo frontend ainda** —
não existe tela de relatório financeiro no app (ver `CURRENT_STATE.md`).

## Regras de banco (defesa em profundidade)

- **Trigger `trg_impedir_saldo_negativo`** (função `impedir_saldo_negativo()`):
  roda `before insert on movimentacoes` e lança exceção se a movimentação levar o
  saldo do aluno abaixo de zero. Isso existe **além** da validação que o
  frontend já faz em `queries.js` — o trigger é a garantia de que a regra vale
  mesmo se alguém escrever direto no banco (SQL Editor, outro cliente, etc.).

## RLS (Row Level Security)

RLS está habilitado nas 4 tabelas. Hoje existe uma única política por tabela:
`auth.role() = 'authenticated'` (qualquer usuário logado tem acesso total —
leitura e escrita). **Não há diferenciação de papel/role ainda** (ex: admin vs.
aluno vs. professor). Isso é uma pendência conhecida para quando o projeto abrir
acesso a alunos verem o próprio saldo — ver `CURRENT_STATE.md`.

## Como alterar o banco

1. Escreva um script `.sql` novo, de preferência idempotente (`if not exists`,
   `if exists`, `create or replace`).
2. Peça para o usuário rodar no SQL Editor do painel do Supabase (não há CLI/
   pipeline de deploy de schema neste projeto).
3. Atualize este arquivo (`DATABASE.md`) imediatamente depois, refletindo o novo
   estado real das tabelas/views.
4. Se a mudança afeta uma regra de negócio, atualize também
   `docs/memory/BUSINESS_RULES.md`.
