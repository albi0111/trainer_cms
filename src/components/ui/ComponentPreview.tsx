import { useState } from 'react';

// UI Components
import Button from './Button';
import IconButton from './IconButton';
import Input from './Input';
import Select from './Select';
import Checkbox from './Checkbox';
import TextArea from './TextArea';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import Modal from './Modal';
import Badge from './Badge';
import EmptyState from './EmptyState';
import Card from './Card';
import Avatar from './Avatar';
import Tag from './Tag';
import SectionHeader from './SectionHeader';
import TabBar from './TabBar';
import type { TabDefinition } from './TabBar';

// Layout Components
import TopNavBar from '../layout/TopNavBar';
import PageWrapper from '../layout/PageWrapper';

// ── Section label ────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <h2 style={{
      marginBottom: '16px',
      color: 'var(--color-text-label)',
      fontSize: 'var(--font-size-2xs)',
      fontWeight: 'var(--font-weight-extrabold)' as any,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.8px',
    }}>
      {children}
    </h2>
  );
}

// ── SVG Icons (matching reference Ionicons sizes) ────────────────────────
const PencilIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 4L4 14H12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CalendarIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 1V4M11 1V4M1 7H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const MedkitIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="4" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 4V3C5 1.9 5.9 1 7 1H9C10.1 1 11 1.9 11 3V4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 7V12M5.5 9.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ── TabBar definitions ───────────────────────────────────────────────────
const CLIENT_TABS: TabDefinition[] = [
  { key: 'overview', label: 'Overview', icon: <CalendarIcon size={16} /> },
  { key: 'analytics', label: 'Analytics', icon: <PencilIcon size={16} /> },
  { key: 'plans', label: 'Plans', icon: <CalendarIcon size={16} /> },
  { key: 'health', label: 'Health', icon: <MedkitIcon size={16} /> },
  { key: 'profile', label: 'Profile', icon: <PencilIcon size={16} /> },
];

export default function ComponentPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');

  return (
    <>
      <TopNavBar showBack rightContent={<span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>Mon, April 28</span>} />

      <PageWrapper>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {/* ── Buttons ───────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Buttons</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <Button variant="primary" size="lg">Confirm</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="outline">+ Add Plan</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </section>

          {/* ── Icon Buttons (32×32 circular) ──────────────────────── */}
          <section>
            <SectionLabel>Icon Buttons (primary action pattern)</SectionLabel>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <IconButton icon={<PencilIcon />} label="Edit" />
              <IconButton icon={<TrashIcon size={18} />} label="Delete" />
              <IconButton icon={<CalendarIcon />} label="Calendar" />
              <IconButton icon={<PencilIcon />} variant="dark" label="Edit (dark)" />
              {/* Planning pill (multi-icon button variant from reference) */}
              <button style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', height: '32px', padding: '0 12px',
                backgroundColor: 'var(--circular-btn-bg-dark)', borderRadius: 'var(--radius-3xl)',
                border: '1px solid var(--circular-btn-border)', cursor: 'pointer',
                color: 'var(--circular-btn-icon-color)',
              }}>
                <CalendarIcon size={14} />
                <PencilIcon size={14} />
              </button>
            </div>
          </section>

          {/* ── TabBar ────────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Tab Bar</SectionLabel>
            <TabBar tabs={CLIENT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </section>

          {/* ── Section Header ────────────────────────────────────────── */}
          <section>
            <SectionLabel>Section Headers</SectionLabel>
            <SectionHeader title="WORKOUT PLAN" actionLabel="+ Add Plan" onAction={() => {}} />
            <SectionHeader title="DIET PLAN" actionLabel="+ Add Column" onAction={() => {}} />
          </section>

          {/* ── Tags / Pills ──────────────────────────────────────────── */}
          <section>
            <SectionLabel>Tags / Pills</SectionLabel>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Tag variant="yellow">Muscle Gain</Tag>
              <Tag variant="gray">Poster Correction</Tag>
              <Tag variant="gray">4 Weeks</Tag>
            </div>
          </section>

          {/* ── Badges (StatusBadge) ──────────────────────────────────── */}
          <section>
            <SectionLabel>Badges</SectionLabel>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant="active" />
              <Badge variant="completed" />
              <Badge variant="on-hold" />
              <Badge variant="pending" />
            </div>
          </section>

          {/* ── Avatars ──────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Avatars</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Avatar name="John Doe" size="sm" />
              <Avatar name="Jane Smith" size="md" />
              <Avatar name="Alex Wilson" size="lg" />
              <Avatar name="User Image" src="https://i.pravatar.cc/150?u=fit" size="md" />
            </div>
          </section>

          {/* ── Form Fields ──────────────────────────────────────────── */}
          <section>
            <SectionLabel>Form Fields</SectionLabel>
            <div style={{ display: 'grid', gap: '20px', maxWidth: '400px' }}>
              <Input label="Full Name" placeholder="Enter client name" />
              <Input label="Email" error="This field is required" defaultValue="invalid" />
              <Input label="Disabled" disabled defaultValue="Cannot edit" />
              <TextArea label="Notes" placeholder="Add session notes..." />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <DatePicker label="Date" />
                <TimePicker label="Time" />
              </div>
              <Select
                label="Goal"
                options={[
                  { label: 'Muscle Gain', value: 'muscle' },
                  { label: 'Fat Loss', value: 'fat' },
                  { label: 'Endurance', value: 'endurance' },
                ]}
                placeholder="Select goal"
              />
              <Select
                label="Status (Error)"
                options={[{ label: 'Active', value: 'active' }]}
                error="Please select a valid status"
              />
              <Checkbox label="Remind me to take measurements" checked={checked} onChange={setChecked} />
            </div>
          </section>

          {/* ── Cards (matching CardContainer) ─────────────────────── */}
          <section>
            <SectionLabel>Cards</SectionLabel>
            <div style={{ display: 'grid', gap: '16px' }}>
              <Card padding="md">
                <div className="card__header">
                  <div className="card__header-left">
                    <span className="card__header-icon"><MedkitIcon size={16} /></span>
                    <span className="card__header-title">Medication</span>
                  </div>
                  <IconButton icon={<PencilIcon />} label="Edit" />
                </div>
                <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-base)', lineHeight: '22px' }}>
                  testostearon booster - 1<br />Line 1<br />Line 2<br />Line 3
                </p>
              </Card>
              <Card padding="lg" bordered onClick={() => alert('Clicked!')}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-md)' }}>Clickable card with border</p>
              </Card>
            </div>
          </section>

          {/* ── Modal ─────────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Modal</SectionLabel>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Add Session"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button onClick={() => setModalOpen(false)}>Confirm</Button>
                </>
              }
            >
              <div style={{ display: 'grid', gap: '20px' }}>
                <Input label="Session Focus" placeholder="e.g. Upper Body" />
                <Select label="Day" options={[{ label: 'Monday', value: 'mon' }, { label: 'Tuesday', value: 'tue' }]} placeholder="Select day" />
              </div>
            </Modal>
          </section>

          {/* ── Empty State ────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Empty State</SectionLabel>
            <EmptyState message="No plans active. Tap Add Plan to map a new cycle." />
          </section>

        </div>
      </PageWrapper>

    </>
  );
}
