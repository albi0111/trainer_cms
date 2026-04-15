import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { FormData } from './types';
import { AppInput } from '../../shared/AppInput';
import { AppSelect } from '../../shared/AppSelect';

interface PersonalStepProps {
  control: Control<FormData>;
  errors: any;
  gender: 'Male' | 'Female' | 'Other';
  onGenderChange: (nextGender: 'Male' | 'Female' | 'Other') => void;
}

export const PersonalStep: React.FC<PersonalStepProps> = ({ control, errors, gender, onGenderChange }) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Controller
        control={control}
        name="name"
        rules={{ required: 'Name is required' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="FULL NAME *"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="e.g. John Smith"
            error={errors.name?.message}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.flexPart}>
          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="AGE"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="28"
                keyboardType="numeric"
              />
            )}
          />
        </View>
        <View style={styles.flexPartEnd}>
          <AppSelect
            label="GENDER"
            value={gender}
            onPress={() => {
              const next = gender === 'Male' ? 'Female' : gender === 'Female' ? 'Other' : 'Male';
              onGenderChange(next);
            }}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="PHONE"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="+1 234 567 8901"
            keyboardType="phone-pad"
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="EMAIL"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="client@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
    </ScrollView>
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
