import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { FormData } from './types';
import { AppInput } from '../../shared/AppInput';

interface InterviewStepProps {
  control: Control<FormData>;
}

export const InterviewStep: React.FC<InterviewStepProps> = ({ control }) => {
  return (
    <ScrollView>
      <Text style={styles.stepHint}>Optional — helps personalize the program</Text>

      <Controller
        control={control}
        name="training_experience"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="TRAINING EXPERIENCE"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="e.g. 2 years gym experience, mostly self-taught..."
            isTextArea
          />
        )}
      />

      <Controller
        control={control}
        name="injuries"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="INJURIES / MEDICAL CONDITIONS"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="e.g. Right knee strain, avoid heavy pressing..."
            isTextArea
          />
        )}
      />

      <Controller
        control={control}
        name="lifestyle_notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="LIFESTYLE NOTES"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="e.g. Desk job, sleeps 6 hrs, high stress..."
            isTextArea
          />
        )}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  stepHint: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 20,
  },
});
