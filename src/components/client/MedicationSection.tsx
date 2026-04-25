import React from 'react';
import { Client, ClientProfile } from '../../types';
import RichTextSection from '../shared/RichTextSection';

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
  return (
    <RichTextSection
      isEditing={isEditing}
      draftHtml={medicationDraft}
      richTextRef={richTextRef}
      onDraftChange={onDraftChange}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      headerIcon="medkit-outline"
      headerIconColor="#FF5252"
      headerTitle="Medication"
      placeholder="Start typing medication notes..."
      emptyViewerText="No medications tracked yet. Tap Edit to add medication notes."
      viewerHtml={clientData.profile?.medications}
      editorSelectedIconTint="#FF5252"
      editorCaretColor="#FF5252"
    />
  );
}
