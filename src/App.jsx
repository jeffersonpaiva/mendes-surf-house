import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useIsDesktop } from './lib/useIsDesktop'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import DashboardDesktop from './components/DashboardDesktop'
import { QuickActionSheet, StudentActionSheet } from './components/QuickActionSheet'
import ModalNovoAluno from './components/ModalNovoAluno'
import ModalEditarAluno from './components/ModalEditarAluno'
import ModalPacote from './components/ModalPacote'
import ModalBaixaAula from './components/ModalBaixaAula'
import ModalBaixaLote from './components/ModalBaixaLote'
import ModalHistorico from './components/ModalHistorico'
import { fetchDashboardKpis, fetchRosterParaLote } from './lib/queries'

export default function App() {
  const isDesktop = useIsDesktop()
  const [sessao, setSessao] = useState(undefined) // undefined = ainda carregando
  // `alunosParaLote`: lista completa (id/nome/saldo), só pra "Dar baixa em
  // lote" casar nomes colados do WhatsApp — a lista VISÍVEL do Dashboard
  // agora é paginada e busca seus próprios dados (ver Dashboard.jsx /
  // DashboardDesktop.jsx + usePaginatedQuery), não depende mais deste estado.
  const [alunosParaLote, setAlunosParaLote] = useState([])
  const [kpis, setKpis] = useState({ alunosAtivos: 0, aulasDisponiveis: 0, aulasNoMes: 0, semAulas: 0 })
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [primeiraCargaCompleta, setPrimeiraCargaCompleta] = useState(false)
  // Incrementado a cada `recarregar()` bem-sucedido — as listas paginadas
  // (Dashboard/DashboardDesktop) observam esse valor pra se atualizarem
  // sozinhas quando algo muda em outra tela (novo aluno, baixa, etc.),
  // preservando a busca/página que o usuário já tinha aberto.
  const [refreshToken, setRefreshToken] = useState(0)

  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [sheetAberto, setSheetAberto] = useState(null) // 'menuGeral' | 'aluno' | 'novoAluno' | 'editarAluno' | 'pacote' | 'baixa' | 'baixaLote' | 'historico'
  const [tela, setTela] = useState('inicio') // 'inicio' | 'alunos' — controla o menu de navegação (bottom nav / sidebar)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSessao(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  const recarregar = useCallback(async () => {
    setCarregandoDados(true)
    try {
      const [kpisCalculados, roster] = await Promise.all([fetchDashboardKpis(), fetchRosterParaLote()])
      setKpis(kpisCalculados)
      setAlunosParaLote(roster)
      setRefreshToken((t) => t + 1)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregandoDados(false)
      setPrimeiraCargaCompleta(true)
    }
  }, [])

  useEffect(() => {
    if (sessao) recarregar()
  }, [sessao, recarregar])

  function fecharTudo() {
    setSheetAberto(null)
  }

  if (sessao === undefined) {
    return <div className="loading-screen">Carregando...</div>
  }

  if (!sessao) {
    return <Login />
  }

  const props = {
    kpis,
    onAbrirAluno: (aluno) => { setAlunoSelecionado(aluno); setSheetAberto('aluno') },
    onAbrirMenuGeral: () => setSheetAberto('menuGeral'),
    onAtualizar: recarregar,
    atualizando: carregandoDados,
    refreshToken,
    tela,
    onNavegar: setTela
  }

  return (
    <div className={isDesktop ? 'app-shell' : 'phone'}>
      {carregandoDados && !primeiraCargaCompleta ? (
        <div className="loading-screen">Carregando dados...</div>
      ) : isDesktop ? (
        <DashboardDesktop {...props} />
      ) : (
        <Dashboard {...props} />
      )}

      <QuickActionSheet
        open={sheetAberto === 'menuGeral'}
        onClose={fecharTudo}
        onBaixa={() => { setAlunoSelecionado(null); setSheetAberto('baixa') }}
        onBaixaLote={() => { setAlunoSelecionado(null); setSheetAberto('baixaLote') }}
        onPacote={() => { setAlunoSelecionado(null); setSheetAberto('pacote') }}
        onNovoAluno={() => setSheetAberto('novoAluno')}
      />

      <StudentActionSheet
        open={sheetAberto === 'aluno'}
        onClose={fecharTudo}
        aluno={alunoSelecionado}
        onBaixa={() => setSheetAberto('baixa')}
        onPacote={() => setSheetAberto('pacote')}
        onHistorico={() => setSheetAberto('historico')}
        onEditar={() => setSheetAberto('editarAluno')}
      />

      <ModalNovoAluno
        open={sheetAberto === 'novoAluno'}
        onClose={fecharTudo}
        onSucesso={recarregar}
      />

      <ModalEditarAluno
        open={sheetAberto === 'editarAluno'}
        onClose={fecharTudo}
        aluno={alunoSelecionado}
        onSucesso={recarregar}
      />

      <ModalPacote
        open={sheetAberto === 'pacote'}
        onClose={fecharTudo}
        aluno={alunoSelecionado}
        onSucesso={recarregar}
      />

      <ModalBaixaAula
        open={sheetAberto === 'baixa'}
        onClose={fecharTudo}
        aluno={alunoSelecionado}
        onSucesso={recarregar}
      />

      <ModalBaixaLote
        open={sheetAberto === 'baixaLote'}
        onClose={fecharTudo}
        alunos={alunosParaLote}
        onSucesso={recarregar}
      />

      <ModalHistorico
        open={sheetAberto === 'historico'}
        onClose={fecharTudo}
        aluno={alunoSelecionado}
      />
    </div>
  )
}
