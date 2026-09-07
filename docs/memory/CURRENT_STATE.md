# CURRENT_STATE.md

**Leia este arquivo primeiro** ao retomar o desenvolvimento. Ele é o checkpoint
mais recente do projeto — a seção "Última situação conhecida" começa pela
sessão mais recente.

**Como o usuário retoma a conversa:** a sessão/conversa fica salva com o
nome "Continuar projeto mendes-surf-house" — quando ele voltar com essa
frase (ou "leia a memória do projeto e continue de onde paramos"), é o sinal
pra ler este arquivo inteiro e seguir a partir da última situação conhecida
abaixo, sem precisar perguntar de novo o que foi feito.

## Última situação conhecida

### Sessão 2026-09-07 (mais recente)

*(Via Cowork, ligada por device bridge à máquina do usuário — todos os
arquivos validados aqui — sintaxe + bundle completo via `esbuild` no
sandbox, incluindo resolução de todos os imports do app — e escritos direto
no repo local via `device_commit_files`. NÃO testado no navegador de
verdade nesta sessão, e o script SQL abaixo **ainda não foi rodado no
Supabase** — ver "Próximos passos".)*

**Tela "Vendas" (controle de venda das camisas da surf trip) — implementada,
a partir de uma especificação detalhada dada pelo usuário.** Junto veio a
primeira diferenciação de papel de usuário do projeto (admin vs. vendedor),
porque o pedido explícito era um login que só acessa essa tela.

1. **Novo papel de usuário "vendedor", restrito à tela Vendas — implementado
   via RLS de verdade, não só UI.** Nova tabela `usuarios_perfis` (papel por
   usuário, todo mundo que já tinha login virou `admin` automaticamente) +
   função `fn_papel_atual()` + as policies de `alunos`/`movimentacoes`/
   `pacotes`/`configuracoes` foram reescritas exigindo `papel = 'admin'`.
   `App.jsx` lê o papel (`fetchMeuPapel()`) e força `tela = 'vendas'` pra
   quem for vendedor; `Dashboard.jsx`/`DashboardDesktop.jsx` escondem
   nav/FAB/KPIs que não fazem sentido pra esse papel. Ver decisão em
   `DECISIONS.md` e detalhes em `DATABASE.md`/`BUSINESS_RULES.md`.
2. **Tela "Vendas" — implementada**, no lugar do antigo item "Relatórios" da
   nav (que nunca teve `onClick`) — ícone novo `IconShirt`. Nova tabela
   `pedidos_camisas` (sem view, cada linha já é o pedido completo).
   - **`src/components/VendasGrid.jsx`** (novo): mesmo padrão visual/técnico
     de `AlunosGrid.jsx` (grid de cards, busca, botão "Filtros" com
     modalidade/status, `usePaginatedQuery` + `PEDIDOS_LISTA_CONFIG`,
     24 por vez) — mas totalmente autocontida (FAB "+" e modal próprios,
     não passa pelo `sheetAberto` de `App.jsx`, diferente de Alunos).
   - **`src/components/ModalPedidoCamisa.jsx`** (novo): um único componente
     pra criar E editar (diferente do padrão separado Novo/Editar de Aluno
     — aqui os campos são idênticos nos dois modos, ver decisão em
     `DECISIONS.md`). Campos: cliente, modelo (Surf Trip/WSL Pipa), cor
     (Branco/Marrom/Azul/Preto), tamanho (P/M/G), tipo (Venda/Staff),
     modalidade (Encomenda/Pronta entrega — decide o preço sugerido),
     forma de pagamento (Pix/Crédito/Débito/Staff), desconto (R$, opcional),
     "cliente já recebeu a camisa" (checkbox) e observação. Preço nunca é
     digitado livre: é sempre `PRECO_CAMISA[modalidade] − desconto`, exibido
     como texto.
   - "Pronta entrega" nasce com `entregue = true` (vendida e entregue no dia
     da viagem); "Encomenda" nasce pendente. Editável em qualquer direção
     depois — é assim que o admin/vendedor acompanha quais encomendas ainda
     faltam entregar (pedido do usuário: "após o cliente receber, a gente
     ter noção que já entregou").
3. **`src/lib/queries.js`**: `fetchMeuPapel()`, `PRECO_CAMISA`,
   `PEDIDOS_LISTA_CONFIG`, `criarPedidoCamisa()`, `editarPedidoCamisa()`.
4. **`scripts/sql/2026-09-07-vendas-camisas.sql`** (novo) — cria
   `usuarios_perfis`, `fn_papel_atual()`, `pedidos_camisas` (+ índices de
   busca/paginação) e reescreve as policies de RLS das 4 tabelas antigas.
   **Precisa ser rodado no SQL Editor do Supabase** antes de qualquer coisa
   disto funcionar em produção — instruções de como criar o login do
   vendedor (Authentication → Users + um `insert` em `usuarios_perfis`)
   estão no topo do próprio script.

**Commit/deploy:** arquivos escritos diretamente no repositório local do
usuário via `device_commit_files`, um a um. **Não confirmado nesta sessão**
se o usuário já deu commit/push (ver sessão 2026-08-27, mesmo padrão) nem se
já rodou o script SQL — perguntar ao retomar antes de assumir que a tela
Vendas funciona em produção.

### Sessão 2026-08-27

*(Sessão longa, via Claude/Cowork, ligada por device bridge à máquina do
usuário — arquivos editados/validados aqui e escritos direto no repo local
do usuário via `device_commit_files`, um a um, confirmados a cada passo.)*

1. **Importação de uma segunda planilha de alunos — feita e confirmada.**
   Antes de rodar, foi explicado ao usuário que o script (`importar-alunos.js`)
   já ignora duplicados (checa por nome via `.ilike` antes de inserir), então
   é seguro rodar mais de uma vez. Na primeira tentativa deu "0 aluno(s)
   importado(s), 0 erro(s)" — causa raiz: a célula A1 da planilha estava `.`
   em vez de `Nome completo`, então toda coluna `nome` lia vazio e a linha
   inteira era pulada silenciosamente (sem log de erro). Corrigido
   diretamente na célula do `.xlsx` do usuário (via script, não é código do
   repo) e confirmado pelo usuário que rodou certo depois ("Deu certo").

2. **Modais: parar de fechar ao clicar fora + botão X explícito —
   implementado.** `src/components/BottomSheet.jsx` (o wrapper usado por
   *todos* os modais do app) parou de fechar no clique no fundo escuro e
   ganhou um botão de fechar (X) fixo no canto — como todo modal já passava
   por esse componente, nenhum modal individual precisou ser tocado.

3. **Ícones: emoji → SVG profissional, em todo o app — implementado.** Novo
   arquivo `src/components/Icons.jsx` (ícones de linha, `viewBox 0 0 24 24`,
   `stroke=currentColor`, sem lib externa) substituindo todos os emojis
   usados como ícone (nav, ações dos modais, busca, etc.), incluindo o ícone
   de "Início" (pedido específico do usuário).

4. **Paginação por cursor (keyset), 20 por vez, em todas as listas —
   implementado**, a partir de uma especificação detalhada dada pelo
   usuário (server-side, `ilike` case-insensitive batendo no banco inteiro,
   debounce, ordenação determinística, índices, solução reutilizável).
   - **`src/lib/usePaginatedQuery.js`** (novo): hook genérico reutilizável —
     ver `docs/memory/ARCHITECTURE.md`, seção "2.1 Paginação por cursor",
     pra o contrato completo. Usado por três listas: Início, histórico do
     aluno (`ModalHistorico`) e o grid novo da tela Alunos (item 5 abaixo).
   - KPIs do topo do Dashboard movidos pro banco: nova função RPC
     `fn_dashboard_kpis()`, chamada por `fetchDashboardKpis()` — antes o
     frontend baixava a tabela `alunos` inteira só pra somar/contar
     (`fetchDashboard()` + `fetchAulasNoMes()` + `calcularKpis()`, todas
     removidas de `queries.js`).
   - `fetchHistoricoAluno()` também foi removida (substituída pelo hook +
     `HISTORICO_LISTA_CONFIG`). `fetchRosterParaLote()` (nova) continua
     buscando a lista **inteira**, sem paginação, só pra "Dar baixa em
     lote" casar nomes do WhatsApp — exceção documentada de propósito, não
     é esquecimento.
   - **Índices + a função RPC** ficam em
     `scripts/sql/2026-08-27-paginacao-indices-kpis.sql` — **precisa ser
     rodado no SQL Editor do Supabase** pra tudo isso funcionar em
     produção. **Não está confirmado nesta sessão se o usuário já rodou** —
     perguntar ao retomar, antes de assumir que Início/Alunos/Histórico
     estão performáticos em produção (sem os índices, funcionam mas
     lentamente; sem a função RPC, os KPIs do topo quebram).

5. **Tela "Alunos" nova (nav antes só decorativa) — implementada e
   aprovada pelo usuário após algumas rodadas de ajuste visual.**
   - **`src/components/AlunosGrid.jsx`** (novo): grid de cards responsivo
     (mobile e desktop com o mesmo componente), busca por nome + um botão
     "Filtros" único ao lado da busca (em vez de chips), que abre um
     `BottomSheet` com dois `<select>` (Status, Situação) e "Limpar
     filtros"/"Aplicar" — edição em rascunho, só aplica de fato no
     "Aplicar". Card clicável abre o mesmo `StudentActionSheet` de sempre.
   - Cada card mostra `saldo/total_adquirido` aulas (ex. "3/10 aulas") com
     uma barra de progresso proporcional — usando colunas que já existiam
     em `vw_dashboard_alunos`, sem precisar de SQL novo.
   - `App.jsx` ganhou estado `tela` (`'inicio' | 'alunos'`), passado pra
     `Dashboard.jsx`/`DashboardDesktop.jsx`, que agora têm nav/sidebar
     clicável de verdade alternando entre a lista da Início e este grid.
   - **Iterações visuais até aprovação** (histórico útil se algo parecido
     surgir de novo): grid começou como CSS Grid simples
     (`auto-fill, minmax(230px,1fr)`) → usuário reportou vão vazio na
     última linha incompleta → virou flexbox com `flex-grow` → usuário
     reportou cards com tamanhos diferentes entre linhas ("desorganizado")
     → virou CSS Grid de novo, cards largura fixa (sem esticar) → usuário
     reportou grid desalinhado da barra de busca (faltava margem lateral
     igual) → corrigido → usuário reportou espaço sobrando à direita numa
     linha cheia → **solução final:** CSS Grid com
     `grid-template-columns: repeat(auto-fill, minmax(230px, 1fr))` (não
     flexbox) — como as colunas são compartilhadas por todo o grid (não por
     linha, diferente de flex), todo card fica do mesmo tamanho em
     qualquer linha, *e* uma linha cheia estica pra preencher 100% da
     largura, sem vão. Usuário confirmou: "agora sim, deu certo!".
   - **Ajuste fino feito pelo próprio usuário, direto no arquivo** (fora
     desta sessão, avisado no chat): `pageSize` do grid mudou de 20 pra
     **24** em `AlunosGrid.jsx` (`usePaginatedQuery({ ...ALUNOS_LISTA_CONFIG,
     pageSize: 24, ... })`) — diferente das outras listas (20), intencional,
     não é bug a corrigir. Já refletido em `ARCHITECTURE.md`/`DATABASE.md`.

**Commit/deploy:** diferente da sessão de 2026-08-25 (que ficou com vários
arquivos pendentes de commit manual), nesta sessão cada arquivo alterado foi
escrito **diretamente no repositório local do usuário** via device bridge
(`device_commit_files`), um a um, confirmado sem conflito a cada passo. As
capturas de tela que o usuário mandou durante a sessão já mostravam o site
em produção (`mendes-surf-house.vercel.app`) refletindo as mudanças, então o
usuário aparenta estar dando `git commit`/push (ou commitando via GitHub
Desktop, como fez em sessões anteriores) por conta própria conforme os
arquivos chegam — **mas isso não foi confirmado explicitamente nesta
sessão.** Ao retomar, vale confirmar que o estado do Git local bate com o
que foi escrito aqui (em especial o ajuste manual de `pageSize` do item 5,
feito pelo usuário fora desta sessão) antes de assumir que está tudo
commitado/deployado.

### Sessão anterior (2026-08-25)

**App em produção com alunos reais.** Nesta sessão foram fechadas três coisas
de uma vez: a edição de aluno, um botão de atualizar no Dashboard, e a
importação em lote dos alunos reais — as três já commitadas (via GitHub
Desktop, pelo usuário), com push confirmado e deploy novo confirmado no
Vercel.

1. **Editar aluno (pendência antiga) — implementado.**
   - `editarAluno()` em `src/lib/queries.js`: atualiza nome, telefone,
     responsável (nome/telefone) e status de um aluno já cadastrado. Mesma
     regra de nome duplicado de `criarAluno()` (case/espaço-insensível), mas
     ignorando o próprio registro na checagem. Nunca mexe em
     saldo/movimentações, só em dados cadastrais.
   - `src/components/ModalEditarAluno.jsx` (novo): bottom sheet igual ao
     `ModalNovoAluno.jsx`, pré-preenchido com os dados atuais do aluno, sem a
     parte de pacote inicial.
   - `StudentActionSheet` (`QuickActionSheet.jsx`) ganhou a opção "Editar
     dados", só a partir do card do aluno.
   - `App.jsx`: novo estado `'editarAluno'` em `sheetAberto`.

2. **Botão de atualizar — implementado**, a pedido do usuário (às vezes o
   app não carregava a lista de alunos ao abrir). Ícone de refresh no
   cabeçalho do Dashboard, ao lado do logo; chama o mesmo `recarregar()` que
   já existia em `App.jsx`, gira e fica desabilitado enquanto carrega. CSS:
   `.refresh-btn` / `.refresh-icon` / `@keyframes refresh-spin` em
   `styles.css`.

3. **Importação em lote dos alunos reais — feita e confirmada pelo usuário.**
   O usuário preencheu manualmente o template `.xlsx` (não usou o fluxo de
   Google Forms desta vez) e enviou a planilha. Arquivo final:
   `importacao-alunos.xlsx` (raiz do repo, **fora do Git** — adicionado ao
   `.gitignore` porque tem nome/telefone reais). 45 alunos importados com
   sucesso, todos com saldo inicial zero (decisão do usuário: lançar aulas
   manualmente depois, aluno por aluno).

4. **Versão desktop responsiva — implementada.** Um app só, um deploy só —
   o layout troca sozinho conforme a largura da tela (`≥ 860px` = desktop,
   `src/lib/useIsDesktop.js`). `BottomSheet.jsx` ganhou o modo diálogo
   centralizado no desktop (todos os modais herdaram de graça).
   `DashboardDesktop.jsx` (novo): sidebar, topbar, KPIs em linha, lista de
   alunos como tabela.

5. **Dar baixa em lote (colar lista do WhatsApp) — implementado.**
   `src/lib/matchNomes.js` (parsing + casamento de nomes, por token/prefixo,
   só confirma match se for exatamente 1 candidato). `registrarAulaLote()`
   em `queries.js`. `ModalBaixaLote.jsx` (3 etapas: colar → revisar →
   resultado). Entrada pelo menu geral "+".

Também foi entregue nesta sessão (arquivos ainda no repo, sem código ligado
ao app): mockup visual de uma futura "Área do Aluno" com agendamento
(`docs/mockups/tela-aluno-mockup.html`) — ver "Próxima grande frente" abaixo.
O mockup do desktop (`docs/mockups/mockup-desktop.html`) também segue no
repo como referência visual, mesmo já tendo virado código de verdade.

## Implementado

- **Navegação com três telas reais:** "Início" (lista/tabela de alunos,
  paginada, com KPIs), "Alunos" (grid de cards com busca + filtros —
  `AlunosGrid.jsx`) e "Vendas" (grid de pedidos de camisa da surf trip —
  `VendasGrid.jsx`, 2026-09-07, no lugar do antigo item "Relatórios").
  "Ajustes" ainda é só item visual.
- **Papel de usuário (`admin` | `vendedor`, 2026-09-07):** vendedor só
  acessa a tela Vendas — bloqueado por RLS de verdade nas outras tabelas,
  não só escondido na UI. Ver `usuarios_perfis`/`fn_papel_atual()` em
  `DATABASE.md` e a decisão em `DECISIONS.md`.
- **Vendas de camisa da surf trip (`VendasGrid.jsx` +
  `ModalPedidoCamisa.jsx`, 2026-09-07):** registra pedido (cliente, modelo,
  cor, tamanho, tipo Venda/Staff, encomenda ou pronta entrega, forma de
  pagamento, desconto opcional), preço calculado automaticamente pela
  modalidade (R$120/R$150 − desconto), acompanha se o cliente já recebeu a
  camisa (editável a qualquer momento). Ver `BUSINESS_RULES.md`.
- **Paginação por cursor (keyset)** em todas as listas navegáveis (Início,
  Alunos, Histórico de um aluno), busca/filtro batendo direto no banco
  inteiro, com hook reutilizável `usePaginatedQuery.js` — ver
  `docs/memory/ARCHITECTURE.md`. KPIs do Dashboard calculados no Postgres
  via RPC (`fn_dashboard_kpis`).
- **Modais:** um único wrapper (`BottomSheet.jsx`) usado por todos — bottom
  sheet no mobile, diálogo centralizado no desktop, sempre com botão X,
  nunca fecha ao clicar fora.
- **Ícones:** SVGs de linha próprios (`Icons.jsx`), sem emoji e sem lib
  externa, em todo o app.
- **Dar baixa em lote** (`ModalBaixaLote`, pelo menu geral "+"): cola a lista
  de um dia/horário do WhatsApp, o sistema casa cada nome com um aluno
  cadastrado (`src/lib/matchNomes.js`), o admin confirma por checkbox e
  escolhe a data, e só então lança 1 aula de baixa por aluno confirmado
  (`registrarAulaLote` em `queries.js`). Nomes sem match confiável ficam de
  fora com aviso, nunca são adivinhados.
- **Autenticação:** login por e-mail/senha via Supabase Auth. Sem self-signup —
  usuários criados manualmente no painel do Supabase.
- **Dashboard (tela Início):** KPIs (alunos ativos, aulas disponíveis, aulas no
  mês, sem aulas) em grid 2×2, colapsável/expansível. Busca de aluno por nome.
  Lista de alunos paginada, com badge de situação (com aulas / sem aulas).
  Botão de atualizar no cabeçalho.
- **Cadastro de aluno** (`ModalNovoAluno`): nome, telefone opcional,
  responsável opcional (nome + telefone), status inicial, observação, e opção de
  já entrar com um pacote/aula avulsa/personalizado.
- **Editar dados de um aluno** (`ModalEditarAluno`, pelo menu do card do
  aluno): nome, telefone, responsável, status. Mesma regra de nome duplicado
  do cadastro. Não mexe em saldo/pacotes.
- **Inserir pacote/aula avulsa** (`ModalPacote`): dropdown agrupado por categoria
  (Nacional/Internacional/One to One/Avulso) + opção Personalizado/Recorrente.
  Funciona tanto a partir do card de um aluno quanto do botão flutuante geral
  (com seletor de aluno nesse caso).
- **Dar baixa em aula** (`ModalBaixaAula`): mesma lógica de aluno pré-selecionado
  ou escolhido no modal. Bloqueia se a quantidade exceder o saldo disponível,
  mostrando o saldo atual antes de confirmar.
- **Histórico do aluno** (`ModalHistorico`): movimentações paginadas, mais
  recente primeiro.
- **Regras de saldo:** nunca negativo (validado no frontend E no banco via
  trigger), pacotes somam ao saldo existente, histórico nunca é apagado.
- **PWA:** instalável na tela do celular, ícones gerados a partir do logo da
  marca, cores de tema configuradas.
- **Deploy automático:** GitHub → Vercel a cada push em `main`.
- **Importação em lote:** template Excel + script Node
  (`scripts/importar-alunos.js`), usado com sucesso pra cadastrar os alunos
  reais da escola em duas levas (2026-08-25 e 2026-08-27).
- **Schema financeiro preparado no banco** (não usado pelo frontend ainda):
  colunas `pacotes.valor`, `movimentacoes.valor_pago`,
  `movimentacoes.forma_pagamento`, view `vw_financeiro_mensal`.
- **Catálogo de pacotes com preços reais** carregado no banco (10 pacotes/planos,
  4 categorias).

## Em andamento / parcialmente implementado

- **Nada está "pela metade" no código atual** — tudo que existe em
  `src/components/` está funcional e ligado. As lacunas abaixo (seção
  Pendências) são funcionalidades ainda não iniciadas, não código quebrado.

## Pendências conhecidas

Em ordem aproximada do que foi discutido como prioridade:

1. **Aba "Ajustes" da navegação** — ainda é só item visual em
   `Dashboard.jsx`/`DashboardDesktop.jsx`, sem `onClick` nem conteúdo.
   ("Alunos" foi implementada em 2026-08-27; "Vendas" tomou o lugar de
   "Relatórios" em 2026-09-07 — nenhuma das duas é mais pendência, mas
   "relatório financeiro" de verdade, ver item 3 abaixo, ainda é.)
2. **Regra automática de inatividade** — existia na versão Apps Script (aluno
   sem movimentação há N dias vira "Inativo" sozinho, parametrizado por
   `configuracoes.dias_inatividade`). Não foi portada. Hoje `status` é 100%
   manual (inclusive pelo `ModalEditarAluno`).
3. **Tela de relatório financeiro** — o banco já tem `valor_pago`,
   `forma_pagamento` e a view `vw_financeiro_mensal` prontos, mas nenhuma tela
   consome isso, e os modais de compra de pacote não pedem esses dados ainda.
   (Não confundir com a tela "Vendas" nova — é financeiro de *pacotes de
   aula*, não das camisas da surf trip.)
4. **RLS com diferenciação de papel mais fina (por linha, não só por
   papel)** — 2026-09-07 já implementou uma primeira diferenciação
   (`admin` vs. `vendedor`, ver `usuarios_perfis`/`fn_papel_atual()` em
   `DATABASE.md`), suficiente pro caso "vendedor só vê Vendas". Ainda falta
   pra abrir acesso a **alunos** (cada um vendo só o próprio saldo — isso é
   RLS por linha, não por papel/tabela inteira como o que existe hoje) ou a
   outros papéis com visão parcial (ex: professor).

## Próxima grande frente (depois das pendências acima)

**Área do Aluno com agendamento de aulas ("marcar aula").** Ver mockup em
`docs/mockups/tela-aluno-mockup.html` e a decisão de roadmap em
`docs/memory/DECISIONS.md`. Resumo: o aluno logado veria o próprio saldo e
poderia marcar horário sozinho (conceito novo, diferente de "dar baixa em
aula" que já existe). Exige tabela nova de agendamentos (não modelada ainda em
`DATABASE.md`) e a pendência 4 (RLS por papel). **Não iniciar essa frente
antes de fechar as pendências acima da tela de admin** — decisão explícita do
dono do produto.

## Problemas conhecidos / pontos frágeis

- **Sem sistema de migration para o banco.** Todo o schema foi aplicado via
  scripts `.sql` avulsos, rodados manualmente no SQL Editor do Supabase, fora do
  Git. Risco: `docs/memory/DATABASE.md` pode ficar dessincronizado do banco real
  se alguém alterar o schema direto no Supabase sem atualizar a documentação.
  Antes de qualquer alteração estrutural, vale conferir o estado real das
  tabelas no Supabase.
- **`scripts/sql/2026-08-27-paginacao-indices-kpis.sql`: status de execução
  não confirmado.** Cria os índices de performance da busca/paginação e a
  função RPC dos KPIs do Dashboard. Sem rodar, o app funciona mas mais lento
  (busca vira sequential scan) e os KPIs do topo quebram (função RPC não
  existe). **Perguntar ao usuário ao retomar se já rodou.**
- **`scripts/sql/2026-09-07-vendas-camisas.sql`: status de execução não
  confirmado (script novo desta sessão).** Sem rodar, a tela Vendas quebra
  por completo (tabela `pedidos_camisas` não existe) e nenhum login de
  vendedor pode ser criado (tabela `usuarios_perfis` não existe). **Mais
  crítico ainda:** enquanto não rodar, as policies de RLS de
  `alunos`/`movimentacoes`/`pacotes`/`configuracoes` continuam na versão
  antiga (permissiva) — ou seja, a restrição do papel "vendedor" só passa a
  valer de verdade depois de rodar este script. **Perguntar ao usuário ao
  retomar se já rodou, antes de considerar seguro criar um login de
  vendedor.**
- **RLS ainda não tem diferenciação por linha.** Desde 2026-09-07 existe
  diferenciação por papel (admin vs. vendedor, ver acima), mas não por linha
  — não há como hoje dar a um aluno acesso "só aos próprios dados", por
  exemplo.
- **Sem testes automatizados.** Não há suíte de testes no projeto — validação é
  manual (e, nesta e na sessão anterior, validação de sintaxe/bundle via
  `esbuild` antes de cada commit, feita pelo Claude, mas sem rodar o app de
  verdade no navegador).
- **"3/10 aulas" no card da tela Alunos é lifetime, não "do pacote atual".**
  `total_adquirido` soma **todas** as compras históricas do aluno, não só o
  último pacote. Pra quem só teve um pacote na vida o número bate certinho;
  pra quem já comprou mais de um pacote ao longo do tempo, o "total" reflete
  a soma de tudo. Avisado ao usuário; não é considerado bug, mas vale
  reavaliar se incomodar no uso real.

## Próximos passos recomendados

1. **Rodar `scripts/sql/2026-09-07-vendas-camisas.sql` no Supabase** (se
   ainda não rodou — ver "Problemas conhecidos" acima) — sem isso a tela
   Vendas não funciona e a restrição do papel vendedor não está em vigor.
   Também confirmar se `scripts/sql/2026-08-27-paginacao-indices-kpis.sql`
   (sessão anterior) já foi rodado.
2. Testar de verdade no navegador (`npm run dev` ou direto em produção):
   a tela Vendas inteira (criar pedido, editar, marcar como entregue,
   filtros), e como admin de sempre: paginação/busca/filtros nas listas de
   sempre (Início, Alunos, Histórico), dar baixa em lote, versão desktop
   redimensionando a janela — confirmar que nada quebrou com a mudança de
   RLS.
3. **Criar o login do vendedor e testar com ele de verdade** (criar em
   Authentication → Users, rodar o `insert` em `usuarios_perfis` com
   `papel = 'vendedor'` — instruções no topo do script SQL): confirmar que
   ele só vê a tela Vendas e que tentar acessar alunos/pacotes de outra
   forma (ex: trocando URL, se existisse rota) realmente falha por RLS.
4. Portar a regra de inatividade automática (pendência 2), reaproveitando o
   parâmetro `configuracoes.dias_inatividade` que já existe no banco.
5. Construir o relatório financeiro de pacotes consumindo
   `vw_financeiro_mensal`, e adicionar os campos de valor pago/forma de
   pagamento nos modais de compra de pacote, ativando de fato o controle
   financeiro que já está preparado no schema (pendência 3 — diferente da
   tela Vendas, que já tem seu próprio controle de valor/pagamento).
6. Avaliar RLS por linha (não só por papel) se/quando o projeto avançar
   para dar acesso a alunos.
7. **Só então** iniciar a Área do Aluno com agendamento ("marcar aula"), usando
   o mockup em `docs/mockups/tela-aluno-mockup.html` como ponto de partida
   visual — vai exigir desenhar a tabela de agendamentos do zero (não existe
   ainda em `DATABASE.md`).

## Arquivos relacionados ao trabalho atual

Para continuar o desenvolvimento, leia nesta ordem:
1. `CLAUDE.md` (raiz do projeto) — visão geral.
2. Este arquivo (`CURRENT_STATE.md`).
3. `src/lib/queries.js` — toda a lógica de negócio do frontend.
4. `src/lib/usePaginatedQuery.js` — hook genérico de paginação por cursor,
   usado por Início, Alunos e Histórico.
5. `src/App.jsx` — como as telas/modais se conectam, incluindo o estado
   `tela` (Início/Alunos/Vendas) e a leitura do papel do usuário.
6. `src/components/AlunosGrid.jsx` — tela "Alunos" (grid + filtros).
7. `src/components/VendasGrid.jsx` + `src/components/ModalPedidoCamisa.jsx`
   — tela "Vendas" (grid + modal de criar/editar pedido).
8. `docs/memory/DATABASE.md` — schema, antes de qualquer mudança que toque no
   banco (inclui a seção "Paginação, índices e KPIs" e a seção RLS
   atualizada com `usuarios_perfis`/`fn_papel_atual()`).
9. `docs/memory/ARCHITECTURE.md` — inclui a seção "2.1 Paginação por cursor
   (keyset)" e a seção "9. Papel do usuário e tela Vendas".
10. `docs/memory/BUSINESS_RULES.md` — antes de mudar qualquer regra de saldo,
    duplicidade, histórico, preço/desconto de camisa, ou autorização.
