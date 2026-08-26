import { useState } from 'react'

function iniciaisDe(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/**
 * Versão desktop do Dashboard: sidebar de navegação + topbar + KPIs em linha
 * + tabela de alunos (em vez da lista de cards do mobile). Usa exatamente os
 * mesmos dados e handlers do Dashboard mobile (alunos, kpis, onAbrirAluno,
 * onAbrirMenuGeral, onAtualizar, atualizando) — quem decide qual dos dois
 * renderizar é o App.jsx, via useIsDesktop(). Clicar num aluno abre o mesmo
 * StudentActionSheet de sempre (que agora vira diálogo centralizado no
 * desktop, graças ao BottomSheet responsivo) — não duplica esse menu aqui.
 */
export default function DashboardDesktop({ alunos, kpis, onAbrirAluno, onAbrirMenuGeral, onAtualizar, atualizando }) {
  const [busca, setBusca] = useState('')

  const alunosFiltrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-name">MENDES</div>
          <div className="brand-sub">SURF HOUSE</div>
        </div>
        <div className="side-nav">
          <div className="side-link active"><span className="ic">⌂</span>Início</div>
          <div className="side-link"><span className="ic">👥</span>Alunos</div>
          <div className="side-link"><span className="ic">📊</span>Relatórios</div>
          <div className="side-link"><span className="ic">⚙</span>Ajustes</div>
        </div>
      </aside>

      <div className="main-col">
        <div className="topbar">
          <h1>Início</h1>
          <div className="d-search">
            <span className="ic">🔍</span>
            <input
              placeholder="Buscar aluno..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
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
          <button type="button" className="btn-primary-d" onClick={onAbrirMenuGeral}>
            + Nova ação
          </button>
        </div>

        <div className="content">
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
                {alunosFiltrados.length === 0 && (
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
        </div>
      </div>
    </div>
  )
}
