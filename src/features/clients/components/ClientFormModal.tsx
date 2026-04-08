import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, HelperText, useTheme } from 'react-native-paper';
import { ClientWithProfile, ClientProfile } from '../types';
import { useClientStore } from '../../../store/useClientStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onDismiss: () => void;

  /**
   * If provided → Edit mode (pre-fills fields with client data).
   * If null → Create mode (all fields empty, only name shown initially).
   */
  client: ClientWithProfile | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Quick create / quick edit modal.
 *
 * Create mode: shows Name field only (required). Fast entry for new clients.
 * Edit mode:   shows Name + basic profile fields. All optional except name.
 *
 * Profile lifestyle fields (occupation, activity level, medical, etc.) are
 * intentionally NOT here — they live in ClientDetailScreen → Lifestyle tab.
 * This modal stays simple and fast.
 *
 * Data safety: sanitizeUpdate() is called inside the store action —
 * empty string fields are stripped before any Firestore write.
 */
export const ClientFormModal = ({ visible, onDismiss, client }: Props) => {
  const theme = useTheme();
  const isEditMode = client !== null;

  const { createClient, updateProfile, isLoading: storeLoading, error, clearError } = useClientStore();

  // ── Local form state ────────────────────────────────────────────────────────
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goal,  setGoal]  = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill when switching from create → edit
  useEffect(() => {
    if (client) {
      setName(client.name ?? '');
      setEmail(client.email ?? '');
      setPhone(client.phone ?? '');
      setGoal(client.goal  ?? '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setGoal('');
    }
    clearError();
  }, [client, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation ──────────────────────────────────────────────────────────────
  const nameIsEmpty = name.trim().length === 0;
  const canSave     = !nameIsEmpty && !isSaving;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const profileFields: Partial<ClientProfile> = { email, phone, goal };

      if (isEditMode) {
        await updateProfile(client.id, { name: name.trim(), ...profileFields }, client.version);
      } else {
        await createClient(name.trim(), profileFields);
      }
      onDismiss();
    } catch {
      // error is surfaced via store.error — no double-handling needed
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{isEditMode ? 'Edit Client' : 'New Client'}</Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.form}>

                {/* Name — required */}
                <TextInput
                  label="Name *"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  autoFocus
                  returnKeyType={isEditMode ? 'next' : 'done'}
                  onSubmitEditing={isEditMode ? undefined : handleSave}
                  style={styles.input}
                />
                <HelperText type="error" visible={nameIsEmpty && name !== ''}>
                  Name is required
                </HelperText>

                {/* Profile fields — only shown in edit mode for speed */}
                {isEditMode && (
                  <>
                    <TextInput
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <TextInput
                      label="Phone"
                      value={phone}
                      onChangeText={setPhone}
                      mode="outlined"
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                    <TextInput
                      label="Goal"
                      value={goal}
                      onChangeText={setGoal}
                      mode="outlined"
                      multiline
                      numberOfLines={2}
                      style={styles.input}
                    />
                  </>
                )}

                {/* Store-level error */}
                {error ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {error}
                  </Text>
                ) : null}

              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Dialog.ScrollArea>

        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={isSaving}>Cancel</Button>
          <Button
            onPress={handleSave}
            disabled={!canSave}
            loading={isSaving}
            mode="contained"
          >
            {isEditMode ? 'Save' : 'Create'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  dialog:     { borderRadius: 16, marginHorizontal: 16 },
  scrollArea: { paddingHorizontal: 0, maxHeight: 400 },
  form:       { paddingHorizontal: 16, paddingVertical: 8 },
  input:      { marginBottom: 8 },
  errorText:  { marginTop: 8, fontSize: 13 },
});
