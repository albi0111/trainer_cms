// ─────────────────────────────────────────────────────────────────────────────
// Add Client Modal — Multi-Step Flow
// Source of truth: system_prompt.md §11 (Add Client Flow)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { createClient, batchUpdateClient } from '../../services/client/clientService';
import { AssessmentExerciseKey } from '../../types';

import { colors, borderRadius } from '../../theme/theme';
import { FLEXIBILITY_TESTS, FormData, Step, AddClientModalProps } from './AddClientSteps/types';
import { PersonalStep } from './AddClientSteps/PersonalStep';
import { InterviewStep } from './AddClientSteps/InterviewStep';
import { AssessmentStep } from './AddClientSteps/AssessmentStep';

export default function AddClientModal({
  visible,
  onClose,
  onSuccess,
  mode = 'create',
  clientId,
  initialData,
  initialStep = 'personal'
}: AddClientModalProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [flexNotes, setFlexNotes] = useState<Record<string, string>>({});

  const setNote = (key: string, val: string) =>
    setFlexNotes(prev => ({ ...prev, [key]: val }));

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '', age: '', gender: 'Male', phone: '', email: '',
      training_experience: '', injuries: '', lifestyle_notes: '',
      weight_kg: '', height_cm: '', bp: '', rhr: '',
      strength_1_note: '', strength_2_note: '', strength_3_note: '', strength_4_note: '',
      strength_5_note: '', strength_6_note: '',
      flex_hamstrings_r: false, flex_hamstrings_l: false,
      flex_quadriceps_r: false, flex_quadriceps_l: false,
      flex_hip_flexors_r: false, flex_hip_flexors_l: false,
      flex_shoulders_r: false, flex_shoulders_l: false,
      flex_toe_reach: false, flex_trunk_r: false, flex_trunk_l: false,
      cardio_done: false,
      cardio_time: '', cardio_distance: '', cardio_mhr: '',
      objectives: '',
    },
  });

  React.useEffect(() => {
    if (visible) {
      setSubmitting(false);
      if (mode === 'edit' && initialData) {
        const { client, profile, lifestyle, assessment } = initialData;

        const flexMap: any = {};
        assessment.flexibility?.forEach(f => {
          if (f.key === 'hamstrings') { flexMap.flex_hamstrings_r = f.right; flexMap.flex_hamstrings_l = f.left; }
          if (f.key === 'quadriceps') { flexMap.flex_quadriceps_r = f.right; flexMap.flex_quadriceps_l = f.left; }
          if (f.key === 'hip_flexors') { flexMap.flex_hip_flexors_r = f.right; flexMap.flex_hip_flexors_l = f.left; }
          if (f.key === 'shoulders') { flexMap.flex_shoulders_r = f.right; flexMap.flex_shoulders_l = f.left; }
          const flexKey = (f.key as any);
          if (flexKey === 'seated_toe_reach' || flexKey === 'toe_reach') { flexMap.flex_toe_reach = f.right; }
          if (f.key === 'trunk_rotation') { flexMap.flex_trunk_r = f.right; flexMap.flex_trunk_l = f.left; }
          if (f.note) setNote(f.key, f.note);
        });

        const exMap: any = {};
        assessment.exercises?.forEach((ex, idx) => {
          exMap[`strength_${idx + 1}_note`] = ex.note || '';
        });

        reset({
          name: client.name,
          age: profile.age.toString(),
          gender: profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'Other',
          phone: client.phone || '',
          email: client.email || '',
          training_experience: lifestyle.job_type === 'Beginner' ? 'Beginner' : 'Experienced',
          injuries: profile.medical_notes?.replace(/<[^>]*>/g, '') || '',
          lifestyle_notes: lifestyle.notes || '',
          weight_kg: profile.initial_weight_kg.toString(),
          height_cm: profile.height_cm.toString(),
          bp: `${assessment.bp_systolic || ''}/${assessment.bp_diastolic || ''}`,
          rhr: assessment.resting_heart_rate?.toString() || '',
          ...flexMap,
          ...exMap,
          cardio_done: !!assessment.cardio_time_minutes,
          cardio_time: assessment.cardio_time_minutes?.toString() || '',
          cardio_distance: assessment.cardio_distance_km?.toString() || '',
          cardio_mhr: assessment.cardio_mhr?.toString() || '',
          objectives: assessment.objectives || '',
        });

        if (initialStep) setStep(initialStep);
      }
    }
  }, [visible, mode, initialData, reset, initialStep]);

  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.warn('[AddClientModal] Validation Errors:', errors);
      const firstError = Object.values(errors)[0] as any;
      Alert.alert('Form Error', firstError.message || 'Please check all required fields.');
    }
  }, [errors]);

  const gender = useWatch({ control, name: 'gender' });

  const handleClose = () => {
    reset();
    setStep('personal');
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const bpParts = (data.bp || '').split('/');
      const bp_systolic = parseInt(bpParts[0]) || null;
      const bp_diastolic = parseInt(bpParts[1]) || null;

      const assessmentData = {
        bp_systolic,
        bp_diastolic,
        resting_heart_rate: parseInt(data.rhr) || null,
        cardio_time_minutes: parseFloat(data.cardio_time) || null,
        cardio_distance_km: parseFloat(data.cardio_distance) || null,
        cardio_mhr: parseInt(data.cardio_mhr) || null,
        objectives: data.objectives,
        flexibility: FLEXIBILITY_TESTS.map(t => {
          return {
            key: t.key,
            right: (data as any)[t.keyR] ?? false,
            left: t.keyL ? ((data as any)[t.keyL] ?? false) : null,
            note: (flexNotes && flexNotes[t.key]) || '',
          };
        }),
        exercises: [
          { label: 'Bench Press', note: data.strength_1_note, order: 1, key: 'bench_press' },
          { label: 'Squat', note: data.strength_2_note, order: 2, key: 'squat' },
          { label: 'Leg Press', note: data.strength_3_note, order: 3, key: 'leg_press' },
          { label: 'Lat Pulldown', note: data.strength_4_note, order: 4, key: 'lat_pulldown' },
          { label: 'Seated Row', note: data.strength_5_note, order: 5, key: 'seated_row' },
          { label: 'Leg Curl', note: data.strength_6_note, order: 6, key: 'leg_curl' },
          { label: 'Cardio', note: data.strength_7_note, order: 7, key: 'cardio' },
          { label: 'Other', note: data.strength_8_note, order: 8, key: 'other' },
        ].map(ex => ({
          key: ex.key as AssessmentExerciseKey,
          order_index: ex.order,
          note: ex.note
        }))
      };

      if (mode === 'edit' && clientId) {
        await batchUpdateClient(clientId, {
          core: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            goal: data.objectives,
          },
          profile: {
            age: parseInt(data.age) || 0,
            gender: data.gender.toLowerCase() as any,
            height_cm: parseFloat(data.height_cm) || 0,
            initial_weight_kg: parseFloat(data.weight_kg) || 0,
            medical_notes: data.injuries,
          },
          lifestyle: {
            notes: data.lifestyle_notes,
          },
          assessment: assessmentData,
        });
        onSuccess(clientId);
        Alert.alert('Success', 'Client profile updated successfully!');
      } else {
        const id = await createClient({
          name: data.name,
          age: parseInt(data.age) || 0,
          gender: data.gender.toLowerCase() as any,
          phone: data.phone,
          email: data.email,
          medicalNotes: data.injuries,
          height: parseFloat(data.height_cm) || 0,
          initialWeight: parseFloat(data.weight_kg) || 0,
          primaryGoal: data.objectives,
          lifestyle: { notes: data.lifestyle_notes },
          assessment: assessmentData,
        });
        onSuccess(id);
        Alert.alert('Success', 'New client added successfully!');
      }
      handleClose();
    } catch (err) {
      console.error('[AddClientModal] Submit failed:', err);
      Alert.alert('Error', 'Failed to save changes. Please check your data and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const TABS: { key: Step; label: string; icon: string }[] = [
    { key: 'personal', label: 'PERSONAL', icon: 'person' },
    { key: 'interview', label: 'INTERVIEW', icon: 'chatbubble-ellipses' },
    { key: 'assessment', label: 'ASSESSMENT', icon: 'stats-chart' },
  ];

  const stepOrder: Step[] = ['personal', 'interview', 'assessment'];
  const currentIdx = stepOrder.indexOf(step);
  const isCompleted = (tabKey: Step) => stepOrder.indexOf(tabKey) < currentIdx;
  const isActive = (tabKey: Step) => tabKey === step;

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map((tab) => (
        <TouchableOpacity key={tab.key} style={styles.tabItem} onPress={() => setStep(tab.key)}>
          <View style={[
            styles.tabIconCircle,
            isActive(tab.key) && styles.tabIconCircleActive,
            isCompleted(tab.key) && styles.tabIconCircleCompleted,
          ]}>
            <Ionicons
              name={isCompleted(tab.key) ? 'checkmark' : tab.icon as any}
              size={16}
              color={isActive(tab.key) || isCompleted(tab.key) ? colors.textDark : colors.textLabel}
            />
          </View>
          <Text style={[styles.tabLabel, (isActive(tab.key) || isCompleted(tab.key)) && styles.tabLabelActive]}>
            {tab.label}
          </Text>
          {isActive(tab.key) && <View style={styles.activeIndicator} />}
          {isCompleted(tab.key) && <View style={[styles.activeIndicator, { backgroundColor: colors.textMuted }]} />}
        </TouchableOpacity>
      ))}
      <View style={styles.tabsBottomLine} />
    </View>
  );

  const renderFooter = () => {
    const isFirst = step === 'personal';
    const isLast = step === 'assessment';

    const handleNext = () => {
      if (step === 'personal') setStep('interview');
      else if (step === 'interview') setStep('assessment');
    };

    const handleBack = () => {
      if (step === 'interview') setStep('personal');
      else if (step === 'assessment') setStep('interview');
    };

    return (
      <View style={styles.footer}>
        {!isFirst ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={16} color={colors.textLight} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {isLast ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.nextBtn, styles.nextBtnYellow, submitting && styles.nextBtnDisabled]}
            onPress={handleSubmit(onSubmit as any, () => {
              Alert.alert('Form Error', 'Please check all required fields (*) on all tabs.');
            })}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textDark} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={colors.textDark} />
                <Text style={[styles.nextBtnText, { color: colors.textDark }]}>
                  {mode === 'create' ? 'Create Client' : 'Update Client'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {step === 'personal' ? 'Next (Interview)' : 'Next (Assessment)'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <View>
                <Text style={styles.subHeader}>{mode === 'create' ? 'NEW CLIENT' : 'EDIT PROFILE'}</Text>
                <Text style={styles.mainTitle}>{mode === 'create' ? 'Add Client' : 'Update Client'}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {renderTabs()}

            <View style={styles.stepContent}>
              {step === 'personal' && (
                <PersonalStep
                  control={control as any}
                  errors={errors}
                  gender={gender as any}
                  onGenderChange={(next) => setValue('gender', next)}
                />
              )}
              {step === 'interview' && <InterviewStep control={control as any} />}
              {step === 'assessment' && (
                <AssessmentStep
                  control={control as any}
                  flexNotes={flexNotes}
                  setNote={setNote}
                />
              )}
            </View>

            {renderFooter()}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '94%',
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    paddingBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderContainer,
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  subHeader: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 28,
    position: 'relative',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabIconCircle: {
    width: 36, height: 36, borderRadius: borderRadius.xxl,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  tabIconCircleActive: { backgroundColor: colors.primary },
  tabIconCircleCompleted: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 10, fontWeight: '800', color: colors.textInactive, letterSpacing: 0.5 },
  tabLabelActive: { color: colors.primary },
  activeIndicator: {
    position: 'absolute', bottom: -1,
    width: '80%', height: 2, backgroundColor: colors.primary, zIndex: 2,
  },
  tabsBottomLine: {
    position: 'absolute', bottom: 0,
    width: '100%', height: 1, backgroundColor: colors.borderDefault,
  },
  stepContent: { flex: 1, minHeight: 0 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, backgroundColor: colors.surface, padding: 16,
    borderRadius: borderRadius.lg, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textLight, fontWeight: '700', fontSize: 14 },
  backBtn: {
    flex: 1, backgroundColor: colors.surface, padding: 16,
    borderRadius: borderRadius.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  backBtnText: { color: colors.textLight, fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 2, backgroundColor: colors.surfaceLight, padding: 16,
    borderRadius: borderRadius.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: '#3A3A3A',
  },
  nextBtnYellow: { backgroundColor: colors.primary, borderColor: colors.primary },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: colors.textPrimary, fontWeight: '800', fontSize: 14 },
});
