import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      setError(signInError.message)
    } else {
      setNotice('Sesión iniciada.')
    }
    setIsSubmitting(false)
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Ingresa tu correo para recibir el enlace.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (otpError) {
      setError(otpError.message)
    } else {
      setNotice('Revisa tu correo para continuar.')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Ops Roster</h1>
        <p className="subtitle">Inicia sesión para acceder a la planificación.</p>
        <form className="auth-form" onSubmit={handlePasswordLogin}>
          <label className="field">
            Correo
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@empresa.com"
              required
            />
          </label>
          <label className="field">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          <div className="auth-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              Entrar
            </button>
            <button className="secondary-button" type="button" onClick={handleMagicLink} disabled={isSubmitting}>
              Enviar enlace mágico
            </button>
          </div>
        </form>
        {error ? <p className="auth-message error">{error}</p> : null}
        {notice ? <p className="auth-message success">{notice}</p> : null}
      </div>
    </div>
  )
}
