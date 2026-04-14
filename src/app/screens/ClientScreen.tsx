// ─────────────────────────────────────────────────────────────────────────────
// Client Screen — Details & Profile View
// Source of truth: Step 2 Requirements
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../RootNavigator';
import { getClientById } from '../../services/client/clientService';
import { Client, ClientProfile } from '../../types';

type ClientScreenRouteProp = RouteProp<RootStackParamList, 'Client'>;

export default function ClientScreen() {
  const route = useRoute<ClientScreenRouteProp>();
  const { clientId } = route.params;
  
  const [data, setData] = useState<Client & { profile: ClientProfile } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientById(clientId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color="#FFD700" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Client not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.id}>ID: {data.id.substring(0, 8)}...</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Goal</Text>
              <Text style={styles.infoValue}>{data.goal || 'No goal defined'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{data.email || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats Placeholder</Text>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>Measurements & Plans coming soon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  name: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  id: { fontSize: 12, color: '#555', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFD700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  card: { backgroundColor: '#161616', borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  placeholderCard: { backgroundColor: '#161616', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dotted', borderWidth: 1, borderColor: '#333' },
  placeholderText: { color: '#444', fontSize: 14, fontWeight: '500' },
  errorText: { color: '#FF5252', fontSize: 16, fontWeight: '600' },
});
