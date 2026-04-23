import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client, ClientProfile, ClientLifestyle, ClientAssessment, AssessmentExerciseKey, FlexibilityKey } from '../../types';
import AvatarCircle from '../shared/AvatarCircle';

// ── Exercise & Flexibility label maps ────────────────────────────────────────

const EXERCISE_IMAGES: Record<AssessmentExerciseKey, any> = {
  bench_press:  require('../../../assets/assesment-icons/assesment-exercise-1.png'),
  squat:        require('../../../assets/assesment-icons/assesment-exercise-2.png'),
  leg_press:    require('../../../assets/assesment-icons/assesment-exercise-3.png'),
  lat_pulldown: require('../../../assets/assesment-icons/assesment-exercise-4.png'),
  seated_row:   require('../../../assets/assesment-icons/assesment-exercise-5.jpeg'),
  leg_curl:     require('../../../assets/assesment-icons/assesment-exercise-6.jpeg'),
  cardio:       require('../../../assets/assesment-icons/assesment-exercise-7.png'),
  other:        require('../../../assets/assesment-icons/assesment-exercise-8.png'),
};

const FLEX_LABELS: Record<FlexibilityKey | 'seated_toe_reach' | 'toe_reach', string> = {
  hamstrings:      'Hamstrings',
  quadriceps:      'Quadriceps',
  seated_toe_reach:'Toe Reach',
  toe_reach:       'Toe Reach',
  shoulders:       'Shoulders',
  trunk_rotation:  'Trunk Rotation',
  hip_flexors:     'Hip Flexors',
};

interface ProfileSectionProps {
  data: {
    client: Client;
    profile: ClientProfile;
    lifestyle: ClientLifestyle;
    assessment: ClientAssessment;
  } | null;
  onEditSection: (section: 'personal' | 'interview' | 'assessment') => void;
}

export default function ProfileSection({ data, onEditSection }: ProfileSectionProps) {
  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

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
    <View style={styles.container}>
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
        {/* Objectives */}
        {!!assessment.objectives && (
          <View style={{ marginBottom: 20 }}>
            {renderInfoRow('OBJECTIVES', assessment.objectives)}
          </View>
        )}

        {/* Cardio Stats */}
        {(assessment.cardio_time_minutes || assessment.cardio_distance_km || assessment.cardio_mhr) && (
          <View style={styles.grid}>
            <View style={styles.gridCol}>{renderInfoRow('CARDIO TIME', `${assessment.cardio_time_minutes || '—'} min`)}</View>
            <View style={styles.gridCol}>{renderInfoRow('DISTANCE', `${assessment.cardio_distance_km || '—'} km`)}</View>
            <View style={styles.gridCol}>{renderInfoRow('MHR', `${assessment.cardio_mhr || '—'} bpm`)}</View>
          </View>
        )}

        {/* Exercises Detail */}
        {assessment.exercises && assessment.exercises.some(ex => !!ex.note && ex.key !== 'cardio' && ex.key !== 'other') && (
          <View style={styles.detailBlock}>
            <View style={styles.detailBlockHeader}>
              <Ionicons name="barbell-outline" size={12} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={styles.detailBlockTitle}>EXERCISES</Text>
            </View>
            {assessment.exercises.map((ex, idx) => {
              if (!ex.note || ex.key === 'cardio' || ex.key === 'other') return null;
              const imageSource = EXERCISE_IMAGES[ex.key as AssessmentExerciseKey];
              return (
                <View key={ex.key || idx} style={styles.exerciseRow}>
                  <View style={styles.exerciseImageWrap}>
                    <Image source={imageSource} style={styles.exerciseImage} resizeMode="contain" />
                  </View>
                  <View style={styles.exerciseNoteWrap}>
                    <Text style={styles.exerciseNote}>{ex.note}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Flexibility Detail */}
        {assessment.flexibility && assessment.flexibility.some(flex => !!flex.note || !!flex.right || !!flex.left) && (
          <View style={[styles.detailBlock, { marginTop: 8 }]}>
            <View style={styles.detailBlockHeader}>
              <Ionicons name="stats-chart" size={12} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={styles.detailBlockTitle}>FITNESS TESTS</Text>
            </View>
            {assessment.flexibility.map((flex, idx) => {
              if (!flex.note && !flex.right && !flex.left) return null;
              const label = FLEX_LABELS[flex.key as FlexibilityKey] || flex.key?.replace(/_/g, ' ') || `Test ${idx + 1}`;
              const bilateral = flex.left === null || flex.left === undefined;
              const rightPassed = !!flex.right;
              const leftPassed = !!flex.left;
              return (
                <View key={flex.key || idx} style={styles.detailCard}>
                  <View style={styles.flexTestTop}>
                    <View style={styles.detailCardLeft}>
                      <View style={[styles.detailIconCircle, { backgroundColor: '#0E1E10' }]}>
                        <Ionicons name="body-outline" size={16} color="#4ADE80" />
                      </View>
                      <Text style={styles.detailCardLabel}>{label}</Text>
                    </View>
                    <View style={styles.flexChipRow}>
                      {bilateral ? (
                        <View style={[styles.flexChip, rightPassed ? styles.flexChipPass : styles.flexChipFail]}>
                          <Text style={[styles.flexChipText, rightPassed ? styles.flexChipTextPass : styles.flexChipTextFail]}>
                            {rightPassed ? '✓ Pass' : '✗ Fail'}
                          </Text>
                        </View>
                      ) : (
                        <>
                          <View style={[styles.flexChip, rightPassed ? styles.flexChipPass : styles.flexChipFail]}>
                            <Text style={[styles.flexChipText, rightPassed ? styles.flexChipTextPass : styles.flexChipTextFail]}>
                              R {rightPassed ? '✓' : '✗'}
                            </Text>
                          </View>
                          <View style={[styles.flexChip, leftPassed ? styles.flexChipPass : styles.flexChipFail]}>
                            <Text style={[styles.flexChipText, leftPassed ? styles.flexChipTextPass : styles.flexChipTextFail]}>
                              L {leftPassed ? '✓' : '✗'}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  {!!flex.note && (
                    <Text style={styles.flexDetailNote}>{flex.note}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { color: '#666', fontSize: 14 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#FFD700', letterSpacing: 1 },
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
  editBtnText: { color: '#AAA', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  gridCol: { flex: 1 },
  infoRow: { marginBottom: 20 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#555', marginBottom: 8, letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: '#FFF', fontWeight: '500', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#1F1F1F', marginBottom: 32 },
  // ── Exercise / Flexibility detail blocks ────────────────────────────────────
  detailBlock: { marginTop: 20 },
  detailBlockHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  detailBlockTitle: {
    fontSize: 10, fontWeight: '800', color: '#666', letterSpacing: 0.8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  exerciseImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  exerciseNoteWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseNote: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  exerciseNoteEmpty: {
    color: '#444',
    fontSize: 14,
    fontStyle: 'italic',
  },
  flexTestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexDetailNote: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginTop: 8,
    paddingLeft: 40,
  },
  detailCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 6,
  },
  detailCardLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10,
  },
  detailIconCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#1C1800',
    justifyContent: 'center', alignItems: 'center',
  },
  detailCardLabel: {
    fontSize: 14, fontWeight: '700', color: '#E0E0E0', flex: 1,
  },
  detailCardNote: {
    fontSize: 12, color: '#999', lineHeight: 18,
    paddingLeft: 40,
  },
  detailCardNoteEmpty: {
    fontSize: 12, color: '#3A3A3A', fontStyle: 'italic',
    paddingLeft: 40,
  },
  flexChipRow: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  flexChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  flexChipPass: { backgroundColor: '#0E1E10', borderColor: '#2E6B36' },
  flexChipFail: { backgroundColor: '#1E0E0E', borderColor: '#6B2E2E' },
  flexChipText: { fontSize: 11, fontWeight: '700' },
  flexChipTextPass: { color: '#4ADE80' },
  flexChipTextFail: { color: '#F87171' },
});
