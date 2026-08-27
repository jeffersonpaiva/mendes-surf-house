import { IconHome, IconUsers, IconChart, IconSettings, IconSearch } from './Icons'
import { usePaginatedQuery } from '../lib/usePaginatedQuery'
import { ALUNOS_LISTA_CONFIG } from '../lib/queries'
import AlunosGrid from './AlunosGrid'

function iniciaisDe(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/**
 * Versão desktop do Dashboard: sidebar de navegação + topbar + KPIs em linha
 * + tabela de alunos (em vez da lista de cards do mobile). Usa exatamente os
 * mesmos dados e handlers do Dashboard mobile (kpis, onAbrirAluno,
 * onAbrirMenuGeral, onAtualizar, atualizando, refreshToken) — quem decide
 * qual dos dois renderizar é o App.jsx, via useIsDesktop(). Clicar num aluno
 * abre o mesmo StudentActionSheet de sempre (que agora vira diálogo
 * centralizado no desktop, graças ao BottomSheet responsivo) — não duplica
 * esse menu aqui.
 *
 * A tabela (tela "Início") é paginada por cursor (20 por vez), com
 * Anterior/Próxima em vez do "Carregar mais" do mobile — troca a página
 * inteira em vez de acumular, que é o padrão mais natural numa tabela densa
 * de desktop. `tela`/`onNavegar` (estado vindo de App.jsx) alternam entre
 * "Início" e a tela "Alunos" (grid de cards com filtros — `AlunosGrid.jsx`,
 * compartilhada com o Dashboard mobile).
 */
export default function DashboardDesktop({ kpis, onAbrirAluno, onAbrirMenuGeral, onAtualizar, atualizando, refreshToken, tela, onNavegar }) {
  const {
    itens: alunosFiltrados,
    carregando: carregandoLista,
    temMais,
    temPaginaAnterior,
    indicePagina,
    busca,
    setBusca,
    proximaPagina,
    paginaAnterior
  } = usePaginatedQuery({ ...ALUNOS_LISTA_CONFIG, pageSize: 20, sinalRecarregar: refreshToken, ativo: tela === 'inicio' })

  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-name">MENDES</div>
          <div className="brand-sub">SURF HOUSE</div>
        </div>
        <div className="side-nav">
          <div className={`side-link ${tela === 'inicio' ? 'active' : ''}`} onClick={() => onNavegar('inicio')}>
            <span className="ic"><IconHome size={16} /></span>Início
          </div>
          <div className={`side-link ${tela === 'alunos' ? 'active' : ''}`} onClick={() => onNavegar('alunos')}>
            <span className="ic"><IconUsers size={16} /></span>Alunos
          </div>
          <div className="side-link"><span className="ic"><IconChart size={16} /></span>Relatórios</div>
          <div className="side-link"><span className="ic"><IconSettings size={16} /></span>Ajustes</div>
        </div>
      </aside>

      <div className="main-col">
        <div className="topbar">
          <h1>{tela === 'alunos' ? 'Alunos' : 'Início'}</h1>
          {tela === 'inicio' && (
            <div className="d-search">
              <span className="ic"><IconSearch size={15} /></span>
              <input
                placeholder="Buscar aluno..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          )}
          <button
            type="button"
            className={`refresh-btn ${atualizando ? 'spinning' : ''}`}
            onClick={onAtualizar}
            disabled={atualizando}
            aria-label="Atualizar lista de alunos"
            title="Atualizar"
          >
            <span className="refresh-icon">⟳</span>
          </button>
          <button type="button" className="btn-primary-d" onClick={onAbrirMenuGeral}>
            + Nova ação
          </button>
        </div>

        <div className="content">
          {tela === 'inicio' && (
            <>
              <div className="kpi-row">
                <div className="kpi-card"><div className="num">{kpis.alunosAtivos}</div><div className="label">Alunos ativos</div></div>
                <div className="kpi-card"><div className="num">{kpis.aulasDisponiveis}</div><div className="label">Aulas disponíveis</div></div>
                <div className="kpi-card"><div className="num">{kpis.aulasNoMes}</div><div className="label">Aulas do mês</div></div>
                <div className="kpi-card"><div className="num">{kpis.semAulas}</div><div className="label">Sem aulas</div></div>
              </div>

              <div className="table-card">
                <table className="d-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Telefone</th>
                      <th>Pacote atual</th>
                      <th>Saldo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregandoLista && alunosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                          Carregando...
                        </td>
                      </tr>
                    )}
                    {!carregandoLista && alunosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                          Nenhum aluno encontrado.
                        </td>
                      </tr>
                    )}
                    {alunosFiltrados.map((aluno) => (
                      <tr key={aluno.id} onClick={() => onAbrirAluno(aluno)}>
                        <td>
                          <div className="row-name">
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{iniciaisDe(aluno.nome)}</div>
                            {aluno.nome}
                          </div>
                        </td>
                        <td className="col-muted">{aluno.telefone || '—'}</td>
                        <td className="col-muted">{aluno.pacote_atual || 'Sem pacote'}</td>
                        <td>{aluno.saldo}</td>
                        <td><span className={`badge ${aluno.saldo > 0 ? 'ok' : 'low'}`}>{aluno.saldo > 0 ? 'Com aulas' : 'Sem aulas'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-pagination">
                <button type="button" className="secondary-btn" onClick={paginaAnterior} disabled={!temPaginaAnterior || carregandoLista}>
                  Anterior
                </button>
                <span className="d-pagination-info">Página {indicePagina}</span>
                <button type="button" className="secondary-btn" onClick={proximaPagina} disabled={!temMais || carregandoLista}>
                  Próxima
                </button>
              </div>
            </>
          )}

          {tela === 'alunos' && (
            <AlunosGrid onAbrirAluno={onAbrirAluno} refreshToken={refreshToken} />
          )}
        </div>
      </div>
    </div>
  )
}
