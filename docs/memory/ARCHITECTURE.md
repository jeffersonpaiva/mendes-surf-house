# ARCHITECTURE.md

## Modelo geral

Não há backend próprio. É uma SPA React que fala diretamente com o Supabase:

```
┌─────────────────────────────────────────────┐
│  React SPA (Vite, PWA)                       │
│  ┌───────────┐  ┌────────────────────────┐   │
│  │ App.jsx   │  │ src/components/*.jsx   │   │
│  │ (estado   │──│ (telas e modais)       │   │
│  │  global)  │  └────────────────────────┘   │
│  └─────┬─────┘                                │
│        │  chama funções de                    │
│        ▼                                       │
│  src/lib/queries.js  (única camada de acesso   │
│  a dados + regras de negócio do frontend)      │
└────────┬────────────────────────────────────┘
         │ @supabase/supabase-js
         ▼
┌─────────────────────────────────────────────┐
│  Supabase                                    │
│  ├─ Auth (login e-mail/senha)                │
│  ├─ Postgres                                 │
│  │   ├─ tabelas: alunos, movimentacoes,      │
│  │   │           pacotes, configuracoes      │
│  │   └─ views: vw_saldo_alunos,              │
│  │             vw_dashboard_alunos,          │
│  │             vw_financeiro_mensal          │
│  └─ RLS (só usuário autenticado acessa)      │
└─────────────────────────────────────────────┘
```

## Por que essa arquitetura

- **Sem backend próprio:** o Supabase já fornece API (via supabase-js), auth e
  banco. Para o tamanho do projeto (uso interno de uma escola), um backend Node/
  Express adicional seria complexidade sem benefício.
- **`queries.js` como camada única:** toda leitura/escrita de dados passa por
  `src/lib/queries.js`. Os componentes React nunca chamam `supabase.from(...)`
  diretamente. Isso existe para que toda regra de negócio (saldo nunca negativo,
  aluno duplicado bloqueado) fique centralizada num único lugar, testável e fácil
  de auditar — em vez de espalhada pelos componentes de UI.
- **Saldo nunca armazenado, sempre calculado:** não existe uma coluna "saldo" em
  `alunos`. O saldo é sempre `SUM(entrada) - SUM(saida)` da tabela
  `movimentacoes`, exposto via view `vw_saldo_alunos`. Ver
  `docs/memory/DECISIONS.md` para o raciocínio completo (essa decisão vem de uma
  versão anterior do projeto, feita em Google Sheets + Apps Script, e foi
  deliberadamente preservada na migração para o Supabase).

## Fluxos principais

### 1. Login

`App.jsx` chama `supabase.auth.getSession()` no mount e assina
`onAuthStateChange`. Enquanto a sessão está `undefined`, mostra tela de
carregamento; se `null`, mostra `Login.jsx`; se preenchida, mostra o app.
Não há cadastro de usuário pelo próprio app — usuários são criados manualmente
pelo administrador no painel do Supabase (Authentication → Users).

### 2. Carregar o Dashboard

Duas fontes de dados independentes, carregadas separadamente:

- **KPIs + roster para "baixa em lote":** `App.jsx.recarregar()` chama, em
  paralelo, `fetchDashboardKpis()` (RPC `fn_dashboard_kpis`, calcula os 4
  indicadores do topo direto no Postgres — não baixa a tabela de alunos
  inteira) e `fetchRosterParaLote()` (lista enxuta id/nome/saldo de TODOS os
  alunos, usada só pelo `ModalBaixaLote` pra casar nomes colados do
  WhatsApp — ver seção 2.1 sobre por que essa lista não é paginada).
- **Lista de alunos visível (mobile e desktop):** `Dashboard.jsx` /
  `DashboardDesktop.jsx` buscam seus próprios dados, de forma independente
  do que foi descrito acima, através do hook `usePaginatedQuery` — 20 por
  vez, busca por nome direto no banco. Ver seção 2.1.

`recarregar()` é chamado após login, e como callback `onSucesso` de toda ação
que grava dado (criar aluno, inserir pacote, dar baixa) — não há cache nem
invalidação seletiva. Ele não recarrega mais a lista visível diretamente
(ela busca os próprios dados); em vez disso incrementa `refreshToken`
(estado em `App.jsx`, passado como prop), que o hook de paginação observa
pra se atualizar sozinho, preservando a busca/página atual do usuário.

### 2.1 Paginação por cursor (keyset) — padrão reutilizável

Duas listas do app usam o mesmo padrão, via o hook genérico
`src/lib/usePaginatedQuery.js`:

- **Lista de alunos** (`Dashboard.jsx` mobile, com botão "Carregar mais";
  `DashboardDesktop.jsx`, com "Anterior/Próxima") — config
  `ALUNOS_LISTA_CONFIG` em `queries.js`.
- **Histórico de um aluno** (`ModalHistorico.jsx`, com "Carregar mais") —
  config `HISTORICO_LISTA_CONFIG` em `queries.js`.

Mecânica: `queries.js` expõe `buscarPaginaKeyset()`, a única função que fala
com o Supabase pra isso (mantém a regra "só `queries.js` chama
`supabase.from(...)`" — o hook em `src/lib/` só orquestra estado/efeitos, a
query em si vive em `queries.js`). A ordenação de cada lista é composta (ex:
`nome, id`) e usada tanto no `ORDER BY` quanto na condição do cursor
(`WHERE (nome, id) > (valor_cursor)`, montada com `.or()`/`and()` do
PostgREST) — o `id` como desempate garante que a paginação nunca pula nem
duplica registro, mesmo com valores repetidos na coluna principal. Busca é
sempre `ilike` (case-insensitive, "contém") direto no banco, com debounce de
350ms, e reinicia a paginação da primeira página a cada mudança de termo —
nunca filtra só os itens já carregados no React.

Uma lista **não** entra nesse padrão: `fetchRosterParaLote()` (usada pelo
`ModalBaixaLote` pra casar nomes colados do WhatsApp contra o cadastro
inteiro) continua buscando todos os alunos de uma vez, de propósito — é uma
ferramenta de reconhecimento de texto, não uma lista navegável, e paginar
ali faria o reconhecimento falhar silenciosamente pra qualquer aluno fora
da primeira página.

Índices que sustentam essa paginação (busca por trigram + ordenação/keyset)
estão em `scripts/sql/2026-08-27-paginacao-indices-kpis.sql` — ver
`docs/memory/DATABASE.md`.

### 3. Cadastrar aluno (`ModalNovoAluno.jsx` → `criarAluno()`)

1. Verifica duplicidade por nome (case/espaço-insensível, via `ilike`).
2. Insere em `alunos`.
3. Se o formulário incluiu um pacote inicial, chama `registrarPacote()` (fluxo 4)
   em seguida, com a descrição "Pacote inicial no cadastro".

### 4. Inserir pacote (`ModalPacote.jsx` → `registrarPacote()`)

1. Resolve o pacote escolhido (ou usa quantidade personalizada, se
   `pacoteId === 'PERSONALIZADO'`).
2. Chama a função interna `registrarMovimentacao()` com `entrada = quantidade`.

Pode ser aberto de duas formas:
- **A partir do card de um aluno** (`aluno` já vem preenchido via prop).
- **A partir do botão flutuante (+)** (`aluno` vem `null` — o modal busca a lista
  completa de alunos com `fetchAlunosParaDropdown()` e mostra um `<select>`).

### 5. Dar baixa em aula (`ModalBaixaAula.jsx` → `registrarAula()`)

Mesmo padrão do fluxo 4 (com/sem aluno pré-selecionado). Antes de gravar, calcula
o saldo atual (`fetchSaldoAluno`) e bloqueia se `quantidade > saldo`.

### 6. `registrarMovimentacao()` (função interna, não exportada)

Usada pelos fluxos 4 e 5. Sempre:
1. Lê o saldo atual do aluno (`fetchSaldoAluno`, que lê a view).
2. Se é uma saída, valida que não passa do saldo — senão lança erro com mensagem
   pronta pra exibir na tela.
3. Calcula `saldo_apos` (snapshot, só para auditoria/histórico — nunca usado para
   recalcular saldo depois).
4. Insere a linha em `movimentacoes`.

### 7. Ver histórico (`ModalHistorico.jsx` → `usePaginatedQuery` + `HISTORICO_LISTA_CONFIG`)

Movimentações de um aluno, mais recente primeiro, paginadas por cursor (20
por vez, botão "Carregar mais") — ver seção 2.1. Somente leitura.

## Importação em lote (fora do app, script separado)

`scripts/importar-alunos.js` roda localmente via `node` (não faz parte do bundle
do app). Fluxo:
1. Pede e-mail/senha do admin no terminal e autentica via
   `supabase.auth.signInWithPassword` (necessário pra passar pela RLS).
2. Lê um arquivo `.xlsx` (aba "Alunos") com `xlsx` (SheetJS).
3. Para cada linha: pula duplicados por nome, insere o aluno, e se
   "Aulas disponíveis agora" > 0, insere uma `movimentacao` tipo `AJUSTE` com a
   descrição "Saldo inicial (importação)".

Esse script não está integrado a nenhuma automação — é rodado manualmente quando
necessário.
