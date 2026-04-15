// ─────────────────────────────────────────────────────────────────────────────
// Add Client Modal — Multi-Step Flow
// Source of truth: system_prompt.md §11 (Add Client Flow)
// Steps:
//   1. Personal  — name* (required), phone, email
//   2. Interview — training experience, injuries, lifestyle notes
//   3. Assessment — vitals, flexibility tests, cardio, objectives, goal, status
// All steps beyond name are skippable per R16.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { 
  createClient, 
  updateClientProfile, 
  updateClientLifestyle, 
  updateClientAssessment,
  updateClientOverview,
  updateClientCore,
  batchUpdateClient
} from '../../services/client/clientService';
import { Client, ClientProfile, ClientLifestyle, ClientAssessment } from '../../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
  mode?: 'create' | 'edit';
  clientId?: string;
  initialData?: {
    client: Client;
    profile: ClientProfile;
    lifestyle: ClientLifestyle;
    assessment: ClientAssessment;
  };
  initialStep?: Step;
}

interface FormData {
  // Step 1: Personal
  name: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;

  // Step 2: Interview
  training_experience: string;
  injuries: string;
  lifestyle_notes: string;

  // Step 3: Assessment
  weight_kg: string;
  height_cm: string;
  bp: string;         // "120/80" format
  rhr: string;

  // Strength Exercises — Notes/Remarks
  strength_1_note: string;
  strength_2_note: string;
  strength_3_note: string;
  strength_4_note: string;
  strength_5_note: string;
  strength_6_note: string;
  strength_7_note: string;
  strength_8_note: string;

  // Flexibility tests — R/L checkboxes
  flex_hamstrings_r: boolean;
  flex_hamstrings_l: boolean;
  flex_quadriceps_r: boolean;
  flex_quadriceps_l: boolean;
  flex_hip_flexors_r: boolean;
  flex_hip_flexors_l: boolean;
  flex_shoulders_r: boolean;
  flex_shoulders_l: boolean;
  flex_toe_reach: boolean;
  flex_trunk_r: boolean;
  flex_trunk_l: boolean;
  // Cardio
  cardio_done: boolean;
  cardio_time: string;
  cardio_distance: string;
  cardio_mhr: string;
  // Objectives + Goal
  objectives: string;
  primary_goal: string;
}

type Step = 'personal' | 'interview' | 'assessment';

// ── Flexibility Tests Config ─────────────────────────────────────────────────

const FLEXIBILITY_TESTS = [
  { label: 'Hamstrings', keyR: 'flex_hamstrings_r', keyL: 'flex_hamstrings_l', bilateral: false },
  { label: 'Quadriceps', keyR: 'flex_quadriceps_r', keyL: 'flex_quadriceps_l', bilateral: false },
  { label: 'Hip Flexors', keyR: 'flex_hip_flexors_r', keyL: 'flex_hip_flexors_l', bilateral: false },
  { label: 'Shoulders', keyR: 'flex_shoulders_r', keyL: 'flex_shoulders_l', bilateral: false },
  { label: 'Toe Reach', keyR: 'flex_toe_reach', keyL: '', bilateral: true },
  { label: 'Trunk Rotation', keyR: 'flex_trunk_r', keyL: 'flex_trunk_l', bilateral: false },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddClientModal({ 
  visible, 
  onClose, 
  onSuccess, 
  mode = 'create', 
  clientId, 
  initialData,
  initialStep = 'personal'
}: AddClientModalProps) {
  console.log('[AddClientModal] Rendered with mode:', mode, 'clientId:', clientId, 'hasInitialData:', !!initialData);
  const [step, setStep] = useState<Step>(initialStep);
  const [submitting, setSubmitting] = useState(false);
  // Track which flex rows have notes panel open
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  // Store notes text per flex row key
  const [flexNotes, setFlexNotes] = useState<Record<string, string>>({});

  const toggleNotes = (key: string) =>
    setOpenNotes(prev => ({ ...prev, [key]: !prev[key] }));
  const setNote = (key: string, val: string) =>
    setFlexNotes(prev => ({ ...prev, [key]: val }));

  const { control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<FormData>({
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
      objectives: '', primary_goal: 'Build Muscle Mass',
    },
  });

  // Handle data pre-filling for edit mode
  React.useEffect(() => {
    if (visible) {
      setSubmitting(false); // Force reset
      if (mode === 'edit' && initialData) {
        const { client, profile, lifestyle, assessment } = initialData;
        
        // Transform flex results to form state
        const flexMap: any = {};
        assessment.flexibility?.forEach(f => {
          if (f.key === 'hamstrings') { flexMap.flex_hamstrings_r = f.right; flexMap.flex_hamstrings_l = f.left; }
          if (f.key === 'quadriceps') { flexMap.flex_quadriceps_r = f.right; flexMap.flex_quadriceps_l = f.left; }
          if (f.key === 'hip_flexors') { flexMap.flex_hip_flexors_r = f.right; flexMap.flex_hip_flexors_l = f.left; }
          if (f.key === 'shoulders') { flexMap.flex_shoulders_r = f.right; flexMap.flex_shoulders_l = f.left; }
          const flexKey = (f.key as any);
          if (flexKey === 'seated_toe_reach' || flexKey === 'toe_reach') { flexMap.flex_toe_reach = f.right; }
          if (f.key === 'trunk_rotation') { flexMap.flex_trunk_r = f.right; flexMap.flex_trunk_l = f.left; }
          // Pre-fill flexNotes state
          if (f.note) setNote(f.key, f.note);
        });

        // Transform strength exercises
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
          training_experience: lifestyle.job_type === 'Beginner' ? 'Beginner' : 'Experienced', // Basic mapping
          injuries: profile.medical_notes || '',
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
          primary_goal: client.goal || 'Build Muscle Mass',
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
      // Parse BP
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
          const key = t.label === 'Toe Reach' ? 'seated_toe_reach' : t.label.toLowerCase().replace(/ /g, '_');
          return {
            key,
            right: (data as any)[t.keyR] ?? false,
            left: t.keyL ? ((data as any)[t.keyL] ?? false) : null,
            note: (flexNotes && flexNotes[key]) || '',
          };
        }),
        exercises: [
          { label: 'Bench Press', note: data.strength_1_note, order: 1, key: 'bench_press' },
          { label: 'Squat', note: data.strength_2_note, order: 2, key: 'squat' },
          { label: 'Leg Press', note: data.strength_3_note, order: 3, key: 'leg_press' },
          { label: 'Lat Pulldown', note: data.strength_4_note, order: 4, key: 'lat_pulldown' },
          { label: 'Seated Row', note: data.strength_5_note, order: 5, key: 'seated_row' },
          { label: 'Leg Curl', note: data.strength_6_note, order: 6, key: 'leg_curl' },
        ].map(ex => ({
          key: ex.key,
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
            goal: data.primary_goal,
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
          primaryGoal: data.primary_goal,
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

  // ── Tab Bar ────────────────────────────────────────────────────────────────

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
              color={isActive(tab.key) || isCompleted(tab.key) ? '#000' : '#666'}
            />
          </View>
          <Text style={[styles.tabLabel, (isActive(tab.key) || isCompleted(tab.key)) && styles.tabLabelActive]}>
            {tab.label}
          </Text>
          {isActive(tab.key) && <View style={styles.activeIndicator} />}
          {isCompleted(tab.key) && <View style={[styles.activeIndicator, { backgroundColor: '#888' }]} />}
        </TouchableOpacity>
      ))}
      <View style={styles.tabsBottomLine} />
    </View>
  );

  // ── Step 1: Personal ───────────────────────────────────────────────────────

  const renderPersonal = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>FULL NAME *</Text>
        <Controller
          control={control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, !!errors.name && styles.inputError]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g. John Smith"
              placeholderTextColor="#444"
            />
          )}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 12 }]}>
          <Text style={styles.label}>AGE</Text>
          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="28"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
            )}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>GENDER</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => {
              const next = gender === 'Male' ? 'Female' : gender === 'Female' ? 'Other' : 'Male';
              setValue('gender', next);
            }}
          >
            <Text style={styles.selectBtnText}>{gender}</Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>PHONE</Text>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="+1 234 567 8901"
              placeholderTextColor="#444"
              keyboardType="phone-pad"
            />
          )}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>EMAIL</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="client@email.com"
              placeholderTextColor="#444"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
      </View>
    </ScrollView>
  );

  // ── Step 2: Interview ──────────────────────────────────────────────────────

  const renderInterview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepHint}>Optional — helps personalize the program</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>TRAINING EXPERIENCE</Text>
        <Controller
          control={control}
          name="training_experience"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g. 2 years gym experience, mostly self-taught..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>INJURIES / MEDICAL CONDITIONS</Text>
        <Controller
          control={control}
          name="injuries"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g. Right knee strain, avoid heavy pressing..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>LIFESTYLE NOTES</Text>
        <Controller
          control={control}
          name="lifestyle_notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g. Desk job, sleeps 6 hrs, high stress..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />
      </View>
    </ScrollView>
  );

  // ── Step 3: Assessment ─────────────────────────────────────────────────────

  const renderCheckbox = (fieldKey: keyof FormData) => (
    <Controller
      control={control}
      name={fieldKey}
      render={({ field: { value, onChange } }) => (
        <TouchableOpacity
          style={[styles.checkbox, value && styles.checkboxChecked]}
          onPress={() => onChange(!value)}
        >
          {value && <Ionicons name="checkmark" size={12} color="#000" />}
        </TouchableOpacity>
      )}
    />
  );

  const renderAssessment = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Vitals Row */}
      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 12 }]}>
          <Text style={styles.label}>WEIGHT (KG)</Text>
          <Controller control={control} name="weight_kg" render={({ field: { onChange, value } }) => (
            <View style={styles.iconInput}>
              <Ionicons name="barbell-outline" size={14} color="#666" />
              <TextInput style={styles.iconInputField} value={value} onChangeText={onChange} placeholder="75" placeholderTextColor="#555" keyboardType="numeric" />
            </View>
          )} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>HEIGHT (CM)</Text>
          <Controller control={control} name="height_cm" render={({ field: { onChange, value } }) => (
            <View style={styles.iconInput}>
              <Ionicons name="barbell-outline" size={14} color="#666" />
              <TextInput style={styles.iconInputField} value={value} onChangeText={onChange} placeholder="175" placeholderTextColor="#555" keyboardType="numeric" />
            </View>
          )} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 12 }]}>
          <Text style={styles.label}>BP (MMHG)</Text>
          <Controller control={control} name="bp" render={({ field: { onChange, value } }) => (
            <View style={styles.iconInput}>
              <Ionicons name="pulse-outline" size={14} color="#666" />
              <TextInput style={styles.iconInputField} value={value} onChangeText={onChange} placeholder="120/80" placeholderTextColor="#555" />
            </View>
          )} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>RHR (BPM)</Text>
          <Controller control={control} name="rhr" render={({ field: { onChange, value } }) => (
            <View style={styles.iconInput}>
              <Ionicons name="heart-outline" size={14} color="#666" />
              <TextInput style={styles.iconInputField} value={value} onChangeText={onChange} placeholder="65" placeholderTextColor="#555" keyboardType="numeric" />
            </View>
          )} />
        </View>
      </View>

      {/* Strength Exercises */}
      <View style={[styles.sectionBlock, { marginBottom: 32 }]}>
        <View style={styles.sectionBlockHeader}>
          <Ionicons name="barbell-outline" size={14} color="#FFD700" />
          <Text style={styles.sectionBlockTitle}>EXERCISES</Text>
        </View>
        {[
          { label: 'Exercise 1', field: 'strength_1_note', icon: require('../../../resrc/icons/Gemini_Generated_Image_8ve3pp8ve3pp8ve3.png') },
          { label: 'Exercise 2', field: 'strength_2_note', icon: require('../../../resrc/icons/Gemini_Generated_Image_e2cq7we2cq7we2cq.png') },
          { label: 'Exercise 3', field: 'strength_3_note', icon: require('../../../resrc/icons/Gemini_Generated_Image_if45hfif45hfif45.png') },
          { label: 'Exercise 4', field: 'strength_4_note', icon: require('../../../resrc/icons/Gemini_Generated_Image_pld916pld916pld9.png') },
          { label: 'Exercise 5', field: 'strength_5_note', icon: require('../../../resrc/icons/Gemini_Generated_Image_t28a37t28a37t28a.png') },
          { label: 'Exercise 6', field: 'strength_6_note', icon: require('../../../resrc/icons/WhatsApp Image 2026-04-14 at 10.10.16 PM (1).jpeg') },
          { label: 'Exercise 7', field: 'strength_7_note', icon: require('../../../resrc/icons/WhatsApp Image 2026-04-14 at 10.10.16 PM.jpeg') },
          { label: 'Exercise 8', field: 'strength_8_note', icon: require('../../../resrc/icons/Gemini_Generated_Image_fvo1befvo1befvo1.png') },
        ].map((ex) => (
          <View key={ex.field} style={styles.strengthRow}>
            <View style={styles.strengthIconWrap}>
              <Image source={ex.icon} style={styles.strengthIcon} resizeMode="contain" />
            </View>
            <View style={styles.strengthInputWrap}>
              <Controller
                control={control}
                name={ex.field as any}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.strengthInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Add remark..."
                    placeholderTextColor="#555"
                    multiline
                  />
                )}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Flexibility Tests */}
      <View style={[styles.sectionBlock, { marginBottom: 32 }]}>
        <View style={styles.sectionBlockHeader}>
          <Ionicons name="stats-chart" size={14} color="#FFD700" />
          <Text style={styles.sectionBlockTitle}>FITNESS TESTS</Text>
        </View>
        <View style={styles.flexTableHeader}>
          <Text style={[styles.flexTableCell, { flex: 1 }]}>EXERCISE</Text>
          <Text style={[styles.flexTableCell, styles.flexTableRLHeader]}>R</Text>
          <Text style={[styles.flexTableCell, styles.flexTableRLHeader]}>L</Text>
          <View style={{ width: 38, marginLeft: 4 }} />
        </View>
        {FLEXIBILITY_TESTS.map((test) => {
          const noteOpen = !!openNotes[test.label];
          const hasNote = (flexNotes[test.label] || '').length > 0;
          return (
            <View key={test.label} style={styles.flexRowWrapper}>
              <View style={[styles.flexTableRow, noteOpen && styles.flexTableRowOpen]}>
                <View style={styles.flexTableExerciseCell}>
                  <Ionicons name="fitness-outline" size={22} color="#666" style={{ marginRight: 12 }} />
                  <Text style={styles.flexTableExerciseText}>{test.label}</Text>
                </View>
                {test.bilateral ? (
                  <>
                    {renderCheckbox(test.keyR as keyof FormData)}
                    <View style={[styles.checkbox, { opacity: 0.15, marginHorizontal: 3 }]} />
                  </>
                ) : (
                  <>
                    {renderCheckbox(test.keyR as keyof FormData)}
                    {renderCheckbox((test.keyL as keyof FormData) || (test.keyR as keyof FormData))}
                  </>
                )}
                <TouchableOpacity
                  style={[styles.notesBtn, (noteOpen || hasNote) && styles.notesBtnActive]}
                  onPress={() => toggleNotes(test.label)}
                >
                  <Ionicons
                    name={noteOpen ? 'document' : 'document-outline'}
                    size={18}
                    color={noteOpen || hasNote ? '#FFD700' : '#555'}
                  />
                </TouchableOpacity>
              </View>
              {noteOpen && (
                <View style={styles.flexNoteRow}>
                  <TextInput
                    style={styles.flexNoteInput}
                    value={flexNotes[test.label] || ''}
                    onChangeText={(val) => setNote(test.label, val)}
                    placeholder="Add remarks..."
                    placeholderTextColor="#444"
                    multiline
                    autoFocus
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Cardio Section */}
      <View style={[styles.flexRowWrapper, { marginBottom: 8 }]}>
        <View style={styles.flexTableRow}>
          <View style={styles.flexTableExerciseCell}>
            <Text style={styles.flexTableExerciseText}>Treadmill</Text>
          </View>
          {renderCheckbox('cardio_done')}
          <TouchableOpacity style={styles.notesBtn}>
            <Ionicons name="document-outline" size={18} color="#555" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.row, { marginBottom: 32 }]}>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>TIME (MIN)</Text>
          <Controller control={control} name="cardio_time" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="30" placeholderTextColor="#555" keyboardType="numeric" />
          )} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>DISTANCE</Text>
          <Controller control={control} name="cardio_distance" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="5.0 km" placeholderTextColor="#555" />
          )} />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>MHR (BPM)</Text>
          <Controller control={control} name="cardio_mhr" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="180" placeholderTextColor="#555" keyboardType="numeric" />
          )} />
        </View>
      </View>

      {/* Objectives */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>OBJECTIVES</Text>
        <Controller control={control} name="objectives" render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.iconInput}>
            <Ionicons name="radio-button-on-outline" size={14} color="#666" style={{ alignSelf: 'flex-start', marginTop: 2 }} />
            <TextInput
              style={[styles.iconInputField, styles.textArea]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g. Improve cardiovascular fitness, increase mobility..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )} />
      </View>

      {/* Primary Goal */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>PRIMARY GOAL</Text>
        <Controller control={control} name="primary_goal" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Build Muscle Mass" placeholderTextColor="#444" />
        )} />
      </View>

    </ScrollView>
  );

  // ── Footer Buttons ─────────────────────────────────────────────────────────

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
            <Ionicons name="chevron-back" size={16} color="#AAA" />
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
            onPress={handleSubmit(onSubmit as any, (err) => {
              console.warn('[AddClientModal] Validation Errors:', err);
              Alert.alert('Form Error', 'Please check all required fields (*) on all tabs.');
            })}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
               <>
                <Ionicons name="checkmark" size={16} color="#000" />
                <Text style={[styles.nextBtnText, { color: '#000' }]}>
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
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.subHeader}>{mode === 'create' ? 'NEW CLIENT' : 'EDIT PROFILE'}</Text>
                <Text style={styles.mainTitle}>{mode === 'create' ? 'Add Client' : 'Update Client'}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            {renderTabs()}

            <View style={styles.stepContent}>
              {step === 'personal' && renderPersonal()}
              {step === 'interview' && renderInterview()}
              {step === 'assessment' && renderAssessment()}
            </View>

            {renderFooter()}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    paddingBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#282828',
    // Flex column so footer is always inside the card
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
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 28,
    position: 'relative',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#262626',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  tabIconCircleActive: { backgroundColor: '#FFD700' },
  tabIconCircleCompleted: { backgroundColor: '#FFD700' },
  tabLabel: { fontSize: 10, fontWeight: '800', color: '#555', letterSpacing: 0.5 },
  tabLabelActive: { color: '#FFD700' },
  activeIndicator: {
    position: 'absolute', bottom: -1,
    width: '80%', height: 2, backgroundColor: '#FFD700', zIndex: 2,
  },
  tabsBottomLine: {
    position: 'absolute', bottom: 0,
    width: '100%', height: 1, backgroundColor: '#333',
  },

  stepContent: { flex: 1, minHeight: 0 },
  stepHint: { color: '#666', fontSize: 13, fontStyle: 'italic', marginBottom: 20 },

  // Form
  fieldGroup: { marginBottom: 24 },
  row: { flexDirection: 'row' },
  label: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    backgroundColor: '#262626',
    color: '#FFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: { borderColor: '#FF5252' },
  textArea: { minHeight: 90, paddingTop: 12 },
  errorText: { color: '#FF5252', fontSize: 11, marginTop: 4 },

  selectBtn: {
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectBtnText: { color: '#FFF', fontSize: 14 },

  iconInput: {
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconInputField: { flex: 1, color: '#FFF', fontSize: 14 },

  // Section blocks (for Assessment)
  sectionBlock: { marginBottom: 8 },
  sectionBlockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, marginTop: 4,
  },
  sectionBlockTitle: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Flexibility table
  flexTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, // Matches flexTableRow
    marginBottom: 6,
  },
  flexTableCell: { color: '#555', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  flexTableRLHeader: { width: 36, textAlign: 'center' }, // 28 (checkbox) + 4+4 (margins) = 36
  flexRowWrapper: { marginBottom: 6 },
  flexTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 0,
  },
  flexTableRowOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  flexTableExerciseCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  flexTableExerciseText: { color: '#E0E0E0', fontSize: 14, fontWeight: '600' },
  checkbox: {
    width: 28, height: 28, borderRadius: 6,
    borderWidth: 1, borderColor: '#444',
    backgroundColor: '#1E1E1E',
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 4,
  },
  checkboxChecked: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  notesBtn: {
    width: 34, height: 34,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  notesBtnActive: {
    backgroundColor: '#2A2500',
    borderColor: '#FFD700',
  },
  flexNoteRow: {
    backgroundColor: '#262626',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  flexNoteInput: {
    color: '#DDD',
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Strength Row
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  strengthIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden', // Clips icon's white corners
    borderWidth: 1,
    borderColor: '#333',
  },
  strengthIcon: {
    width: '100%',
    height: '100%',
  },
  strengthInputWrap: {
    flex: 1,
    height: 80,
    justifyContent: 'center',
  },
  strengthInput: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '400',
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    height: '100%',
    textAlignVertical: 'top',
  },

  // Status selector
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: {
    flex: 1, paddingVertical: 14,
    backgroundColor: '#262626', borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  statusBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  statusBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  statusBtnTextActive: { color: '#000', fontWeight: '800' },

  // Footer
  footer: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, backgroundColor: '#262626', padding: 16,
    borderRadius: 10, alignItems: 'center',
  },
  cancelBtnText: { color: '#AAA', fontWeight: '700', fontSize: 14 },
  backBtn: {
    flex: 1, backgroundColor: '#262626', padding: 16,
    borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  backBtnText: { color: '#AAA', fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 2, backgroundColor: '#2A2A2A', padding: 16,
    borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: '#3A3A3A',
  },
  nextBtnYellow: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
