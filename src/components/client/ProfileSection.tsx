import './ProfileSection.css';
import { ASSESSMENT_EXERCISES, FLEXIBILITY_LABELS } from '../../constants/assessment';
import LongPressCard from '../LongPressCard';
import type {
  ClientAssessment,
  ClientLifestyle,
  ClientProfile,
  FlexibilityResult,
} from '../../types';

type ProfileSectionClientData = {
  phone?: string;
  email?: string;
};

type ProfileSectionProfileData = Omit<ClientProfile, 'client_id' | 'updated_at'>;
type ProfileSectionLifestyleData = Omit<ClientLifestyle, 'client_id' | 'updated_at'>;
type ProfileSectionAssessmentData = Omit<ClientAssessment, 'client_id' | 'updated_at'>;

const EXERCISE_IMAGES = Object.fromEntries(
  ASSESSMENT_EXERCISES.map((exercise) => [exercise.key, exercise.icon]),
);

interface ProfileSectionProps {
  data: {
    client: ProfileSectionClientData;
    profile: ProfileSectionProfileData;
    lifestyle: ProfileSectionLifestyleData;
    assessment: ProfileSectionAssessmentData;
  } | null;
  onEditSection: (section: 'personal' | 'interview' | 'assessment') => void;
  onDeleteClient: () => void;
}

export default function ProfileSection({ data, onEditSection, onDeleteClient }: ProfileSectionProps) {
  if (!data) return <div className="profile-loading">Loading...</div>;

  const { client, profile, lifestyle, assessment } = data;

  // Icons
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

  const renderSectionHeader = (title: string, icon: React.ReactNode) => (
    <div className="profile-block__header">
      <div className="profile-block__title-group">
        <span className="profile-block__icon">{icon}</span>
        <h3 className="profile-block__title">{title}</h3>
      </div>
    </div>
  );

  const renderInfoItem = (label: string, value: string | number | undefined) => (
    <div className="profile-info-item">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">
        {value === undefined || value === null || value === '' ? '—' : value}
      </span>
    </div>
  );

  // Only show exercises that have notes (dynamic — empty = hidden)
  const exercisesWithNotes = (assessment?.exercises || []).filter(
    (exercise) => exercise.note && exercise.note.trim().length > 0
  );

  const tests: FlexibilityResult[] = assessment?.flexibility || [];

  return (
    <div className="profile-section">
      {/* PERSONAL INFO */}
      <LongPressCard
        className="profile-block"
        onLongPress={() => onEditSection('personal')}
      >
        {renderSectionHeader('PERSONAL INFO', personalIcon)}
        <div className="profile-info-grid">
          {renderInfoItem('AGE', profile?.age ? `${profile.age} years` : undefined)}
          {renderInfoItem('GENDER', profile?.gender)}
          {renderInfoItem('PHONE', client?.phone)}
          {renderInfoItem('EMAIL', client?.email)}
        </div>
      </LongPressCard>

      {/* INTERVIEW */}
      <LongPressCard
        className="profile-block"
        onLongPress={() => onEditSection('interview')}
      >
        {renderSectionHeader('INTERVIEW', interviewIcon)}
        <div className="profile-block__content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {renderInfoItem('EXPERIENCE', lifestyle?.job_type)}
          {renderInfoItem('INJURIES / CONDITIONS', profile?.medical_notes)}
          {renderInfoItem('LIFESTYLE', lifestyle?.notes)}
        </div>
      </LongPressCard>

      {/* ASSESSMENT */}
      <LongPressCard
        className="profile-block"
        onLongPress={() => onEditSection('assessment')}
      >
        {renderSectionHeader('ASSESSMENT', assessmentIcon)}
        <div className="profile-info-grid" style={{ marginBottom: 20 }}>
          {renderInfoItem('WEIGHT', profile?.initial_weight_kg ? `${profile.initial_weight_kg} kg` : undefined)}
          {renderInfoItem('HEIGHT', profile?.height_cm ? `${profile.height_cm} cm` : undefined)}
          {renderInfoItem('BP', assessment?.bp_systolic ? `${assessment.bp_systolic}/${assessment.bp_diastolic}` : undefined)}
          {renderInfoItem('RHR', assessment?.resting_heart_rate ? `${assessment.resting_heart_rate} bpm` : undefined)}
        </div>
        <div style={{ marginBottom: 24 }}>
          {renderInfoItem('OBJECTIVES', assessment?.objectives)}
        </div>
        <div className="profile-info-grid">
          {renderInfoItem('CARDIO TIME', assessment?.cardio_time_minutes ? `${assessment.cardio_time_minutes} min` : undefined)}
          {renderInfoItem('DISTANCE', assessment?.cardio_distance_km ? `${assessment.cardio_distance_km} km` : undefined)}
          {renderInfoItem('MHR', assessment?.cardio_mhr ? `${assessment.cardio_mhr} bpm` : undefined)}
        </div>

        {/* Nested EXERCISES */}
        {exercisesWithNotes.length > 0 && (
          <div className="profile-block__nested-section">
            <div className="profile-block__divider" />
            <div className="profile-block__sub-header">
              <span className="profile-block__icon">{exerciseIcon}</span>
              <h4 className="profile-block__sub-title">EXERCISES</h4>
            </div>
            <div className="profile-exercises-list">
              {exercisesWithNotes.map((ex, idx) => {
                const imgSrc = EXERCISE_IMAGES[ex.key] || ASSESSMENT_EXERCISES[idx]?.icon;
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
          </div>
        )}

        {/* Nested FITNESS TESTS */}
        <div className="profile-block__nested-section">
          <div className="profile-block__divider" />
          <div className="profile-block__sub-header">
            <span className="profile-block__icon">{testIcon}</span>
            <h4 className="profile-block__sub-title">FITNESS TESTS</h4>
          </div>
          <div className="profile-tests-list">
            {tests.map((test) => (
              <div key={test.key} className="test-row">
                <div className="test-row__main">
                  <div className="test-row__left">
                    <span className="test-row__icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v20M2 12h20M5.3 5.3l13.4 13.4M5.3 18.7l13.4-13.4" />
                      </svg>
                    </span>
                    <span className="test-row__name">{test.label || FLEXIBILITY_LABELS[test.key]}</span>
                  </div>
                  <div className="test-row__chips">
                    {test.pass !== undefined ? (
                      <span className={`test-chip ${test.pass ? 'test-chip--pass' : 'test-chip--fail'}`}>
                        {test.pass ? '✓ Pass' : '✗ Fail'}
                      </span>
                    ) : (
                      <>
                        <span className={`test-chip ${test.right ? 'test-chip--pass' : 'test-chip--fail'}`}>
                          R {test.right ? '✓' : '✗'}
                        </span>
                        <span className={`test-chip ${test.left ? 'test-chip--pass' : 'test-chip--fail'}`}>
                          L {test.left ? '✓' : '✗'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {test.note && <div className="test-row__notes">{test.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </LongPressCard>


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
