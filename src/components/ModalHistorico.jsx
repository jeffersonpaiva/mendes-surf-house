import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { fetchHistoricoAluno } from '../lib/queries'

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function ModalHistorico({ open, onClose, aluno }) {
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (open && aluno) {
      setCarregando(true)
      fetchHistoricoAluno(aluno.id)
        .then(setHistorico)
        .finally(() => setCarregando(false))
    }
  }, [open, aluno])

  if (!aluno) return null

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3>Histórico — {aluno.nome}</h3>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {carregando && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Carregando...</div>}
        {!carregando && historico.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Nenhuma movimentação ainda.</div>
        )}
        {historico.map((m) => (
          <div key={m.id} className="historico-row">
            <div>
              <div className="historico-desc">{m.descricao}</div>
              <div className="historico-data">{formatarData(m.data)} &middot; {m.tipo}</div>
            </div>
            <div className={`historico-valor ${m.entrada > 0 ? 'positivo' : 'negativo'}`}>
              {m.entrada > 0 ? `+${m.entrada}` : `-${m.saida}`}
            </div>
          </div>
        ))}
      </div>
      <div className="sheet-actions">
        <button type="button" className="secondary-btn" onClick={onClose} style={{ width: '100%' }}>Fechar</button>
      </div>
    </BottomSheet>
  )
}
