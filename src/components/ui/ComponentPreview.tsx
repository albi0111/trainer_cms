import { useState } from 'react';
import Button from './Button';
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
import TopNavBar from '../layout/TopNavBar';
import BottomNav from '../layout/BottomNav';
import PageWrapper from '../layout/PageWrapper';

export default function ComponentPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(true);

  return (
    <PageWrapper className="preview-page">
      <TopNavBar 
        title="Component Preview" 
        right={<Badge variant="success">Dev Mode</Badge>}
      />

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Buttons */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Buttons</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button fullWidth>Full Width</Button>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Inputs & Fields</h2>
          <div style={{ display: 'grid', gap: '20px', maxWidth: '400px' }}>
            <Input label="Normal Input" placeholder="Type something..." />
            <Input label="Error Input" error="This field is required" defaultValue="Invalid value" />
            <Input label="Disabled Input" disabled defaultValue="Cannot edit this" />
            <TextArea label="Text Area" placeholder="Enter notes..." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <DatePicker label="Date Picker" />
              <TimePicker label="Time Picker" />
            </div>
            <Select 
              label="Select (Normal)" 
              options={[
                { label: 'Option 1', value: '1' },
                { label: 'Option 2', value: '2' },
              ]} 
              placeholder="Choose an option"
            />
            <Select 
              label="Select (Error)" 
              options={[
                { label: 'Option A', value: 'a' },
              ]} 
              error="Please select a valid option"
            />
            <Checkbox label="Checkbox Example" checked={checked} onChange={setChecked} />
          </div>
        </section>

        {/* Feedback & Status */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Badges</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Badge variant="active">Active</Badge>
            <Badge variant="inactive">Inactive</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="success">Success</Badge>
          </div>
        </section>

        {/* Avatars */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Avatars</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Avatar name="John Doe" size="sm" />
            <Avatar name="Jane Smith" size="md" />
            <Avatar name="Alex Wilson" size="lg" />
            <Avatar name="User Image" src="https://i.pravatar.cc/150?u=fit" size="md" />
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Cards</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <Card padding="sm" bordered>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>Small padding + bordered</p>
            </Card>
            <Card padding="md">
              <p style={{ fontSize: 'var(--font-size-sm)' }}>Medium padding (default)</p>
            </Card>
            <Card padding="lg" onClick={() => alert('Card clicked!')}>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>Large padding + clickable</p>
            </Card>
          </div>
        </section>

        {/* Modals */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Modals</h2>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal Preview</Button>
          <Modal 
            open={modalOpen} 
            onClose={() => setModalOpen(false)}
            title="Preview Modal"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              </>
            }
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>
              This is a native dialog modal. It slides up on mobile and centers on desktop.
              Body scrolling is locked when open.
            </p>
          </Modal>
        </section>

        {/* Empty State */}
        <section>
          <h2 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Empty State</h2>
          <Card bordered>
            <EmptyState 
              title="No clients found" 
              subtitle="Start by adding your first personal training client."
              actionLabel="Add Client"
              onAction={() => alert('Add action')}
            />
          </Card>
        </section>

      </div>

      <BottomNav />
    </PageWrapper>
  );
}
