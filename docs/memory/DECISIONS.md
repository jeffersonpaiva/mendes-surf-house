# DECISIONS.md

Decisões arquiteturais importantes, registradas a partir do que é possível
concluir com segurança olhando o código e o histórico de construção do projeto.
Quando o motivo exato não pode ser determinado com confiança, isso é dito
explicitamente em vez de suposto.

---

### Decisão: migrar de Google Sheets + Apps Script para React + Supabase + Vercel

**Motivo:** a versão em planilha (Google Sheets + Apps Script) funcionava, mas o
visual dos modais (`HtmlService`) e a experiência em geral não tinham "cara de
app". A prioridade explícita do dono do produto era visual bonito e experiência
de app mobile, mais do que custo zero ou escalabilidade.

**Impacto:** todo o sistema de controle de aulas foi reconstruído do zero em
React/Supabase, preservando as mesmas regras de negócio da versão em planilha
(saldo como ledger, nunca apagar histórico, nunca saldo negativo, ID interno em
vez de nome).

**Arquivos relacionados:** projeto inteiro; a versão anterior (Apps Script) não
faz parte deste repositório.

---

### Decisão: sem backend próprio — frontend fala direto com o Supabase

**Motivo:** Supabase já fornece Postgres, Auth e uma API automática via
supabase-js. Um backend adicional (Node/Express, etc.) não teria função clara
para o tamanho e o uso interno deste projeto.

**Impacto:** toda regra de negócio que normalmente ficaria num backend está em
`src/lib/queries.js`, rodando no cliente. Segurança de acesso depende inteiramente
de RLS no Postgres, não de lógica de servidor.

**Arquivos relacionados:** `src/lib/queries.js`, `src/supabaseClient.js`.

---

### Decisão: saldo como ledger (nunca armazenado, sempre `SUM(entrada) - SUM(saida)`)

**Motivo:** evitar que o saldo do Dashboard, da view e do histórico do aluno
"dessincronizem" entre si. Se o saldo fosse uma coluna gravada, haveria risco de
uma tela mostrar um número e outra mostrar outro. Um ledger auditável elimina essa
classe de bug por construção — essa era exatamente a mesma razão dessa decisão na
versão anterior (planilha), e foi conscientemente preservada na migração.

**Impacto:** toda leitura de saldo precisa agregar `movimentacoes` (feito via
view `vw_saldo_alunos`, para não repetir a lógica de agregação em múltiplos
lugares).

**Arquivos relacionados:** `docs/memory/DATABASE.md` (view `vw_saldo_alunos`),
`src/lib/queries.js` (`fetchSaldoAluno`, `registrarMovimentacao`).

---

### Decisão: correções de saldo são uma nova movimentação (`AJUSTE`), nunca edição/exclusão

**Motivo:** preservar histórico completo e auditável — mesma razão da decisão
anterior. Não determinável com mais detalhe além disso a partir do código.

**Impacto:** não existe (e não deveria existir sem repensar essa regra) um botão
de editar ou apagar uma linha de `movimentacoes` no app.

**Arquivos relacionados:** `docs/memory/BUSINESS_RULES.md`.

---

### Decisão: `pacotes.valor` é preço sugerido; `movimentacoes.valor_pago` seria o preço real cobrado

**Motivo:** evitar que um reajuste de preço futuro altere retroativamente o valor
de vendas já registradas em relatórios financeiros.

**Impacto:** o schema já tem as colunas prontas (`pacotes.valor`,
`movimentacoes.valor_pago`, `movimentacoes.forma_pagamento`, view
`vw_financeiro_mensal`), mas **o frontend ainda não usa nenhuma delas** — não há
tela de relatório financeiro, e os modais de compra de pacote não pedem valor
pago nem forma de pagamento. Essa é uma decisão de preparar o terreno, não uma
funcionalidade implementada.

**Arquivos relacionados:** `docs/memory/DATABASE.md`, `docs/memory/CURRENT_STATE.md`.

---

### Decisão: telefone do aluno opcional, com campos separados de responsável

**Motivo:** alunos menores de idade nem sempre têm telefone próprio; o contato
real é do pai/mãe/responsável.

**Impacto:** `alunos.telefone` é nullable; existem `nome_responsavel` e
`telefone_responsavel` como campos adicionais, não um campo único sobrecarregado.

**Arquivos relacionados:** `docs/memory/DATABASE.md` (tabela `alunos`),
`src/components/ModalNovoAluno.jsx`.

---

### Decisão: RLS simples (`authenticated` = acesso total), sem diferenciação de papel ainda

**Motivo:** hoje só o administrador usa o sistema. A intenção declarada é abrir
acesso a alunos no futuro (verem o próprio saldo), mas essa política de acesso
diferenciado ainda não foi implementada.

**Impacto:** não é seguro criar login para ninguém além do próprio administrador
(ou de um professor de confiança) até que uma política de RLS mais granular seja
criada.

**Arquivos relacionados:** `docs/memory/DATABASE.md` (seção RLS),
`docs/memory/CURRENT_STATE.md` (pendências).

---

### Decisão: sem domínio próprio por enquanto

**Motivo:** manter custo zero. O domínio padrão da Vercel (`*.vercel.app`)
funciona plenamente, inclusive para instalar como PWA no celular.

**Impacto:** nenhum — é reversível a qualquer momento contratando um domínio e
configurando na Vercel.

**Arquivos relacionados:** `docs/memory/DEPLOYMENT.md`.

---

### Decisão: importação em lote via script Node standalone, não uma tela no app

**Motivo:** não determinável com certeza além do fato de que a necessidade
(importar muitos alunos de uma vez, vindos da planilha antiga) era pontual/de
migração, não uma funcionalidade recorrente do dia a dia. Um script rodado
localmente foi a solução mais rápida de entregar.

**Impacto:** a importação em massa não é uma funcionalidade do produto (não tem
UI, não é acessível pra um usuário não técnico) — é uma ferramenta de
desenvolvedor/administrador.

**Arquivos relacionados:** `scripts/importar-alunos.js`.

---

### Decisão: captação de alunos reais via Google Forms → planilha → script de importação existente (2026-08-17)

**Motivo:** o usuário quer parar de digitar manualmente nome/telefone de cada
aluno real. Em vez de digitar tudo, decidiu abrir um Google Forms no grupo
pedindo Nome completo + Telefone, e usar a planilha de respostas ligada ao
formulário como entrada do script `scripts/importar-alunos.js` que já existe.
Decisão explícita do usuário: quer **revisar as respostas antes de importar**
(não é uma importação automática/direta).

**Impacto:** nenhuma mudança de código foi necessária — o script já suporta
esse caso (aluno sem saldo inicial, saldo fica zero até o admin lançar aulas
depois manualmente). Só foi preciso alinhar convenção: as perguntas do Forms
precisam se chamar exatamente `Nome completo` e `Telefone do aluno` (viram
cabeçalho de coluna), e a aba de respostas no Google Sheets precisa ser
renomeada para `Alunos` (nome que o script procura via
`workbook.Sheets['Alunos']`). Guia completo em `docs/importacao-google-forms.md`.
Ainda não executado — o Google Forms em si não foi criado até o fim desta
sessão.

**Arquivos relacionados:** `scripts/importar-alunos.js`,
`docs/importacao-google-forms.md`, `importacao-alunos-template.xlsx` (raiz do
repo, fora do Git).

---

### Decisão: Área do Aluno com agendamento ("marcar aula") é a próxima grande frente, mas só depois de fechar as pendências do admin (2026-08-17)

**Motivo:** a pedido do usuário, foi produzido um mockup visual (não
funcional) de uma tela onde o aluno logado veria o próprio saldo e poderia
marcar horário de aula sozinho — um conceito de **agendamento futuro**,
diferente de tudo que existe hoje no sistema (hoje só existe "dar baixa em
aula", que registra uma aula já realizada, sem noção de data/horário
futuro nem de agenda/capacidade). Ao apresentar o mockup, ficou claro que
essa funcionalidade exige duas peças que ainda não existem: uma tabela nova
de agendamentos, e RLS com diferenciação de papel (pendência já conhecida,
necessária pra um login de aluno só ver/mexer nos próprios dados). O usuário,
de forma explícita, decidiu que essa é a próxima grande frente do projeto,
mas **só depois de finalizar as pendências que já estavam na fila para a tela
de admin** (editar aluno, regra de inatividade, relatório financeiro — ver
`docs/memory/CURRENT_STATE.md`).

**Impacto:** nenhum código do app foi alterado. Existe um mockup HTML
estático de referência (`docs/mockups/tela-aluno-mockup.html`, dados
fictícios, sem conexão com Supabase) que reflete a identidade visual atual do
app (mesmas variáveis de cor/fonte de `src/styles.css`) e serve de ponto de
partida visual quando essa frente for retomada. **Quando essa frente for
iniciada de fato**, será necessário: desenhar e documentar em `DATABASE.md` a
tabela de agendamentos (dia, horário, capacidade/vaga, status, vínculo com
`alunos` e possivelmente com `movimentacoes` no momento em que a aula marcada
vira aula realizada), e resolver a pendência de RLS por papel antes de
qualquer login de aluno existir de verdade.

**Arquivos relacionados:** `docs/mockups/tela-aluno-mockup.html`,
`docs/memory/CURRENT_STATE.md` (seção "Próxima grande frente"),
`docs/memory/DATABASE.md` (schema ainda não tem tabela de agendamento).
