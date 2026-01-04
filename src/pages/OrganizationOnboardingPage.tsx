import { useState } from 'react'
import { createOrganizationWithOwner } from '../lib/storage'

type OrganizationOnboardingPageProps = {
  onOrganizationCreated: (organization: { id: string; name: string }) => void
  onSignOut: () => void
}

export function OrganizationOnboardingPage({
  onOrganizationCreated,
  onSignOut,
}: OrganizationOnboardingPageProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const organization = await createOrganizationWithOwner(name)
      onOrganizationCreated(organization)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la organización.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Ops Roster</h1>
          <p className="subtitle">Turnos y dotación por organización</p>
        </div>
        <button className="auth-secondary" type="button" onClick={onSignOut}>
          Cerrar sesión
        </button>
      </header>
      <main className="content">
        <h2>Crear organización</h2>
        <p className="helper-text">
          Necesitas una organización para comenzar. Crea la primera y te asignaremos como owner.
        </p>
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <label className="field">
            Nombre
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de la organización"
              disabled={isSubmitting}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creando...' : 'Crear'}
          </button>
        </form>
        {error ? <p className="helper-text">{error}</p> : null}
      </main>
    </div>
  )
}
