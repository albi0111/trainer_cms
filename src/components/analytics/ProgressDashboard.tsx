import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Svg, Polygon, Line as SvgLine, Circle, Text as SvgText } from 'react-native-svg';
import { Measurement, MeasurementConfig } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProgressDashboardProps {
  measurements: Measurement[];
  configs: MeasurementConfig[];
  onLogPress: () => void;
  onManageMetrics: () => void;
}

type DeltaMode = 'previous' | 'initial';

export default function ProgressDashboard({
  measurements,
  configs,
  onLogPress,
  onManageMetrics,
}: ProgressDashboardProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'performance'>('body');
  const [deltaMode, setDeltaMode] = useState<DeltaMode>('previous');
  const [performanceView, setPerformanceView] = useState<'bar' | 'radar'>('bar');
  const [selectedBodyMetric, setSelectedBodyMetric] = useState<string>('weight_kg');

  // Sort measurements by date ASC for trend analysis
  const sortedMs = useMemo(() => {
    return [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [measurements]);

  // Chart Colors (Premium Palette)
  const COLORS = {
    primary: '#FFD700',
    secondary: '#3DCC88',
    tertiary: '#FF5252',
    quaternary: '#5E72E4',
    bg: '#1A1A1A',
    grid: '#333'
  };

  const latestM = sortedMs[sortedMs.length - 1];
  const initialM = sortedMs[0];
  const previousM = sortedMs.length > 1 ? sortedMs[sortedMs.length - 2] : null;

  const toggleDeltaMode = () => {
    setDeltaMode(prev => prev === 'previous' ? 'initial' : 'previous');
  };

  const getMetricData = (key: string) => {
    const current = latestM?.values?.[key] ?? latestM?.[key as keyof Measurement] as number | undefined;
    const initial = initialM?.values?.[key] ?? initialM?.[key as keyof Measurement] as number | undefined;
    const previous = previousM?.values?.[key] ?? previousM?.[key as keyof Measurement] as number | undefined;

    let delta = 0;
    if (current !== undefined) {
      const compareTo = deltaMode === 'previous' ? previous : initial;
      if (compareTo !== undefined) {
        delta = current - compareTo;
      }
    }

    return { current, delta };
  };

  const renderMetricCard = (config: MeasurementConfig) => {
    const { current, delta } = getMetricData(config.key);
    const deltaColor = delta > 0 ? '#3DCC88' : delta < 0 ? '#FF5252' : '#888';
    const deltaSign = delta > 0 ? '+' : '';

    return (
      <TouchableOpacity
        key={config.key}
        style={[
          styles.card,
          config.key === (activeTab === 'body' ? selectedBodyMetric : null) && styles.cardActive
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (activeTab === 'body') setSelectedBodyMetric(config.key);
          else toggleDeltaMode();
        }}
      >
        <Text style={styles.cardLabel}>{config.label}</Text>
        <View style={styles.cardValueRow}>
          <Text style={styles.cardValue}>
            {current ?? '—'}
            <Text style={styles.cardUnit}>{config.unit}</Text>
          </Text>
        </View>
        <Text style={[styles.cardDelta, { color: deltaColor }]}>
          {deltaSign}{delta.toFixed(1)}{config.unit}
          <Text style={styles.deltaModeLabel}> vs {deltaMode}</Text>
        </Text>
      </TouchableOpacity>
    );
  };

  const renderLineChart = () => {
    if (sortedMs.length < 2) return <View style={styles.chartPlaceholder}><Text style={{ color: '#666' }}>Not enough data for trend chart</Text></View>;

    const data = {
      labels: sortedMs.map(m => m.date.slice(5)), // MM-DD
      datasets: [
        {
          data: sortedMs.map(m => (m.values?.[selectedBodyMetric] ?? m[selectedBodyMetric as keyof Measurement] as number) || 0),
          color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };

    return (
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>{configs.find(c => c.key === selectedBodyMetric)?.label} Trend</Text>
        <LineChart
          data={data}
          width={SCREEN_WIDTH - 80}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#1A1A1A',
            backgroundGradientTo: '#1A1A1A',
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "4", strokeWidth: "2", stroke: "#FFD700" },
            paddingRight: 0,
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    );
  };

  const renderPerformanceCharts = () => {
    const perfConfigs = configs.filter(c => c.category === 'performance');
    if (perfConfigs.length === 0 || sortedMs.length === 0) return null;

    if (performanceView === 'bar') {
      const data = {
        labels: latestM ? ['Previous', 'Current'] : [],
        datasets: perfConfigs.map((c, i) => ({
          data: [
            (previousM?.values?.[c.key] ?? previousM?.[c.key as keyof Measurement] as number) || 0,
            (latestM?.values?.[c.key] ?? latestM?.[c.key as keyof Measurement] as number) || 0
          ],
          // Map colors
          color: (opacity = 1) => i === 0 ? `rgba(255, 215, 0, ${opacity})` : `rgba(61, 204, 136, ${opacity})`
        }))
      };

      return (
        <View style={styles.chartBox}>
          <Text style={styles.chartTitle}>Session Comparison</Text>
          <BarChart
            data={{
              labels: perfConfigs.map(c => c.label.split(' ')[0]),
              datasets: [{
                data: perfConfigs.map(c => (latestM?.values?.[c.key] ?? latestM?.[c.key as keyof Measurement] as number) || 0)
              }]
            }}
            width={SCREEN_WIDTH - 80}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: '#1A1A1A',
              backgroundGradientTo: '#1A1A1A',
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, 0.5)`,
              paddingRight: 0,
            }}
            verticalLabelRotation={30}
            style={{ borderRadius: 16 }}
          />
        </View>
      );
    }

    return renderRadarChart(perfConfigs);
  };

  const renderRadarChart = (perfConfigs: MeasurementConfig[]) => {
    const size = 240;
    const center = size / 2;
    const radius = 85;
    const angleStep = (Math.PI * 2) / perfConfigs.length;

    // Normalization: (val / target_max) * radius
    const getPoint = (val: number, index: number, max: number = 100) => {
      const normalized = Math.min((val / max), 1) * radius;
      const angle = index * angleStep - Math.PI / 2;
      return {
        x: center + normalized * Math.cos(angle),
        y: center + normalized * Math.sin(angle)
      };
    };

    const points = perfConfigs.map((c, i) => {
      const val = (latestM?.values?.[c.key] ?? latestM?.[c.key as keyof Measurement] as number) || 0;
      return getPoint(val, i, c.target_max || 100);
    });

    const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <View style={[styles.chartBox, { alignItems: 'center' }]}>
        <Text style={styles.chartTitle}>Normalization Radar</Text>
        <Svg width={size} height={size}>
          {/* Axis lines */}
          {perfConfigs.map((c, i) => {
            const end = getPoint(c.target_max || 100, i, c.target_max || 100);
            return (
              <React.Fragment key={i}>
                <SvgLine x1={center} y1={center} x2={end.x} y2={end.y} stroke="#333" strokeWidth="1" />
                <SvgText x={end.x} y={end.y} fill="#666" fontSize="10" textAnchor="middle">{c.label}</SvgText>
              </React.Fragment>
            );
          })}
          {/* Concentration Rings */}
          {[0.25, 0.5, 0.75, 1].map(r => (
            <Circle key={r} cx={center} cy={center} r={radius * r} fill="none" stroke="#222" strokeWidth="1" />
          ))}
          {/* Data area */}
          <Polygon points={polygonPoints} fill="rgba(255, 215, 0, 0.3)" stroke="#FFD700" strokeWidth="2" />
        </Svg>
      </View>
    );
  }

  const filteredConfigs = configs.filter(c => c.category === activeTab);

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'body' && styles.tabActive]}
            onPress={() => setActiveTab('body')}
          >
            <Ionicons name="body-outline" size={14} color={activeTab === 'body' ? '#FFF' : '#888'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'body' && styles.tabTextActive]} numberOfLines={1}>Body Measurements</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'performance' && styles.tabActive]}
            onPress={() => setActiveTab('performance')}
          >
            <Ionicons name="walk-outline" size={14} color={activeTab === 'performance' ? '#FFF' : '#888'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'performance' && styles.tabTextActive]} numberOfLines={1}>Performance</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.manageBtn} onPress={onManageMetrics}>
          <Ionicons name="settings-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Metric Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cardsScroll}
        contentContainerStyle={styles.cardsContent}
      >
        {filteredConfigs.map(c => renderMetricCard(c))}
      </ScrollView>

      {/* Analytics Switcher for Performance */}
      {activeTab === 'performance' && (
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[styles.viewToggle, performanceView === 'bar' && styles.viewToggleActive]}
            onPress={() => setPerformanceView('bar')}
          >
            <Text style={[styles.viewToggleText, performanceView === 'bar' && styles.viewToggleTextActive]}>Bar (Compare)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, performanceView === 'radar' && styles.viewToggleActive]}
            onPress={() => setPerformanceView('radar')}
          >
            <Text style={[styles.viewToggleText, performanceView === 'radar' && styles.viewToggleTextActive]}>Radar (Overview)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Charts Area */}
      <View style={styles.chartArea}>
        {activeTab === 'body' ? renderLineChart() : renderPerformanceCharts()}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={onLogPress}>
        <Ionicons name="add" size={20} color="#AAA" />
        <Text style={styles.addBtnText}>Log Progress</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 12, padding: 3, width: '50%' },
  // tabContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#222', borderRadius: 12, padding: 3, marginRight: 16 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#333', borderWidth: 1, borderColor: '#444' },
  tabIcon: { marginRight: 6 },
  tabText: { color: '#888', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFF' },
  manageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardsScroll: { marginHorizontal: -20 },
  cardsContent: { paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 16, minWidth: 120, borderWidth: 1, borderColor: '#333' },
  cardLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  cardValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  cardValue: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  cardUnit: { fontSize: 14, color: '#666', marginLeft: 2 },
  cardDelta: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  deltaModeLabel: { fontSize: 10, fontWeight: '400', color: '#555' },
  cardActive: { borderColor: '#FFD700', backgroundColor: '#222' },

  chartArea: {
    minHeight: 300,
    backgroundColor: '#161616',
    borderRadius: 20,
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
    alignItems: 'center'
  },
  chartBox: { flex: 1 },
  chartTitle: { color: '#AAA', fontSize: 13, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  chartPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  viewToggleContainer: { flexDirection: 'row', gap: 8, marginTop: 20, paddingHorizontal: 4 },
  viewToggle: { flex: 1, backgroundColor: '#222', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  viewToggleActive: { backgroundColor: '#333' },
  viewToggleText: { color: '#666', fontSize: 12, fontWeight: '700' },
  viewToggleTextActive: { color: '#FFD700' },

  emptyText: { color: '#444', marginVertical: 20, marginLeft: 10, width: 200 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333', borderRadius: 12, marginTop: 16 },
  addBtnText: { color: '#AAA', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
