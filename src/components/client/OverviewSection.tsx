import React from 'react';
import { Client, ClientProfile } from '../../types';
import RichTextSection from '../shared/RichTextSection';

interface OverviewSectionProps {
  clientData: Client & { profile: ClientProfile };
  isEditing: boolean;
  overviewDraft: string;
  richTextRef: React.RefObject<any>;
  onDraftChange: (html: string) => void;
  onToggleEdit: () => void;
  onSave: () => void;
}

export default function OverviewSection({
  clientData,
  isEditing,
  overviewDraft,
  richTextRef,
  onDraftChange,
  onToggleEdit,
  onSave,
}: OverviewSectionProps) {
  return (
    <RichTextSection
      isEditing={isEditing}
      draftHtml={overviewDraft}
      richTextRef={richTextRef}
      onDraftChange={onDraftChange}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      headerIcon="document-text-outline"
      headerIconColor="#FFD700"
      headerTitle="Overview"
      placeholder="Start typing notes..."
      emptyViewerText="No overview notes yet. Tap Edit to add profile context."
      viewerHtml={clientData.overview_notes}
      editorSelectedIconTint="#FFD700"
      editorCaretColor="#FFD700"
    />
  );
}
