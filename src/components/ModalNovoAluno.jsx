import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { criarAluno, fetchPacotesAgrupados } from '../lib/queries'

export default function ModalNovoAluno({ open, onClose, onSucesso }) {
  const [grupos, setGrupos] = useState({})
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('')
  const [temResponsavel, setTemResponsavel] = useState(false)
  const [status, setStatus] = useState('Ativo')
  const [temPacote, setTemPacote] = useState(false)
  const [pacoteId, setPacoteId] = useState('')
  const [quantidadePersonalizada, setQuantidadePersonalizada] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) {
      setNome(''); setTelefone(''); setNomeResponsavel(''); setTelefoneResponsavel('')
      setTemResponsavel(false); setStatus('Ativo'); setTemPacote(false); setPacoteId('')
      setQuantidadePersonalizada(''); setObservacao(''); setErro('')
      fetchPacotesAgrupados().then(setGrupos).catch(() => setGrupos({}))
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      await criarAluno({
        nome, telefone, status, observacao,
        nomeResponsavel: temResponsavel ? nomeResponsavel : '',
        telefoneResponsavel: temResponsavel ? telefoneResponsavel : '',
        pacoteInicial: temPacote ? { pacoteId, quantidadePersonalizada, data: new Date().toISOString().slice(0, 10) } : null
      })
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
      <h3>Novo aluno</h3>
      <form onSubmit={handleSubmit}>
        <label className="field-label">Nome completo</label>
        <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} required />

        <label className="field-label">Telefone do aluno (opcional)</label>
        <input className="field-input" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(85) 90000-0000" />

        <label className="checkbox-row">
          <input type="checkbox" checked={temResponsavel} onChange={(e) => setTemResponsavel(e.target.checked)} />
          Aluno é criança/adolescente (usar contato do responsável)
        </label>

        {temResponsavel && (
          <>
            <label className="field-label">Nome do responsável</label>
            <input className="field-input" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} />
            <label className="field-label">Telefone do responsável</label>
            <input className="field-input" value={telefoneResponsavel} onChange={(e) => setTelefoneResponsavel(e.target.value)} />
          </>
        )}

        <label className="field-label">Status inicial</label>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
        </select>

        <label className="checkbox-row">
          <input type="checkbox" checked={temPacote} onChange={(e) => setTemPacote(e.target.checked)} />
          Já entra com pacote / aula avulsa
        </label>

        {temPacote && (
          <>
            <label className="field-label">Pacote</label>
            <select className="field-input" value={pacoteId} onChange={(e) => setPacoteId(e.target.value)} required={temPacote}>
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
          </>
        )}

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
