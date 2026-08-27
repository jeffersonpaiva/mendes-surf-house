import { useIsDesktop } from '../lib/useIsDesktop'
import { IconClose } from './Icons'

/**
 * Wrapper de modal único usado por todos os modais do app (Novo aluno,
 * Editar, Pacote, Baixa, Histórico e os menus de ação). No mobile continua
 * subindo como bottom sheet, igual sempre foi. No desktop (≥860px) vira um
 * diálogo centralizado na tela — sem precisar duplicar nenhum dos modais
 * que usam este componente, eles ganham o comportamento novo automaticamente.
 *
 * Fechar é sempre explícito (botão X aqui, ou os botões Cancelar/Fechar de
 * cada modal) — clicar no fundo escuro NÃO fecha mais, pra evitar perder
 * dado digitado num formulário por um toque sem querer fora do modal.
 */
export default function BottomSheet({ open, onClose, children }) {
  const isDesktop = useIsDesktop()

  return (
    <div className={`overlay ${isDesktop ? 'dialog' : ''} ${open ? 'open' : ''}`}>
      <div className={isDesktop ? 'dialog-box' : 'sheet'}>
        {!isDesktop && <div className="grip" />}
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Fechar">
          <IconClose size={18} strokeWidth={2} />
        </button>
        {children}
      </div>
    </div>
  )
}
