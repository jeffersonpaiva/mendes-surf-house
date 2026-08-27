import { useState } from 'react'
import { usePaginatedQuery } from '../lib/usePaginatedQuery'
import { ALUNOS_LISTA_CONFIG } from '../lib/queries'
import BottomSheet from './BottomSheet'
import { IconFilter } from './Icons'

// Teto usado só pra desenhar a barrinha de aulas disponíveis (não é um
// limite de verdade) — cobre o maior pacote do catálogo hoje ("Programa
// Performance", 14 aulas, ver docs/memory/DATABASE.md). Quem tiver mais
// que isso só enche a barra 100%, sem quebrar o layout.
const TETO_BARRA_AULAS = 15

function iniciaisDe(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/**
 * Tela "Alunos" — grid de cards com busca + filtros (status, situação),
 * reaproveitando o mesmo padrão de paginação por cursor da lista de Início
 * (ver src/lib/usePaginatedQuery.js). Um único componente serve mobile e
 * desktop: o grid responsivo (CSS grid, auto-fill) se ajusta sozinho à
 * largura disponível — diferente do Dashboard/DashboardDesktop (lista de
 * cards vs. tabela densa), aqui não precisa de duas versões.
 *
 * Paginação sempre por "Carregar mais" (mesmo no desktop) — um grid de
 * cards que vai crescendo combina mais com esse padrão do que
 * Anterior/Próxima, que fazia mais sentido pra tabela densa do Início.
 */
export default function AlunosGrid({ onAbrirAluno, refreshToken }) {
  // Filtros já aplicados à lista.
  const [status, setStatus] = useState('todos') // 'todos' | 'Ativo' | 'Inativo'
  const [situacao, setSituacao] = useState('todos') // 'todos' | 'com' | 'sem'
  // Rascunho editado dentro do modal "Filtros" — só vira filtro de verdade
  // quando o usuário clica em "Aplicar" (evita re-buscar a cada clique nos
  // selects, e permite "Cancelar" fechando sem aplicar nada).
  const [modalAberto, setModalAberto] = useState(false)
  const [rascunhoStatus, setRascunhoStatus] = useState('todos')
  const [rascunhoSituacao, setRascunhoSituacao] = useState('todos')

  const filtros = {}
  if (status !== 'todos') filtros.status = status
  if (situacao === 'com') filtros.situacao_pacote = 'Com aulas disponíveis'
  if (situacao === 'sem') filtros.situacao_pacote = 'Sem aulas'
  const filtrosAtivos = status !== 'todos' || situacao !== 'todos'

  function abrirModalFiltros() {
    setRascunhoStatus(status)
    setRascunhoSituacao(situacao)
    setModalAberto(true)
  }

  function aplicarFiltros() {
    setStatus(rascunhoStatus)
    setSituacao(rascunhoSituacao)
    setModalAberto(false)
  }

  function limparFiltros() {
    setRascunhoStatus('todos')
    setRascunhoSituacao('todos')
    setStatus('todos')
    setSituacao('todos')
    setModalAberto(false)
  }

  const {
    itens: alunos,
    carregando,
    carregandoMais,
    temMais,
    busca,
    setBusca,
    carregarMais
  } = usePaginatedQuery({ ...ALUNOS_LISTA_CONFIG, pageSize: 18, filtros, sinalRecarregar: refreshToken })

  return (
    <div className="alunos-tela">
      <div className="search-filtro-row">
        <div className="search">
          <input
            placeholder="Buscar aluno..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`filter-btn ${filtrosAtivos ? 'ativo' : ''}`}
          onClick={abrirModalFiltros}
        >
          <IconFilter size={16} strokeWidth={2} />
          Filtros
          {filtrosAtivos && <span className="filter-btn-dot" />}
        </button>
      </div>

      <div className="alunos-grid">
        {carregando && alunos.length === 0 && (
          <div className="alunos-grid-vazio">Carregando...</div>
        )}
        {!carregando && alunos.length === 0 && (
          <div className="alunos-grid-vazio">Nenhum aluno encontrado.</div>
        )}
        {alunos.map((aluno) => {
          const pct = Math.max(0, Math.min(100, (aluno.saldo / TETO_BARRA_AULAS) * 100))
          return (
            <div className="aluno-card" key={aluno.id} onClick={() => onAbrirAluno(aluno)}>
              <div className="aluno-card-top">
                <div className="avatar">{iniciaisDe(aluno.nome)}</div>
                <div className="aluno-card-info">
                  <div className="nome">{aluno.nome}</div>
                  <div className="telefone">{aluno.telefone || 'Sem telefone'}</div>
                </div>
              </div>
              <div className="aula-bar-row">
                <div className="aula-bar">
                  <div
                    className={`aula-bar-fill ${aluno.saldo > 0 ? '' : 'zerado'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="aula-bar-num">{aluno.saldo} aula(s)</span>
              </div>
            </div>
          )
        })}
      </div>

      {temMais && (
        <div className="load-more-wrap">
          <button type="button" className="secondary-btn" onClick={carregarMais} disabled={carregandoMais}>
            {carregandoMais ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}

      <BottomSheet open={modalAberto} onClose={() => setModalAberto(false)}>
        <h3>Filtrar alunos</h3>

        <label className="field-label">Status</label>
        <select
          className="field-input"
          value={rascunhoStatus}
          onChange={(e) => setRascunhoStatus(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
        </select>

        <label className="field-label">Situação</label>
        <select
          className="field-input"
          value={rascunhoSituacao}
          onChange={(e) => setRascunhoSituacao(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="com">Com aulas</option>
          <option value="sem">Sem aulas</option>
        </select>

        <div className="sheet-actions">
          <button type="button" className="secondary-btn" onClick={limparFiltros}>
            Limpar filtros
          </button>
          <button type="button" className="primary-btn" onClick={aplicarFiltros}>
            Aplicar
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
