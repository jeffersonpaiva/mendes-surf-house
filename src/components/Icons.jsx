/**
 * Ícones de linha (estilo minimalista, sem dependência externa) usados no
 * lugar dos emojis que o app tinha antes. Todos herdam a cor do texto ao
 * redor via `currentColor`, então basta ajustar `color` no CSS do elemento
 * pai pra combinar com o tema (igual funcionava com os emojis).
 */
function IconBase({ size = 20, strokeWidth = 1.8, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Nav "Início" — casa. */
export function IconHome(props) {
  return (
    <IconBase {...props}>
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6 10v9.3a1 1 0 0 0 1 1h3v-6.3h4v6.3h3a1 1 0 0 0 1-1V10" />
    </IconBase>
  )
}

/** Botão de fechar modal (X). */
export function IconClose(props) {
  return (
    <IconBase {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </IconBase>
  )
}

/** "Dar baixa em aula" — ondas, remete a surf. */
export function IconWaves(props) {
  return (
    <IconBase {...props}>
      <path d="M2 7c1.4-1.3 2.9-1.3 4.3 0 1.4 1.3 2.9 1.3 4.3 0 1.4-1.3 2.9-1.3 4.3 0 1.4 1.3 2.9 1.3 4.3 0" />
      <path d="M2 12.5c1.4-1.3 2.9-1.3 4.3 0 1.4 1.3 2.9 1.3 4.3 0 1.4-1.3 2.9-1.3 4.3 0 1.4 1.3 2.9 1.3 4.3 0" />
      <path d="M2 18c1.4-1.3 2.9-1.3 4.3 0 1.4 1.3 2.9 1.3 4.3 0 1.4-1.3 2.9-1.3 4.3 0 1.4 1.3 2.9 1.3 4.3 0" />
    </IconBase>
  )
}

/** "Dar baixa em lote" / "Ver histórico completo" — lista/prancheta. */
export function IconClipboardList(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.3h6a1 1 0 0 1 1 1V6H8V4.3a1 1 0 0 1 1-1Z" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" />
      <line x1="8.5" y1="18" x2="12.5" y2="18" />
    </IconBase>
  )
}

/** "Inserir pacote" — cartão/pacote. */
export function IconCard(props) {
  return (
    <IconBase {...props}>
      <rect x="2.3" y="5.5" width="19.4" height="13" rx="2.2" />
      <line x1="2.3" y1="10" x2="21.7" y2="10" />
      <line x1="6" y1="14.7" x2="10.5" y2="14.7" />
    </IconBase>
  )
}

/** "Novo aluno" — pessoa com +. */
export function IconUserPlus(props) {
  return (
    <IconBase {...props}>
      <circle cx="9.5" cy="8.2" r="3.4" />
      <path d="M3 20c0-3.5 2.9-5.9 6.5-5.9s6.5 2.4 6.5 5.9" />
      <line x1="18.3" y1="6.8" x2="18.3" y2="12.8" />
      <line x1="15.3" y1="9.8" x2="21.3" y2="9.8" />
    </IconBase>
  )
}

/** "Editar dados" — lápis. */
export function IconEdit(props) {
  return (
    <IconBase {...props}>
      <path d="M4 20.5h4L19.3 9.2a2.4 2.4 0 0 0-4-4L4.5 16.5l-.5 4Z" />
      <line x1="14.3" y1="6.2" x2="18.3" y2="10.2" />
    </IconBase>
  )
}

/** Nav "Alunos" — duas pessoas. */
export function IconUsers(props) {
  return (
    <IconBase {...props}>
      <circle cx="8.7" cy="8" r="3.1" />
      <path d="M3 20c0-3.2 2.6-5.5 5.7-5.5s5.7 2.3 5.7 5.5" />
      <circle cx="16.8" cy="8.6" r="2.4" />
      <path d="M15.2 14.7c2.5.5 4.1 2.4 4.1 5.3" />
    </IconBase>
  )
}

/** Nav "Relatórios" — gráfico de barras. */
export function IconChart(props) {
  return (
    <IconBase {...props}>
      <line x1="4" y1="20.5" x2="20" y2="20.5" />
      <rect x="6" y="12.5" width="3.2" height="7" />
      <rect x="10.9" y="8" width="3.2" height="11.5" />
      <rect x="15.8" y="4.5" width="3.2" height="15" />
    </IconBase>
  )
}

/** Nav "Ajustes" — engrenagem. */
export function IconSettings(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.4a7.5 7.5 0 0 0 0-2.8l1.9-1.5-2-3.4-2.3.7a7.5 7.5 0 0 0-2.4-1.4L14 2.5h-4l-.6 2.5a7.5 7.5 0 0 0-2.4 1.4l-2.3-.7-2 3.4L4.6 10.6a7.5 7.5 0 0 0 0 2.8l-1.9 1.5 2 3.4 2.3-.7a7.5 7.5 0 0 0 2.4 1.4L10 21.5h4l.6-2.5a7.5 7.5 0 0 0 2.4-1.4l2.3.7 2-3.4Z" />
    </IconBase>
  )
}

/** Campo de busca — lupa. */
export function IconSearch(props) {
  return (
    <IconBase {...props}>
      <circle cx="10.3" cy="10.3" r="6.3" />
      <line x1="15.1" y1="15.1" x2="20.5" y2="20.5" />
    </IconBase>
  )
}
