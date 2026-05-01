import './TabBar.css';

export interface TabDefinition {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface TabBarProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

/**
 * Segmented tab bar — matches reference TabBar exactly.
 * Dark pill container, active tab has gold border glow, icon + label.
 */
export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-bar__scroll">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              className={`tab-bar__tab ${isActive ? 'tab-bar__tab--active' : ''}`}
              onClick={() => onTabChange(tab.key)}
              aria-label={tab.label}
              title={tab.label}
            >
              <span className="tab-bar__icon">{tab.icon}</span>
              <span className="tab-bar__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
