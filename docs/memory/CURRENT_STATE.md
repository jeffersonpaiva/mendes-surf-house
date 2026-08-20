# CURRENT_STATE.md

**Leia este arquivo primeiro** ao retomar o desenvolvimento. Ele é o checkpoint
mais recente do projeto.

## Última situação conhecida

*(Atualizado em 2026-08-17, sessão de continuidade via Claude/Cowork.)*

App em produção (Vercel), banco em produção (Supabase), primeiro usuário admin
criado e testado. O aluno de teste inicial já foi removido do banco (script de
reset rodado).

**Confirmado com o usuário nesta sessão: a importação em lote dos alunos reais
ainda NÃO foi executada.** O banco de produção está sem alunos reais hoje. Isso
é a prioridade nº 1 antes de qualquer outra coisa nova — ver "Próximos passos
recomendados" abaixo.

Nesta sessão (sem alterar nenhum código do app):

1. **Preparado o caminho para a importação em lote:**
   - Gerado `importacao-alunos-template.xlsx` (salvo na raiz do repo, fora do
     Git — é dado de aluno, não deve ser versionado) com as colunas exatas que
     `scripts/importar-alunos.js` espera, aba `Instruções` explicando o
     preenchimento, e aba `Alunos` com uma linha de exemplo (que precisa ser
     apagada antes de importar de verdade).
   - Decidido, a pedido do usuário, captar Nome completo + Telefone dos alunos
     via **Google Forms** (ligado a uma planilha de respostas), em vez de o
     usuário digitar tudo manualmente. O usuário quer revisar as respostas
     antes de importar.
   - Escrito `docs/importacao-google-forms.md` com o passo a passo completo:
     nomear as perguntas do Forms exatamente como `Nome completo` e
     `Telefone do aluno` (viram cabeçalho de coluna), renomear a aba de
     respostas para `Alunos` (nome que o script procura), revisar/limpar
     linhas na planilha antes de exportar, baixar como `.xlsx` e rodar
     `node scripts/importar-alunos.js`. Alunos entram com saldo zero — o
     usuário pretende lançar as aulas de cada um manualmente depois, via
     "Inserir pacote/aula avulsa" (fluxo que já existe no app).
   - **Nada disso foi executado ainda** — é só material de apoio entregue ao
     usuário. O Google Forms em si ainda não foi criado.

2. **Mockup visual de uma futura "Área do Aluno"** (só design, não é código do
   app, não está no repositório do app): o usuário pediu uma tela no mesmo
   visual do app atual, onde o aluno logado pudesse ver saldo de aulas e
   **marcar aula** (agendar horário) sozinho. Foi entregue um mockup HTML
   estático (`docs/mockups/tela-aluno-mockup.html`, salvo no repo só como
   referência visual) com: cartão de saldo em destaque, fluxo de marcar
   aula (escolher dia/horário num bottom sheet), lista de "Próximas aulas"
   com opção de cancelar, e histórico — tudo com dados fictícios, sem conexão
   com o Supabase.
   - **Importante:** "marcar aula" (agendamento futuro) é um conceito que o
     sistema atual não tem — hoje só existe "dar baixa em aula" (admin
     registra uma aula já realizada). Implementar de verdade exigiria (a) uma
     tabela nova de agendamentos (dia, horário, vaga/capacidade, status) que
     não existe hoje em `DATABASE.md`, e (b) a pendência já conhecida de RLS
     com diferenciação de papel (pendência 5), pra um login de aluno só
     enxergar/mexer nos próprios dados.
   - **Decisão explícita do usuário: essa é a próxima grande frente do
     projeto, mas só depois de finalizar as pendências da tela de admin que
     já estavam na fila.** Ver `docs/memory/DECISIONS.md` para o registro
     completo dessa decisão de roadmap.

## Implementado

- **Autenticação:** login por e-mail/senha via Supabase Auth. Sem self-signup —
  usuários criados manualmente no painel do Supabase.
- **Dashboard:** KPIs (alunos ativos, aulas disponíveis, aulas no mês, sem aulas)
  em grid 2×2, colapsável/expansível. Busca de aluno por nome. Lista de alunos em
  cards, com badge de situação (com aulas / sem aulas).
- **Cadastro de aluno** (`ModalNovoAluno`): nome, telefone opcional,
  responsável opcional (nome + telefone), status inicial, observação, e opção de
  já entrar com um pacote/aula avulsa/personalizado.
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
  (`scripts/importar-alunos.js`) para cadastrar muitos alunos de uma vez,
  incluindo saldo inicial (como movimentação tipo `AJUSTE`).
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

0. **Rodar a importação em lote dos alunos reais** — confirmado que ainda não
   foi feita (ver "Última situação conhecida"). Material de apoio já entregue
   ao usuário (template `.xlsx` + guia de Google Forms); falta o usuário criar
   o formulário, coletar respostas e rodar `scripts/importar-alunos.js`.
1. **Abas "Alunos", "Relatórios" e "Ajustes" da navegação inferior** — hoje são
   só itens visuais em `Dashboard.jsx` (`<nav>`), sem `onClick` nem rota. Só
   "Início" é funcional.
2. **Editar dados de um aluno já cadastrado** (nome, telefone, responsável,
   status) — hoje só existe criação, não edição. Não há tela nem função em
   `queries.js` para isso.
3. **Regra automática de inatividade** — existia na versão Apps Script (aluno
   sem movimentação há N dias vira "Inativo" sozinho, parametrizado por
   `configuracoes.dias_inatividade`). Não foi portada. Hoje `status` é 100%
   manual.
4. **Tela de relatório financeiro** — o banco já tem `valor_pago`,
   `forma_pagamento` e a view `vw_financeiro_mensal` prontos, mas nenhuma tela
   consome isso, e os modais de compra de pacote não pedem esses dados ainda.
5. **RLS com diferenciação de papel** — hoje qualquer usuário autenticado tem
   acesso total. Necessário antes de abrir acesso a alunos (visão restrita ao
   próprio saldo) ou a outros papéis (ex: professor com permissões diferentes de
   admin).

## Próxima grande frente (depois das pendências acima)

**Área do Aluno com agendamento de aulas ("marcar aula").** Ver mockup em
`docs/mockups/tela-aluno-mockup.html` e a decisão de roadmap em
`docs/memory/DECISIONS.md`. Resumo: o aluno logado veria o próprio saldo e
poderia marcar horário sozinho (conceito novo, diferente de "dar baixa em
aula" que já existe). Exige tabela nova de agendamentos (não modelada ainda em
`DATABASE.md`) e a pendência 5 (RLS por papel). **Não iniciar essa frente antes
de fechar as pendências 1–4 da tela de admin** — decisão explícita do dono do
produto nesta sessão.

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
- **`node_modules` nunca foi instalado neste ambiente de geração do projeto** —
  o código foi escrito mas não houve `npm install`/build real rodado durante a
  criação (sem acesso à internet no ambiente de desenvolvimento usado). Ou seja:
  o código não foi testado num bundler de verdade antes de chegar ao usuário.
  Caso apareçam erros de build ou import na primeira execução (`npm run dev` /
  `npm run build`), comece a depuração por aí — é o ponto mais provável de falha
  não detectada ainda.

## Próximos passos recomendados

1. Importação em lote dos alunos reais ainda pendente (confirmado nesta
   sessão) — usuário vai montar o Google Forms usando `docs/importacao-google-forms.md`
   como guia; quando as respostas estiverem prontas, rodar
   `scripts/importar-alunos.js`. Perguntar ao retomar se isso já avançou.
2. Implementar edição de aluno (pendência 2) — é a lacuna mais básica hoje.
   **Usuário confirmou nesta sessão que quer focar em fechar as pendências da
   tela de admin antes de avançar na Área do Aluno/agendamento.**
3. Portar a regra de inatividade automática (pendência 3), reaproveitando o
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
