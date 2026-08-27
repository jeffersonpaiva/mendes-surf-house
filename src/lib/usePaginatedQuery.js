import { useCallback, useEffect, useRef, useState } from 'react'
import { buscarPaginaKeyset } from './queries'

const DEBOUNCE_PADRAO_MS = 350

/**
 * Hook genérico e reutilizável de paginação por cursor (keyset/seek method)
 * contra o Supabase — pensado pra alimentar qualquer lista do app (alunos,
 * histórico, e futuras) sem duplicar a lógica de busca/scroll/páginas.
 *
 * Como usar:
 *   const { itens, carregando, carregandoMais, temMais, temPaginaAnterior,
 *           busca, setBusca, carregarMais, proximaPagina, paginaAnterior }
 *     = usePaginatedQuery({ table, select, orderColumns, searchColumn, pageSize, filtros })
 *
 * - Mobile ("Carregar mais"): use `itens` (vai acumulando) + `carregarMais()`.
 * - Desktop ("Anterior/Próxima"): use `itens` (troca a cada página) +
 *   `proximaPagina()` / `paginaAnterior()` + `temPaginaAnterior`/`temMais`.
 *
 * A query em si (o `.from(table).select(...)...`) fica em `queries.js`
 * (`buscarPaginaKeyset`), não aqui — esse hook só orquestra estado/efeitos.
 * Isso mantém a regra do projeto de que só `queries.js` fala com o Supabase
 * diretamente (ver docs/memory/ARCHITECTURE.md).
 *
 * `orderColumns` define a ordenação determinística da lista (ex: nome+id) —
 * o mesmo array é usado tanto no ORDER BY quanto pra montar a condição do
 * cursor, então precisa ser SEMPRE o mesmo array (mesma ordem, mesmas
 * colunas) durante a vida da lista — normalmente uma constante exportada de
 * `queries.js` (ver `ALUNOS_LISTA_CONFIG`, `HISTORICO_LISTA_CONFIG`).
 *
 * `filtros` (opcional) são filtros fixos de igualdade (ex: `{ aluno_id }`) —
 * ao mudar de valor, a lista reinicia da primeira página automaticamente.
 *
 * `sinalRecarregar` (opcional, número/qualquer valor comparável) — muda de
 * valor sempre que uma tela IRMÃ alterar dado que afeta esta lista (ex:
 * cadastrar aluno em outro modal) e você quer que ela se atualize sozinha.
 * Reinicia a paginação, mas preserva o termo de busca atual.
 *
 * `ativo` (default true) — quando false, a busca não dispara (útil pra
 * modais que ficam montados no DOM mas escondidos, ex: BottomSheet).
 */
export function usePaginatedQuery({
  table,
  select = '*',
  orderColumns,
  searchColumn = null,
  pageSize = 20,
  filtros,
  buscaDebounceMs = DEBOUNCE_PADRAO_MS,
  ativo = true,
  sinalRecarregar = 0
}) {
  const [buscaDigitada, setBuscaDigitada] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState(null)
  const [temMais, setTemMais] = useState(false)
  const [indicePagina, setIndicePagina] = useState(0)

  // cursoresRef.current[i] = cursor (valores das orderColumns) pra buscar a
  // página i. Página 0 sempre começa com cursor nulo (sem filtro de keyset).
  const cursoresRef = useRef([null])
  // Contador de pedidos em voo — evita que uma resposta antiga e lenta
  // sobrescreva um resultado mais novo (condição de corrida ao digitar
  // rápido ou trocar de página rápido).
  const pedidoRef = useRef(0)

  const filtrosChave = JSON.stringify(filtros || {})

  // Debounce: só "aplica" a busca (e assim dispara a consulta) depois que o
  // usuário para de digitar por `buscaDebounceMs`.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(buscaDigitada.trim()), buscaDebounceMs)
    return () => clearTimeout(t)
  }, [buscaDigitada, buscaDebounceMs])

  const carregarPagina = useCallback(async (pagina, { acumular }) => {
    if (!ativo) return
    const meuPedido = ++pedidoRef.current
    const setCarregandoFlag = acumular ? setCarregandoMais : setCarregando
    setCarregandoFlag(true)
    setErro(null)
    try {
      const cursor = cursoresRef.current[pagina] ?? null
      const dados = await buscarPaginaKeyset({
        table,
        select,
        orderColumns,
        pageSize,
        searchColumn,
        search: buscaAplicada || null,
        filters: filtros,
        cursor
      })

      if (meuPedido !== pedidoRef.current) return // resposta antiga — ignora

      setItens((prev) => (acumular ? [...prev, ...dados] : dados))
      setTemMais(dados.length === pageSize)
      setIndicePagina(pagina)

      if (dados.length > 0) {
        const ultimo = dados[dados.length - 1]
        cursoresRef.current[pagina + 1] = orderColumns.map((o) => ultimo[o.coluna])
      }
    } catch (err) {
      if (meuPedido === pedidoRef.current) setErro(err)
    } finally {
      if (meuPedido === pedidoRef.current) setCarregandoFlag(false)
    }
    // filtrosChave representa `filtros` de forma estável (evita refazer a
    // função — e disparar o efeito abaixo — a cada render só porque o
    // chamador passou um objeto literal novo com o mesmo conteúdo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, orderColumns, pageSize, searchColumn, buscaAplicada, filtrosChave, ativo])

  // Reinicia do zero (primeira página) sempre que: a busca aplicada muda, os
  // filtros mudam, ou alguém pede recarga externa (sinalRecarregar) — cobre
  // os requisitos "ao iniciar/alterar busca, resetar paginação" e "ao
  // limpar busca, voltar pra listagem normal paginada".
  useEffect(() => {
    cursoresRef.current = [null]
    carregarPagina(0, { acumular: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAplicada, filtrosChave, sinalRecarregar, ativo])

  const carregarMais = useCallback(() => {
    if (carregando || carregandoMais || !temMais) return
    carregarPagina(indicePagina + 1, { acumular: true })
  }, [carregarPagina, carregando, carregandoMais, temMais, indicePagina])

  const proximaPagina = useCallback(() => {
    if (carregando || !temMais) return
    carregarPagina(indicePagina + 1, { acumular: false })
  }, [carregarPagina, carregando, temMais, indicePagina])

  const paginaAnterior = useCallback(() => {
    if (carregando || indicePagina === 0) return
    carregarPagina(indicePagina - 1, { acumular: false })
  }, [carregarPagina, carregando, indicePagina])

  return {
    itens,
    carregando,
    carregandoMais,
    erro,
    temMais,
    temPaginaAnterior: indicePagina > 0,
    indicePagina: indicePagina + 1, // 1-based, pronto pra exibir "Página N"
    busca: buscaDigitada,
    setBusca: setBuscaDigitada,
    carregarMais,
    proximaPagina,
    paginaAnterior
  }
}
