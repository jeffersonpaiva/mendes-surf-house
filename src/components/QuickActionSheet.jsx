import BottomSheet from './BottomSheet'

function ActionRow({ icon, title, subtitle, onClick, first }) {
  return (
    <div className="action-row" style={first ? { borderTop: 'none' } : undefined} onClick={onClick}>
      <div className="action-icon">{icon}</div>
      <div className="action-text">
        <div className="t">{title}</div>
        <div className="s">{subtitle}</div>
      </div>
    </div>
  )
}

/** Menu geral, aberto pelo botão flutuante (+). Inclui "Novo aluno". */
export function QuickActionSheet({ open, onClose, onBaixa, onPacote, onNovoAluno }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3>O que você quer fazer?</h3>
      <ActionRow first icon="🏄" title="Dar baixa em aula" subtitle="Registrar aula realizada" onClick={onBaixa} />
      <ActionRow icon="💳" title="Inserir pacote" subtitle="Pacote ou aula avulsa" onClick={onPacote} />
      <ActionRow icon="👤" title="Novo aluno" subtitle="Cadastrar aluno" onClick={onNovoAluno} />
    </BottomSheet>
  )
}

/** Menu contextual de um aluno específico, aberto ao tocar no card dele. */
export function StudentActionSheet({ open, onClose, aluno, onBaixa, onPacote, onHistorico, onEditar }) {
  if (!aluno) return null
  const iniciais = aluno.nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="avatar" style={{ width: 46, height: 46, fontSize: 15 }}>{iniciais}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{aluno.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {aluno.pacote_atual || 'Sem pacote'} &middot; {aluno.saldo} aula(s) disponível(is)
          </div>
        </div>
      </div>
      <ActionRow first icon="🏄" title="Dar baixa em aula" subtitle="Registrar aula realizada por este aluno" onClick={onBaixa} />
      <ActionRow icon="💳" title="Inserir pacote" subtitle="Pacote ou aula avulsa para este aluno" onClick={onPacote} />
      <ActionRow icon="📋" title="Ver histórico completo" subtitle="Todas as movimentações do aluno" onClick={onHistorico} />
      <ActionRow icon="✏️" title="Editar dados" subtitle="Nome, telefone, responsável e status" onClick={onEditar} />
    </BottomSheet>
  )
}
