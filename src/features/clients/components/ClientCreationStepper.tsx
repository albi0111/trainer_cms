import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ThemeText } from '../../../shared/components/ThemeText';
import { Button } from '../../../shared/components/Button';
import { InputField } from '../../../shared/components/forms/InputField';
import { Stack } from '../../../shared/components/layout/Stack';
import { useClientFormStore } from '../../../store/useClientFormStore';

const STEPS = [
  { title: 'Personal', subtitle: 'Basic identity' },
  { title: 'Interview', subtitle: 'History & Lifestyle' },
  { title: 'Assessment', subtitle: 'Current baseline' },
  { title: 'Goal', subtitle: 'Target outcome' },
  { title: 'Review', subtitle: 'Confirm details' },
];

export const ClientCreationStepper = ({ 
  onComplete, 
  onCancel, 
  isSyncing = false 
}: { 
  onComplete: () => void, 
  onCancel: () => void, 
  isSyncing?: boolean 
}) => {
  const theme = useAppTheme();
  const { formData, step, updateFields, nextStep, prevStep, isEditMode } = useClientFormStore();

  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    header: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.xl,
      paddingBottom: t.spacing.lg,
    },
    stepperBar: {
      flexDirection: 'row',
      gap: 4,
      marginTop: t.spacing.md,
    },
    stepIndicator: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    content: {
      flex: 1,
      paddingHorizontal: t.spacing.lg,
    },
    footer: {
      padding: t.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: t.colors.surfaceElevated,
      flexDirection: 'row',
      gap: t.spacing.md,
    },
    reviewCard: {
      backgroundColor: t.colors.surface,
      padding: t.spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    reviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.xs,
    }
  }));

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Stack gap="lg">
            <InputField
              label="Full Name *"
              value={formData.name}
              onChangeText={(v) => updateFields({ name: v })}
              placeholder="e.g. John Doe"
            />
            <InputField
              label="Email"
              value={formData.email}
              onChangeText={(v) => updateFields({ email: v })}
              placeholder="john@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <InputField
              label="Phone"
              value={formData.phone}
              onChangeText={(v) => updateFields({ phone: v })}
              placeholder="+1 234 567 890"
              keyboardType="phone-pad"
            />
            <InputField
              label="Address"
              value={formData.address}
              onChangeText={(v) => updateFields({ address: v })}
              placeholder="Street, City, Country"
            />
          </Stack>
        );
      case 1:
        return (
          <Stack gap="lg">
            <InputField
              label="Occupation"
              value={formData.occupation}
              onChangeText={(v) => updateFields({ occupation: v })}
              placeholder="e.g. Software Engineer"
            />
            <InputField
              label="Lifestyle"
              value={formData.lifestyle}
              onChangeText={(v) => updateFields({ lifestyle: v })}
              placeholder="e.g. Sedentary, active weekends"
              multiline
            />
            <InputField
              label="Medical Conditions"
              value={formData.medical_conditions}
              onChangeText={(v) => updateFields({ medical_conditions: v })}
              placeholder="e.g. None, Knee injury"
              multiline
            />
          </Stack>
        );
      case 2:
        return (
          <Stack gap="lg">
            <InputField
              label="Height (cm)"
              value={formData.height_cm?.toString() || ''}
              onChangeText={(v) => updateFields({ height_cm: parseFloat(v) || undefined })}
              placeholder="180"
              keyboardType="numeric"
            />
            <InputField
              label="Weight (kg)"
              value={formData.weight_kg?.toString() || ''}
              onChangeText={(v) => updateFields({ weight_kg: parseFloat(v) || undefined })}
              placeholder="85"
              keyboardType="numeric"
            />
          </Stack>
        );
      case 3:
        return (
          <Stack gap="lg">
            <InputField
              label="Fitness Goal"
              value={formData.goal}
              onChangeText={(v) => updateFields({ goal: v })}
              placeholder="e.g. Weight loss, Muscle gain"
              multiline
              numberOfLines={4}
            />
          </Stack>
        );
      case 4:
        return (
          <ScrollView>
            <Stack gap="md">
              <View style={styles.reviewCard}>
                <ThemeText level="h3" style={{ marginBottom: 12 }}>{formData.name}</ThemeText>
                <View style={styles.reviewRow}>
                  <ThemeText level="body2" color="textSecondary">Email</ThemeText>
                  <ThemeText level="body2">{formData.email || 'N/A'}</ThemeText>
                </View>
                <View style={styles.reviewRow}>
                  <ThemeText level="body2" color="textSecondary">Phone</ThemeText>
                  <ThemeText level="body2">{formData.phone || 'N/A'}</ThemeText>
                </View>
                <View style={styles.reviewRow}>
                  <ThemeText level="body2" color="textSecondary">Goal</ThemeText>
                  <ThemeText level="body2" numberOfLines={1}>{formData.goal || 'N/A'}</ThemeText>
                </View>
              </View>
              <ThemeText level="caption" color="textSecondary">
                By clicking {isEditMode ? 'Update' : 'Create'}, you will {isEditMode ? 'update the client profile' : 'save this client'} to your database.
              </ThemeText>
            </Stack>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  const isNextDisabled = step === 0 && !formData.name.trim();

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <ThemeText level="caption" color="primary">{STEPS[step].subtitle}</ThemeText>
          <ThemeText level="h1">{STEPS[step].title}</ThemeText>
          <View style={styles.stepperBar}>
            {STEPS.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.stepIndicator, 
                  { backgroundColor: i <= step ? theme.colors.primary : theme.colors.surfaceElevated }
                ]} 
              />
            ))}
          </View>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {renderStepContent()}
        </ScrollView>

        <View style={styles.footer}>
          {step === 0 ? (
            <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={onCancel} />
          ) : (
            <Button label="Back" variant="outline" style={{ flex: 1 }} onPress={prevStep} />
          )}
          
          {step === STEPS.length - 1 ? (
            <Button 
              label={isEditMode ? 'Update Client' : 'Create Client'} 
              style={{ flex: 2 }} 
              onPress={onComplete} 
              loading={isSyncing}
            />
          ) : (
            <Button 
              label="Next" 
              style={{ flex: 2 }} 
              disabled={isNextDisabled} 
              onPress={nextStep} 
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
