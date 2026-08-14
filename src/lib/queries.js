import { supabase } from '../supabaseClient'

/** Lista pronta pro Dashboard: já vem com saldo, situação e pacote atual calculados pela view. */
export async function fetchDashboard() {
  const { data, error } = await supabase
    .from('vw_dashboard_alunos')
    .select('*')
    .order('nome')
  if (error) throw error
  return data
}

/** Quantas aulas foram dadas de baixa desde o dia 1 do mês atual. */
export async function fetchAulasNoMes() {
  const inicio = new Date()
  inicio.setDate(1)
  const inicioStr = inicio.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('movimentacoes')
    .select('saida')
    .eq('tipo', 'AULA')
    .gte('data', inicioStr)
  if (error) throw error
  return data.reduce((total, m) => total + (m.saida || 0), 0)
}

/** Monta os 4 indicadores do topo a partir da lista já carregada + aulas do mês. */
export function calcularKpis(alunos, aulasNoMes) {
  const ativos = alunos.filter((a) => a.status === 'Ativo').length
  const comAulas = alunos.filter((a) => a.saldo > 0).length
  const totalAulasDisponiveis = alunos.reduce((t, a) => t + (a.saldo || 0), 0)
  return {
    alunosAtivos: ativos,
    aulasDisponiveis: totalAulasDisponiveis,
    aulasNoMes,
    semAulas: alunos.length - comAulas
  }
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

/** Histórico completo de um aluno, mais recente primeiro. */
export async function fetchHistoricoAluno(alunoId) {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('data', { ascending: false })
    .order('registrado_em', { ascending: false })
  if (error) throw error
  return data
}
