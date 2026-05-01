import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Measurement, MeasurementConfig } from '../../types';
import ManageMetricsModal from '../modals/ManageMetricsModal';
import AddMeasurementModal from '../modals/AddMeasurementModal';
import { getClientProgress } from '../../services/analytics/analyticsService';
import './AnalyticsSection.css';

interface AnalyticsSectionProps {
  clientId: string;
}

type DeltaMode = 'previous' | 'initial';

export default function AnalyticsSection({
  clientId
}: AnalyticsSectionProps) {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const isCompact = viewportWidth < 768;
  const isPhone = viewportWidth < 480;

  const [activeTab, setActiveTab] = useState<'body' | 'performance'>('body');
  const [deltaMode, setDeltaMode] = useState<DeltaMode>('previous');
  const [performanceView, setPerformanceView] = useState<'bar' | 'radar'>('bar');
  const [selectedBodyMetric, setSelectedBodyMetric] = useState<string>('weight_kg');
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isLogProgressOpen, setIsLogProgressOpen] = useState(false);
  const [isManageMetricsOpen, setIsManageMetricsOpen] = useState(false);

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [configs, setConfigs] = useState<MeasurementConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const progress = await getClientProgress(clientId);
      setMeasurements(progress.measurements);
      setConfigs(progress.measurementConfigs);
      
      if (
        progress.measurementConfigs.length > 0 &&
        !progress.measurementConfigs.find((config) => config.key === selectedBodyMetric && config.category === 'body')
      ) {
        const firstBody = progress.measurementConfigs.find((config) => config.category === 'body');
        if (firstBody) setSelectedBodyMetric(firstBody.key);
      }
    } catch (err) {
      console.error('[AnalyticsSection] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Data Processing ─────────────────────────────────────────────────────────

  const bodyConfigs = useMemo(() => configs.filter(c => c.category === 'body'), [configs]);
  const perfConfigs = useMemo(() => configs.filter(c => c.category === 'performance'), [configs]);

  const sortedMs = useMemo(() => {
    return [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [measurements]);

  // Separate measurements by presence of category data to avoid "zero-dips" in charts
  const bodyMs = useMemo(() => {
    return sortedMs.filter(m => bodyConfigs.some(c => m.values && m.values[c.key] !== undefined));
  }, [sortedMs, bodyConfigs]);

  const perfMs = useMemo(() => {
    return sortedMs.filter(m => perfConfigs.some(c => m.values && m.values[c.key] !== undefined));
  }, [sortedMs, perfConfigs]);

  // Get relevant latest/previous/initial based on active tab
  const relevantMs = activeTab === 'body' ? bodyMs : perfMs;
  const latestM = relevantMs[relevantMs.length - 1];
  const initialM = relevantMs[0];
  const previousM = relevantMs.length > 1 ? relevantMs[relevantMs.length - 2] : null;

  const toggleDeltaMode = () => {
    setDeltaMode(prev => prev === 'previous' ? 'initial' : 'previous');
  };

  const getMetricData = (key: string) => {
    const current = latestM?.values?.[key] as number | undefined;
    const initial = initialM?.values?.[key] as number | undefined;
    const previous = previousM?.values?.[key] as number | undefined;

    let delta = 0;
    if (current !== undefined) {
      const compareTo = deltaMode === 'previous' ? previous : initial;
      if (compareTo !== undefined) {
        delta = current - compareTo;
      }
    }

    return { current, delta };
  };

  // ── Charts ──────────────────────────────────────────────────────────────────

  const renderLineChart = (isModal = false) => {
    // Only use measurements that actually contain the selected metric
    const trendData = bodyMs.filter(m => m.values && m.values[selectedBodyMetric] !== undefined);

    if (trendData.length < 2) {
      return <div className="analytics-chart-placeholder">Not enough data for trend chart</div>;
    }

    const data = trendData.map(m => m.values?.[selectedBodyMetric] || 0);
    const labels = trendData.map(m => m.date.slice(5));
    const maxVal = Math.max(...data) * 1.05;
    const minVal = Math.min(...data) * 0.95;
    const range = maxVal - minVal || 1;

    const chartWidth = isModal ? 800 : 600;
    const chartHeight = isModal ? 400 : 250;
    const paddingX = 40;
    const paddingY = 20;
    const plotWidth = chartWidth - paddingX * 2;
    const plotHeight = chartHeight - paddingY * 2;

    const points = data.map((val, i) => ({
      x: paddingX + (i / (data.length - 1)) * plotWidth,
      y: paddingY + plotHeight - ((val - minVal) / range) * plotHeight,
    }));

    if (!points[0]) return null;
    let pathD = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      if (!p0 || !p1) continue;
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      pathD += ` C${cp1x},${p0.y} ${cp1x},${p1.y} ${p1.x},${p1.y}`;
    }

    const lastPoint = points[points.length - 1];
    if (!lastPoint) return null;
    const fillPath = `${pathD} L${lastPoint.x},${chartHeight - paddingY} L${points[0].x},${chartHeight - paddingY} Z`;
    
    const config = configs.find(c => c.key === selectedBodyMetric);

    return (
      <div 
        style={{ width: '100%', cursor: isModal ? 'default' : 'pointer' }}
        onClick={() => !isModal && setIsChartModalOpen(true)}
      >
        <div className="analytics-chart-title">{config?.label} Trend</div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="analytics-line-chart">
          <defs>
            <linearGradient id={`chartGradient-${isModal}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(p => {
            const y = paddingY + plotHeight - p * plotHeight;
            const val = (minVal + p * range).toFixed(1);
            return (
              <g key={p}>
                <line 
                  x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} 
                  stroke="#333" strokeWidth="1" strokeDasharray="4 4" 
                />
                <text x={paddingX - 10} y={y + 4} fill="#666" fontSize={isModal ? 12 : 10} textAnchor="end">{val}</text>
              </g>
            );
          })}

          <path d={fillPath} fill={`url(#chartGradient-${isModal})`} />
          <path d={pathD} fill="none" stroke="#FFD700" strokeWidth={isModal ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? (isModal ? 8 : 6) : (isModal ? 5 : 4)} fill="#FFD700" />
              <text x={p.x} y={chartHeight - 5} fill="#666" fontSize={isModal ? 12 : 10} textAnchor="middle">{labels[i]}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderBarChart = (isModal = false) => {
    if (perfConfigs.length === 0 || perfMs.length === 0) return null;
    const maxVal = Math.max(...perfConfigs.map(c => latestM?.values?.[c.key] || 0), 1);
    const barMaxHeight = isModal ? 300 : 180;

    return (
      <div 
        style={{ width: '100%', cursor: isModal ? 'default' : 'pointer' }}
        onClick={() => !isModal && setIsChartModalOpen(true)}
      >
        <div className="analytics-chart-title">Session Comparison</div>
        <div className="analytics-bar-chart" style={{ height: isModal ? '380px' : '260px' }}>
          {perfConfigs.map(c => {
            const val = latestM?.values?.[c.key] || 0;
            const height = Math.max((val / maxVal) * barMaxHeight, 8);
            return (
              <div key={c.key} className="analytics-bar-column">
                <span className="analytics-bar-value" style={{ fontSize: isModal ? '14px' : '12px' }}>{val}</span>
                <div className="analytics-bar" style={{ 
                  height, 
                  width: isModal ? '48px' : '32px',
                  background: 'linear-gradient(180deg, #FFD700 0%, #B8960F 100%)' 
                }} />
                <span className="analytics-bar-label" style={{ fontSize: isModal ? '12px' : '10px' }}>
                  {isPhone ? c.label.charAt(0) : c.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRadarChart = (isModal = false) => {
    if (perfConfigs.length === 0 || perfMs.length === 0) return null;
    const size = isModal ? 400 : (isPhone ? 184 : (isCompact ? 220 : 240));
    const center = size / 2;
    const radius = isModal ? 150 : (isPhone ? 60 : (isCompact ? 74 : 85));
    const angleStep = (Math.PI * 2) / perfConfigs.length;

    const getPoint = (val: number, index: number, max: number = 100) => {
      const normalized = Math.min((val / max), 1) * radius;
      const angle = index * angleStep - Math.PI / 2;
      return { x: center + normalized * Math.cos(angle), y: center + normalized * Math.sin(angle) };
    };

    const points = perfConfigs.map((c, i) => getPoint(latestM?.values?.[c.key] || 0, i, c.target_max || 100));
    const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <div 
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: isModal ? 'default' : 'pointer' }}
        onClick={() => !isModal && setIsChartModalOpen(true)}
      >
        <div className="analytics-chart-title">Normalization Radar</div>
        <svg width={size} height={size}>
          {perfConfigs.map((c, i) => {
            const end = getPoint(c.target_max || 100, i, c.target_max || 100);
            return (
              <g key={i}>
                <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#333" strokeWidth="1" />
                <text x={end.x} y={end.y - 8} fill="#666" fontSize={isModal ? '12' : (isPhone ? '8' : '10')} textAnchor="middle">{isPhone ? c.label.charAt(0) : c.label}</text>
              </g>
            );
          })}
          {[0.25, 0.5, 0.75, 1].map(r => <circle key={r} cx={center} cy={center} r={radius * r} fill="none" stroke="#222" strokeWidth="1" />)}
          <polygon points={polygonPoints} fill="rgba(255, 215, 0, 0.3)" stroke="#FFD700" strokeWidth="2" />
        </svg>
      </div>
    );
  };

  if (loading) return <div className="analytics-section loading">Loading analytics...</div>;

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <div className="analytics-tab-container">
          <button className={`analytics-tab ${activeTab === 'body' ? 'analytics-tab--active' : ''}`} onClick={() => setActiveTab('body')}>
            <div className="analytics-tab__icon-circle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'body' ? '#000' : '#444'} strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="analytics-tab__text">BODY</span>
          </button>

          <button className={`analytics-tab ${activeTab === 'performance' ? 'analytics-tab--active' : ''}`} onClick={() => setActiveTab('performance')}>
            <div className="analytics-tab__icon-circle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'performance' ? '#000' : '#444'} strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12h.01M13 2v2M13 20v2M22 13h-2M4 13H2M14.5 9l-2.5 2.5 2.5 2.5M9.5 15l2.5-2.5-2.5-2.5"/>
              </svg>
            </div>
            <span className="analytics-tab__text">PERFORMANCE</span>
          </button>
        </div>

        <button className="analytics-manage-btn" onClick={() => setIsManageMetricsOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </button>
      </div>

      <div className="analytics-cards-scroll">
        <div className="analytics-cards-content">
          {(activeTab === 'body' ? bodyConfigs : perfConfigs).map(c => {
            const { current, delta } = getMetricData(c.key);
            const deltaColor = delta > 0 ? '#3DCC88' : delta < 0 ? '#FF5252' : '#666';
            const deltaSign = delta > 0 ? '+' : '';
            const isSelected = activeTab === 'body' && c.key === selectedBodyMetric;

            return (
              <div key={c.key} className={`analytics-card ${isSelected ? 'analytics-card--active' : ''}`} onClick={() => activeTab === 'body' ? setSelectedBodyMetric(c.key) : toggleDeltaMode()}>
                <div className="analytics-card__label">{c.label.toUpperCase()}</div>
                <div className="analytics-card__value-row">
                  <span className="analytics-card__value">{current ?? '—'}<span className="analytics-card__unit">{c.unit}</span></span>
                </div>
                <div className="analytics-card__delta" style={{ color: deltaColor }}>{deltaSign}{delta.toFixed(1)}{c.unit}<span className="analytics-card__delta-mode"> vs {deltaMode}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      {activeTab === 'performance' && (
        <div className="analytics-perf-toggle">
          <button className={`perf-toggle-btn ${performanceView === 'bar' ? 'active' : ''}`} onClick={() => setPerformanceView('bar')}>
            {isPhone ? 'Compare' : 'Bar (Compare)'}
          </button>
          <button className={`perf-toggle-btn ${performanceView === 'radar' ? 'active' : ''}`} onClick={() => setPerformanceView('radar')}>
            {isPhone ? 'Radar' : 'Radar (Overview)'}
          </button>
        </div>
      )}

      <div className="analytics-chart-area">
        {activeTab === 'body' ? renderLineChart() : (performanceView === 'bar' ? renderBarChart() : renderRadarChart())}
      </div>

      <button className="analytics-add-btn" onClick={() => setIsLogProgressOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span className="analytics-add-btn__text">Log Progress</span>
      </button>

      {isChartModalOpen && createPortal(
        <div className="chart-modal-overlay" onClick={() => setIsChartModalOpen(false)}>
          <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
            <div className="chart-modal-header">
              <h3>TREND OVERVIEW</h3>
              <button className="chart-modal-close" onClick={() => setIsChartModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="chart-modal-body">{activeTab === 'body' ? renderLineChart(true) : (performanceView === 'bar' ? renderBarChart(true) : renderRadarChart(true))}</div>
          </div>
        </div>,
        document.body
      )}

      <ManageMetricsModal 
        visible={isManageMetricsOpen}
        clientId={clientId}
        onClose={() => setIsManageMetricsOpen(false)}
        onSuccess={loadData}
      />

      <AddMeasurementModal 
        visible={isLogProgressOpen}
        clientId={clientId}
        onClose={() => setIsLogProgressOpen(false)}
        onSuccess={() => { setIsLogProgressOpen(false); loadData(); }}
      />
    </div>
  );
}
