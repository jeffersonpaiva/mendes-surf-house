import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { editarAluno } from '../lib/queries'

export default function ModalEditarAluno({ open, onClose, aluno, onSucesso }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('')
  const [temResponsavel, setTemResponsavel] = useState(false)
  const [status, setStatus] = useState('Ativo')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open && aluno) {
      setNome(aluno.nome || '')
      setTelefone(aluno.telefone || '')
      setNomeResponsavel(aluno.nome_responsavel || '')
      setTelefoneResponsavel(aluno.telefone_responsavel || '')
      setTemResponsavel(Boolean(aluno.nome_responsavel || aluno.telefone_responsavel))
      setStatus(aluno.status || 'Ativo')
      setObservacao(aluno.observacao || '')
      setErro('')
    }
  }, [open, aluno])

  if (!aluno) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      await editarAluno({
        alunoId: aluno.id,
        nome, telefone, status, observacao,
        nomeResponsavel: temResponsavel ? nomeResponsavel : '',
        telefoneResponsavel: temResponsavel ? telefoneResponsavel : ''
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
      <h3>Editar aluno — {aluno.nome}</h3>
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

        <label className="field-label">Status</label>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
        </select>

        <label className="field-label">Observação (opcional)</label>
        <textarea className="field-input" rows="2" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        {erro && <div className="form-msg erro">{erro}</div>}

        <div className="sheet-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-btn" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
