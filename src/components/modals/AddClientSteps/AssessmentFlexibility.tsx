import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { FormData, FLEXIBILITY_TESTS } from './types';
import { AppCheckbox } from '../../shared/AppCheckbox';
import { colors, borderRadius } from '../../../theme/theme';

interface AssessmentFlexibilityProps {
  control: Control<FormData>;
  flexNotes: Record<string, string>;
  setNote: (key: string, val: string) => void;
}

export const AssessmentFlexibility: React.FC<AssessmentFlexibilityProps> = ({ control, flexNotes, setNote }) => {
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const toggleNotes = (key: string) => {
    setOpenNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={[styles.sectionBlock, { marginBottom: 32 }]}>
      <View style={styles.sectionBlockHeader}>
        <Ionicons name="stats-chart" size={14} color={colors.primary} />
        <Text style={styles.sectionBlockTitle}>FITNESS TESTS</Text>
      </View>
      
      <View style={styles.flexTableHeader}>
        <Text style={[styles.flexTableCell, { flex: 1 }]}>EXERCISE</Text>
        <Text style={[styles.flexTableCell, styles.flexTableRLHeader]}>R</Text>
        <Text style={[styles.flexTableCell, styles.flexTableRLHeader]}>L</Text>
        <View style={{ width: 38, marginLeft: 4 }} />
      </View>
      
      {FLEXIBILITY_TESTS.map((test) => {
        const noteOpen = !!openNotes[test.label];
        const hasNote = (flexNotes[test.label] || '').length > 0;
        
        return (
          <View key={test.label} style={styles.flexRowWrapper}>
            <View style={[styles.flexTableRow, noteOpen && styles.flexTableRowOpen]}>
              <View style={styles.flexTableExerciseCell}>
                <Ionicons name="fitness-outline" size={22} color={colors.textLabel} style={{ marginRight: 12 }} />
                <Text style={styles.flexTableExerciseText}>{test.label}</Text>
              </View>
              
              {test.bilateral ? (
                <>
                  <Controller
                    control={control}
                    name={test.keyR as keyof FormData}
                    render={({ field: { value, onChange } }) => (
                      <AppCheckbox checked={value as boolean} onChange={onChange} />
                    )}
                  />
                  <View style={[styles.checkboxPlaceholder, { opacity: 0.15, marginHorizontal: 3 }]} />
                </>
              ) : (
                <>
                  <Controller
                    control={control}
                    name={test.keyR as keyof FormData}
                    render={({ field: { value, onChange } }) => (
                      <AppCheckbox checked={value as boolean} onChange={onChange} />
                    )}
                  />
                  <Controller
                    control={control}
                    name={(test.keyL as keyof FormData) || (test.keyR as keyof FormData)}
                    render={({ field: { value, onChange } }) => (
                      <AppCheckbox checked={value as boolean} onChange={onChange} />
                    )}
                  />
                </>
              )}
              
              <TouchableOpacity
                style={[styles.notesBtn, (noteOpen || hasNote) && styles.notesBtnActive]}
                onPress={() => toggleNotes(test.label)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={noteOpen ? 'document' : 'document-outline'}
                  size={18}
                  color={noteOpen || hasNote ? colors.primary : colors.textInactive}
                />
              </TouchableOpacity>
            </View>
            
            {noteOpen && (
              <View style={styles.flexNoteRow}>
                <TextInput
                  style={styles.flexNoteInput}
                  value={flexNotes[test.label] || ''}
                  onChangeText={(val) => setNote(test.label, val)}
                  placeholder="Add remarks..."
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  autoFocus
                />
              </View>
            )}
          </View>
        );
      })}
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
  flexTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  flexTableCell: { color: colors.textInactive, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  flexTableRLHeader: { width: 36, textAlign: 'center' },
  flexRowWrapper: { marginBottom: 6 },
  flexTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  flexTableRowOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  flexTableExerciseCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  flexTableExerciseText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  checkboxPlaceholder: {
    width: 28, height: 28, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.borderLight,
    backgroundColor: colors.surfaceDark,
    marginHorizontal: 4,
  },
  notesBtn: {
    width: 34, height: 34,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  notesBtnActive: {
    backgroundColor: colors.surfaceYellow,
    borderColor: colors.primary,
  },
  flexNoteRow: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  flexNoteInput: {
    color: colors.textInput,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
