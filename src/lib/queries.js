import { supabase } from '../supabaseClient'

/**
 * KPIs do topo do Dashboard, calculados inteiramente no banco (função RPC)
 * em vez de trazer todos os alunos pro navegador só pra somar/contar — ver
 * `fn_dashboard_kpis` em `scripts/sql/2026-08-27-paginacao-indices-kpis.sql`
 * (rodar uma vez no SQL Editor do Supabase). Substitui as antigas
 * `fetchDashboard()` + `fetchAulasNoMes()` + `calcularKpis()`, que exigiam
 * baixar a tabela inteira de alunos pra tela inicial.
 */
export async function fetchDashboardKpis() {
  const { data, error } = await supabase.rpc('fn_dashboard_kpis').single()
  if (error) throw error
  return {
    alunosAtivos: data.alunos_ativos,
    aulasDisponiveis: data.aulas_disponiveis,
    aulasNoMes: data.aulas_no_mes,
    semAulas: data.sem_aulas
  }
}

/**
 * Lista enxuta (id, nome, saldo) de TODOS os alunos, usada só pela tela
 * "Dar baixa em lote" (`ModalBaixaLote`) pra casar nomes colados do
 * WhatsApp contra o cadastro inteiro. Não é uma lista navegável — é uma
 * ferramenta de reconhecimento de texto — então **não** usa paginação por
 * cursor: paginar aqui faria o reconhecimento falhar silenciosamente pra
 * qualquer aluno fora da primeira página. Continua sendo uma leitura
 * completa da tabela, mas enxuta (3 colunas) e sem entrar na paginação da
 * lista visível do Dashboard, que é uma consulta totalmente separada
 * (`ALUNOS_LISTA_CONFIG` + `usePaginatedQuery`).
 */
export async function fetchRosterParaLote() {
  const { data, error } = await supabase
    .from('vw_dashboard_alunos')
    .select('id, nome, saldo')
    .order('nome')
  if (error) throw error
  return data
}

/**
 * Formata com segurança um valor pro filtro `.or()` do PostgREST — usado
 * pra montar a condição de cursor da paginação por keyset. Aspas duplas
 * evitam quebra quando o valor tem vírgula, ponto ou parênteses (comum em
 * nome de aluno); a barra invertida e a aspa interna são escapadas.
 */
function valorCursorPg(valor) {
  const texto = String(valor).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${texto}"`
}

/**
 * Monta a condição de keyset (seek method) pra um ORDER BY composto — ex:
 * pra `orderColumns = [{coluna:'nome',asc:true},{coluna:'id',asc:true}]` e
 * `valoresCursor = ['Yuri', 'id-123']` gera a string
 *   `nome.gt."Yuri",and(nome.eq."Yuri",id.gt."id-123")`
 * que o supabase-js interpreta (via `.or()`) como
 *   `nome > 'Yuri' OU (nome = 'Yuri' E id > 'id-123')`
 * — a forma correta de "próxima página" numa ordenação por duas ou mais
 * colunas, sem pular nem repetir registro entre páginas.
 */
function condicaoCursorKeyset(orderColumns, valoresCursor) {
  const partes = []
  for (let i = 0; i < orderColumns.length; i++) {
    const igualdadesAnteriores = []
    for (let j = 0; j < i; j++) {
      igualdadesAnteriores.push(`${orderColumns[j].coluna}.eq.${valorCursorPg(valoresCursor[j])}`)
    }
    const { coluna, asc } = orderColumns[i]
    const condicaoColuna = `${coluna}.${asc ? 'gt' : 'lt'}.${valorCursorPg(valoresCursor[i])}`
    partes.push(
      igualdadesAnteriores.length
        ? `and(${[...igualdadesAnteriores, condicaoColuna].join(',')})`
        : condicaoColuna
    )
  }
  return partes.join(',')
}

/**
 * Busca UMA página de uma lista paginada por cursor (keyset). É a única
 * função que o hook reutilizável `usePaginatedQuery`
 * (`src/lib/usePaginatedQuery.js`) chama — fica aqui, e não no hook, pra
 * manter a regra do projeto de que só `queries.js` fala com o Supabase
 * diretamente (ver `docs/memory/ARCHITECTURE.md`).
 *
 * `orderColumns` (obrigatório) define a ordenação determinística da lista
 * — ex: `[{coluna:'nome',asc:true},{coluna:'id',asc:true}]`. Precisa
 * sempre incluir uma coluna única (like `id`) como desempate final, senão
 * duas linhas com o mesmo valor na coluna principal podem ser puladas ou
 * repetidas entre páginas.
 */
export async function buscarPaginaKeyset({ table, select = '*', orderColumns, pageSize, searchColumn, search, filters, cursor }) {
  let query = supabase.from(table).select(select)

  if (search && searchColumn) {
    query = query.ilike(searchColumn, `%${search}%`)
  }
  if (filters) {
    for (const [coluna, valor] of Object.entries(filters)) {
      if (valor !== undefined && valor !== null) query = query.eq(coluna, valor)
    }
  }
  for (const { coluna, asc } of orderColumns) {
    query = query.order(coluna, { ascending: asc })
  }
  if (cursor) {
    query = query.or(condicaoCursorKeyset(orderColumns, cursor))
  }
  query = query.limit(pageSize)

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Configuração da lista paginada de alunos (tela Início) — passar direto
 * pro hook `usePaginatedQuery`: `usePaginatedQuery({ ...ALUNOS_LISTA_CONFIG, pageSize: 20, ... })`.
 * nome+id garante ordenação determinística mesmo havendo alunos com nomes
 * iguais (nunca pula/duplica aluno entre páginas). Busca é por `nome`,
 * case-insensitive (`ilike`), "contém" (igual ao filtro local que existia
 * antes) — funciona mesmo pra aluno ainda não carregado na tela.
 */
export const ALUNOS_LISTA_CONFIG = {
  table: 'vw_dashboard_alunos',
  select: '*',
  orderColumns: [
    { coluna: 'nome', asc: true },
    { coluna: 'id', asc: true }
  ],
  searchColumn: 'nome'
}

/**
 * Configuração da lista paginada de histórico de um aluno (ModalHistorico)
 * — mais recente primeiro, com `id` como desempate final pra garantir
 * ordenação determinística mesmo em movimentações lançadas no mesmo
 * instante.
 */
export const HISTORICO_LISTA_CONFIG = {
  table: 'movimentacoes',
  select: '*',
  orderColumns: [
    { coluna: 'data', asc: false },
    { coluna: 'registrado_em', asc: false },
    { coluna: 'id', asc: false }
  ]
}

/** Pacotes ativos, agrupados por categoria (Nacional, Internacional, One to One, Avulso). */
export async function fetchPacotesAgrupados() {
  const { data, error } = await supabase
    .from('pacotes')
    .select('*')
    .eq('ativo', true)
    .order('categoria')
    .order('quantidade')
  if (error) throw error

  const grupos = {}
  for (const pacote of data) {
    const chave = pacote.categoria || 'Outros'
    if (!grupos[chave]) grupos[chave] = []
    grupos[chave].push(pacote)
  }
  return grupos
}

/** Lista simples de alunos (id + nome), usada nos dropdowns dos modais quando não há aluno pré-selecionado. */
export async function fetchAlunosParaDropdown() {
  const { data, error } = await supabase.from('alunos').select('id, nome').order('nome')
  if (error) throw error
  return data
}

export async function fetchSaldoAluno(alunoId) {
  const { data, error } = await supabase
    .from('vw_saldo_alunos')
    .select('saldo')
    .eq('aluno_id', alunoId)
    .maybeSingle()
  if (error) throw error
  return data?.saldo ?? 0
}

/**
 * Cria um novo aluno. Bloqueia nome duplicado (case/espaço insensível),
 * igual à regra que já tínhamos na versão da planilha.
 */
export async function criarAluno({ nome, telefone, nomeResponsavel, telefoneResponsavel, status, observacao, pacoteInicial }) {
  const nomeLimpo = nome.trim()
  if (!nomeLimpo) throw new Error('Informe o nome do aluno.')

  const { data: existentes, error: erroBusca } = await supabase
    .from('alunos')
    .select('id')
    .ilike('nome', nomeLimpo)
  if (erroBusca) throw erroBusca
  if (existentes && existentes.length > 0) {
    throw new Error(`Já existe um aluno cadastrado como "${nomeLimpo}". Verifique antes de continuar.`)
  }

  const { data: aluno, error } = await supabase
    .from('alunos')
    .insert({
      nome: nomeLimpo,
      telefone: telefone || null,
      nome_responsavel: nomeResponsavel || null,
      telefone_responsavel: telefoneResponsavel || null,
      status: status || 'Ativo',
      observacao: observacao || null
    })
    .select()
    .single()
  if (error) throw error

  if (pacoteInicial) {
    await registrarPacote({ alunoId: aluno.id, ...pacoteInicial, observacao: 'Pacote inicial no cadastro' })
  }

  return aluno
}

/**
 * Atualiza os dados cadastrais de um aluno já existente (nome, telefone,
 * responsável, status, observação). Nunca mexe em saldo/movimentações — isso
 * continua só passando por registrarMovimentacao().
 * Mesma regra de nome duplicado de criarAluno(), mas ignorando o próprio
 * registro (senão o aluno nunca conseguiria salvar sem mudar o nome).
 */
export async function editarAluno({ alunoId, nome, telefone, nomeResponsavel, telefoneResponsavel, status, observacao }) {
  if (!alunoId) throw new Error('Aluno não informado.')

  const nomeLimpo = nome.trim()
  if (!nomeLimpo) throw new Error('Informe o nome do aluno.')

  const { data: existentes, error: erroBusca } = await supabase
    .from('alunos')
    .select('id')
    .ilike('nome', nomeLimpo)
  if (erroBusca) throw erroBusca
  if (existentes && existentes.some((a) => a.id !== alunoId)) {
    throw new Error(`Já existe um aluno cadastrado como "${nomeLimpo}". Verifique antes de continuar.`)
  }

  const { data: aluno, error } = await supabase
    .from('alunos')
    .update({
      nome: nomeLimpo,
      telefone: telefone || null,
      nome_responsavel: nomeResponsavel || null,
      telefone_responsavel: telefoneResponsavel || null,
      status: status || 'Ativo',
      observacao: observacao || null
    })
    .eq('id', alunoId)
    .select()
    .single()
  if (error) throw error

  return aluno
}

/**
 * Grava uma movimentação, validando saldo suficiente para saídas.
 * O banco também tem um trigger de segurança contra saldo negativo —
 * esta checagem aqui é só pra dar uma mensagem amigável mais rápido.
 */
async function registrarMovimentacao({ alunoId, data, tipo, descricao, entrada = 0, saida = 0, observacao, valorPago, formaPagamento }) {
  const saldoAtual = await fetchSaldoAluno(alunoId)

  if (saida > saldoAtual) {
    throw new Error(`Saldo insuficiente: este aluno tem apenas ${saldoAtual} aula(s) disponível(is).`)
  }

  const saldoApos = saldoAtual + entrada - saida

  const { data: mov, error } = await supabase
    .from('movimentacoes')
    .insert({
      aluno_id: alunoId,
      data: data || new Date().toISOString().slice(0, 10),
      tipo,
      descricao,
      entrada,
      saida,
      saldo_apos: saldoApos,
      observacao: observacao || null,
      valor_pago: valorPago ?? null,
      forma_pagamento: formaPagamento || null
    })
    .select()
    .single()
  if (error) throw error
  return mov
}

/** Registra a compra de um pacote (soma ao saldo, nunca substitui). */
export async function registrarPacote({ alunoId, pacoteId, quantidadePersonalizada, data, observacao, valorPago, formaPagamento }) {
  let nomePacote, quantidade

  if (pacoteId === 'PERSONALIZADO') {
    quantidade = Number(quantidadePersonalizada)
    if (!quantidade || quantidade <= 0) throw new Error('Informe uma quantidade válida para o pacote personalizado.')
    nomePacote = `Personalizado (${quantidade} aulas)`
  } else {
    const { data: pacote, error } = await supabase.from('pacotes').select('*').eq('id', pacoteId).single()
    if (error || !pacote) throw new Error('Pacote não encontrado.')
    nomePacote = pacote.nome
    quantidade = pacote.quantidade
    valorPago = valorPago ?? pacote.valor
  }

  return registrarMovimentacao({
    alunoId, data, tipo: 'PACOTE', descricao: nomePacote,
    entrada: quantidade, saida: 0, observacao, valorPago, formaPagamento
  })
}

/** Dá baixa em aula(s). Lança erro se a quantidade for maior que o saldo. */
export async function registrarAula({ alunoId, data, quantidade, observacao }) {
  const qtd = Number(quantidade)
  if (!qtd || qtd <= 0) throw new Error('Informe uma quantidade de aulas válida.')

  return registrarMovimentacao({
    alunoId, data, tipo: 'AULA', descricao: 'Aula realizada',
    entrada: 0, saida: qtd, observacao
  })
}

/**
 * Dá baixa em lote (1 aula por aluno), usada na tela de colar a lista do
 * WhatsApp e confirmar quem fez aula. Roda uma baixa de cada vez e NÃO para
 * no primeiro erro — cada aluno vira um resultado independente (sucesso ou
 * falha, ex: saldo insuficiente), pra um problema pontual não travar o
 * restante do lote.
 */
export async function registrarAulaLote({ alunoIds, data, observacao }) {
  const resultados = []
  for (const alunoId of alunoIds) {
    try {
      const mov = await registrarAula({ alunoId, data, quantidade: 1, observacao })
      resultados.push({ alunoId, sucesso: true, mov })
    } catch (err) {
      resultados.push({ alunoId, sucesso: false, erro: err.message })
    }
  }
  return resultados
}

// Histórico de aluno (antiga fetchHistoricoAluno) agora é paginado por
// cursor — ver HISTORICO_LISTA_CONFIG + usePaginatedQuery, consumido em
// ModalHistorico.jsx.
