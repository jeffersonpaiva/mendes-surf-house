import { useState } from 'react'
import { usePaginatedQuery } from '../lib/usePaginatedQuery'
import { PEDIDOS_LISTA_CONFIG } from '../lib/queries'
import BottomSheet from './BottomSheet'
import ModalPedidoCamisa from './ModalPedidoCamisa'
import { IconFilter, IconCheckCircle } from './Icons'

/**
 * Tela "Vendas" — controle de vendas das camisas da surf trip. Mesmo padrão
 * da tela "Alunos" (AlunosGrid.jsx): grid de cards responsivo, busca + um
 * botão "Filtros", paginação por cursor via usePaginatedQuery. Diferença:
 * aqui não existe um "menu de ação" compartilhado com outra tela — o botão
 * "+" e o modal de criar/editar pedido são inteiramente locais a este
 * componente (não passam por App.jsx/QuickActionSheet), porque a
 * funcionalidade inteira de vendas vive só nesta tela.
 *
 * Acesso: tela visível pra admin e pro papel novo "vendedor" (que só vê
 * esta tela — ver App.jsx). A restrição de verdade é no RLS do banco (ver
 * scripts/sql/2026-09-07-vendas-camisas.sql); o app só reflete isso na nav.
 */
export default function VendasGrid({ refreshToken }) {
  const [modalidadeFiltro, setModalidadeFiltro] = useState('todas') // 'todas' | 'Encomenda' | 'Pronta entrega'
  const [statusFiltro, setStatusFiltro] = useState('todos') // 'todos' | 'entregue' | 'pendente'
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false)
  const [rascunhoModalidade, setRascunhoModalidade] = useState('todas')
  const [rascunhoStatus, setRascunhoStatus] = useState('todos')

  const [modalPedidoAberto, setModalPedidoAberto] = useState(false)
  const [pedidoEditando, setPedidoEditando] = useState(null)
  // Contador local — some com o refreshToken (vindo de App.jsx) numa chave
  // composta, pra recarregar a lista tanto quando algo mudar em outra tela
  // (não deve acontecer hoje, mas mantém o padrão) quanto quando um pedido é
  // criado/editado aqui dentro, sem precisar subir esse evento até App.jsx.
  const [refreshLocal, setRefreshLocal] = useState(0)

  const filtros = {}
  if (modalidadeFiltro !== 'todas') filtros.modalidade = modalidadeFiltro
  if (statusFiltro === 'entregue') filtros.entregue = true
  if (statusFiltro === 'pendente') filtros.entregue = false
  const filtrosAtivos = modalidadeFiltro !== 'todas' || statusFiltro !== 'todos'

  function abrirModalFiltros() {
    setRascunhoModalidade(modalidadeFiltro)
    setRascunhoStatus(statusFiltro)
    setModalFiltrosAberto(true)
  }

  function aplicarFiltros() {
    setModalidadeFiltro(rascunhoModalidade)
    setStatusFiltro(rascunhoStatus)
    setModalFiltrosAberto(false)
  }

  function limparFiltros() {
    setRascunhoModalidade('todas')
    setRascunhoStatus('todos')
    setModalidadeFiltro('todas')
    setStatusFiltro('todos')
    setModalFiltrosAberto(false)
  }

  function abrirNovoPedido() {
    setPedidoEditando(null)
    setModalPedidoAberto(true)
  }

  function abrirEditarPedido(pedido) {
    setPedidoEditando(pedido)
    setModalPedidoAberto(true)
  }

  function aoSalvarPedido() {
    setRefreshLocal((v) => v + 1)
  }

  const {
    itens: pedidos,
    carregando,
    carregandoMais,
    temMais,
    busca,
    setBusca,
    carregarMais
  } = usePaginatedQuery({
    ...PEDIDOS_LISTA_CONFIG,
    pageSize: 24,
    filtros,
    sinalRecarregar: `${refreshToken}:${refreshLocal}`
  })

  return (
    <div className="alunos-tela">
      <div className="search-filtro-row">
        <div className="search">
          <input
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`filter-btn ${filtrosAtivos ? 'ativo' : ''}`}
          onClick={abrirModalFiltros}
        >
          <IconFilter size={16} strokeWidth={2} />
          Filtros
          {filtrosAtivos && <span className="filter-btn-dot" />}
        </button>
      </div>

      <div className="alunos-grid">
        {carregando && pedidos.length === 0 && (
          <div className="alunos-grid-vazio">Carregando...</div>
        )}
        {!carregando && pedidos.length === 0 && (
          <div className="alunos-grid-vazio">Nenhum pedido encontrado.</div>
        )}
        {pedidos.map((pedido) => (
          <div className="aluno-card pedido-card" key={pedido.id} onClick={() => abrirEditarPedido(pedido)}>
            <div className="aluno-card-top">
              <div className="aluno-card-info">
                <div className="nome">{pedido.cliente_nome}</div>
                <div className="telefone">
                  {pedido.modelo} &middot; {pedido.cor} &middot; {pedido.tamanho}
                  {pedido.tipo_venda === 'Staff' && ' · Staff'}
                </div>
              </div>
            </div>
            <div className="pedido-card-bottom">
              <span className="pedido-valor">R$ {Number(pedido.valor).toFixed(2)}</span>
              <span className={`badge ${pedido.entregue ? 'ok' : 'low'}`}>
                {pedido.entregue ? <><IconCheckCircle size={12} strokeWidth={2.4} /> Entregue</> : `${pedido.modalidade} pendente`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {temMais && (
        <div className="load-more-wrap">
          <button type="button" className="secondary-btn" onClick={carregarMais} disabled={carregandoMais}>
            {carregandoMais ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}

      <button className="fab" onClick={abrirNovoPedido}>+</button>

      <BottomSheet open={modalFiltrosAberto} onClose={() => setModalFiltrosAberto(false)}>
        <h3>Filtrar pedidos</h3>

        <label className="field-label">Modalidade</label>
        <select
          className="field-input"
          value={rascunhoModalidade}
          onChange={(e) => setRascunhoModalidade(e.target.value)}
        >
          <option value="todas">Todas</option>
          <option value="Encomenda">Encomenda</option>
          <option value="Pronta entrega">Pronta entrega</option>
        </select>

        <label className="field-label">Status</label>
        <select
          className="field-input"
          value={rascunhoStatus}
          onChange={(e) => setRascunhoStatus(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="entregue">Entregue</option>
          <option value="pendente">Pendente</option>
        </select>

        <div className="sheet-actions">
          <button type="button" className="secondary-btn" onClick={limparFiltros}>
            Limpar filtros
          </button>
          <button type="button" className="primary-btn" onClick={aplicarFiltros}>
            Aplicar
          </button>
        </div>
      </BottomSheet>

      <ModalPedidoCamisa
        open={modalPedidoAberto}
        onClose={() => setModalPedidoAberto(false)}
        pedido={pedidoEditando}
        onSucesso={aoSalvarPedido}
      />
    </div>
  )
}
