import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Measurement, MeasurementConfig } from '../../types';
import ManageMetricsModal from '../modals/ManageMetricsModal';
import AddMeasurementModal from '../modals/AddMeasurementModal';
import OdometerNumber from '../OdometerNumber';
import SkeletonScheduleCard from '../skeletons/SkeletonScheduleCard';
import SkeletonStatCard from '../skeletons/SkeletonStatCard';
import { getClientProgress } from '../../services/analytics/analyticsService';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';
import './AnalyticsSection.css';

interface AnalyticsSectionProps {
  clientId: string;
}

type DeltaMode = 'previous' | 'initial';
type PillStyle = { width: number; x: number; ready: boolean };
type ChartRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const CHART_MODAL_OPENING_MS = 200;
const CHART_MODAL_CLOSING_MS = 280;
const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export default function AnalyticsSection({
  clientId
}: AnalyticsSectionProps) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  const isPhone = viewportWidth < 480;

  const [activeTab, setActiveTab] = useState<'body' | 'performance'>('body');
  const deltaMode: DeltaMode = 'previous';
  const [performanceView, setPerformanceView] = useState<'bar' | 'radar'>('bar');
  const [selectedBodyMetric, setSelectedBodyMetric] = useState<string>('weight_kg');
  const [selectedPerformanceMetric, setSelectedPerformanceMetric] = useState<string>('');
  const [chartRange, setChartRange] = useState<ChartRange>('3M');
  const [hoveredChartPoint, setHoveredChartPoint] = useState<number | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isChartModalPresent, setIsChartModalPresent] = useState(false);
  const [isChartModalOpening, setIsChartModalOpening] = useState(false);
  const [isLogProgressOpen, setIsLogProgressOpen] = useState(false);
  const [isManageMetricsOpen, setIsManageMetricsOpen] = useState(false);
  const chartModalCloseTimeoutRef = useRef<number | null>(null);
  const chartModalOpeningTimeoutRef = useRef<number | null>(null);
  const chartModalOverlayRef = useRef<HTMLDivElement>(null);
  const chartModalContentRef = useRef<HTMLDivElement>(null);
  const analyticsTabContainerRef = useRef<HTMLDivElement>(null);
  const analyticsTabRefs = useRef<Record<'body' | 'performance', HTMLButtonElement | null>>({
    body: null,
    performance: null,
  });
  const perfToggleContainerRef = useRef<HTMLDivElement>(null);
  const perfToggleRefs = useRef<Record<'bar' | 'radar', HTMLButtonElement | null>>({
    bar: null,
    radar: null,
  });
  const [analyticsTabPillStyle, setAnalyticsTabPillStyle] = useState<PillStyle>({
    width: 0,
    x: 0,
    ready: false,
  });
  const [perfTogglePillStyle, setPerfTogglePillStyle] = useState<PillStyle>({
    width: 0,
    x: 0,
    ready: false,
  });

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [configs, setConfigs] = useState<MeasurementConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);
  const canOpenChartModal = true;
  const hasLoadedAnalyticsRef = useRef(false);

  useModalVelocityDismiss({
    visible: isChartModalOpen,
    onClose: () => setIsChartModalOpen(false),
    overlayRef: chartModalOverlayRef,
    sheetRef: chartModalContentRef,
    enabled: false,
  });

  useEffect(() => {
    loadData();
  }, [clientId]);

  useEffect(() => {
    hasLoadedAnalyticsRef.current = false;
    setShowLoadingSkeleton(false);
  }, [clientId]);

  useEffect(() => {
    if (hasLoadedAnalyticsRef.current || !loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoadingSkeleton(true);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    hasLoadedAnalyticsRef.current = true;

    if (!showLoadingSkeleton) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoadingSkeleton(false);
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading, showLoadingSkeleton]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (chartModalCloseTimeoutRef.current !== null) {
      window.clearTimeout(chartModalCloseTimeoutRef.current);
      chartModalCloseTimeoutRef.current = null;
    }

    if (chartModalOpeningTimeoutRef.current !== null) {
      window.clearTimeout(chartModalOpeningTimeoutRef.current);
      chartModalOpeningTimeoutRef.current = null;
    }

    if (isChartModalOpen) {
      setIsChartModalPresent(true);
      setIsChartModalOpening(true);
      chartModalOpeningTimeoutRef.current = window.setTimeout(() => {
        setIsChartModalOpening(false);
        chartModalOpeningTimeoutRef.current = null;
      }, CHART_MODAL_OPENING_MS);
      return;
    }

    setIsChartModalOpening(false);
    if (!isChartModalPresent) {
      return;
    }

    chartModalCloseTimeoutRef.current = window.setTimeout(() => {
      setIsChartModalPresent(false);
      chartModalCloseTimeoutRef.current = null;
    }, CHART_MODAL_CLOSING_MS);
  }, [isChartModalOpen, isChartModalPresent]);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') {
        return;
      }

      if (chartModalCloseTimeoutRef.current !== null) {
        window.clearTimeout(chartModalCloseTimeoutRef.current);
      }

      if (chartModalOpeningTimeoutRef.current !== null) {
        window.clearTimeout(chartModalOpeningTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    syncViewportWidth();
    window.addEventListener('resize', syncViewportWidth);

    return () => {
      window.removeEventListener('resize', syncViewportWidth);
    };
  }, []);

  useLayoutEffect(() => {
    const activeElement = analyticsTabRefs.current[activeTab];
    if (!activeElement) {
      return;
    }

    setAnalyticsTabPillStyle({
      width: activeElement.offsetWidth,
      x: activeElement.offsetLeft,
      ready: true,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    const activeElement = perfToggleRefs.current[performanceView];
    if (!activeElement) {
      return;
    }

    setPerfTogglePillStyle({
      width: activeElement.offsetWidth,
      x: activeElement.offsetLeft,
      ready: true,
    });
  }, [performanceView, activeTab]);

  useEffect(() => {
    const syncAnalyticsTabPill = () => {
      const activeElement = analyticsTabRefs.current[activeTab];
      if (!activeElement) {
        return;
      }

      setAnalyticsTabPillStyle({
        width: activeElement.offsetWidth,
        x: activeElement.offsetLeft,
        ready: true,
      });
    };

    syncAnalyticsTabPill();

    const handleResize = () => {
      syncAnalyticsTabPill();
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && analyticsTabContainerRef.current) {
      resizeObserver = new ResizeObserver(syncAnalyticsTabPill);
      resizeObserver.observe(analyticsTabContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'performance') {
      return undefined;
    }

    const syncPerfTogglePill = () => {
      const activeElement = perfToggleRefs.current[performanceView];
      if (!activeElement) {
        return;
      }

      setPerfTogglePillStyle({
        width: activeElement.offsetWidth,
        x: activeElement.offsetLeft,
        ready: true,
      });
    };

    syncPerfTogglePill();

    const handleResize = () => {
      syncPerfTogglePill();
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && perfToggleContainerRef.current) {
      resizeObserver = new ResizeObserver(syncPerfTogglePill);
      resizeObserver.observe(perfToggleContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [activeTab, performanceView]);

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

      if (
        progress.measurementConfigs.length > 0 &&
        !progress.measurementConfigs.find((config) => config.key === selectedPerformanceMetric && config.category === 'performance')
      ) {
        const firstPerformance = progress.measurementConfigs.find((config) => config.category === 'performance');
        if (firstPerformance) setSelectedPerformanceMetric(firstPerformance.key);
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

  const getRangeStartDate = (range: ChartRange, latestDate: string) => {
    if (range === 'ALL') {
      return '';
    }

    const date = new Date(`${latestDate}T12:00:00`);
    const months = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 12;
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0] || latestDate;
  };

  const buildCatmullRomPath = (points: Array<{ x: number; y: number }>, tension = 0.4) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M${points[0]!.x},${points[0]!.y}`;

    let path = `M${points[0]!.x},${points[0]!.y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[Math.max(0, index - 1)]!;
      const p1 = points[index]!;
      const p2 = points[index + 1]!;
      const p3 = points[Math.min(points.length - 1, index + 2)]!;
      const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
      const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
      const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
      const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
  };

  const renderLineChart = (isModal = false) => {
    const selectedMetric = activeTab === 'body' ? selectedBodyMetric : selectedPerformanceMetric;
    const metricConfigs = activeTab === 'body' ? bodyConfigs : perfConfigs;
    const metricMeasurements = activeTab === 'body' ? bodyMs : perfMs;
    const config = metricConfigs.find(c => c.key === selectedMetric) || metricConfigs[0];

    if (!config) {
      return <div className="analytics-chart-placeholder">No metric selected</div>;
    }

    const fullTrendData = metricMeasurements.filter(m => m.values && m.values[config.key] !== undefined);
    const latestTrendDate = fullTrendData[fullTrendData.length - 1]?.date;
    const rangeStart = latestTrendDate ? getRangeStartDate(chartRange, latestTrendDate) : '';
    const trendData = fullTrendData.filter(m => !rangeStart || m.date >= rangeStart);

    if (trendData.length < 2) {
      return <div className="analytics-chart-placeholder">Not enough data for trend chart</div>;
    }

    const chartId = `analytics-${activeTab}-${config.key}-${isModal ? 'modal' : 'inline'}`;
    const data = trendData.map(m => Number(m.values?.[config.key] || 0));
    const labels = trendData.map(m => m.date.slice(5));
    const rawMax = Math.max(...data);
    const rawMin = Math.min(...data);
    const topPad = Math.max((rawMax - rawMin) * 0.18, rawMax * 0.04, 1);
    const bottomPad = Math.max((rawMax - rawMin) * 0.12, rawMin * 0.02, 1);
    const maxVal = rawMax + topPad;
    const minVal = Math.max(0, rawMin - bottomPad);
    const range = maxVal - minVal || 1;

    const chartWidth = isModal ? 860 : 720;
    const chartHeight = isModal ? 440 : 320;
    const paddingLeft = 18;
    const paddingRight = 58;
    const paddingTop = 46;
    const paddingBottom = 42;
    const plotHeight = chartHeight - paddingTop - paddingBottom;

    const points = data.map((val, i) => ({
      x: paddingLeft + (i / (data.length - 1)) * (chartWidth - paddingLeft - paddingRight),
      y: paddingTop + plotHeight - ((val - minVal) / range) * plotHeight,
      value: val,
      date: trendData[i]?.date || '',
      label: labels[i] || '',
    }));

    const pathD = buildCatmullRomPath(points, 0.4);

    const lastPoint = points[points.length - 1];
    if (!lastPoint) return null;
    const fillPath = `${pathD} L${lastPoint.x},${chartHeight - paddingBottom} L${points[0]!.x},${chartHeight - paddingBottom} Z`;
    const tooltipPoint = hoveredChartPoint !== null ? points[hoveredChartPoint] : null;

    return (
      <div
        className="analytics-chart-panel"
        style={{ cursor: !isModal && canOpenChartModal ? 'pointer' : 'default' }}
        onClick={() => {
          if (!isModal && canOpenChartModal) {
            setIsChartModalOpen(true);
          }
        }}
        onMouseLeave={() => setHoveredChartPoint(null)}
      >
        <div className="analytics-chart-panel__header">
          <div className="analytics-chart-panel__title-wrap">
            <h4 className="analytics-chart-title">{config.label}</h4>
            {config.unit ? (
              <span className="analytics-chart-unit"><i />{config.unit}</span>
            ) : null}
          </div>
          <div className="analytics-chart-ranges" onClick={(event) => event.stopPropagation()}>
            {CHART_RANGES.map((rangeOption) => (
              <button
                key={rangeOption}
                className={`analytics-chart-range ${chartRange === rangeOption ? 'analytics-chart-range--active' : ''}`}
                type="button"
                onClick={() => setChartRange(rangeOption)}
              >
                {rangeOption}
              </button>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="analytics-line-chart">
          <defs>
            <linearGradient id={`${chartId}-gradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(254, 249, 89, 0.18)" />
              <stop offset="100%" stopColor="rgba(254, 249, 89, 0)" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(p => {
            const y = paddingTop + plotHeight - p * plotHeight;
            const val = (minVal + p * range).toFixed(1);
            return (
              <g key={p}>
                <line 
                  x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y}
                  className="analytics-line-chart__grid"
                />
                <text x={chartWidth - 8} y={y + 4} className="analytics-line-chart__y-label" textAnchor="end">{val}</text>
              </g>
            );
          })}

          <path d={fillPath} fill={`url(#${chartId}-gradient)`} />
          <path d={pathD} className="analytics-line-chart__glow" fill="none" />
          <path d={pathD} className="analytics-line-chart__line" fill="none" />

          {points.map((p, i) => (
            <g
              key={i}
              onMouseEnter={() => setHoveredChartPoint(i)}
              onClick={(event) => {
                event.stopPropagation();
                setHoveredChartPoint(i);
              }}
              onPointerDown={(event) => {
                if (event.pointerType === 'touch') {
                  event.stopPropagation();
                  setHoveredChartPoint(i);
                }
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
                setHoveredChartPoint(i);
              }}
            >
              <text
                x={p.x}
                y={Math.max(14, p.y - 14)}
                className={`analytics-line-chart__value ${i === points.length - 1 ? 'analytics-line-chart__value--latest' : ''}`}
                textAnchor="middle"
              >
                {Number.isInteger(p.value) ? p.value : p.value.toFixed(1)}
              </text>
              <circle cx={p.x} cy={p.y} r="5" className="analytics-line-chart__point-outer" />
              <circle cx={p.x} cy={p.y} r="2.5" className="analytics-line-chart__point-inner" />
              <circle cx={p.x} cy={p.y} r="15" fill="transparent" />
              <text x={p.x} y={chartHeight - 9} className="analytics-line-chart__x-label" textAnchor="middle">{p.label}</text>
            </g>
          ))}

          {tooltipPoint ? (
            <g
              className="analytics-chart-tooltip"
              transform={`translate(${Math.min(Math.max(tooltipPoint.x - 58, 8), chartWidth - 126)}, ${Math.max(tooltipPoint.y - 92, 8)})`}
              pointerEvents="none"
            >
              <rect width="118" height="62" rx="10" />
              <text x="12" y="20" className="analytics-chart-tooltip__date">{tooltipPoint.date}</text>
              <text x="12" y="48" className="analytics-chart-tooltip__value">
                {Number.isInteger(tooltipPoint.value) ? tooltipPoint.value : tooltipPoint.value.toFixed(1)}{config.unit || ''}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    );
  };

  const renderRadarChart = (isModal = false) => {
    if (perfConfigs.length === 0 || perfMs.length === 0) {
      return <div className="analytics-chart-placeholder">Not enough data for radar chart</div>;
    }

    const size = isModal ? 460 : (isPhone ? 280 : 360);
    const center = size / 2;
    const radius = isModal ? 136 : (isPhone ? 78 : 104);
    const labelRadius = isModal ? 196 : (isPhone ? 118 : 156);
    const angleStep = (Math.PI * 2) / perfConfigs.length;

    const getAngle = (index: number) => index * angleStep - Math.PI / 2;

    const getPoint = (val: number, index: number, max = 100) => {
      const normalized = Math.min((val / max), 1) * radius;
      const angle = getAngle(index);
      return {
        x: center + normalized * Math.cos(angle),
        y: center + normalized * Math.sin(angle),
      };
    };

    const getAxisPoint = (index: number) => {
      const angle = getAngle(index);
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    };

    const getLabelPoint = (index: number) => {
      const angle = getAngle(index);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: center + labelRadius * cos,
        y: center + labelRadius * sin,
        anchor: (Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end') as 'middle' | 'start' | 'end',
        dy: Math.abs(sin) > 0.9 ? (sin < 0 ? '-0.2em' : '0.9em') : '0.35em',
      };
    };

    const points = perfConfigs.map((config, index) => getPoint(
      latestM?.values?.[config.key] || 0,
      index,
      config.target_max || 100,
    ));
    const polygonPoints = points.map(point => `${point.x},${point.y}`).join(' ');

    return (
      <div
        className="analytics-chart-panel analytics-chart-panel--radar"
        style={{ cursor: !isModal && canOpenChartModal ? 'pointer' : 'default' }}
        onClick={() => {
          if (!isModal && canOpenChartModal) {
            setIsChartModalOpen(true);
          }
        }}
      >
        <div className="analytics-chart-panel__header">
          <div className="analytics-chart-panel__title-wrap">
            <h4 className="analytics-chart-title">Performance Radar</h4>
            <span className="analytics-chart-unit"><i />normalized</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${size} ${size}`} className="analytics-radar-chart">
          {[0.25, 0.5, 0.75, 1].map(ring => (
            <circle
              key={ring}
              cx={center}
              cy={center}
              r={radius * ring}
              className="analytics-radar-chart__ring"
            />
          ))}
          {perfConfigs.map((config, index) => {
            const axisPoint = getAxisPoint(index);
            const labelPoint = getLabelPoint(index);
            return (
              <g key={config.key}>
                <line
                  x1={center}
                  y1={center}
                  x2={axisPoint.x}
                  y2={axisPoint.y}
                  className="analytics-radar-chart__axis"
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  dy={labelPoint.dy}
                  className="analytics-radar-chart__label"
                  textAnchor={labelPoint.anchor}
                >
                  {isPhone ? config.label.split(' ')[0] : config.label}
                </text>
              </g>
            );
          })}
          <polygon points={polygonPoints} className="analytics-radar-chart__area" />
          <polygon points={polygonPoints} className="analytics-radar-chart__line" />
          {points.map((point, index) => (
            <circle
              key={`${perfConfigs[index]?.key || index}-point`}
              cx={point.x}
              cy={point.y}
              r="4"
              className="analytics-radar-chart__point"
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="analytics-section analytics-section--stack">
      <div
        className="analytics-section__content"
        style={{
          opacity: loading && !hasLoadedAnalyticsRef.current ? 0 : 1,
          transform: loading && !hasLoadedAnalyticsRef.current ? 'translate3d(0, 6px, 0)' : 'translate3d(0, 0, 0)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        }}
      >
        <div className="analytics-header">
          <div className="analytics-tab-container" ref={analyticsTabContainerRef}>
            <span
              className={`analytics-toggle-pill ${analyticsTabPillStyle.ready ? 'analytics-toggle-pill--ready' : ''}`}
              style={{
                width: `${analyticsTabPillStyle.width}px`,
                transform: `translateX(${analyticsTabPillStyle.x}px)`,
              }}
              aria-hidden="true"
            />
            <button
              ref={(element) => {
                analyticsTabRefs.current.body = element;
              }}
              className={`analytics-tab ${activeTab === 'body' ? 'analytics-tab--active' : ''}`}
              onClick={() => setActiveTab('body')}
            >
              <div className="analytics-tab__icon-circle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'body' ? '#000' : '#444'} strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className="analytics-tab__text">BODY</span>
            </button>

            <button
              ref={(element) => {
                analyticsTabRefs.current.performance = element;
              }}
              className={`analytics-tab ${activeTab === 'performance' ? 'analytics-tab--active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <div className="analytics-tab__icon-circle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'performance' ? '#000' : '#444'} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12h.01M13 2v2M13 20v2M22 13h-2M4 13H2M14.5 9l-2.5 2.5 2.5 2.5M9.5 15l2.5-2.5-2.5-2.5"/>
                </svg>
              </div>
              <span className="analytics-tab__text">PERFORMANCE</span>
            </button>
          </div>

          <button
            className="analytics-manage-btn"
            onClick={() => setIsManageMetricsOpen(true)}
            aria-label="Manage analytics metrics"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
          </button>
        </div>

        <div className="analytics-cards-grid">
          {(activeTab === 'body' ? bodyConfigs : perfConfigs).slice(0, 6).map(c => {
              const { current, delta } = getMetricData(c.key);
              const deltaColor = delta > 0 ? '#3DCC88' : delta < 0 ? '#FF5252' : '#666';
              const deltaArrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '•';
              const deltaAbs = Math.abs(delta);
              const isSelected = activeTab === 'body'
                ? c.key === selectedBodyMetric
                : c.key === selectedPerformanceMetric;

              return (
                <button
                  key={c.key}
                  type="button"
                  className={`analytics-card ${isSelected ? 'analytics-card--active' : ''}`}
                  onClick={() => {
                    if (activeTab === 'body') {
                      setSelectedBodyMetric(c.key);
                    } else {
                      setSelectedPerformanceMetric(c.key);
                    }
                  }}
                >
                  <div className="analytics-card__label">{c.label.toUpperCase()}</div>
                  <div className="analytics-card__value-row">
                    {typeof current === 'number' ? (
                      <>
                        <OdometerNumber
                          value={current}
                          decimals={Number.isInteger(current) ? 0 : 1}
                          className="analytics-card__value"
                        />
                        {c.unit ? <span className="analytics-card__unit">{c.unit}</span> : null}
                      </>
                    ) : (
                      <span className="analytics-card__value">—</span>
                    )}
                  </div>
                  <div className="analytics-card__delta" style={{ color: deltaColor }}>
                    <span>{deltaArrow}</span>
                    {deltaAbs.toFixed(1)}{c.unit}
                    <span className="analytics-card__delta-mode"> vs {deltaMode}</span>
                  </div>
                </button>
              );
          })}
        </div>

        {activeTab === 'performance' && (
          <div className="analytics-perf-toggle" ref={perfToggleContainerRef}>
            <span
              className={`analytics-toggle-pill ${perfTogglePillStyle.ready ? 'analytics-toggle-pill--ready' : ''}`}
              style={{
                width: `${perfTogglePillStyle.width}px`,
                transform: `translateX(${perfTogglePillStyle.x}px)`,
              }}
              aria-hidden="true"
            />
            <button
              ref={(element) => {
                perfToggleRefs.current.bar = element;
              }}
              className={`perf-toggle-btn ${performanceView === 'bar' ? 'active' : ''}`}
              onClick={() => setPerformanceView('bar')}
            >
              Trend
            </button>
            <button
              ref={(element) => {
                perfToggleRefs.current.radar = element;
              }}
              className={`perf-toggle-btn ${performanceView === 'radar' ? 'active' : ''}`}
              onClick={() => setPerformanceView('radar')}
            >
              Radar
            </button>
          </div>
        )}

        <div className="analytics-chart-area">
          {activeTab === 'performance' && performanceView === 'radar' ? renderRadarChart() : renderLineChart()}
        </div>

        <button className="analytics-add-btn" onClick={() => setIsLogProgressOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="analytics-add-btn__text">Log Progress</span>
        </button>
      </div>

      {showLoadingSkeleton ? (
        <div
          className="analytics-section__skeleton"
          style={{ opacity: loading ? 1 : 0 }}
          aria-hidden="true"
        >
          <div className="analytics-section__skeleton-cards">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonStatCard key={`analytics-skeleton-card-${index}`} />
            ))}
          </div>
          <SkeletonScheduleCard />
        </div>
      ) : null}

      {isChartModalPresent && typeof document !== 'undefined' && createPortal(
        <div
          ref={chartModalOverlayRef}
          className="chart-modal-overlay"
          data-state={isChartModalOpen ? 'open' : 'closed'}
          data-opening={isChartModalOpening ? 'true' : 'false'}
          onClick={() => setIsChartModalOpen(false)}
        >
          <div ref={chartModalContentRef} className="chart-modal-content" onClick={e => e.stopPropagation()}>
            <div className="chart-modal-header">
              <h3>TREND OVERVIEW</h3>
              <button
                className="chart-modal-close"
                onClick={() => setIsChartModalOpen(false)}
                aria-label="Close trend overview"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="chart-modal-body">{activeTab === 'performance' && performanceView === 'radar' ? renderRadarChart(true) : renderLineChart(true)}</div>
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
        initialCategory={activeTab}
        onClose={() => setIsLogProgressOpen(false)}
        onSuccess={() => { setIsLogProgressOpen(false); loadData(); }}
      />
    </div>
  );
}
