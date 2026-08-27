import { useState } from 'react'
import { IconHome, IconUsers, IconChart, IconSettings } from './Icons'
import { usePaginatedQuery } from '../lib/usePaginatedQuery'
import { ALUNOS_LISTA_CONFIG } from '../lib/queries'
import AlunosGrid from './AlunosGrid'

function iniciaisDe(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export default function Dashboard({ kpis, onAbrirAluno, onAbrirMenuGeral, onAtualizar, atualizando, refreshToken, tela, onNavegar }) {
  const [kpisAbertos, setKpisAbertos] = useState(true)

  // Lista paginada por cursor (18 por vez), busca por nome direto no banco
  // (não só nos alunos já carregados) — ver src/lib/usePaginatedQuery.js.
  // `ativo` só liga a busca quando esta tela (Início) está de fato visível.
  const {
    itens: alunosFiltrados,
    carregando: carregandoLista,
    carregandoMais,
    temMais,
    busca,
    setBusca,
    carregarMais
  } = usePaginatedQuery({ ...ALUNOS_LISTA_CONFIG, pageSize: 18, sinalRecarregar: refreshToken, ativo: tela === 'inicio' })

  return (
    <>
      <header>
        <div className="brand">
          <div>
            <div className="brand-name">MENDES</div>
            <div className="brand-sub">SURF HOUSE</div>
          </div>
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
        </div>
        <div className="wave" />
      </header>

      {tela === 'inicio' && (
        <>
          <div className="kpis-header">
            <div className="label">Resumo</div>
            <button className="kpis-toggle" onClick={() => setKpisAbertos((v) => !v)}>
              {kpisAbertos ? 'Esconder' : 'Mostrar'} {kpisAbertos ? '▲' : '▼'}
            </button>
          </div>
          <div className={`kpis ${kpisAbertos ? '' : 'collapsed'}`}>
            <div className="kpi"><div className="num">{kpis.alunosAtivos}</div><div className="label">Alunos ativos</div></div>
            <div className="kpi"><div className="num">{kpis.aulasDisponiveis}</div><div className="label">Aulas disponíveis</div></div>
            <div className="kpi"><div className="num">{kpis.aulasNoMes}</div><div className="label">Aulas do mês</div></div>
            <div className="kpi"><div className="num">{kpis.semAulas}</div><div className="label">Sem aulas</div></div>
          </div>

          <div className="search">
            <input
              placeholder="Buscar aluno..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="section-title">
            <h2>Alunos</h2>
          </div>

          <div className="list">
            {carregandoLista && alunosFiltrados.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Carregando...
              </div>
            )}
            {!carregandoLista && alunosFiltrados.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Nenhum aluno encontrado.
              </div>
            )}
            {alunosFiltrados.map((aluno) => (
              <div className="student" key={aluno.id} onClick={() => onAbrirAluno(aluno)}>
                <div className="avatar">{iniciaisDe(aluno.nome)}</div>
                <div className="student-info">
                  <div className="name">{aluno.nome}</div>
                  <div className="meta">
                    {aluno.pacote_atual || 'Sem pacote'} &middot; {aluno.saldo} aula(s) restantes
                  </div>
                </div>
                <div className={`badge ${aluno.saldo > 0 ? 'ok' : 'low'}`}>
                  {aluno.saldo > 0 ? 'Com aulas' : 'Sem aulas'}
                </div>
              </div>
            ))}
            {temMais && (
              <div className="load-more-wrap">
                <button type="button" className="secondary-btn" onClick={carregarMais} disabled={carregandoMais}>
                  {carregandoMais ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tela === 'alunos' && (
        <>
          <div className="section-title">
            <h2>Alunos</h2>
          </div>
          <div className="list">
            <AlunosGrid onAbrirAluno={onAbrirAluno} refreshToken={refreshToken} />
          </div>
        </>
      )}

      <button className="fab" onClick={onAbrirMenuGeral}>+</button>

      <nav>
        <div className={`nav-item ${tela === 'inicio' ? 'active' : ''}`} onClick={() => onNavegar('inicio')}>
          <div className="nav-dot"><IconHome size={16} /></div>Início
        </div>
        <div className={`nav-item ${tela === 'alunos' ? 'active' : ''}`} onClick={() => onNavegar('alunos')}>
          <div className="nav-dot"><IconUsers size={16} /></div>Alunos
        </div>
        <div className="nav-item"><div className="nav-dot"><IconChart size={16} /></div>Relatórios</div>
        <div className="nav-item"><div className="nav-dot"><IconSettings size={16} /></div>Ajustes</div>
      </nav>
    </>
  )
}
