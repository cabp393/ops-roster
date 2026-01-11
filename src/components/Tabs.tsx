import { CalendarDays, Settings, Truck, Users } from 'lucide-react'

type TabKey = 'planning' | 'workers' | 'equipments' | 'setup'

type TabsProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

const tabs: { key: TabKey; label: string; hint: string; icon: JSX.Element }[] = [
  {
    key: 'planning',
    label: 'Plan semanal',
    hint: 'Turnos y roles',
    icon: <CalendarDays size={18} />,
  },
  {
    key: 'workers',
    label: 'Equipo',
    hint: 'Dotación y contratos',
    icon: <Users size={18} />,
  },
  {
    key: 'equipments',
    label: 'Flota',
    hint: 'Maquinaria y estado',
    icon: <Truck size={18} />,
  },
  {
    key: 'setup',
    label: 'Parámetros',
    hint: 'Catálogos base',
    icon: <Settings size={18} />,
  },
]

export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <nav className="nav-stack">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeTab === tab.key ? 'nav-link active' : 'nav-link'}
          onClick={() => onChange(tab.key)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-text">
            <span className="nav-label">{tab.label}</span>
            <span className="nav-hint">{tab.hint}</span>
          </span>
        </button>
      ))}
    </nav>
  )
}
