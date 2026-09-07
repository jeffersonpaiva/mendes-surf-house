# BUSINESS_RULES.md

Regras de negócio que não são óbvias só olhando o código ou o schema — o "porquê"
por trás de decisões que, se alteradas sem entender o motivo, provavelmente
reintroduzem um bug que já foi resolvido.

## Saldo de aulas

- **Nunca é armazenado**, sempre calculado como `SUM(entrada) − SUM(saida)` em
  `movimentacoes` (ver `vw_saldo_alunos`). Não existe e não deve existir uma
  coluna "saldo" em `alunos`.
- **Nunca pode ficar negativo.** Validado em duas camadas: no frontend
  (`registrarMovimentacao()` em `queries.js`, checa saldo antes de gravar) e no
  banco (trigger `trg_impedir_saldo_negativo`). As duas camadas devem ser mantidas
  — a do frontend dá uma mensagem de erro amigável rápido; a do banco é a garantia
  real, inclusive contra escrita direta no banco.
- **Comprar um pacote soma ao saldo existente, nunca substitui.** Um aluno com 2
  aulas que compra um pacote de 12 fica com 14 — não com 12.

## Histórico (`movimentacoes`)

- **Nunca se apaga uma linha de `movimentacoes`.** Correções entram como uma nova
  linha do tipo `AJUSTE` (positiva ou negativa), preservando o histórico completo.
  Isso vem da versão anterior do projeto (planilha) e foi mantido deliberadamente
  na migração — não implementar um botão de "editar/excluir movimentação" sem
  reconsiderar essa regra primeiro.
- **`saldo_apos` é um snapshot, não uma fonte de cálculo.** Serve só para auditoria
  (olhar o histórico e ver "depois dessa aula, ele ficou com X"). O saldo atual
  real sempre vem de somar a tabela inteira, nunca de ler o último `saldo_apos`.

## Alunos

- **Nome duplicado é bloqueado**, comparação case/espaço-insensível
  (`"joão paiva"` e `"João Paiva "` contam como o mesmo aluno). Validado no
  frontend antes do insert, e reforçado por um índice único no banco
  (`lower(trim(nome))`).
- **Telefone do aluno é opcional.** Alunos crianças/adolescentes podem não ter
  telefone próprio — por isso existem os campos separados
  `nome_responsavel`/`telefone_responsavel`, preenchidos só quando aplicável. Essa
  foi uma decisão explícita do dono do produto (não assumir que todo aluno tem
  celular próprio).
- **Status (Ativo/Inativo) é manual hoje.** A versão anterior (Apps Script) tinha
  uma regra automática (inativar após N dias sem movimentação, configurável via
  `configuracoes.dias_inatividade`) — essa automação **não foi portada** para a
  versão atual. A tabela `configuracoes` já tem o parâmetro pronto, esperando essa
  lógica ser implementada no frontend (ou numa function/cron do Supabase). Ver
  `CURRENT_STATE.md`.

## Pacotes / preços

- **`pacotes.valor` é só o preço sugerido/atual**, usado para pré-preencher o
  formulário. **Não é a fonte de verdade do quanto foi cobrado numa venda
  específica** — isso é (ou seria, quando implementado no frontend)
  `movimentacoes.valor_pago`, um snapshot do preço no momento da venda. A razão:
  se o preço de um pacote for reajustado no futuro, o histórico de vendas
  antigas não pode mudar de valor retroativamente nos relatórios financeiros.
  **O frontend hoje não usa `valor_pago`/`forma_pagamento` em nenhum lugar** — os
  modais de compra de pacote não pedem esses campos ainda, mesmo a coluna já
  existindo no banco.
- **Categorias de pacote (`Nacional`, `Internacional`, `One to One`, `Avulso`)**
  são só para agrupar visualmente o dropdown — não têm nenhuma regra de negócio
  atrelada além da exibição.
- **"Personalizado / Recorrente"** não é uma linha em `pacotes`; é tratado como
  caso especial no código (`pacoteId === 'PERSONALIZADO'`) em `queries.js`,
  `ModalPacote.jsx` e `ModalNovoAluno.jsx` — a quantidade de aulas é digitada
  direto no formulário em vez de vir do catálogo.

## Autenticação / autorização

- **Atualizado em 2026-09-07: existem dois papéis agora — `admin` e
  `vendedor`** (tabela `usuarios_perfis`, ver `docs/memory/DATABASE.md`).
  `admin` continua com acesso total (alunos, movimentações, pacotes,
  configurações, e vendas de camisa). `vendedor` só lê/escreve
  `pedidos_camisas` — bloqueado por RLS em todo o resto, não só escondido na
  UI. Todo usuário criado antes desta mudança virou `admin` automaticamente
  (ninguém perdeu acesso).
- Não há fluxo de cadastro/self-signup no app — todo usuário (admin ou
  vendedor) é criado manualmente no painel do Supabase (Authentication →
  Users), e o papel é atribuído manualmente rodando um `insert` em
  `usuarios_perfis` (ver instruções no topo de
  `scripts/sql/2026-09-07-vendas-camisas.sql`). Continua não sendo seguro
  criar conta pra ninguém além de admin/vendedor de confiança até que
  existam outros papéis com RLS granular o suficiente (ex: aluno vendo só o
  próprio saldo — ainda não implementado).

## Vendas de camisa (surf trip, `pedidos_camisas`)

- **Preço por modalidade, não digitado livre.** "Encomenda" = R$ 120,
  "Pronta entrega" (vendida e entregue no dia da viagem) = R$ 150 —
  constantes em `PRECO_CAMISA` (`queries.js`). O valor final gravado
  (`pedidos_camisas.valor`) é sempre `preço da modalidade − desconto`,
  nunca negativo, calculado no formulário (`ModalPedidoCamisa.jsx`) — quem
  registra a venda não digita o valor final, só o desconto (opcional,
  pensado pro caso de staff, mas não travado a esse caso).
- **"Entregue" é o que diferencia encomenda de venda pronta.** Todo pedido
  nasce com um valor padrão de `entregue` conforme a modalidade — "Pronta
  entrega" já nasce entregue (o cliente leva a camisa na hora, no dia da
  viagem), "Encomenda" nasce pendente — mas o campo é sempre editável depois
  (virar em qualquer direção), porque é assim que o admin/vendedor sabe
  quais encomendas ainda faltam entregar. Não existe hoje nenhuma automação
  que marque "entregue" sozinho — é sempre uma ação manual de editar o
  pedido.
- **Pedido não é apagado pelo app** — mesma filosofia de nunca apagar
  histórico usada em `movimentacoes` (ver acima). Um pedido errado deve ser
  corrigido editando os campos, não excluído (não há policy de `delete` em
  `pedidos_camisas`).
- **Sem checagem de cliente duplicado.** Diferente de `alunos` (nome
  duplicado bloqueado), o mesmo cliente pode ter vários pedidos de camisa —
  é o esperado (ex: mais de um tamanho/modelo pro mesmo cliente).
