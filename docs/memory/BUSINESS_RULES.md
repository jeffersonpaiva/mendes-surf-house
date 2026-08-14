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

- **Todo usuário autenticado tem acesso total** (não existe distinção de papel
  ainda). Só o administrador deve receber login — não é seguro criar conta para
  outra pessoa (ex: um aluno) esperando que ela veja só os próprios dados, porque
  essa restrição ainda não existe no RLS.
- Não há fluxo de cadastro/self-signup no app — todo usuário é criado manualmente
  no painel do Supabase (Authentication → Users).
