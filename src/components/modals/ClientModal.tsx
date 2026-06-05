// ─────────────────────────────────────────────────────────────────────────────
// ClientModal — Unified Multi-step form for Add & Edit
// Steps: Personal → Interview → Assessment
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import './ClientModal.css';
import Modal from '../ui/Modal'; // Using standard Modal wrapper for accessibility
import { ASSESSMENT_EXERCISES, FLEXIBILITY_TESTS } from '../../constants/assessment';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { createClient, getClientDetail, updateClient } from '../../services/client/clientService';
import { isValidOptionalEmail, isValidOptionalPhone } from '../../services/shared/inputValidation';

export type ClientModalStep = 'personal' | 'interview' | 'assessment';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  clientId?: string | null; // null means ADD mode
  initialStep?: ClientModalStep;
  onSuccess?: (clientId: string) => void;
}

export default function ClientModal({ open, onClose, clientId, initialStep = 'personal', onSuccess }: ClientModalProps) {
  const [step, setStep] = useState<ClientModalStep>(initialStep);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const haptic = useHaptic();
  const { playConfirm, playError } = useSoundFeedback();

  // ── Form State ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('Beginner');
  const [injuries, setInjuries] = useState('');
  const [lifestyleNotes, setLifestyleNotes] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bp, setBp] = useState('');
  const [rhr, setRhr] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [flexChecks, setFlexChecks] = useState<Record<string, boolean>>({});
  const [flexNotes, setFlexNotes] = useState<Record<string, string>>({});
  const [openFlexNotes, setOpenFlexNotes] = useState<Record<string, boolean>>({});
  const [cardioTime, setCardioTime] = useState('');
  const [cardioDistance, setCardioDistance] = useState('');
  const [cardioMhr, setCardioMhr] = useState('');
  const [objectives, setObjectives] = useState('');

  // ── Data Loading ──────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setName(''); setAge(''); setGender('Male'); setPhone(''); setEmail('');
    setExperience('Beginner'); setInjuries(''); setLifestyleNotes('');
    setWeightKg(''); setHeightCm(''); setBp(''); setRhr('');
    setExerciseNotes({}); setFlexChecks({}); setFlexNotes({}); setOpenFlexNotes({});
    setCardioTime(''); setCardioDistance(''); setCardioMhr(''); setObjectives('');
    setNameError(''); setPhoneError(''); setEmailError('');
    setErrorMessage('');
    setSaveState('idle');
    setStep(initialStep);
  }, [initialStep]);

  const loadClientData = useCallback(async (id: string) => {
    const detail = await getClientDetail(id);
    const client = detail?.client;
    const profile = detail?.profile;
    const lifestyle = detail?.lifestyle;
    const assessment = detail?.assessment;

    if (client) {
      setName(client.name);
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setObjectives(client.goal || '');
    }
    if (profile) {
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || 'Male');
      setWeightKg(profile.initial_weight_kg?.toString() || '');
      setHeightCm(profile.height_cm?.toString() || '');
      setInjuries(profile.medical_notes || '');
    }
    if (lifestyle) {
      setExperience(lifestyle.job_type || 'Beginner');
      setLifestyleNotes(lifestyle.notes || '');
    }
    if (assessment) {
      setBp(assessment.bp_systolic ? `${assessment.bp_systolic}/${assessment.bp_diastolic}` : '');
      setRhr(assessment.resting_heart_rate?.toString() || '');
      setCardioTime(assessment.cardio_time_minutes?.toString() || '');
      setCardioDistance(assessment.cardio_distance_km?.toString() || '');
      setCardioMhr(assessment.cardio_mhr?.toString() || '');

      const exNotes: Record<string, string> = {};
      assessment.exercises?.forEach((ex: any, idx: number) => {
        exNotes[`strength_${idx + 1}_note`] = ex.note || '';
      });
      setExerciseNotes(exNotes);

      const fChecks: Record<string, boolean> = {};
      const fNotes: Record<string, string> = {};
      assessment.flexibility?.forEach((f: any) => {
        if (f.key === 'hamstrings') { fChecks.flex_hamstrings_r = !!f.right; fChecks.flex_hamstrings_l = !!f.left; }
        if (f.key === 'quadriceps') { fChecks.flex_quadriceps_r = !!f.right; fChecks.flex_quadriceps_l = !!f.left; }
        if (f.key === 'hip_flexors') { fChecks.flex_hip_flexors_r = !!f.right; fChecks.flex_hip_flexors_l = !!f.left; }
        if (f.key === 'shoulders') { fChecks.flex_shoulders_r = !!f.right; fChecks.flex_shoulders_l = !!f.left; }
        if (f.key === 'toe_reach' || f.key === 'seated_toe_reach') { fChecks.flex_toe_reach = !!f.pass; }
        if (f.key === 'trunk_rotation') { fChecks.flex_trunk_r = !!f.right; fChecks.flex_trunk_l = !!f.left; }
        if (f.note) fNotes[f.key] = f.note;
      });
      setFlexChecks(fChecks);
      setFlexNotes(fNotes);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep(initialStep); // Ensure we start at requested step (e.g. from Profile edit btn)
      if (clientId) {
        void loadClientData(clientId);
      } else {
        resetForm();
      }
    }
  }, [open, clientId, loadClientData, resetForm, initialStep]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const validateName = useCallback(() => {
    if (!name.trim()) {
      setNameError('Please enter a name.');
      playError();
      return false;
    }

    setNameError('');
    return true;
  }, [name, playError]);

  const validateContactFields = useCallback(() => {
    let valid = true;

    if (!isValidOptionalPhone(phone)) {
      setPhoneError('Enter a valid phone number.');
      valid = false;
    } else {
      setPhoneError('');
    }

    if (!isValidOptionalEmail(email)) {
      setEmailError('Enter a valid email.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!valid) {
      playError();
    }

    return valid;
  }, [email, phone, playError]);

  const handleSave = async () => {
    if (!validateName() || !validateContactFields()) {
      return;
    }

    haptic.medium();
    setIsSaving(true);
    setSaveState('idle');
    setErrorMessage('');
    try {
      const bpParts = (bp || '').split('/');

      const assessmentData = {
        bp_systolic: parseInt(bpParts[0] || '') || null,
        bp_diastolic: parseInt(bpParts[1] || '') || null,
        resting_heart_rate: parseInt(rhr) || null,
        cardio_time_minutes: parseFloat(cardioTime) || null,
        cardio_distance_km: parseFloat(cardioDistance) || null,
        cardio_mhr: parseInt(cardioMhr) || null,
        objectives,
        exercises: ASSESSMENT_EXERCISES.map((exercise, idx) => ({
          key: exercise.key,
          order_index: idx,
          note: exerciseNotes[`strength_${idx + 1}_note`] || '',
        })),
        flexibility: FLEXIBILITY_TESTS.map(test => ({
          key: test.key,
          right: !test.bilateral ? !!flexChecks[test.keyR] : undefined,
          left: !test.bilateral ? !!flexChecks[test.keyL] : undefined,
          pass: test.bilateral ? !!flexChecks[test.keyR] : undefined,
          note: flexNotes[test.key] || '',
        })),
      };

      let persistedClientId = clientId || null;
      if (clientId) {
        await updateClient(clientId, {
          core: {
            name,
            phone,
            email,
            goal: objectives,
          },
          profile: {
            age: parseInt(age) || 0,
            gender: gender as any,
            initial_weight_kg: parseFloat(weightKg) || 0,
            height_cm: parseFloat(heightCm) || 0,
            medical_notes: injuries,
          },
          lifestyle: {
            job_type: experience,
            notes: lifestyleNotes,
          },
          assessment: assessmentData,
        });
      } else {
        persistedClientId = await createClient({
          name,
          phone,
          email,
          goal: objectives,
          profile: {
            age: parseInt(age) || 0,
            gender: gender as any,
            initial_weight_kg: parseFloat(weightKg) || 0,
            height_cm: parseFloat(heightCm) || 0,
            medical_notes: injuries,
          },
          lifestyle: {
            job_type: experience,
            notes: lifestyleNotes,
          },
          assessment: assessmentData,
        });
      }

      playConfirm();
      setSaveState('saved');
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1500);
      });
      onSuccess?.(persistedClientId || clientId || '');
      onClose();
    } catch (error) {
      playError();
      console.error('Failed to save client', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save client data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 'personal') {
      if (!validateName() || !validateContactFields()) {
        return;
      }
      setStep('interview');
    }
    else if (step === 'interview') setStep('assessment');
    else handleSave();
  };

  const handleBack = () => {
    if (step === 'interview') setStep('personal');
    else if (step === 'assessment') setStep('interview');
  };

  // ── Render Helpers ────────────────────────────────────────────────────────
  const TABS: { id: ClientModalStep; label: string; icon: React.ReactNode }[] = [
    {
      id: 'personal', label: 'PERSONAL', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      id: 'interview', label: 'INTERVIEW', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      id: 'assessment', label: 'ASSESSMENT', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    }
  ];

  const currentIdx = ['personal', 'interview', 'assessment'].indexOf(step);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={clientId ? 'EDIT PROFILE' : 'NEW REGISTRATION'}
      className="modal--premium"
    >
      <div className="client-modal">

        {/* Tabs */}
        <div className="cm-tabs">
          {TABS.map((tab, idx) => {
            const isActive = step === tab.id;
            const isCompleted = currentIdx > idx;
            return (
              <button
                key={tab.id}
                className="cm-tab"
                onClick={() => {
                  const targetIdx = ['personal', 'interview', 'assessment'].indexOf(tab.id);
                  if (targetIdx > currentIdx && (!validateName() || !validateContactFields())) {
                    return;
                  }
                  setStep(tab.id);
                }}
              >
                <div className={`cm-tab-icon ${isActive || isCompleted ? 'cm-tab-icon--active' : ''}`}>
                  {isCompleted ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <div style={{ color: isActive ? '#000' : '#888' }}>{tab.icon}</div>
                  )}
                </div>
                <span className={`cm-tab-label ${isActive || isCompleted ? 'cm-tab-label--active' : ''}`}>{tab.label}</span>
              </button>
            );
          })}
          <div className="cm-tabs-line" />
        </div>

        {/* Step Body */}
        <div className="cm-body">
          {step === 'personal' && (
            <div className="cm-step-content">
              <div className="cm-form-group">
                <label className="cm-label">FULL NAME *</label>
                <input
                  className={`cm-input ${nameError ? 'cm-input--error input-shake' : ''}`}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError && e.target.value.trim()) {
                      setNameError('');
                    }
                  }}
                  placeholder="e.g. John Doe"
                />
                {nameError && (
                  <div className="cm-field-warning" role="alert">
                    {nameError}
                  </div>
                )}
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label className="cm-label">AGE</label>
                  <input className="cm-input" type="text" value={age} onChange={e => setAge(e.target.value)} placeholder="25" />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">GENDER</label>
                  <select className="cm-select" value={gender} onChange={e => setGender(e.target.value)}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="cm-form-group">
                <label className="cm-label">PHONE</label>
                <input
                  className={`cm-input ${phoneError ? 'cm-input--error input-shake' : ''}`}
                  type="text"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    if (phoneError) {
                      setPhoneError('');
                    }
                  }}
                  placeholder="+91 ..."
                />
                {phoneError && (
                  <div className="cm-field-warning" role="alert">
                    {phoneError}
                  </div>
                )}
              </div>
              <div className="cm-form-group">
                <label className="cm-label">EMAIL</label>
                <input
                  className={`cm-input ${emailError ? 'cm-input--error input-shake' : ''}`}
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (emailError) {
                      setEmailError('');
                    }
                  }}
                  placeholder="john@example.com"
                />
                {emailError && (
                  <div className="cm-field-warning" role="alert">
                    {emailError}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'interview' && (
            <div className="cm-step-content">
              <div className="cm-form-group">
                <label className="cm-label">EXPERIENCE</label>
                <input className="cm-input" type="text" value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. Beginner, 2 years at gym..." />
              </div>
              <div className="cm-form-group">
                <label className="cm-label">INJURIES / CONDITIONS</label>
                <textarea className="cm-textarea" rows={5} value={injuries} onChange={e => setInjuries(e.target.value)} placeholder="Any past injuries or health conditions..." />
              </div>
              <div className="cm-form-group">
                <label className="cm-label">LIFESTYLE NOTES</label>
                <textarea className="cm-textarea" rows={5} value={lifestyleNotes} onChange={e => setLifestyleNotes(e.target.value)} placeholder="Sleep, stress, occupation, etc..." />
              </div>
            </div>
          )}

          {step === 'assessment' && (
            <div className="cm-step-content">
              <div className="cm-form-row cm-form-row--compact">
                <div className="cm-form-group cm-form-group--compact">
                  <label className="cm-label cm-label--compact">WEIGHT (KG)</label>
                  <input className="cm-input cm-input--compact" type="text" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="75 KG" />
                </div>
                <div className="cm-form-group cm-form-group--compact">
                  <label className="cm-label cm-label--compact">HEIGHT (CM)</label>
                  <input className="cm-input cm-input--compact" type="text" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="175 CM" />
                </div>
              </div>
              <div className="cm-form-row cm-form-row--compact">
                <div className="cm-form-group cm-form-group--compact">
                  <label className="cm-label cm-label--compact">BP (MMHG)</label>
                  <input className="cm-input cm-input--compact" type="text" value={bp} onChange={e => setBp(e.target.value)} placeholder="120/80" />
                </div>
                <div className="cm-form-group cm-form-group--compact">
                  <label className="cm-label cm-label--compact">RHR (BPM)</label>
                  <input className="cm-input cm-input--compact" type="text" value={rhr} onChange={e => setRhr(e.target.value)} placeholder="65" />
                </div>
              </div>

              <div className="cm-section-block">
                <div className="cm-section-title">EXERCISES</div>
                {ASSESSMENT_EXERCISES.map(ex => (
                  <div key={ex.field} className="cm-exercise-row">
                    <div className="cm-exercise-icon-wrap">
                      <img src={ex.icon} alt={ex.label} className="cm-exercise-icon" />
                    </div>
                    <textarea
                      className="cm-exercise-input"
                      value={exerciseNotes[ex.field] || ''}
                      onChange={e => setExerciseNotes(prev => ({ ...prev, [ex.field]: e.target.value }))}
                      placeholder="Remark..."
                    />
                  </div>
                ))}
              </div>

              <div className="cm-section-block">
                <div className="cm-section-title">FITNESS TESTS</div>
                {FLEXIBILITY_TESTS.map(test => {
                  const noteOpen = !!openFlexNotes[test.key];
                  return (
                    <div key={test.key} className="cm-test-item-container">
                      <div className="cm-test-item">
                        <span className="cm-test-label">{test.label}</span>
                        <div className="cm-test-actions">
                          <button
                            className={`cm-check ${test.bilateral ? 'cm-check--empty' : ''} ${flexChecks[test.keyR] ? 'cm-check--on' : ''}`}
                            onClick={() => setFlexChecks(p => ({ ...p, [test.keyR]: !p[test.keyR] }))}
                            aria-label={test.bilateral ? `${test.label} pass` : `${test.label} right`}
                          >
                            {test.bilateral ? '' : 'R'}
                          </button>
                          {!test.bilateral && <button className={`cm-check ${flexChecks[test.keyL] ? 'cm-check--on' : ''}`} onClick={() => setFlexChecks(p => ({ ...p, [test.keyL]: !p[test.keyL] }))}>L</button>}
                          <button className={`cm-note-toggle ${noteOpen ? 'active' : ''}`} onClick={() => setOpenFlexNotes(p => ({ ...p, [test.key]: !p[test.key] }))}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </button>
                        </div>
                      </div>
                      {noteOpen && (
                        <textarea className="cm-test-note-input" value={flexNotes[test.key] || ''} onChange={e => setFlexNotes(p => ({ ...p, [test.key]: e.target.value }))} placeholder="Notes..." />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="cm-form-group">
                <label className="cm-label">OBJECTIVES</label>
                <textarea className="cm-textarea" rows={4} value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="Client's primary goal and objectives..." />
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="cm-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="cm-footer">
          {step !== 'personal' && (
            <button className="cm-btn cm-btn--secondary" onClick={handleBack}>Back</button>
          )}
          {step === 'personal' && (
            <button className="cm-btn cm-btn--secondary" onClick={onClose}>Cancel</button>
          )}
          <button className={`cm-btn ${step === 'assessment' ? 'cm-btn--yellow' : 'cm-btn--primary'}`} onClick={handleNext} disabled={isSaving}>
            {isSaving
              ? 'Saving...'
              : saveState === 'saved'
                ? 'Saved ✓'
                : step === 'assessment'
                  ? (clientId ? 'Update Client' : 'Add Client')
                  : 'Next'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
