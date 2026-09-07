import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { criarPedidoCamisa, editarPedidoCamisa, PRECO_CAMISA } from '../lib/queries'

const MODELOS = ['Surf Trip', 'WSL Pipa']
const CORES = ['Branco', 'Marrom', 'Azul', 'Preto']
const TAMANHOS = ['P', 'M', 'G']
const FORMAS_PAGAMENTO = ['Pix', 'Crédito', 'Débito', 'Staff']

/**
 * Modal único de criar/editar pedido de camisa — ao contrário de
 * aluno (que tem ModalNovoAluno/ModalEditarAluno separados, porque "editar"
 * tem um formulário bem menor que "novo"), aqui os campos são os mesmos nos
 * dois casos, então um componente só evita duplicar todo o formulário.
 * `pedido` nulo = modo criação; preenchido = modo edição.
 *
 * O preço não é um campo livre: `PRECO_CAMISA[modalidade]` (120 encomenda /
 * 150 pronta entrega) menos o desconto é sempre o valor final, mostrado
 * como texto (não input) — evita cobrança digitada errada por engano.
 * Desconto é o único valor em dinheiro que se digita, pensado pro caso de
 * "Staff" (mas não é travado a esse caso — fica a critério de quem registra).
 */
export default function ModalPedidoCamisa({ open, onClose, pedido, onSucesso }) {
  const editando = Boolean(pedido)

  const [clienteNome, setClienteNome] = useState('')
  const [modelo, setModelo] = useState(MODELOS[0])
  const [cor, setCor] = useState(CORES[0])
  const [tamanho, setTamanho] = useState(TAMANHOS[0])
  const [tipoVenda, setTipoVenda] = useState('Venda')
  const [modalidade, setModalidade] = useState('Encomenda')
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [desconto, setDesconto] = useState('')
  const [entregue, setEntregue] = useState(false)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    if (pedido) {
      setClienteNome(pedido.cliente_nome || '')
      setModelo(pedido.modelo || MODELOS[0])
      setCor(pedido.cor || CORES[0])
      setTamanho(pedido.tamanho || TAMANHOS[0])
      setTipoVenda(pedido.tipo_venda || 'Venda')
      setModalidade(pedido.modalidade || 'Encomenda')
      setFormaPagamento(pedido.forma_pagamento || 'Pix')
      setDesconto(pedido.desconto ? String(pedido.desconto) : '')
      setEntregue(Boolean(pedido.entregue))
      setObservacao(pedido.observacao || '')
    } else {
      setClienteNome('')
      setModelo(MODELOS[0])
      setCor(CORES[0])
      setTamanho(TAMANHOS[0])
      setTipoVenda('Venda')
      setModalidade('Encomenda')
      setFormaPagamento('Pix')
      setDesconto('')
      setEntregue(false)
      setObservacao('')
    }
    setErro('')
  }, [open, pedido])

  // "Pronta entrega" já nasce entregue por padrão (vendida e levada no dia
  // da viagem) — só no modo criação, pra não sobrescrever uma decisão manual
  // já tomada ao editar um pedido existente.
  useEffect(() => {
    if (!editando) setEntregue(modalidade === 'Pronta entrega')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalidade])

  const precoBase = PRECO_CAMISA[modalidade] || 0
  const descontoNum = Number(desconto) || 0
  const valorFinal = Math.max(0, precoBase - descontoNum)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const dadosComuns = {
        clienteNome, modelo, cor, tamanho, tipoVenda, modalidade,
        formaPagamento, valor: valorFinal, desconto: descontoNum, observacao, entregue
      }
      if (editando) {
        await editarPedidoCamisa({ pedidoId: pedido.id, dataEntregaAtual: pedido.data_entrega, ...dadosComuns })
      } else {
        await criarPedidoCamisa(dadosComuns)
      }
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
      <h3>{editando ? `Editar pedido — ${pedido.cliente_nome}` : 'Novo pedido de camisa'}</h3>
      <form onSubmit={handleSubmit}>
        <label className="field-label">Nome do cliente</label>
        <input className="field-input" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} required />

        <label className="field-label">Modelo</label>
        <select className="field-input" value={modelo} onChange={(e) => setModelo(e.target.value)}>
          {MODELOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className="field-label">Cor</label>
        <select className="field-input" value={cor} onChange={(e) => setCor(e.target.value)}>
          {CORES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="field-label">Tamanho</label>
        <select className="field-input" value={tamanho} onChange={(e) => setTamanho(e.target.value)}>
          {TAMANHOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="field-label">Tipo</label>
        <select className="field-input" value={tipoVenda} onChange={(e) => setTipoVenda(e.target.value)}>
          <option value="Venda">Venda</option>
          <option value="Staff">Staff</option>
        </select>

        <label className="field-label">Encomenda ou pronta entrega</label>
        <select className="field-input" value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
          <option value="Encomenda">Encomenda (R$ {PRECO_CAMISA.Encomenda.toFixed(2)})</option>
          <option value="Pronta entrega">Pronta entrega (R$ {PRECO_CAMISA['Pronta entrega'].toFixed(2)})</option>
        </select>

        <label className="field-label">Forma de pagamento</label>
        <select className="field-input" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
          {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <label className="field-label">Desconto (R$) — opcional, ex: staff</label>
        <input
          className="field-input" type="number" min="0" step="0.01" inputMode="decimal"
          value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00"
        />

        <div className="saldo-info">Valor a cobrar: R$ {valorFinal.toFixed(2)}</div>

        <label className="checkbox-row">
          <input type="checkbox" checked={entregue} onChange={(e) => setEntregue(e.target.checked)} />
          Cliente já recebeu a camisa
        </label>

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
