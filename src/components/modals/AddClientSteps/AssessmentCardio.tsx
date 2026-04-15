import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { FormData } from './types';
import { AppInput } from '../../shared/AppInput';
import { AppCheckbox } from '../../shared/AppCheckbox';
import { colors, borderRadius } from '../../../theme/theme';

interface AssessmentCardioProps {
  control: Control<FormData>;
}

export const AssessmentCardio: React.FC<AssessmentCardioProps> = ({ control }) => {
  return (
    <>
      <View style={[styles.flexRowWrapper, { marginBottom: 8 }]}>
        <View style={styles.flexTableRow}>
          <View style={styles.flexTableExerciseCell}>
            <Text style={styles.flexTableExerciseText}>Treadmill</Text>
          </View>
          
          <Controller
            control={control}
            name="cardio_done"
            render={({ field: { value, onChange } }) => (
              <AppCheckbox checked={value} onChange={onChange} />
            )}
          />
          
          <TouchableOpacity style={styles.notesBtn} activeOpacity={0.7}>
            <Ionicons name="document-outline" size={18} color={colors.textInactive} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flexPart}>
          <Controller
            control={control}
            name="cardio_time"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="TIME (MIN)"
                value={value}
                onChangeText={onChange}
                placeholder="30"
                keyboardType="numeric"
              />
            )}
          />
        </View>
        <View style={styles.flexPart}>
          <Controller
            control={control}
            name="cardio_distance"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="DISTANCE"
                value={value}
                onChangeText={onChange}
                placeholder="5.0 km"
              />
            )}
          />
        </View>
        <View style={styles.flexPartEnd}>
          <Controller
            control={control}
            name="cardio_mhr"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="MHR (BPM)"
                value={value}
                onChangeText={onChange}
                placeholder="180"
                keyboardType="numeric"
              />
            )}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  flexRowWrapper: { marginBottom: 6 },
  flexTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  flexTableExerciseCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  flexTableExerciseText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  notesBtn: {
    width: 34, height: 34,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  row: {
    flexDirection: 'row',
  },
  flexPart: {
    flex: 1,
    marginRight: 8,
  },
  flexPartEnd: {
    flex: 1,
  },
});
