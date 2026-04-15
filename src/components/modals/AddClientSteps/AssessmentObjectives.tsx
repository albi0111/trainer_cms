import React from 'react';
import { StyleSheet } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { FormData } from './types';
import { AppInput } from '../../shared/AppInput';

interface AssessmentObjectivesProps {
  control: Control<FormData>;
}

export const AssessmentObjectives: React.FC<AssessmentObjectivesProps> = ({ control }) => {
  return (
    <>
      <Controller
        control={control}
        name="objectives"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="OBJECTIVES"
            icon="radio-button-on-outline"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="e.g. Improve cardiovascular fitness, increase mobility..."
            isTextArea
          />
        )}
      />

      <Controller
        control={control}
        name="primary_goal"
        render={({ field: { onChange, value } }) => (
          <AppInput
            label="PRIMARY GOAL"
            value={value}
            onChangeText={onChange}
            placeholder="Build Muscle Mass"
          />
        )}
      />
    </>
  );
};
