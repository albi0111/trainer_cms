import React from 'react';
import { ScrollView } from 'react-native';
import { Control } from 'react-hook-form';
import { FormData } from './types';

import { AssessmentVitals } from './AssessmentVitals';
import { AssessmentExercises } from './AssessmentExercises';
import { AssessmentFlexibility } from './AssessmentFlexibility';
import { AssessmentCardio } from './AssessmentCardio';
import { AssessmentObjectives } from './AssessmentObjectives';

interface AssessmentStepProps {
  control: Control<FormData>;
  flexNotes: Record<string, string>;
  setNote: (key: string, val: string) => void;
}

export const AssessmentStep: React.FC<AssessmentStepProps> = ({ control, flexNotes, setNote }) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <AssessmentVitals control={control} />
      <AssessmentExercises control={control} />
      <AssessmentFlexibility control={control} flexNotes={flexNotes} setNote={setNote} />
      <AssessmentCardio control={control} />
      <AssessmentObjectives control={control} />
    </ScrollView>
  );
};
