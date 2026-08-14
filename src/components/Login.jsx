import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!email || !senha) {
      setErro('Preencha e-mail e senha.')
      return
    }
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-name" style={{ fontSize: 24 }}>MENDES</div>
        <div className="brand-sub" style={{ marginBottom: 28 }}>SURF HOUSE</div>

        <form onSubmit={handleSubmit}>
          <label className="field-label">E-mail</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
          />

          <label className="field-label">Senha</label>
          <input
            className="field-input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />

          {erro && <div className="form-msg erro" style={{ display: 'block' }}>{erro}</div>}

          <button className="primary-btn" type="submit" disabled={carregando} style={{ marginTop: 20 }}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
