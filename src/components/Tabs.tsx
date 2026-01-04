type TabKey = 'planning' | 'workers' | 'equipments' | 'setup'

type TabsProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'planning', label: 'Planificación' },
  { key: 'workers', label: 'Trabajadores' },
  { key: 'equipments', label: 'Equipos' },
  { key: 'setup', label: 'Configuración' },
]

export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeTab === tab.key ? 'tab active' : 'tab'}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
