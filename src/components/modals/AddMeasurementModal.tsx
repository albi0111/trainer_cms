import { useState, useEffect, useRef } from 'react';
import { MeasurementConfig } from '../../types';
import ManageMetricsModal from './ManageMetricsModal';
import DatePicker from '../ui/DatePicker';
import {
  addMeasurement,
  getClientMeasurementConfigs,
} from '../../services/measurement/measurementService';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';
import './AddMeasurementModal.css';

interface AddMeasurementModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMeasurementModal({
  visible,
  clientId,
  onClose,
  onSuccess,
}: AddMeasurementModalProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'performance'>('body');
  const [configs, setConfigs] = useState<MeasurementConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [isManageMetricsVisible, setIsManageMetricsVisible] = useState(false);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const haptic = useHaptic();
  const { playConfirm, playError } = useSoundFeedback();

  useModalVelocityDismiss({
    visible,
    onClose,
    overlayRef,
    sheetRef: containerRef,
  });

  useEffect(() => {
    if (visible) {
      setSaveState('idle');
      loadConfigs();
    }
  }, [visible, clientId]);

  useEffect(() => {
    if (!visible) {
      setIsOpening(false);
      return;
    }

    setIsOpening(true);
    const timeout = window.setTimeout(() => {
      setIsOpening(false);
    }, 200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [visible]);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      setConfigs(await getClientMeasurementConfigs(clientId));
      setErrorMessage('');
    } catch (error) {
      console.error('[AddMeasurementModal] Load configs error:', error);
      setErrorMessage('Failed to load metrics.');
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const parsedValues: Record<string, number> = {};
      Object.keys(values).forEach(key => {
        const val = parseFloat(values[key] as string);
        if (!isNaN(val)) parsedValues[key] = val;
      });

      await addMeasurement(clientId, {
        date: date || '',
        values: parsedValues,
        notes: notes || '',
      });

      setValues({});
      setNotes('');
      setErrorMessage('');
      setSaveState('saved');
      playConfirm();
      window.setTimeout(() => {
        setSaveState('idle');
        onSuccess();
      }, 1500);
    } catch (error) {
      playError();
      console.error('[AddMeasurementModal] Save error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save log entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredConfigs = configs.filter(c => c.category === activeTab);

  return (
    <div
      ref={overlayRef}
      className="add-measurement-overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onClick={onClose}
    >
      <div ref={containerRef} className="add-measurement-container" onClick={e => e.stopPropagation()}>
        <div className="add-measurement-header">
          <h2>LOG PROGRESS</h2>
          <button className="add-measurement-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {errorMessage && <div className="empty-hint">{errorMessage}</div>}

        <div className="add-measurement-tabs">
          <button 
            className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            BODY
          </button>
          <button 
            className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12h.01M13 2v2M13 20v2M22 13h-2M4 13H2M14.5 9l-2.5 2.5 2.5 2.5M9.5 15l2.5-2.5-2.5-2.5"/></svg>
            PERFORMANCE
          </button>
        </div>

        <div className="add-measurement-scroll">
          <div className="form-section">
            <label className="section-label">ENTRY DATE</label>
            <DatePicker 
              value={date}
              onChange={setDate}
            />
          </div>

          <div className="form-section">
            <label className="section-label">METRICS ({activeTab.toUpperCase()})</label>
            {loadingConfigs ? (
              <div className="loading-state">Loading metrics...</div>
            ) : (
              <div className="metrics-grid">
                {filteredConfigs.map(c => (
                  <div key={c.key} className="metric-input-wrap">
                    <label>{c.label} {c.unit ? `(${c.unit})` : ''}</label>
                    <input 
                      type="number" 
                      placeholder="0.0"
                      value={values[c.key] || ''}
                      onChange={e => setValues({...values, [c.key]: e.target.value})}
                    />
                  </div>
                ))}
                
                <button className="add-metric-inline" onClick={() => setIsManageMetricsVisible(true)}>
                  <span className="icon">+</span>
                  Add Metric
                </button>
              </div>
            )}
            
            {!loadingConfigs && filteredConfigs.length === 0 && (
              <div className="empty-hint">No {activeTab} metrics tracked for this client yet.</div>
            )}
          </div>

          <div className="form-section">
            <label className="section-label">NOTES</label>
            <textarea 
              className="notes-input"
              placeholder="How was the session? Any physical changes?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="add-measurement-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={() => { haptic.medium(); void handleSave(); }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : 'Log Entry'}
          </button>
        </div>
      </div>

      <ManageMetricsModal 
        visible={isManageMetricsVisible}
        clientId={clientId}
        onClose={() => setIsManageMetricsVisible(false)}
        onSuccess={loadConfigs}
      />
    </div>
  );
}
