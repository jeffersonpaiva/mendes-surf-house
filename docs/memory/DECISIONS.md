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
