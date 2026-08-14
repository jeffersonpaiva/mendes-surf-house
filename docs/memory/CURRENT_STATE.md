# CURRENT_STATE.md

**Leia este arquivo primeiro** ao retomar o desenvolvimento. Ele é o checkpoint
mais recente do projeto.

## Última situação conhecida

App em produção (Vercel), banco em produção (Supabase), primeiro usuário admin
criado e testado. O aluno de teste inicial já foi removido do banco (script de
reset rodado). O próximo passo natural era popular o banco com os alunos reais,
via importação em lote (Excel + `scripts/importar-alunos.js`) — **confirmar com o
usuário se essa importação já foi executada** antes de assumir que o banco tem
alunos reais ou está vazio.

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
6. **Confirmar se a importação em lote dos alunos reais já foi executada** — ver
   "Última situação conhecida" acima.

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

1. Confirmar com o usuário se a importação em lote dos alunos reais já rodou; se
   não, esse é o próximo passo antes de qualquer coisa nova.
2. Implementar edição de aluno (pendência 2) — é a lacuna mais básica hoje.
3. Portar a regra de inatividade automática (pendência 3), reaproveitando o
   parâmetro `configuracoes.dias_inatividade` que já existe no banco.
4. Construir a aba "Relatórios" consumindo `vw_financeiro_mensal`, e adicionar
   os campos de valor pago/forma de pagamento nos modais de compra de pacote,
   ativando de fato o controle financeiro que já está preparado no schema.
5. Só depois disso, avaliar RLS com diferenciação de papel, se/quando o projeto
   avançar para dar acesso a alunos.

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
