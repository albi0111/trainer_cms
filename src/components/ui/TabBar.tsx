import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './TabBar.css';
import { useHaptic } from '../../hooks/useHaptic';

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
  const haptic = useHaptic();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activePillStyle, setActivePillStyle] = useState<{ width: number; x: number; ready: boolean }>({
    width: 0,
    x: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const activeElement = tabRefs.current[activeTab];
    if (!activeElement) {
      return;
    }

    setActivePillStyle({
      width: activeElement.offsetWidth,
      x: activeElement.offsetLeft,
      ready: true,
    });
  }, [activeTab, tabs]);

  useEffect(() => {
    const syncActivePill = () => {
      const activeElement = tabRefs.current[activeTab];
      if (!activeElement) {
        return;
      }

      setActivePillStyle({
        width: activeElement.offsetWidth,
        x: activeElement.offsetLeft,
        ready: true,
      });

      activeElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
    };

    syncActivePill();

    const handleResize = () => {
      syncActivePill();
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && scrollRef.current) {
      resizeObserver = new ResizeObserver(syncActivePill);
      resizeObserver.observe(scrollRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [activeTab]);

  return (
    <div className="tab-bar">
      <div className="tab-bar__scroll" ref={scrollRef}>
        <span
          className={`tab-bar__active-pill ${activePillStyle.ready ? 'tab-bar__active-pill--ready' : ''}`}
          style={{
            width: `${activePillStyle.width}px`,
            transform: `translateX(${activePillStyle.x}px)`,
          }}
          aria-hidden="true"
        />
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[tab.key] = element;
              }}
              className={`tab-bar__tab tab-item pressable ${isActive ? 'tab-bar__tab--active' : ''}`}
              onClick={() => {
                if (tab.key === activeTab) {
                  return;
                }

                haptic.light();
                onTabChange(tab.key);
              }}
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
