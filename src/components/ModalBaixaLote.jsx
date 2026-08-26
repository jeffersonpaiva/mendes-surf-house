import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { processarListaColada } from '../lib/matchNomes'
import { registrarAulaLote } from '../lib/queries'

/**
 * Dar baixa em lote: o admin cola o trecho de um dia/horário da lista que
 * circula no grupo do WhatsApp, o sistema tenta reconhecer cada nome como
 * um aluno já cadastrado, o admin confirma (checkbox) quem realmente fez
 * aula, e só então lança a baixa de 1 aula pra cada um selecionado.
 *
 * Recebe `alunos` (a mesma lista já carregada no Dashboard, com id/nome/
 * saldo) em vez de buscar de novo — evita round-trip extra e garante que o
 * saldo mostrado na revisão é o mesmo que a tela principal está exibindo.
 *
 * Três etapas dentro do mesmo modal: 'colar' -> 'revisar' -> 'resultado'.
 */
export default function ModalBaixaLote({ open, onClose, alunos, onSucesso }) {
  const [etapa, setEtapa] = useState('colar')
  const [texto, setTexto] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [reconhecidos, setReconhecidos] = useState([])
  const [naoReconhecidos, setNaoReconhecidos] = useState([])
  const [selecionados, setSelecionados] = useState(new Set())
  const [resultados, setResultados] = useState([])
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  function resetar() {
    setEtapa('colar')
    setTexto('')
    setData(new Date().toISOString().slice(0, 10))
    setReconhecidos([])
    setNaoReconhecidos([])
    setSelecionados(new Set())
    setResultados([])
    setErro('')
    setProcessando(false)
  }

  function handleClose() {
    resetar()
    onClose()
  }

  function handleAnalisar() {
    if (!texto.trim()) { setErro('Cole a lista de alunos.'); return }

    const { reconhecidos: rec, naoReconhecidos: naoRec } = processarListaColada(texto, alunos)
    if (rec.length === 0 && naoRec.length === 0) {
      setErro('Não encontrei nenhum nome nessa lista. Confira se colou o trecho certo.')
      return
    }

    setReconhecidos(rec)
    setNaoReconhecidos(naoRec)
    setSelecionados(new Set(rec.map((r) => r.aluno.id)))
    setErro('')
    setEtapa('revisar')
  }

  function toggleSelecionado(alunoId) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(alunoId)) next.delete(alunoId)
      else next.add(alunoId)
      return next
    })
  }

  async function handleConfirmarLote() {
    if (selecionados.size === 0) return
    setErro('')
    setProcessando(true)
    try {
      const res = await registrarAulaLote({
        alunoIds: Array.from(selecionados),
        data,
        observacao: 'Baixa em lote (lista colada)'
      })
      setResultados(res)
      setEtapa('resultado')
      onSucesso()
    } catch (err) {
      setErro(err.message)
    } finally {
      setProcessando(false)
    }
  }

  const sucessos = resultados.filter((r) => r.sucesso)
  const falhas = resultados.filter((r) => !r.sucesso)

  return (
    <BottomSheet open={open} onClose={handleClose}>
      {etapa === 'colar' && (
        <>
          <h3>Dar baixa em lote</h3>
          <div className="saldo-info" style={{ marginTop: -8, marginBottom: 4 }}>
            Cole aqui a lista de um dia/horário só (como sai no grupo do WhatsApp) — o
            sistema tenta reconhecer cada nome como um aluno já cadastrado.
          </div>

          <label className="field-label">Data da aula</label>
          <input className="field-input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

          <label className="field-label">Lista colada</label>
          <textarea
            className="field-input lote-textarea"
            rows="10"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Quarta-feira\n5:40\nIana castelo\nDavi Oliveira\nLyara Peres\n...'}
          />

          {erro && <div className="form-msg erro">{erro}</div>}

          <div className="sheet-actions">
            <button type="button" className="secondary-btn" onClick={handleClose}>Cancelar</button>
            <button type="button" className="primary-btn" onClick={handleAnalisar}>Analisar lista</button>
          </div>
        </>
      )}

      {etapa === 'revisar' && (
        <>
          <h3>Confirmar baixa em lote</h3>
          <div className="lote-resumo">
            {selecionados.size} de {reconhecidos.length} aluno(s) reconhecido(s) selecionado(s)
          </div>

          <div className="lote-lista">
            {reconhecidos.length === 0 && (
              <div className="saldo-info">Nenhum nome da lista bateu com aluno cadastrado.</div>
            )}
            {reconhecidos.map((item) => (
              <label key={item.aluno.id} className="lote-item">
                <input
                  type="checkbox"
                  checked={selecionados.has(item.aluno.id)}
                  onChange={() => toggleSelecionado(item.aluno.id)}
                />
                <div className="lote-item-info">
                  <div className="nome">{item.aluno.nome}</div>
                  <div className="origem">Na lista: "{item.nomeOriginal}"</div>
                </div>
                {item.aluno.saldo <= 0 && <span className="badge low">Sem saldo</span>}
              </label>
            ))}
          </div>

          {naoReconhecidos.length > 0 && (
            <div className="lote-aviso">
              <div className="titulo">
                {naoReconhecidos.length} nome(s) não reconhecido(s) — ficaram de fora do lote
              </div>
              <ul>
                {naoReconhecidos.map((n, i) => (
                  <li key={i}>
                    "{n.nomeOriginal}"
                    {n.ambiguo
                      ? ` — ambíguo entre: ${n.candidatos.map((c) => c.nome).join(', ')}`
                      : ' — não encontrado no cadastro'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {erro && <div className="form-msg erro">{erro}</div>}

          <div className="sheet-actions">
            <button type="button" className="secondary-btn" onClick={() => setEtapa('colar')}>Voltar</button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirmarLote}
              disabled={selecionados.size === 0 || processando}
            >
              {processando ? 'Lançando...' : `Dar baixa em lote (${selecionados.size})`}
            </button>
          </div>
        </>
      )}

      {etapa === 'resultado' && (
        <>
          <h3>Resultado da baixa em lote</h3>

          {sucessos.length > 0 && (
            <div className="form-msg sucesso">{sucessos.length} baixa(s) lançada(s) com sucesso.</div>
          )}
          {falhas.length > 0 && (
            <div className="form-msg erro">{falhas.length} falharam — veja o motivo abaixo.</div>
          )}

          <div className="lote-lista">
            {resultados.map((r) => {
              const item = reconhecidos.find((x) => x.aluno.id === r.alunoId)
              return (
                <div key={r.alunoId} className="lote-resultado-item">
                  <span>{item ? item.aluno.nome : r.alunoId}</span>
                  <span style={{ color: r.sucesso ? 'var(--green)' : 'var(--coral)' }}>
                    {r.sucesso ? '✓ ok' : r.erro}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="sheet-actions">
            <button type="button" className="primary-btn" style={{ flex: 1 }} onClick={handleClose}>Concluir</button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
