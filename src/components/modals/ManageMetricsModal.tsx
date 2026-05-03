import { useState, useEffect, useMemo, useRef } from 'react';
import { MeasurementConfig, MeasurementCategory } from '../../types';
import { DEFAULT_METRICS } from '../../constants/metrics';
import {
  getClientMeasurementConfigs,
  upsertClientMeasurementConfig,
  deleteClientMeasurementConfig,
} from '../../services/measurement/measurementService';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';
import './ManageMetricsModal.css';

interface ManageMetricsModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface DefaultMetric {
  key: string;
  label: string;
  unit: string;
  category: MeasurementCategory;
}

const LOCKED_KEYS = ['weight_kg'];

export default function ManageMetricsModal({
  visible,
  clientId,
  onClose,
  onSuccess,
}: ManageMetricsModalProps) {
  const [configs, setConfigs] = useState<MeasurementConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<MeasurementConfig>>({});
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [isOpening, setIsOpening] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const haptic = useHaptic();
  const { playConfirm, playDelete, playError } = useSoundFeedback();

  useModalVelocityDismiss({
    visible,
    onClose,
    overlayRef,
    sheetRef: containerRef,
  });

  useEffect(() => {
    if (visible) {
      fetchConfigs();
    }
  }, [visible, clientId]);

  useEffect(() => {
    if (!visible || !isEditing) {
      setSaveState('idle');
    }
  }, [isEditing, visible]);

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

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      setConfigs(await getClientMeasurementConfigs(clientId));
      setErrorMessage('');
    } catch (err) {
      console.error('[ManageMetricsModal] Fetch error:', err);
      setErrorMessage('Failed to load metrics.');
    } finally {
      setLoading(false);
    }
  };

  const availableMetrics = useMemo(() => {
    const clientKeys = new Set(configs.map(c => c.key));
    return DEFAULT_METRICS.filter(d => !clientKeys.has(d.key));
  }, [configs]);

  const handleSave = async () => {
    if (!editingConfig.key || !editingConfig.label || !editingConfig.category) {
      playError();
      setErrorMessage('Key, label, and category are required.');
      return;
    }

    try {
      await upsertClientMeasurementConfig(clientId, {
        key: editingConfig.key,
        label: editingConfig.label,
        unit: editingConfig.unit || '',
        category: editingConfig.category as MeasurementCategory,
        target_min: editingConfig.target_min,
        target_max: editingConfig.target_max,
      });
      setIsEditing(false);
      setEditingConfig({});
      setErrorMessage('');
      setSaveState('saved');
      playConfirm();
      void fetchConfigs();
      onSuccess();
    } catch (err) {
      playError();
      console.error('[ManageMetricsModal] Save error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save metric.');
    }
  };

  const handleRemoveFromClient = async (key: string) => {
    try {
      await deleteClientMeasurementConfig(clientId, key);
      setConfirmDeleteKey(null);
      setErrorMessage('');
      playDelete();
      haptic.error();
      void fetchConfigs();
      onSuccess();
    } catch (err) {
      playError();
      console.error('[ManageMetricsModal] Remove error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove metric.');
    }
  };

  const handleAddToClient = async (metric: DefaultMetric) => {
    try {
      await upsertClientMeasurementConfig(clientId, {
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        category: metric.category,
      });
      setErrorMessage('');
      playConfirm();
      void fetchConfigs();
      onSuccess();
    } catch (err) {
      playError();
      console.error('[ManageMetricsModal] Add error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add metric.');
    }
  };

  const bodyConfigs = configs.filter(c => c.category === 'body');
  const perfConfigs = configs.filter(c => c.category === 'performance');
  const bodyAvailable = availableMetrics.filter(m => m.category === 'body');
  const perfAvailable = availableMetrics.filter(m => m.category === 'performance');

  return (
    <div
      ref={overlayRef}
      className="manage-metrics-overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onClick={onClose}
    >
      <div ref={containerRef} className="manage-metrics-container" onClick={e => e.stopPropagation()}>
        <div className="manage-metrics-header">
          <h2>{isEditing ? (editingConfig.updated_at ? 'EDIT METRIC' : 'CREATE METRIC') : 'MANAGE METRICS'}</h2>
          <button className="manage-metrics-close" onClick={isEditing ? () => setIsEditing(false) : onClose}>
            {isEditing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            )}
          </button>
        </div>

        {errorMessage && <div className="empty-hint">{errorMessage}</div>}

        {isEditing ? (
          <div className="metric-form">
            <div className="form-group">
              <label>KEY (Internal ID, unique)</label>
              <input 
                type="text"
                disabled={!!editingConfig.updated_at}
                value={editingConfig.key || ''}
                onChange={e => setEditingConfig({...editingConfig, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                placeholder="e.g. chest_cm"
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-2">
                <label>LABEL (Display Name)</label>
                <input 
                  type="text"
                  value={editingConfig.label || ''}
                  onChange={e => setEditingConfig({...editingConfig, label: e.target.value})}
                  placeholder="e.g. Chest"
                />
              </div>
              <div className="form-group flex-1">
                <label>UNIT</label>
                <input 
                  type="text"
                  value={editingConfig.unit || ''}
                  onChange={e => setEditingConfig({...editingConfig, unit: e.target.value})}
                  placeholder="cm"
                />
              </div>
            </div>

            <div className="form-group">
              <label>CATEGORY</label>
              <div className="category-tabs">
                <button 
                  className={editingConfig.category === 'body' ? 'active' : ''} 
                  onClick={() => setEditingConfig({...editingConfig, category: 'body'})}
                >Body</button>
                <button 
                  className={editingConfig.category === 'performance' ? 'active' : ''} 
                  onClick={() => setEditingConfig({...editingConfig, category: 'performance'})}
                >Performance</button>
              </div>
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="save-btn" onClick={() => { haptic.medium(); void handleSave(); }}>
                {saveState === 'saved' ? 'Saved ✓' : 'Save Metric'}
              </button>
            </div>
          </div>
        ) : (
          <div className="metrics-scroll-area">
            {loading ? (
              <div className="loading-state">Loading metrics...</div>
            ) : (
              <>
                <div className="metric-section">
                  <div className="section-title">
                    <span className="icon-wrap client"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
                    <h3>CLIENT METRICS</h3>
                    <span className="count-pill">{configs.length}</span>
                  </div>

                  {bodyConfigs.length > 0 && (
                    <div className="category-group">
                      <h4>BODY MEASUREMENTS</h4>
                      {bodyConfigs.map(c => renderMetricRow(c, true))}
                    </div>
                  )}

                  {perfConfigs.length > 0 && (
                    <div className="category-group">
                      <h4>PERFORMANCE</h4>
                      {perfConfigs.map(c => renderMetricRow(c, true))}
                    </div>
                  )}

                  {configs.length === 0 && <div className="empty-hint">No metrics tracked for this client yet.</div>}
                </div>

                <div className="section-divider" />

                <div className="metric-section">
                  <div className="section-title">
                    <span className="icon-wrap available"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></span>
                    <h3>AVAILABLE METRICS</h3>
                    <span className="count-pill available">{availableMetrics.length}</span>
                  </div>

                  {bodyAvailable.length > 0 && (
                    <div className="category-group">
                      <h4>BODY MEASUREMENTS</h4>
                      {bodyAvailable.map(m => renderMetricRow(m, false))}
                    </div>
                  )}

                  {perfAvailable.length > 0 && (
                    <div className="category-group">
                      <h4>PERFORMANCE</h4>
                      {perfAvailable.map(m => renderMetricRow(m, false))}
                    </div>
                  )}

                  <button className="create-custom-btn" onClick={() => { setEditingConfig({category: 'body'}); setIsEditing(true); }}>
                    <span className="plus">+</span>
                    Create Custom Metric
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function renderMetricRow(item: any, isClientMetric: boolean) {
    const isLocked = LOCKED_KEYS.includes(item.key);
    const isConfirming = confirmDeleteKey === item.key;

    return (
      <div key={item.key} className="metric-item-row">
        <div className="metric-info">
          <div className="label-row">
            <span className="label">{item.label}</span>
            {isLocked && <span className="lock-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>}
          </div>
          <span className="key-sub">{item.key} {item.unit ? `(${item.unit})` : ''}</span>
        </div>

        <div className="metric-actions">
          {isClientMetric ? (
            isConfirming ? (
              <div className="confirm-delete">
                <span className="q">Remove?</span>
                <button className="yes" onClick={() => handleRemoveFromClient(item.key)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                <button className="no" onClick={() => setConfirmDeleteKey(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ) : (
              <>
                <button className="action-btn edit" onClick={() => { setEditingConfig(item); setIsEditing(true); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                {!isLocked && (
                  <button className="action-btn delete" onClick={() => setConfirmDeleteKey(item.key)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                  </button>
                )}
              </>
            )
          ) : (
            <button className="action-btn add" onClick={() => handleAddToClient(item)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          )}
        </div>
      </div>
    );
  }
}
