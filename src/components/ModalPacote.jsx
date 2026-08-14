import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { registrarPacote, fetchPacotesAgrupados, fetchAlunosParaDropdown, fetchSaldoAluno } from '../lib/queries'

export default function ModalPacote({ open, onClose, aluno, onSucesso }) {
  const [grupos, setGrupos] = useState({})
  const [alunosLista, setAlunosLista] = useState([])
  const [alunoIdEscolhido, setAlunoIdEscolhido] = useState('')
  const [saldoAtual, setSaldoAtual] = useState(null)
  const [pacoteId, setPacoteId] = useState('')
  const [quantidadePersonalizada, setQuantidadePersonalizada] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const alunoIdFinal = aluno ? aluno.id : alunoIdEscolhido

  useEffect(() => {
    if (open) {
      setData(new Date().toISOString().slice(0, 10))
      setPacoteId('')
      setQuantidadePersonalizada('')
      setObservacao('')
      setErro('')
      setAlunoIdEscolhido('')
      setSaldoAtual(null)
      fetchPacotesAgrupados().then(setGrupos).catch(() => setGrupos({}))
      if (!aluno) fetchAlunosParaDropdown().then(setAlunosLista).catch(() => setAlunosLista([]))
    }
  }, [open, aluno])

  useEffect(() => {
    if (alunoIdFinal) fetchSaldoAluno(alunoIdFinal).then(setSaldoAtual).catch(() => setSaldoAtual(null))
  }, [alunoIdFinal])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!alunoIdFinal) { setErro('Escolha o aluno.'); return }
    if (!pacoteId) { setErro('Escolha um pacote.'); return }
    setSalvando(true)
    try {
      await registrarPacote({ alunoId: alunoIdFinal, pacoteId, quantidadePersonalizada, data, observacao })
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
      <h3>{aluno ? `Inserir pacote — ${aluno.nome}` : 'Inserir pacote / aula avulsa'}</h3>
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

        {alunoIdFinal && saldoAtual !== null && (
          <div className="saldo-info">Saldo atual: {saldoAtual} aula(s) disponível(is)</div>
        )}

        <label className="field-label">Pacote</label>
        <select className="field-input" value={pacoteId} onChange={(e) => setPacoteId(e.target.value)} required>
          <option value="" disabled>Selecione...</option>
          {Object.entries(grupos).map(([categoria, pacotes]) => (
            <optgroup key={categoria} label={categoria}>
              {pacotes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} ({p.quantidade} aulas — R$ {Number(p.valor).toFixed(2)})</option>
              ))}
            </optgroup>
          ))}
          <option value="PERSONALIZADO">Personalizado / Recorrente</option>
        </select>

        {pacoteId === 'PERSONALIZADO' && (
          <>
            <label className="field-label">Quantidade de aulas</label>
            <input className="field-input" type="number" min="1" value={quantidadePersonalizada}
              onChange={(e) => setQuantidadePersonalizada(e.target.value)} required />
          </>
        )}

        <label className="field-label">Data da compra</label>
        <input className="field-input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

        <label className="field-label">Observação (opcional)</label>
        <textarea className="field-input" rows="2" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        {erro && <div className="form-msg erro">{erro}</div>}

        <div className="sheet-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-btn" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
