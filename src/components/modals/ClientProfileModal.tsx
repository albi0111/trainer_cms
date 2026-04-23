import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client, ClientProfile, ClientLifestyle, ClientAssessment } from '../../types';

interface ClientProfileModalProps {
  visible: boolean;
  onClose: () => void;
  data: {
    client: Client;
    profile: ClientProfile;
    lifestyle: ClientLifestyle;
    assessment: ClientAssessment;
  } | null;
  onEditSection: (section: 'personal' | 'interview' | 'assessment') => void;
}

export default function ClientProfileModal({ visible, onClose, data, onEditSection }: ClientProfileModalProps) {
  if (!data) return null;

  const { client, profile, lifestyle, assessment } = data;

  const renderSectionHeader = (title: string, icon: any, sectionKey: 'personal' | 'interview' | 'assessment') => (
    <View style={styles.sectionHeader}>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color="#FFD700" style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => onEditSection(sectionKey)}>
        <Ionicons name="pencil" size={12} color="#AAA" style={{ marginRight: 4 }} />
        <Text style={styles.editBtnText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInfoRow = (label: string, value: string | number | undefined) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{client.name.substring(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{client.name}</Text>
                <View style={styles.subtextRow}>
                  <Text style={styles.goalText}>{client.goal || 'No goal set'}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Personal Info */}
            <View style={styles.section}>
              {renderSectionHeader('PERSONAL INFO', 'person-outline', 'personal')}
              <View style={styles.grid}>
                <View style={styles.gridCol}>{renderInfoRow('AGE', `${profile.age} years`)}</View>
                <View style={styles.gridCol}>{renderInfoRow('GENDER', profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1))}</View>
              </View>
              <View style={styles.grid}>
                <View style={styles.gridCol}>{renderInfoRow('PHONE', client.phone)}</View>
                <View style={styles.gridCol}>{renderInfoRow('EMAIL', client.email)}</View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Interview */}
            <View style={styles.section}>
              {renderSectionHeader('INTERVIEW', 'chatbubble-outline', 'interview')}
              {renderInfoRow('EXPERIENCE', lifestyle.job_type || 'Beginner')}
              {renderInfoRow('INJURIES / CONDITIONS', profile.medical_notes || 'None reported')}
              {renderInfoRow('LIFESTYLE', lifestyle.notes || 'No lifestyle notes.')}
            </View>

            <View style={styles.divider} />

            {/* Assessment Summary */}
            <View style={styles.section}>
              {renderSectionHeader('ASSESSMENT', 'fitness-outline', 'assessment')}
              <View style={styles.grid}>
                <View style={styles.gridCol}>{renderInfoRow('WEIGHT', `${profile.initial_weight_kg} kg`)}</View>
                <View style={styles.gridCol}>{renderInfoRow('HEIGHT', `${profile.height_cm} cm`)}</View>
              </View>
              <View style={styles.grid}>
                <View style={styles.gridCol}>{renderInfoRow('BP', `${assessment.bp_systolic || '—'}/${assessment.bp_diastolic || '—'}`)}</View>
                <View style={styles.gridCol}>{renderInfoRow('RHR', `${assessment.resting_heart_rate || '—'} bpm`)}</View>
              </View>
              
              <View style={styles.miniStatsRow}>
                 <Text style={styles.miniStatLabel}>EXERCISES:</Text>
                 <Text style={styles.miniStatValue}>{assessment.exercises?.length || 0} items logged</Text>
              </View>
              <View style={styles.miniStatsRow}>
                 <Text style={styles.miniStatLabel}>FLEXIBILITY:</Text>
                 <Text style={styles.miniStatValue}>{assessment.flexibility?.filter(f => f.right || f.left).length || 0} tests passed</Text>
              </View>
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    height: '80%',
    backgroundColor: '#121212',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  goalText: {
    fontSize: 13,
    color: '#888',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444',
    marginHorizontal: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#3DCC88', // Green for Active
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  editBtnText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  gridCol: {
    flex: 1,
  },
  infoRow: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#555',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '500',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginBottom: 32,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#444',
  },
  miniStatValue: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '500',
  },
});
