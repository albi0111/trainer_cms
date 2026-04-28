import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Client, ClientProfile, ClientAssessment } from '../../types';
import AvatarCircle from '../shared/AvatarCircle';
import StatusBadge from '../shared/StatusBadge';

interface ClientHeaderCardProps {
  clientData: Client & { profile: ClientProfile };
  latestWeight: number | null;
  assessment?: ClientAssessment | null;
}

export default function ClientHeaderCard({ clientData, latestWeight, assessment }: ClientHeaderCardProps) {
  const displayObjective = assessment?.objectives || clientData.goal || 'General Fitness';
  return (
    <View style={styles.clientHeaderCard}>
      <View style={styles.headerTopRow}>
        <AvatarCircle name={clientData.name} size={64} />
        <View style={styles.headerMainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.headerName}>{clientData.name}</Text>
            <StatusBadge status="active" />
          </View>
          <Text style={styles.headerGoal}>{displayObjective}</Text>
        </View>
      </View>

      <View style={[styles.statsRow, { marginTop: 24 }]}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>AGE</Text>
          <Text style={styles.statValue}>{clientData.profile.age}y</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>WEIGHT</Text>
          <Text style={styles.statValue}>
            {latestWeight || clientData.profile.initial_weight_kg}
            {latestWeight || clientData.profile.initial_weight_kg ? ' kg' : '—'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>HEIGHT</Text>
          <Text style={styles.statValue}>
            {clientData.profile.height_cm || '—'}
            {clientData.profile.height_cm ? ' cm' : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clientHeaderCard: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  headerGoal: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
