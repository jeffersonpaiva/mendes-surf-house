import { useIsDesktop } from '../lib/useIsDesktop'

/**
 * Wrapper de modal único usado por todos os modais do app (Novo aluno,
 * Editar, Pacote, Baixa, Histórico e os menus de ação). No mobile continua
 * subindo como bottom sheet, igual sempre foi. No desktop (≥860px) vira um
 * diálogo centralizado na tela — sem precisar duplicar nenhum dos modais
 * que usam este componente, eles ganham o comportamento novo automaticamente.
 */
export default function BottomSheet({ open, onClose, children }) {
  const isDesktop = useIsDesktop()

  return (
    <div
      className={`overlay ${isDesktop ? 'dialog' : ''} ${open ? 'open' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={isDesktop ? 'dialog-box' : 'sheet'}>
        {!isDesktop && <div className="grip" />}
        {children}
      </div>
    </div>
  )
}
