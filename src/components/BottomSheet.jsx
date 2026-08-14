export default function BottomSheet({ open, onClose, children }) {
  return (
    <div
      className={`overlay ${open ? 'open' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="sheet">
        <div className="grip" />
        {children}
      </div>
    </div>
  )
}
