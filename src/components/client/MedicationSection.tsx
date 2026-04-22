import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CardContainer from '../shared/CardContainer';

export default function MedicationSection() {
  return (
    <CardContainer
      headerIcon="medkit-outline"
      headerIconColor="#FF5252"
      headerTitle="Medication"
    >
      <View style={styles.placeholder}>
        <Ionicons name="medkit" size={32} color="#333" style={{ marginBottom: 12 }} />
        <Text style={styles.placeholderText}>No medications tracked yet.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>
      </View>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#3DCC88',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
