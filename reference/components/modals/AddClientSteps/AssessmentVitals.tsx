import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { FormData } from './types';
import { AppInput } from '../../shared/AppInput';

interface AssessmentVitalsProps {
  control: Control<FormData>;
}

export const AssessmentVitals: React.FC<AssessmentVitalsProps> = ({ control }) => {
  return (
    <>
      <View style={styles.row}>
        <View style={styles.flexPart}>
          <Controller
            control={control}
            name="weight_kg"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="WEIGHT (KG)"
                icon="barbell-outline"
                value={value}
                onChangeText={onChange}
                placeholder="75"
                keyboardType="numeric"
              />
            )}
          />
        </View>
        <View style={styles.flexPartEnd}>
          <Controller
            control={control}
            name="height_cm"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="HEIGHT (CM)"
                icon="barbell-outline"
                value={value}
                onChangeText={onChange}
                placeholder="175"
                keyboardType="numeric"
              />
            )}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flexPart}>
          <Controller
            control={control}
            name="bp"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="BP (MMHG)"
                icon="pulse-outline"
                value={value}
                onChangeText={onChange}
                placeholder="120/80"
              />
            )}
          />
        </View>
        <View style={styles.flexPartEnd}>
          <Controller
            control={control}
            name="rhr"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="RHR (BPM)"
                icon="heart-outline"
                value={value}
                onChangeText={onChange}
                placeholder="65"
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
  row: {
    flexDirection: 'row',
  },
  flexPart: {
    flex: 1,
    marginRight: 12,
  },
  flexPartEnd: {
    flex: 1,
  },
});
