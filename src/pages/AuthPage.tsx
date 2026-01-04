import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
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

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña para registrarte.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (signUpError) {
      setError(signUpError.message)
    } else if (data.session) {
      setNotice('Registro completado. ¡Bienvenido!')
    } else {
      setNotice('Revisa tu correo para confirmar tu cuenta.')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Ops Roster</h1>
        <p className="subtitle">
          {authMode === 'login'
            ? 'Inicia sesión para acceder a la planificación.'
            : 'Crea tu cuenta para comenzar a planificar.'}
        </p>
        <div className="auth-mode-toggle" role="tablist" aria-label="Modo de autenticación">
          <button
            className="secondary-button"
            type="button"
            role="tab"
            aria-selected={authMode === 'login'}
            onClick={() => {
              setAuthMode('login')
              setError(null)
              setNotice(null)
            }}
            disabled={isSubmitting}
          >
            Iniciar sesión
          </button>
          <button
            className="secondary-button"
            type="button"
            role="tab"
            aria-selected={authMode === 'register'}
            onClick={() => {
              setAuthMode('register')
              setError(null)
              setNotice(null)
            }}
            disabled={isSubmitting}
          >
            Registrarse
          </button>
        </div>
        <form className="auth-form" onSubmit={authMode === 'login' ? handlePasswordLogin : handleRegister}>
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
              {authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
            {authMode === 'login' ? (
              <button className="secondary-button" type="button" onClick={handleMagicLink} disabled={isSubmitting}>
                Enviar enlace mágico
              </button>
            ) : null}
          </div>
        </form>
        {error ? <p className="auth-message error">{error}</p> : null}
        {notice ? <p className="auth-message success">{notice}</p> : null}
      </div>
    </div>
  )
}
