// ─────────────────────────────────────────────────────────────────────────────
// RichTextSection — Rich text editor/viewer with formatting toolbar
// Reference: /reference/components/shared/RichTextSection.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import './RichTextSection.css';
import Card from './Card';
import IconButton from './IconButton';
import LongPressCard from '../LongPressCard';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';

interface RichTextSectionProps {
  title: string;
  icon: React.ReactNode;
  isEditing: boolean;
  value: string;
  onChange: (val: string) => void;
  onToggleEdit: () => void;
  onSave: () => Promise<void> | void;
  placeholder?: string;
  emptyText?: string;
  showViewAction?: boolean;
}

export default function RichTextSection({
  title,
  icon,
  isEditing,
  value,
  onChange,
  onToggleEdit,
  onSave,
  placeholder = 'Start typing...',
  emptyText = 'No content yet.',
  showViewAction = true,
}: RichTextSectionProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { playConfirm, playError } = useSoundFeedback();
  const haptic = useHaptic();

  const editIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const spinnerIcon = (
    <span className="rich-text-section__spinner" aria-hidden="true" />
  );

  const saveIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 8L6 12L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // Parse initial markdown-like text to basic HTML for backward compatibility
  useEffect(() => {
    if (isEditing && editorRef.current) {
      let html = value;
      // Convert old markdown \n to <br> if there are no HTML tags
      if (html && !html.includes('<') && html.includes('\n')) {
        html = html.replace(/\n/g, '<br>');
      }
      // Convert old **bold** to <b>bold</b>
      if (html && html.includes('**')) {
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      }

      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
      editorRef.current.focus();
    }
  }, [isEditing]);

  const handleAction = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    haptic.medium();
    setSaveState('saving');

    try {
      await onSave();
      playConfirm();
      setSaveState('saved');
      window.setTimeout(() => {
        setSaveState('idle');
      }, 1500);
    } catch {
      playError();
      setSaveState('idle');
    }
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  // Convert old markdown-like text to basic HTML for rendering in view mode
  const renderValue = () => {
    if (!value) return emptyText;
    let html = value;
    if (!html.includes('<') && html.includes('\n')) {
      html = html.replace(/\n/g, '<br>');
    }
    if (html.includes('**')) {
      html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    }
    return html;
  };

  const content = (
    <>
      <div className="card__header">
        <div className="card__header-left">
          <span className="card__header-icon">{icon}</span>
          <span className="card__header-title">{title}</span>
        </div>
        {(isEditing || showViewAction) ? (
          <IconButton
            icon={isEditing ? (saveState === 'saving' ? spinnerIcon : saveState === 'saved' ? saveIcon : saveIcon) : editIcon}
            onClick={isEditing ? () => void handleSave() : onToggleEdit}
            disabled={saveState === 'saving'}
            label={isEditing ? (saveState === 'saved' ? 'Saved' : 'Save') : 'Edit'}
          />
        ) : null}
      </div>

      {isEditing ? (
        <>
          <div className="rich-text-toolbar">
            <button className="rich-text-toolbar__btn" onMouseDown={(e) => { e.preventDefault(); handleAction('bold'); }} title="Bold">
              <b>B</b>
            </button>
            <button className="rich-text-toolbar__btn" onMouseDown={(e) => { e.preventDefault(); handleAction('italic'); }} title="Italic">
              <i>I</i>
            </button>
            <button className="rich-text-toolbar__btn" onMouseDown={(e) => { e.preventDefault(); handleAction('underline'); }} title="Underline">
              <u>U</u>
            </button>
            
            <div className="rich-text-toolbar__separator" />
            
            <select className="rich-text-toolbar__select" onChange={(e) => handleAction('formatBlock', e.target.value)} defaultValue="">
              <option value="" disabled hidden>Format</option>
              <option value="H1">Heading 1</option>
              <option value="H2">Heading 2</option>
              <option value="H3">Heading 3</option>
              <option value="P">Paragraph</option>
            </select>
            
            <select className="rich-text-toolbar__select" onChange={(e) => handleAction('fontSize', e.target.value)} defaultValue="">
              <option value="" disabled hidden>Size</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>

            <div className="rich-text-toolbar__separator" />
            
            <input 
               type="color" 
               className="rich-text-toolbar__color" 
               onChange={(e) => handleAction('foreColor', e.target.value)} 
               title="Text Color"
            />
            
            <button className="rich-text-toolbar__btn" onMouseDown={(e) => { e.preventDefault(); handleAction('insertUnorderedList'); }} title="Bullet List">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="4" cy="6" r="1" fill="currentColor"></circle><circle cx="4" cy="12" r="1" fill="currentColor"></circle><circle cx="4" cy="18" r="1" fill="currentColor"></circle></svg>
            </button>
          </div>

          <div
            ref={editorRef}
            className="rich-text-editor rich-text-editor--editable"
            contentEditable
            onInput={onInput}
            suppressContentEditableWarning
            data-placeholder={placeholder}
          />
        </>
      ) : (
        <div 
           className={`rich-text-content ${!value ? 'rich-text-content--empty' : ''}`}
           dangerouslySetInnerHTML={{ __html: renderValue() }}
        />
      )}
    </>
  );

  if (isEditing) {
    return (
      <Card padding="md" className="rich-text-section">
        {content}
      </Card>
    );
  }

  return (
    <LongPressCard onLongPress={onToggleEdit} className="card card--pad-md rich-text-section">
      {content}
    </LongPressCard>
  );
}
