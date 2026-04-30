import RichTextSection from '../ui/RichTextSection';

interface MedicationSectionProps {
  value: string;
  isEditing: boolean;
  onValueChange: (val: string) => void;
  onToggleEdit: () => void;
  onSave: () => void;
}

export default function MedicationSection({
  value,
  isEditing,
  onValueChange,
  onToggleEdit,
  onSave,
}: MedicationSectionProps) {
  const icon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFE66D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H10a2 2 0 0 0-2 2v2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2z"></path>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="12" y1="11" x2="12" y2="17"></line>
      <line x1="9" y1="14" x2="15" y2="14"></line>
    </svg>
  );

  return (
    <RichTextSection
      title="Medication & Supplements"
      icon={icon}
      isEditing={isEditing}
      value={value}
      onChange={onValueChange}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      placeholder="List medications and supplements..."
      emptyText="No medications tracked yet. Tap Edit to add medication notes."
    />
  );
}
