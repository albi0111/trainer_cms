import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Platform } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { Client, ClientProfile } from '../../types';
import CardContainer from '../shared/CardContainer';

interface MedicationSectionProps {
  clientData: Client & { profile: ClientProfile };
  isEditing: boolean;
  medicationDraft: string;
  richTextRef: React.RefObject<any>;
  onDraftChange: (html: string) => void;
  onToggleEdit: () => void;
  onSave: () => void;
}

export default function MedicationSection({
  clientData,
  isEditing,
  medicationDraft,
  richTextRef,
  onDraftChange,
  onToggleEdit,
  onSave,
}: MedicationSectionProps) {

  const [inputHeight, setInputHeight] = useState(100);

  // ── Web fallback: simple textarea (web is not the target platform) ──
  const renderWebEditor = () => (
    <View style={styles.editorContainer}>
      <TextInput
        style={[styles.webTextInput, { height: Math.max(100, inputHeight) }]}
        value={medicationDraft.replace(/<[^>]*>/g, '')}
        onChangeText={onDraftChange}
        multiline
        placeholder="Start typing medication notes..."
        placeholderTextColor="#555"
        textAlignVertical="top"
        scrollEnabled={false}
        onContentSizeChange={(e) => {
          setInputHeight(e.nativeEvent.contentSize.height);
        }}
      />
    </View>
  );

  const renderWebViewer = () => (
    <View>
      {clientData.profile?.medications ? (
        <Text style={styles.overviewText}>
          {clientData.profile.medications.replace(/<[^>]*>/g, '')}
        </Text>
      ) : (
        <Text style={styles.overviewText}>
          No medications tracked yet. Tap Edit to add medication notes.
        </Text>
      )}
    </View>
  );

  // ── Native: Full RichEditor with toolbar ──
  const renderNativeEditor = () => (
    <View style={styles.nativeEditorContainer}>
      <RichToolbar
        editor={richTextRef}
        actions={[
          actions.heading1,
          actions.heading2,
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.setStrikethrough,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.checkboxList,
          actions.insertLink,
          actions.undo,
          actions.redo,
        ]}
        iconTint="#AAA"
        selectedIconTint="#FF5252"
        style={styles.toolbar}
      />
      <RichEditor
        ref={richTextRef}
        initialContentHTML={medicationDraft}
        onChange={onDraftChange}
        editorStyle={{
          backgroundColor: '#1A1A1A',
          color: '#CCC',
          placeholderColor: '#555',
          caretColor: '#FF5252',
          contentCSSText: `
            font-size: 14px;
            line-height: 22px;
            padding: 12px;
          `,
        }}
        placeholder="Tap to start typing medication notes..."
      />
    </View>
  );

  const renderNativeViewer = () => (
    <View>
      {clientData.profile?.medications ? (
        <View style={{ flex: 1, backgroundColor: 'transparent', minHeight: 40 }}>
          <RichEditor
            initialContentHTML={clientData.profile.medications}
            disabled={true}
            editorStyle={{ backgroundColor: 'transparent', color: '#AAA' }}
            scrollEnabled={false}
          />
        </View>
      ) : (
        <Text style={styles.overviewText}>
          No medications tracked yet. Tap Edit to add medication notes.
        </Text>
      )}
    </View>
  );

  return (
    <CardContainer
      headerIcon="medkit-outline"
      headerIconColor="#FF5252"
      headerTitle="Medication"
      actionIcon={isEditing ? 'checkmark' : 'pencil'}
      onAction={isEditing ? onSave : onToggleEdit}
    >
      {isEditing ? (
        <View style={{ minHeight: 100 }}>
          {Platform.OS === 'web' ? renderWebEditor() : renderNativeEditor()}
        </View>
      ) : (
        <View style={styles.overviewContainer}>
          {Platform.OS === 'web' ? renderWebViewer() : renderNativeViewer()}
        </View>
      )}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  // ── Web fallback ──
  editorContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  webTextInput: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && { outlineWidth: 0 }),
  },
  // ── Native RichEditor ──
  nativeEditorContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  toolbar: {
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  // ── Viewer ──
  overviewContainer: {
    flexDirection: 'column',
  },
  overviewText: {
    color: '#AAA',
    fontSize: 14,
    lineHeight: 22,
  },
});
