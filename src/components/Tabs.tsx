type TabKey = 'planning' | 'summary' | 'restrictions' | 'workers' | 'setup'

type TabsProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'planning', label: 'Planificación' },
  { key: 'summary', label: 'Resumen' },
  { key: 'restrictions', label: 'Restricciones' },
  { key: 'workers', label: 'Dotación' },
  { key: 'setup', label: 'Catálogos' },
]

export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <nav className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={activeTab === tab.key ? 'tab active' : 'tab'}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
