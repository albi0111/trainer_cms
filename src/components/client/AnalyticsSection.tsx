import React, { useState } from 'react';
import { View } from 'react-native';
import { Measurement, MeasurementConfig } from '../../types';
import ProgressDashboard from '../analytics/ProgressDashboard';
import AddMeasurementModal from '../modals/AddMeasurementModal';
import ManageMetricsModal from '../modals/ManageMetricsModal';

interface AnalyticsSectionProps {
  measurements: Measurement[];
  measurementConfigs: MeasurementConfig[];
  clientId: string;
  onDataChange: () => void;
}

export default function AnalyticsSection({
  measurements,
  measurementConfigs,
  clientId,
  onDataChange,
}: AnalyticsSectionProps) {
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [isManageMetricsVisible, setIsManageMetricsVisible] = useState(false);

  return (
    <View>
      <ProgressDashboard
        measurements={measurements}
        configs={measurementConfigs}
        onLogPress={() => setIsMeasurementModalVisible(true)}
        onManageMetrics={() => setIsManageMetricsVisible(true)}
      />

      <AddMeasurementModal
        visible={isMeasurementModalVisible}
        clientId={clientId}
        onClose={() => setIsMeasurementModalVisible(false)}
        onSuccess={() => {
          setIsMeasurementModalVisible(false);
          onDataChange();
        }}
      />
      <ManageMetricsModal
        visible={isManageMetricsVisible}
        clientId={clientId}
        onClose={() => setIsManageMetricsVisible(false)}
        onSuccess={() => {
          onDataChange();
        }}
      />
    </View>
  );
}
