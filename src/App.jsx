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
import ModalHistorico from './components/ModalHistorico'
import { fetchDashboard, fetchAulasNoMes, calcularKpis } from './lib/queries'

export default function App() {
  const isDesktop = useIsDesktop()
  const [sessao, setSessao] = useState(undefined) // undefined = ainda carregando
  const [alunos, setAlunos] = useState([])
  const [kpis, setKpis] = useState({ alunosAtivos: 0, aulasDisponiveis: 0, aulasNoMes: 0, semAulas: 0 })
  const [carregandoDados, setCarregandoDados] = useState(true)

  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [sheetAberto, setSheetAberto] = useState(null) // 'menuGeral' | 'aluno' | 'novoAluno' | 'editarAluno' | 'pacote' | 'baixa' | 'historico'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSessao(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  const recarregar = useCallback(async () => {
    setCarregandoDados(true)
    try {
      const [listaAlunos, aulasNoMes] = await Promise.all([fetchDashboard(), fetchAulasNoMes()])
      setAlunos(listaAlunos)
      setKpis(calcularKpis(listaAlunos, aulasNoMes))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregandoDados(false)
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
    alunos,
    kpis,
    onAbrirAluno: (aluno) => { setAlunoSelecionado(aluno); setSheetAberto('aluno') },
    onAbrirMenuGeral: () => setSheetAberto('menuGeral'),
    onAtualizar: recarregar,
    atualizando: carregandoDados
  }

  return (
    <div className={isDesktop ? 'app-shell' : 'phone'}>
      {carregandoDados && alunos.length === 0 ? (
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

      <ModalHistorico
        open={sheetAberto === 'historico'}
        onClose={fecharTudo}
        aluno={alunoSelecionado}
      />
    </div>
  )
}
