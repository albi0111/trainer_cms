// ─────────────────────────────────────────────────────────────────────────────
// Add Client Modal
// Source of truth: Step 2 Requirements
// ONLY 'name' is required.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
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
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { createClient } from '../../services/client/clientService';

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
}

interface FormData {
  name: string;
}

export default function AddClientModal({
  visible,
  onClose,
  onSuccess,
}: AddClientModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const id = await createClient(data.name);
      reset();
      onSuccess(id);
    } catch (error) {
      console.error('[AddClientModal] Failed to create client:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>New Client</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <Controller
              control={control}
              rules={{ required: 'Name is required' }}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#555"
                  autoFocus
                />
              )}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name.message}</Text>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Client</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
  },
  form: {
    gap: 8,
  },
  label: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#222',
    color: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});
