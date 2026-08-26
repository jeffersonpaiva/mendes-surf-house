/**
 * Parsing e casamento de nomes pra "Dar baixa em lote": o admin cola aqui o
 * trecho de UM dia/horário da lista que circula no grupo do WhatsApp (com
 * cabeçalho de dia da semana, horário, e um nome por linha) e este módulo
 * tenta casar cada nome com um aluno já cadastrado no sistema.
 *
 * Não tenta ser perfeito — cada match sugerido ainda passa por confirmação
 * manual do admin na tela (checkbox), e nome sem match confiável só fica de
 * fora do lote com um aviso, nunca é adivinhado à força.
 */

const DIAS_SEMANA = /^(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(-feira)?$/i

// Faixas de emoji comuns na lista (bandeiras, cadeado, símbolos diversos).
const EMOJI_REGEX = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu

function normalizar(s) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // remove acentos (marcas combinantes) depois do NFD
    .toLowerCase()
    .trim()
}

function tokens(s) {
  return normalizar(s).split(/\s+/).filter(Boolean)
}

/**
 * Limpa uma linha candidata a nome: remove emojis, tags conhecidas
 * (experimental/exp, one to one) e espaços sobrando. Retorna string vazia
 * se não sobrar nada aproveitável (linha era só emoji/tag).
 */
function limparNomeLinha(linha) {
  let s = linha.replace(EMOJI_REGEX, '')
  s = s.replace(/\(\s*experimental\s*\)/gi, '')
  s = s.replace(/\bexperimental\b/gi, '')
  s = s.replace(/\(\s*exp\.?\s*\)/gi, '')
  s = s.replace(/\bexp\.?\b/gi, '')
  s = s.replace(/\bone\s*to\s*one\b/gi, '')
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Recebe o texto colado (um dia/horário só) e devolve a lista de nomes
 * candidatos, já limpos, na ordem em que apareceram, sem linhas de
 * cabeçalho (dia da semana, horário, instruções entre parênteses) e sem
 * duplicatas (mesmo nome colado duas vezes por engano).
 */
export function extrairNomesDaLista(texto) {
  const linhas = (texto || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const nomes = []
  const vistos = new Set()

  for (const linha of linhas) {
    if (DIAS_SEMANA.test(linha)) continue
    if (/^\d/.test(linha)) continue // horário: "5:40", "15:20🔒", "6h", "7:10"...
    if (linha.startsWith('(')) continue // instrução entre parênteses

    const nomeLimpo = limparNomeLinha(linha)
    if (!nomeLimpo) continue

    const chave = normalizar(nomeLimpo)
    if (vistos.has(chave)) continue
    vistos.add(chave)

    nomes.push(nomeLimpo)
  }

  return nomes
}

/**
 * Tenta casar um nome candidato com um único aluno da lista, comparando por
 * token (cada palavra do nome colado precisa ser prefixo de alguma palavra
 * do nome cadastrado — cobre "Lyara Peres" -> "Lyara Maria Peres Ximenes").
 * Se achar exatamente um aluno, é match. Se achar zero ou mais de um
 * (ambíguo), não arrisca — devolve os candidatos pra mostrar no aviso.
 */
export function casarNomeComAlunos(nomeCandidato, alunos) {
  const candTokens = tokens(nomeCandidato)
  if (candTokens.length === 0) return { aluno: null, candidatos: [] }

  const candidatos = alunos.filter((a) => {
    const nomeTokens = tokens(a.nome)
    return candTokens.every((ct) => nomeTokens.some((nt) => nt.startsWith(ct)))
  })

  if (candidatos.length === 1) return { aluno: candidatos[0], candidatos }
  return { aluno: null, candidatos }
}

/**
 * Junta as duas funções acima: recebe o texto colado + a lista de alunos já
 * carregada, devolve { reconhecidos, naoReconhecidos } prontos pra tela de
 * revisão.
 */
export function processarListaColada(texto, alunos) {
  const nomes = extrairNomesDaLista(texto)
  const reconhecidos = []
  const naoReconhecidos = []

  for (const nomeOriginal of nomes) {
    const { aluno, candidatos } = casarNomeComAlunos(nomeOriginal, alunos)
    if (aluno) {
      reconhecidos.push({ nomeOriginal, aluno })
    } else {
      naoReconhecidos.push({ nomeOriginal, ambiguo: candidatos.length > 1, candidatos })
    }
  }

  return { reconhecidos, naoReconhecidos }
}
