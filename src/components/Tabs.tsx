type TabKey = 'planning' | 'workers' | 'equipments' | 'setup'

type TabsProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'planning', label: 'Planning' },
  { key: 'workers', label: 'Workers' },
  { key: 'equipments', label: 'Equipos' },
  { key: 'setup', label: 'Setup' },
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
