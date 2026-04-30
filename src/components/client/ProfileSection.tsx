// ─────────────────────────────────────────────────────────────────────────────
// ProfileSection — Premium redesigned client profile
// ─────────────────────────────────────────────────────────────────────────────

import './ProfileSection.css';

// Exercise icon map — matches reference EXERCISE_IMAGES (8 exercises)
const EXERCISE_IMAGES: Record<string, string> = {
  bench_press:  '/assesment-icons/assesment-exercise-1.png',
  squat:        '/assesment-icons/assesment-exercise-2.png',
  leg_press:    '/assesment-icons/assesment-exercise-3.png',
  lat_pulldown: '/assesment-icons/assesment-exercise-4.png',
  seated_row:   '/assesment-icons/assesment-exercise-5.jpeg',
  leg_curl:     '/assesment-icons/assesment-exercise-6.jpeg',
  cardio:       '/assesment-icons/assesment-exercise-7.png',
  other:        '/assesment-icons/assesment-exercise-8.png',
};

interface ProfileSectionProps {
  data: {
    client: any;
    profile: any;
    lifestyle: any;
    assessment: any;
  } | null;
  onEditSection: (section: 'personal' | 'interview' | 'assessment') => void;
  onDeleteClient: () => void;
}

export default function ProfileSection({ data, onEditSection, onDeleteClient }: ProfileSectionProps) {
  if (!data) return <div className="profile-loading">Loading...</div>;

  const { client, profile, lifestyle, assessment } = data;

  // Icons
  const pencilIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );

  const personalIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const interviewIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const assessmentIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );

  const exerciseIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h12M12 22v-4M12 2v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const testIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );

  const trashIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );

  const renderSectionHeader = (title: string, icon: React.ReactNode, onEdit?: () => void) => (
    <div className="profile-block__header">
      <div className="profile-block__title-group">
        <span className="profile-block__icon">{icon}</span>
        <h3 className="profile-block__title">{title}</h3>
      </div>
      {onEdit && (
        <button className="profile-block__edit-btn" onClick={onEdit}>
          {pencilIcon}
        </button>
      )}
    </div>
  );

  const renderInfoItem = (label: string, value: string | number | undefined) => (
    <div className="profile-info-item">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value || '—'}</span>
    </div>
  );

  // Only show exercises that have notes (dynamic — empty = hidden)
  const exercisesWithNotes = (assessment?.exercises || []).filter(
    (ex: any) => ex.note && ex.note.trim().length > 0
  );

  // Mock tests if not in data
  const tests = assessment?.flexibility || [];

  return (
    <div className="profile-section">
      {/* PERSONAL INFO */}
      <section className="profile-block">
        {renderSectionHeader('PERSONAL INFO', personalIcon, () => onEditSection('personal'))}
        <div className="profile-info-grid">
          {renderInfoItem('AGE', `${profile?.age || 26} years`)}
          {renderInfoItem('GENDER', profile?.gender || 'Male')}
          {renderInfoItem('PHONE', client?.phone || '0123456789')}
          {renderInfoItem('EMAIL', client?.email || 'test@test.com')}
        </div>
      </section>

      <div className="profile-divider" />

      {/* INTERVIEW */}
      <section className="profile-block">
        {renderSectionHeader('INTERVIEW', interviewIcon, () => onEditSection('interview'))}
        <div className="profile-block__content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {renderInfoItem('EXPERIENCE', lifestyle?.job_type || 'Beginner')}
          {renderInfoItem('INJURIES / CONDITIONS', profile?.medical_notes || 'None reported')}
          {renderInfoItem('LIFESTYLE', lifestyle?.notes || 'No lifestyle notes.')}
        </div>
      </section>

      <div className="profile-divider" />

      {/* ASSESSMENT */}
      <section className="profile-block">
        {renderSectionHeader('ASSESSMENT', assessmentIcon, () => onEditSection('assessment'))}
        <div className="profile-info-grid" style={{ marginBottom: 20 }}>
          {renderInfoItem('WEIGHT', `${profile?.initial_weight_kg || 74} kg`)}
          {renderInfoItem('HEIGHT', `${profile?.height_cm || 178} cm`)}
          {renderInfoItem('BP', assessment?.bp_systolic ? `${assessment.bp_systolic}/${assessment.bp_diastolic}` : '120/20')}
          {renderInfoItem('RHR', `${assessment?.resting_heart_rate || 65} bpm`)}
        </div>
        <div style={{ marginBottom: 24 }}>
          {renderInfoItem('OBJECTIVES', assessment?.objectives || 'goal\ngoal\ngoal\ngoal')}
        </div>
        <div className="profile-info-grid">
          {renderInfoItem('CARDIO TIME', `${assessment?.cardio_time_minutes || 3} min`)}
          {renderInfoItem('DISTANCE', `${assessment?.cardio_distance_km || 3} km`)}
          {renderInfoItem('MHR', `${assessment?.cardio_mhr || 130} bpm`)}
        </div>
      </section>

      {/* EXERCISES — only rendered if at least one exercise has a note */}
      {exercisesWithNotes.length > 0 && (
        <section className="profile-block">
          {renderSectionHeader('EXERCISES', exerciseIcon)}
          <div className="profile-exercises-list">
            {exercisesWithNotes.map((ex: any, idx: number) => {
              const imgSrc = EXERCISE_IMAGES[ex.key] || `/assesment-icons/assesment-exercise-${idx + 1}.png`;
              return (
                <div key={ex.key || idx} className="exercise-card">
                  <div className="exercise-card__img-wrap">
                    <img src={imgSrc} alt={ex.key} className="exercise-card__img" />
                  </div>
                  <div className="exercise-card__notes">{ex.note}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FITNESS TESTS */}
      <section className="profile-block">
        {renderSectionHeader('FITNESS TESTS', testIcon)}
        <div className="profile-tests-list">
          {tests.map((test: any) => (
            <div key={test.key} className="test-row">
              <div className="test-row__main">
                <div className="test-row__left">
                  <span className="test-row__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v20M2 12h20M5.3 5.3l13.4 13.4M5.3 18.7l13.4-13.4" />
                    </svg>
                  </span>
                  <span className="test-row__name">{test.label}</span>
                </div>
                <div className="test-row__chips">
                  {test.pass !== undefined ? (
                    <span className="test-chip test-chip--pass">✓ Pass</span>
                  ) : (
                    <>
                      <span className={`test-chip ${test.r ? 'test-chip--pass' : 'test-chip--fail'}`}>
                        R {test.r ? '✓' : '✗'}
                      </span>
                      <span className={`test-chip ${test.l ? 'test-chip--pass' : 'test-chip--fail'}`}>
                        L {test.l ? '✓' : '✗'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {test.note && <div className="test-row__notes">{test.note}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className="danger-zone">
        <div className="danger-zone__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="danger-zone__title">DANGER ZONE</span>
        </div>
        <p className="danger-zone__desc">
          Deleting this client will remove all their data, including assessments, plans, and session history. This action cannot be undone.
        </p>
        <button className="danger-delete-btn" onClick={onDeleteClient}>
          {trashIcon}
          Delete Client
        </button>
      </section>
    </div>
  );
}
