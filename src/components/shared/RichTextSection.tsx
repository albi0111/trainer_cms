import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Platform } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';
import CardContainer from './CardContainer';

interface RichTextSectionProps {
  isEditing: boolean;
  draftHtml: string;
  richTextRef: React.RefObject<any>;
  onDraftChange: (html: string) => void;
  onToggleEdit: () => void;
  onSave: () => void;

  // Customizations
  headerIcon: keyof typeof Ionicons.glyphMap;
  headerIconColor: string;
  headerTitle: string;
  placeholder: string;
  emptyViewerText: string;
  viewerHtml?: string | null;
  editorSelectedIconTint: string;
  editorCaretColor: string;
}

export default function RichTextSection({
  isEditing,
  draftHtml,
  richTextRef,
  onDraftChange,
  onToggleEdit,
  onSave,
  headerIcon,
  headerIconColor,
  headerTitle,
  placeholder,
  emptyViewerText,
  viewerHtml,
  editorSelectedIconTint,
  editorCaretColor,
}: RichTextSectionProps) {
  const [inputHeight, setInputHeight] = useState(100);

  // ── Web fallback: simple textarea (web is not the target platform) ──
  const renderWebEditor = () => (
    <View style={styles.editorContainer}>
      <TextInput
        style={[styles.webTextInput, { height: Math.max(100, inputHeight) }]}
        value={draftHtml.replace(/<[^>]*>/g, '')}
        onChangeText={onDraftChange}
        multiline
        placeholder={placeholder}
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
      {viewerHtml ? (
        <Text style={styles.overviewText}>
          {viewerHtml.replace(/<[^>]*>/g, '')}
        </Text>
      ) : (
        <Text style={styles.overviewText}>
          {emptyViewerText}
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
        selectedIconTint={editorSelectedIconTint}
        style={styles.toolbar}
      />
      <RichEditor
        ref={richTextRef}
        initialContentHTML={draftHtml}
        onChange={onDraftChange}
        editorStyle={{
          backgroundColor: '#1A1A1A',
          color: '#CCC',
          placeholderColor: '#555',
          caretColor: editorCaretColor,
          contentCSSText: `
            font-size: 14px;
            line-height: 22px;
            padding: 12px;
          `,
        }}
        placeholder={placeholder}
      />
    </View>
  );

  const renderNativeViewer = () => (
    <View>
      {viewerHtml ? (
        <View style={{ flex: 1, backgroundColor: 'transparent', minHeight: 40 }}>
          <RichEditor
            initialContentHTML={viewerHtml}
            disabled={true}
            editorStyle={{ backgroundColor: 'transparent', color: '#AAA' }}
            scrollEnabled={false}
          />
        </View>
      ) : (
        <Text style={styles.overviewText}>
          {emptyViewerText}
        </Text>
      )}
    </View>
  );

  return (
    <CardContainer
      headerIcon={headerIcon}
      headerIconColor={headerIconColor}
      headerTitle={headerTitle}
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
