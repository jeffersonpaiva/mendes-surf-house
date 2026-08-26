import { useEffect, useState } from 'react'

/**
 * Breakpoint único entre o layout mobile (celular, PWA como já era) e o
 * layout desktop (notebook). Mantido num só lugar pra nunca dessincronizar
 * do que o CSS em styles.css usa.
 */
export const DESKTOP_BREAKPOINT = '(min-width: 860px)'

/**
 * Detecta se a tela atual deve usar o layout desktop, atualizando sozinho
 * se a janela for redimensionada (ex: notebook ligado num monitor externo,
 * ou navegador redimensionado). Não depende de user-agent — é só largura de
 * tela, então funciona também num tablet grande em modo paisagem, por
 * exemplo.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_BREAKPOINT).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_BREAKPOINT)
    const handler = (e) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
