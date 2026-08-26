# CURRENT_STATE.md

**Leia este arquivo primeiro** ao retomar o desenvolvimento. Ele é o checkpoint
mais recente do projeto.

**Como o usuário retoma a conversa:** a sessão/conversa fica salva com o
nome "Continuar projeto mendes-surf-house" — quando ele voltar com essa
frase (ou "leia a memória do projeto e continue de onde paramos"), é o sinal
pra ler este arquivo inteiro e seguir a partir da última situação conhecida
abaixo, sem precisar perguntar de novo o que foi feito.

## Última situação conhecida

*(Atualizado em 2026-08-25, sessão de continuidade via Claude/Cowork.)*

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
   - `StudentActionSheet` (`QuickActionSheet.jsx`) ganhou a opção "✏️ Editar
     dados", só a partir do card do aluno.
   - `App.jsx`: novo estado `'editarAluno'` em `sheetAberto`.

2. **Botão de atualizar — implementado**, a pedido do usuário (às vezes o
   app não carregava a lista de alunos ao abrir). Ícone ⟳ no cabeçalho do
   Dashboard, ao lado do logo; chama o mesmo `recarregar()` que já existia em
   `App.jsx`, gira e fica desabilitado enquanto carrega. CSS:
   `.refresh-btn` / `.refresh-icon` / `@keyframes refresh-spin` em
   `styles.css`. **Limitação conhecida:** se o carregamento inicial travar
   antes do Dashboard renderizar (tela presa em "Carregando dados..."), esse
   botão ainda não existe nesse estado específico, porque fica dentro do
   Dashboard. Não há evidência de que é esse o cenário real relatado; se
   acontecer de novo, é um ajuste pequeno adicional.

3. **Importação em lote dos alunos reais — feita e confirmada pelo usuário.**
   O usuário preencheu manualmente o template `.xlsx` (não usou o fluxo de
   Google Forms desta vez) e enviou a planilha. Antes de gerar o arquivo
   final, dois problemas foram encontrados e corrigidos com confirmação do
   usuário: a linha de exemplo do template ainda estava presente (removida),
   e "Allison Bruno" / "Allison Bruno Couza Costa" tinham o mesmo telefone —
   confirmado que era a mesma pessoa, mantido só "Allison Bruno Couza Costa".
   Arquivo final: `importacao-alunos.xlsx` (raiz do repo, **fora do Git** —
   adicionado ao `.gitignore` porque tem nome/telefone reais). 45 alunos,
   todos com "Aulas disponíveis agora" em branco (decisão do usuário: lançar
   aulas manualmente depois, aluno por aluno, via "Inserir pacote/aula
   avulsa" — fluxo que já existia).
   - Rodar exigiu dois passos de ambiente que não estavam prontos, resolvidos
     durante a sessão: `npm install` (nunca tinha sido rodado nessa máquina —
     era um problema conhecido, registrado em "Problemas conhecidos" abaixo)
     e criar o `.env` local com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
     reais (nunca tinha sido criado; só existia o `.env.example`). O `.env` é
     gitignorado, então isso não aparece no repositório.
   - **Confirmado pelo usuário: o script rodou até o fim com sucesso, ~45
     alunos importados.** O guia de Google Forms
     (`docs/importacao-google-forms.md`) e o template vazio
     (`importacao-alunos-template.xlsx`, ainda no repo) seguem disponíveis
     caso o usuário capte novos alunos assim no futuro.

4. **Versão desktop responsiva — implementada (mesmo dia, depois do commit
   acima), ainda SEM commit do usuário.** Pedido novo do usuário: precisa
   usar o app pelo notebook, não só pelo celular. Antes de codar, foi feito
   um mockup HTML estático (`docs/mockups/mockup-desktop.html`, um único
   arquivo que troca de layout sozinho por media query — serviu pra alinhar
   o visual antes de mexer no app de verdade) e só depois, com aprovação do
   usuário, veio a implementação real:
   - **Abordagem:** um app só, um deploy só — o layout troca sozinho
     conforme a largura da tela (`≥ 860px` = desktop), sem apps separados.
     Breakpoint centralizado em `src/lib/useIsDesktop.js`
     (`DESKTOP_BREAKPOINT`), um hook que usa `window.matchMedia` e reage a
     resize.
   - **`src/components/BottomSheet.jsx`** (peça-chave): agora é responsivo —
     no mobile continua subindo como bottom sheet (como sempre foi); no
     desktop vira um diálogo centralizado (`.dialog-box`). Como todos os
     modais do app (`ModalNovoAluno`, `ModalEditarAluno`, `ModalPacote`,
     `ModalBaixaAula`, `ModalHistorico`, `QuickActionSheet`,
     `StudentActionSheet`) usam esse componente por baixo, **todos ganharam o
     comportamento desktop de graça, sem nenhum precisar ser tocado ou
     duplicado.**
   - **`src/components/DashboardDesktop.jsx`** (novo): sidebar de navegação
     fixa (só "Início" funcional, igual à nav mobile hoje), topbar com busca
     + botão de atualizar + botão "+ Nova ação" (abre o mesmo
     `QuickActionSheet` do FAB mobile), KPIs em linha, e a lista de alunos
     como **tabela** (Aluno/Telefone/Pacote/Saldo/Status) em vez de cards.
     Clicar numa linha abre o mesmo `StudentActionSheet` de sempre — que no
     desktop já aparece como diálogo centralizado.
   - **`src/App.jsx`**: novo `isDesktop = useIsDesktop()`; escolhe
     `<Dashboard>` ou `<DashboardDesktop>` conforme o modo, passando os
     mesmos props pros dois (nenhuma duplicação de estado/lógica); o wrapper
     raiz vira `.app-shell` (sem o `max-width:480px` do `.phone`) quando
     desktop.
   - **CSS novo em `styles.css`**: bloco `sidebar`/`side-nav`/`side-link`,
     `topbar`/`d-search`/`btn-primary-d`, `kpi-row`/`kpi-card`,
     `table-card`/`d-table`, `.overlay.dialog`/`.dialog-box`. Não usei
     `@media` pra essas classes de propósito — quem decide se elas existem no
     DOM é o React (via `isDesktop`), então não têm como conflitar com o CSS
     mobile mesmo sem media query.
   - **Simplificação consciente em relação ao mockup:** o mockup tinha um
     painel lateral (`detail-panel`) deslizando da direita com ações e um
     mini-resumo de saldo, construído do zero. Na implementação real, optei
     por **reaproveitar o `StudentActionSheet` já existente** (que agora
     também vira diálogo centralizado no desktop) em vez de construir um
     componente de painel novo — menos código, zero duplicação de lógica,
     mesma fonte de verdade que o mobile usa. Fica mais simples que o
     mockup, mas sem o efeito "painel lateral com saldo em destaque". Se o
     usuário achar que faz falta depois de usar, dá pra evoluir isso depois
     sem quebrar nada.
   - **Um bug pego e corrigido durante a implementação** (não chegou a subir
     quebrado): o `<nav>` da sidebar ia colidir com o seletor CSS global
     `nav{ position:fixed; ... }` (pensado só pro menu inferior do mobile) —
     troquei a sidebar pra usar `<div className="side-nav">` em vez de
     `<nav>`, evitando o conflito sem precisar tocar no CSS mobile existente.
     Também corrigi o aninhamento de `brand-name`/`brand-sub` na sidebar
     (usar `.sidebar-brand` em vez de reaproveitar `.brand`, que é
     `display:flex; justify-content:space-between` no mobile — reaproveitar
     ia empurrar "MENDES" e "SURF HOUSE" pra lados opostos em vez de
     empilhado).
   - **Ainda NÃO testado no navegador de verdade** (só sintaxe/chaves
     conferidas) **e ainda NÃO commitado pelo usuário.** Ver "Próximos passos
     recomendados" abaixo.

5. **Dar baixa em lote (colar lista do WhatsApp) — implementado, ainda SEM
   teste nem commit do usuário.** Pedido novo do usuário, mostrando como
   exemplo a lista real que circula no grupo (dia da semana, horário, um
   nome por linha, às vezes com tags como "exp"/"ONE TO ONE"/emoji). Antes
   de codar, 3 decisões foram confirmadas com o usuário:
   - **Colagem:** o admin cola só o trecho de UM dia/horário por vez (não a
     semana inteira) — mais simples e sem ambiguidade de qual bloco é
     "hoje".
   - **Nomes sem match confiável:** ficam de fora do lote automaticamente,
     com aviso no final (não trava o fluxo pedindo pra vincular manualmente
     ali na hora).
   - **Data:** o admin pode escolher a data da baixa (não é travado em
     "hoje"), pra cobrir o caso de lançar atrasado.
   - **`src/lib/matchNomes.js`** (novo): faz o parsing e o casamento de
     nomes, sem nenhuma chamada ao banco.
     `extrairNomesDaLista(texto)` remove linhas de cabeçalho (dia da semana,
     linha que começa com dígito = horário tipo "5:40"/"15:20🔒"/"6h", linha
     entre parênteses tipo instrução) e limpa tags conhecidas de cada nome
     (emoji, "(experimental)"/"exp", "ONE TO ONE"), com dedupe.
     `casarNomeComAlunos(nome, alunos)` compara por token: cada palavra do
     nome colado precisa ser prefixo de alguma palavra do nome cadastrado
     (cobre "Lyara Peres" -> "Lyara Maria Peres Ximenes"). Só considera
     match se achar exatamente 1 aluno — 0 ou mais de 1 (ambíguo) vira "não
     reconhecido", nunca arrisca a adivinhação. Testado manualmente com o
     texto de exemplo do usuário antes de integrar na tela (inclusive caso
     de ambiguidade proposital com dois "Ivo").
   - **`registrarAulaLote()`** em `queries.js` (novo): recebe uma lista de
     `alunoId`s + data + observação, chama o `registrarAula()` que já
     existia (mesma trava de saldo insuficiente) uma vez por aluno, e NÃO
     para no primeiro erro — cada aluno vira um resultado independente
     (sucesso ou motivo da falha), pra um problema pontual (ex: aluno sem
     saldo) não travar o lote inteiro.
   - **`src/components/ModalBaixaLote.jsx`** (novo): um modal só, com 3
     etapas internas (`colar` → `revisar` → `resultado`). Etapa 1: campo de
     data + textarea pra colar a lista. Etapa 2: lista com checkbox (todos
     os reconhecidos vêm pré-marcados) mostrando "nome cadastrado" +
     "nome como veio na lista" + selo "Sem saldo" se for o caso, e embaixo
     um aviso coral com os nomes não reconhecidos (incluindo o motivo:
     ambíguo entre quais alunos, ou não encontrado). Etapa 3: resumo de
     quantos deram certo/errado, com o motivo de cada falha. Reaproveita
     `BottomSheet` (então já funciona como diálogo no desktop de graça) e
     as classes de formulário existentes (`field-label`, `field-input`,
     `form-msg`, `sheet-actions`).
   - **Entrada no app:** novo item "📋 Dar baixa em lote" no menu geral
     (`QuickActionSheet`, botão flutuante "+" / "+ Nova ação" no desktop) —
     só no menu geral, não no menu de um aluno específico, porque é uma
     ação em massa. Novo estado `'baixaLote'` em `sheetAberto` no
     `App.jsx`, que passa a lista `alunos` já carregada (mesma fonte que o
     Dashboard usa) direto pro modal, sem round-trip extra ao banco.
   - **Ainda NÃO testado no navegador de verdade** (só a lógica de
     parsing/matching foi validada isoladamente com Node, fora do React) **e
     ainda NÃO commitado pelo usuário.**

**Commit/deploy:** o commit da edição de aluno + botão de atualizar +
importação (itens 1–3) e a versão desktop (item 4) — status de cada um
descrito acima. **O item 5 (baixa em lote) é código novo desta mesma sessão,
também ainda não commitado nem testado.** Arquivos pendentes de commit hoje,
somando itens 4 e 5: `src/lib/useIsDesktop.js` (novo),
`src/components/DashboardDesktop.jsx` (novo), `src/components/BottomSheet.jsx`,
`src/lib/matchNomes.js` (novo), `src/components/ModalBaixaLote.jsx` (novo),
`src/lib/queries.js`, `src/components/QuickActionSheet.jsx`, `src/App.jsx`,
`src/styles.css`. **Perguntar ao retomar se o usuário já testou (`npm run
dev`) e se já commitou** antes de assumir que a versão desktop e/ou a baixa
em lote estão em produção.

Também foi entregue nesta sessão (arquivos ainda no repo, sem código ligado
ao app): mockup visual de uma futura "Área do Aluno" com agendamento
(`docs/mockups/tela-aluno-mockup.html`) — ver "Próxima grande frente" abaixo.
O mockup do desktop (`docs/mockups/mockup-desktop.html`) também segue no
repo como referência visual, mesmo já tendo virado código de verdade.

## Implementado

- **Dar baixa em lote** (`ModalBaixaLote`, pelo menu geral "+"): cola a lista
  de um dia/horário do WhatsApp, o sistema casa cada nome com um aluno
  cadastrado (`src/lib/matchNomes.js`), o admin confirma por checkbox e
  escolhe a data, e só então lança 1 aula de baixa por aluno confirmado
  (`registrarAulaLote` em `queries.js`). Nomes sem match confiável ficam de
  fora com aviso, nunca são adivinhados. **Ainda sem teste no navegador.**
- **Autenticação:** login por e-mail/senha via Supabase Auth. Sem self-signup —
  usuários criados manualmente no painel do Supabase.
- **Dashboard:** KPIs (alunos ativos, aulas disponíveis, aulas no mês, sem aulas)
  em grid 2×2, colapsável/expansível. Busca de aluno por nome. Lista de alunos em
  cards, com badge de situação (com aulas / sem aulas). Botão de atualizar
  (ícone ⟳) no cabeçalho.
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
- **Histórico do aluno** (`ModalHistorico`): lista completa de movimentações,
  mais recente primeiro.
- **Regras de saldo:** nunca negativo (validado no frontend E no banco via
  trigger), pacotes somam ao saldo existente, histórico nunca é apagado.
- **PWA:** instalável na tela do celular, ícones gerados a partir do logo da
  marca, cores de tema configuradas.
- **Deploy automático:** GitHub → Vercel a cada push em `main`.
- **Importação em lote:** template Excel + script Node
  (`scripts/importar-alunos.js`), usado com sucesso em 2026-08-25 pra
  cadastrar os ~45 alunos reais da escola (saldo inicial zero neste caso —
  o script também suporta saldo inicial > 0 via movimentação `AJUSTE`).
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

1. **Abas "Alunos", "Relatórios" e "Ajustes" da navegação inferior** — hoje são
   só itens visuais em `Dashboard.jsx` (`<nav>`), sem `onClick` nem rota. Só
   "Início" é funcional.
2. **Regra automática de inatividade** — existia na versão Apps Script (aluno
   sem movimentação há N dias vira "Inativo" sozinho, parametrizado por
   `configuracoes.dias_inatividade`). Não foi portada. Hoje `status` é 100%
   manual (inclusive pelo `ModalEditarAluno`).
3. **Tela de relatório financeiro** — o banco já tem `valor_pago`,
   `forma_pagamento` e a view `vw_financeiro_mensal` prontos, mas nenhuma tela
   consome isso, e os modais de compra de pacote não pedem esses dados ainda.
4. **RLS com diferenciação de papel** — hoje qualquer usuário autenticado tem
   acesso total. Necessário antes de abrir acesso a alunos (visão restrita ao
   próprio saldo) ou a outros papéis (ex: professor com permissões diferentes de
   admin).

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
- **RLS permissiva.** Qualquer login autenticado tem acesso total de
  leitura/escrita a todas as tabelas — não há como hoje dar a alguém um acesso
  "só leitura" ou "só os próprios dados".
- **Sem testes automatizados.** Não há suíte de testes no projeto — validação é
  manual.
- **`node_modules` e `.env` locais: resolvido em 2026-08-25.** Antes disso o
  `node_modules` nunca tinha sido instalado nem o `.env` criado na máquina do
  usuário — se ele configurar um ambiente novo (outra máquina, reinstalação),
  vai precisar repetir `npm install` e recriar o `.env` a partir do
  `.env.example` com as credenciais reais do Supabase.
- **Editar aluno e botão de atualizar ainda não foram vistos rodando no
  navegador de verdade** — só a lógica foi revisada. Testar o fluxo completo
  (`npm run dev`, abrir um aluno, editar, salvar; clicar no botão de
  atualizar) é o próximo passo de verificação recomendado.

## Próximos passos recomendados

1. Testar de verdade no navegador (`npm run dev`): editar aluno, botão de
   atualizar, versão desktop (redimensionar a janela ou abrir no notebook) e
   dar baixa em lote (colar uma lista real do WhatsApp e ver se reconhece os
   alunos certos). Nenhum desses foi visto rodando ainda, só revisados no
   código.
2. Conferir no Dashboard que os ~45 alunos importados aparecem certos (nome,
   telefone, status "Ativo", saldo zero) antes de começar a lançar as aulas
   de cada um manualmente.
3. Portar a regra de inatividade automática (pendência 2), reaproveitando o
   parâmetro `configuracoes.dias_inatividade` que já existe no banco.
4. Construir a aba "Relatórios" consumindo `vw_financeiro_mensal`, e adicionar
   os campos de valor pago/forma de pagamento nos modais de compra de pacote,
   ativando de fato o controle financeiro que já está preparado no schema.
5. Só depois disso, avaliar RLS com diferenciação de papel, se/quando o projeto
   avançar para dar acesso a alunos.
6. **Só então** iniciar a Área do Aluno com agendamento ("marcar aula"), usando
   o mockup em `docs/mockups/tela-aluno-mockup.html` como ponto de partida
   visual — vai exigir desenhar a tabela de agendamentos do zero (não existe
   ainda em `DATABASE.md`).

## Arquivos relacionados ao trabalho atual

Para continuar o desenvolvimento, leia nesta ordem:
1. `CLAUDE.md` (raiz do projeto) — visão geral.
2. Este arquivo (`CURRENT_STATE.md`).
3. `src/lib/queries.js` — toda a lógica de negócio do frontend.
4. `src/App.jsx` — como as telas/modais se conectam.
5. `docs/memory/DATABASE.md` — schema, antes de qualquer mudança que toque no
   banco.
6. `docs/memory/BUSINESS_RULES.md` — antes de mudar qualquer regra de saldo,
   duplicidade, ou histórico.
