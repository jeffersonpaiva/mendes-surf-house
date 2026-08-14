# CLAUDE.md — Mendes Surf House

Este é o arquivo principal de contexto para qualquer sessão do Claude (ou de outro
desenvolvedor) que retome este projeto. Leia este arquivo por completo antes de
fazer qualquer alteração relevante.

## Visão geral

**Projeto:** App de controle interno de aulas da Mendes Surf House (escola de surf).

**Objetivo:** substituir o controle manual (originalmente feito em planilha Google
Sheets + Apps Script) por um web app mobile-first (PWA), com visual de app nativo,
para a administração cadastrar alunos, vender pacotes de aulas, dar baixa em aulas
realizadas e acompanhar o saldo de cada aluno.

**Problema que resolve:** dar à administração da escola um sistema rápido de usar
pelo celular, com saldo de aulas sempre correto e nunca negativo, histórico completo
e auditável, e visual alinhado à identidade da marca.

**Estado atual:** MVP funcional, em produção, uso real começando. Login de admin
funcionando, CRUD de alunos/pacotes/movimentações funcionando, deploy automático
ativo. Ver `docs/memory/CURRENT_STATE.md` para o checkpoint mais recente.

## Stack

- **Frontend:** React 18 + Vite 5, JavaScript puro (sem TypeScript), CSS puro
  (sem framework tipo Tailwind) em `src/styles.css`.
- **PWA:** `vite-plugin-pwa` (instalável na tela do celular, manifest com ícones
  gerados a partir do logo da marca).
- **Backend/dados:** Supabase (Postgres gerenciado + Auth + Row Level Security).
  Não há backend próprio — o frontend fala direto com o Supabase via
  `@supabase/supabase-js`.
- **Hospedagem:** Vercel (deploy automático a cada push na branch `main` do GitHub).
- **Controle de versão:** GitHub, repositório local em `D:\REPOSITORIO_PESSOAL\mendes-app`
  (Windows, máquina do administrador do projeto).
- **Importação em lote:** script Node standalone (`scripts/importar-alunos.js`),
  usa `xlsx` (SheetJS) para ler um template Excel e `dotenv` para ler as
  credenciais do `.env` local.

## Arquitetura

Não existe backend/API própria. O frontend React fala diretamente com o Supabase:

```
React (Vite, PWA)  ──►  supabase-js  ──►  Supabase
                                            ├─ Postgres (tabelas + views)
                                            ├─ Auth (login por e-mail/senha)
                                            └─ RLS (autorização por linha)
```

- Toda leitura de dados passa por **views** do Postgres que já entregam os dados
  calculados (saldo, situação do pacote) — o frontend nunca calcula saldo "na mão".
- Toda escrita de saldo passa por uma única tabela (`movimentacoes`), nunca por
  update direto de um campo de saldo. Ver `docs/memory/DATABASE.md` e
  `docs/memory/BUSINESS_RULES.md`.
- Não há servidor Node/Express — o único código Node do projeto é o script de
  importação em lote, que roda localmente e fala direto com o Supabase.

## Estrutura de pastas

```
mendes-app/
├── index.html              # HTML raiz do Vite
├── vite.config.js          # config do Vite + manifest do PWA
├── package.json
├── .env.example             # nomes das variáveis de ambiente (sem valores reais)
├── public/
│   └── icon-192.png, icon-512.png   # ícones do PWA, gerados a partir do logo
├── scripts/
│   └── importar-alunos.js  # importação em lote via Excel (rodado localmente)
├── src/
│   ├── main.jsx             # bootstrap do React
│   ├── App.jsx              # componente raiz: sessão, roteamento de sheets/modais, orquestra os dados
│   ├── supabaseClient.js    # cliente único do supabase-js
│   ├── styles.css           # todo o CSS do app (identidade visual da marca)
│   ├── lib/
│   │   └── queries.js       # TODA a lógica de acesso a dados e regras de negócio
│   └── components/
│       ├── Login.jsx
│       ├── Dashboard.jsx           # tela principal: KPIs, busca, lista de alunos
│       ├── BottomSheet.jsx         # componente genérico de modal (bottom sheet)
│       ├── QuickActionSheet.jsx    # menu geral (FAB) + menu contextual do aluno
│       ├── ModalNovoAluno.jsx
│       ├── ModalPacote.jsx
│       ├── ModalBaixaAula.jsx
│       └── ModalHistorico.jsx
└── docs/memory/              # esta pasta — memória detalhada do projeto
```

`src/lib/queries.js` é o arquivo mais importante do projeto: toda regra de negócio
(evitar saldo negativo, evitar aluno duplicado, cálculo de KPIs) vive ali. Qualquer
alteração de regra de negócio deve começar por esse arquivo.

## Banco de dados

Ver detalhes completos em `docs/memory/DATABASE.md`. Resumo:

- **Banco:** Postgres gerenciado pelo Supabase, projeto `mendes-surf-house`
  (região São Paulo).
- **Tabelas principais:** `alunos`, `movimentacoes` (ledger — fonte única de
  verdade do saldo), `pacotes`, `configuracoes`.
- **Views:** `vw_saldo_alunos`, `vw_dashboard_alunos` (saldo/situação sempre
  calculados, nunca armazenados), `vw_financeiro_mensal` (preparada, ainda não
  usada pelo frontend).
- **Migrations:** não há sistema de migration formal (Prisma/Drizzle/etc.) — o
  schema foi aplicado manualmente via scripts `.sql` rodados no SQL Editor do
  Supabase. Esses scripts **não estão versionados no repositório do app** (foram
  entregues ao usuário fora do Git). Ver `docs/memory/DATABASE.md` para o schema
  completo reconstituído a partir do código.
- **Como alterar o banco:** escrever um novo script `.sql`, idempotente sempre que
  possível (`if not exists`, `if exists`), pedir pro usuário rodar no SQL Editor do
  Supabase, e **atualizar `docs/memory/DATABASE.md`** imediatamente depois.

## Fluxos principais

Ver `docs/memory/ARCHITECTURE.md` para os fluxos passo a passo. Os três fluxos
centrais:

1. **Cadastrar aluno** → opcionalmente já entra com um pacote inicial.
2. **Inserir pacote/aula avulsa** → soma aulas ao saldo do aluno (nunca substitui).
3. **Dar baixa em aula** → subtrai do saldo, bloqueado se não houver saldo suficiente.

Todos os três passam por `movimentacoes` — não existe outro caminho de escrita de
saldo no sistema.

## Regras de negócio

Ver `docs/memory/BUSINESS_RULES.md` para a lista completa (saldo nunca negativo,
duplicidade de nome bloqueada, telefone do aluno opcional com fallback pra
responsável, etc.).

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencher com as credenciais reais do Supabase
npm run dev             # abre em http://localhost:5173
```

Variáveis de ambiente necessárias (nomes apenas — ver seção Segurança):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deploy

Ver `docs/memory/DEPLOYMENT.md`. Resumo: push na branch `main` do GitHub →
Vercel builda e publica automaticamente. As mesmas duas variáveis de ambiente
precisam estar configuradas em Vercel → Project Settings → Environment Variables.

## Estado atual do projeto

Ver **`docs/memory/CURRENT_STATE.md`** — esse é o arquivo mais importante pra
retomar o desenvolvimento. Contém o que está implementado, em andamento, pendente,
problemas conhecidos e próximos passos recomendados.

---

## Instruções para futuras sessões do Claude

1. Antes de começar qualquer alteração relevante, leia este `CLAUDE.md` por completo.
2. Quando precisar de mais detalhe, consulte os arquivos em `docs/memory/`.
3. Leia `docs/memory/CURRENT_STATE.md` primeiro — ele diz exatamente onde o
   desenvolvimento parou.
4. Não assuma que a documentação está 100% atualizada; valide informações críticas
   contra o código antes de tomar decisões importantes.
5. Ao tomar uma nova decisão arquitetural importante, registre em `DECISIONS.md`.
6. Ao concluir uma funcionalidade relevante ou mudar o estado do projeto, atualize
   `CURRENT_STATE.md`.
7. Se uma mudança alterar arquitetura, banco, API ou regras de negócio, atualize
   também o arquivo correspondente em `docs/memory/`.
8. Nunca coloque senhas, tokens, API keys, secrets ou credenciais reais em nenhum
   arquivo de documentação — apenas o nome da variável de ambiente.
9. Preserve decisões existentes documentadas em `DECISIONS.md`, a menos que o
   código atual demonstre claramente que ficaram obsoletas.
10. O schema do banco vive só no Supabase (não há migrations versionadas no
    repositório) — `docs/memory/DATABASE.md` é a melhor fonte de verdade
    disponível no código, mas em caso de dúvida, confirme direto no Supabase
    (Table Editor / SQL Editor) antes de alterar algo que dependa da estrutura
    exata das tabelas.
