import { useState } from 'react'

function iniciaisDe(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export default function Dashboard({ alunos, kpis, onAbrirAluno, onAbrirMenuGeral, onAtualizar, atualizando }) {
  const [busca, setBusca] = useState('')
  const [kpisAbertos, setKpisAbertos] = useState(true)

  const alunosFiltrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  )

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
        {alunosFiltrados.length === 0 && (
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
      </div>

      <button className="fab" onClick={onAbrirMenuGeral}>+</button>

      <nav>
        <div className="nav-item active"><div className="nav-dot">⌂</div>Início</div>
        <div className="nav-item"><div className="nav-dot">👥</div>Alunos</div>
        <div className="nav-item"><div className="nav-dot">📊</div>Relatórios</div>
        <div className="nav-item"><div className="nav-dot">⚙</div>Ajustes</div>
      </nav>
    </>
  )
}
