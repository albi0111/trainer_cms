import React from 'react';
import { View, Text, Image, TextInput, StyleSheet } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { FormData } from './types';
import { colors, borderRadius } from '../../../theme/theme';

interface AssessmentExercisesProps {
  control: Control<FormData>;
}

const STRENGTH_EXERCISES = [
  { label: 'Exercise 1', field: 'strength_1_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-1.png') },
  { label: 'Exercise 2', field: 'strength_2_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-2.png') },
  { label: 'Exercise 3', field: 'strength_3_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-3.png') },
  { label: 'Exercise 4', field: 'strength_4_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-4.png') },
  { label: 'Exercise 5', field: 'strength_5_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-5.jpeg') },
  { label: 'Exercise 6', field: 'strength_6_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-6.jpeg') },
  { label: 'Exercise 7', field: 'strength_7_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-7.png') },
  { label: 'Exercise 8', field: 'strength_8_note', icon: require('../../../../assets/assesment-icons/assesment-exercise-8.png') },
];

export const AssessmentExercises: React.FC<AssessmentExercisesProps> = ({ control }) => {
  return (
    <View style={[styles.sectionBlock, { marginBottom: 32 }]}>
      <View style={styles.sectionBlockHeader}>
        <Ionicons name="barbell-outline" size={14} color={colors.primary} />
        <Text style={styles.sectionBlockTitle}>EXERCISES</Text>
      </View>
      
      {STRENGTH_EXERCISES.map((ex) => (
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
                  placeholderTextColor={colors.textInactive}
                  multiline
                />
              )}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionBlock: { marginBottom: 8 },
  sectionBlockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, marginTop: 4,
  },
  sectionBlockTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  strengthIconWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderDefault,
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
    color: colors.textPrimary,
    fontSize: 15,
    padding: 10,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.xl,
    height: '100%',
    textAlignVertical: 'top',
  },
});
