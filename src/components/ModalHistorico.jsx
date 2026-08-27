import BottomSheet from './BottomSheet'
import { usePaginatedQuery } from '../lib/usePaginatedQuery'
import { HISTORICO_LISTA_CONFIG } from '../lib/queries'

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/**
 * Segunda lista do app a usar o padrão reutilizável de paginação por cursor
 * (a primeira é a lista de alunos — ver Dashboard.jsx/DashboardDesktop.jsx).
 * Aqui não tem busca (`searchColumn` fica de fora), só "Carregar mais" —
 * histórico de aluno não tem versão desktop separada, então usa sempre o
 * padrão de lista que acumula.
 */
export default function ModalHistorico({ open, onClose, aluno }) {
  const {
    itens: historico,
    carregando,
    carregandoMais,
    temMais,
    carregarMais
  } = usePaginatedQuery({
    ...HISTORICO_LISTA_CONFIG,
    pageSize: 20,
    filtros: aluno ? { aluno_id: aluno.id } : undefined,
    ativo: open && !!aluno
  })

  if (!aluno) return null

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3>Histórico — {aluno.nome}</h3>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {carregando && historico.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Carregando...</div>
        )}
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
        {temMais && (
          <div className="load-more-wrap">
            <button type="button" className="secondary-btn" onClick={carregarMais} disabled={carregandoMais}>
              {carregandoMais ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>
      <div className="sheet-actions">
        <button type="button" className="secondary-btn" onClick={onClose} style={{ width: '100%' }}>Fechar</button>
      </div>
    </BottomSheet>
  )
}
