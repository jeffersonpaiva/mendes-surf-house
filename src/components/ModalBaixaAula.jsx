import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { registrarAula, fetchSaldoAluno, fetchAlunosParaDropdown } from '../lib/queries'

export default function ModalBaixaAula({ open, onClose, aluno, onSucesso }) {
  const [alunosLista, setAlunosLista] = useState([])
  const [alunoIdEscolhido, setAlunoIdEscolhido] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [saldo, setSaldo] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const alunoIdFinal = aluno ? aluno.id : alunoIdEscolhido

  useEffect(() => {
    if (open) {
      setData(new Date().toISOString().slice(0, 10))
      setQuantidade(1)
      setObservacao('')
      setErro('')
      setAlunoIdEscolhido('')
      setSaldo(null)
      if (!aluno) fetchAlunosParaDropdown().then(setAlunosLista).catch(() => setAlunosLista([]))
    }
  }, [open, aluno])

  useEffect(() => {
    if (alunoIdFinal) fetchSaldoAluno(alunoIdFinal).then(setSaldo).catch(() => setSaldo(null))
    else setSaldo(null)
  }, [alunoIdFinal])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!alunoIdFinal) { setErro('Escolha o aluno.'); return }
    if (saldo !== null && Number(quantidade) > saldo) {
      setErro(`Este aluno possui apenas ${saldo} aula(s) disponível(is).`)
      return
    }
    setSalvando(true)
    try {
      await registrarAula({ alunoId: alunoIdFinal, data, quantidade, observacao })
      onSucesso()
      onClose()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h3>{aluno ? `Dar baixa em aula — ${aluno.nome}` : 'Dar baixa em aula'}</h3>
      <form onSubmit={handleSubmit}>
        {!aluno && (
          <>
            <label className="field-label">Aluno</label>
            <select className="field-input" value={alunoIdEscolhido} onChange={(e) => setAlunoIdEscolhido(e.target.value)} required>
              <option value="" disabled>Selecione...</option>
              {alunosLista.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </>
        )}

        {saldo !== null && <div className="saldo-info">Saldo atual: {saldo} aula(s) disponível(is)</div>}

        <label className="field-label">Data da aula</label>
        <input className="field-input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

        <label className="field-label">Quantidade de aulas</label>
        <input className="field-input" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />

        <label className="field-label">Observação (opcional)</label>
        <textarea className="field-input" rows="2" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        {erro && <div className="form-msg erro">{erro}</div>}

        <div className="sheet-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-btn" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Confirmar baixa'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
