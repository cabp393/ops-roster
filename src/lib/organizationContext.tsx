import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getOrganizationMemberRole } from './storage'
import { supabase } from './supabaseClient'
import type { OrganizationMemberRole } from '../types'

const ORGANIZATION_STORAGE_KEY = 'opsRoster:organizationId'

type Organization = {
  id: string
  name: string
}

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrganizationId: string | null
  setActiveOrganizationId: (id: string | null) => void
  refreshOrganizations: () => Promise<void>
  memberRole: OrganizationMemberRole | null
  canWrite: boolean
  refreshMemberRole: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

function loadStoredOrganizationId() {
  return localStorage.getItem(ORGANIZATION_STORAGE_KEY)
}

function storeOrganizationId(id: string | null) {
  if (!id) {
    localStorage.removeItem(ORGANIZATION_STORAGE_KEY)
    return
  }
  localStorage.setItem(ORGANIZATION_STORAGE_KEY, id)
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() => {
    return loadStoredOrganizationId()
  })
  const [memberRole, setMemberRole] = useState<OrganizationMemberRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshOrganizations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) {
        setOrganizations([])
        setMemberRole(null)
        setIsLoading(false)
        return
      }
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('id,name')
        .order('name')
      if (orgError) throw orgError
      const list = data ?? []
      setOrganizations(list)
      const activeExists = activeOrganizationId
        ? list.some((org) => org.id === activeOrganizationId)
        : false
      if (list.length === 0) {
        setActiveOrganizationIdState(null)
        storeOrganizationId(null)
        setMemberRole(null)
        setIsLoading(false)
        return
      }
      if (!activeOrganizationId || !activeExists) {
        const nextId = list[0].id
        setActiveOrganizationIdState(nextId)
        storeOrganizationId(nextId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [activeOrganizationId])

  const refreshMemberRole = useCallback(async () => {
    if (!activeOrganizationId) {
      setMemberRole(null)
      return
    }
    try {
      const role = await getOrganizationMemberRole(activeOrganizationId)
      setMemberRole(role)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo validar el rol de la organización.'
      setError(message)
      setMemberRole(null)
    }
  }, [activeOrganizationId])

  useEffect(() => {
    void refreshOrganizations()
  }, [refreshOrganizations])

  useEffect(() => {
    void refreshMemberRole()
  }, [refreshMemberRole])

  const setActiveOrganizationId = useCallback((id: string | null) => {
    setActiveOrganizationIdState(id)
    storeOrganizationId(id)
  }, [])

  const value = useMemo(
    () => ({
      organizations,
      activeOrganizationId,
      setActiveOrganizationId,
      refreshOrganizations,
      memberRole,
      canWrite: memberRole === 'editor' || memberRole === 'owner',
      refreshMemberRole,
      isLoading,
      error,
    }),
    [
      organizations,
      activeOrganizationId,
      setActiveOrganizationId,
      refreshOrganizations,
      memberRole,
      refreshMemberRole,
      isLoading,
      error,
    ],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
