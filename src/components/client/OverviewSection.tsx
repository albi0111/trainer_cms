import RichTextSection from '../ui/RichTextSection';

interface OverviewSectionProps {
  value: string;
  isEditing: boolean;
  onValueChange: (val: string) => void;
  onToggleEdit: () => void;
  onSave: () => void;
}

export default function OverviewSection({
  value,
  isEditing,
  onValueChange,
  onToggleEdit,
  onSave,
}: OverviewSectionProps) {
  const icon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3H14M2 8H14M2 13H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <RichTextSection
      title="Overview"
      icon={icon}
      isEditing={isEditing}
      value={value}
      onChange={onValueChange}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      placeholder="Start typing notes..."
      emptyText="No overview notes yet. Long press to add profile context."
      showViewAction={false}
    />
  );
}
