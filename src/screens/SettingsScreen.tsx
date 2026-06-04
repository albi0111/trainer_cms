import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import pkg from '../../package.json';
import './SettingsScreen.css';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import BrandMark from '../components/branding/BrandMark';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SyncIndicator from '../components/sync/SyncIndicator';
import { useSoundFeedback } from '../hooks/useSoundFeedback';
import { useAppStore } from '../store/useAppStore';

const DriveConnectAlert = lazy(() => import('../components/sync/DriveConnectAlert'));

export default function SettingsScreen() {
  const isConnectedToDrive = useAppStore((state) => state.isConnectedToDrive);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
  const calendarPendingSyncCount = useAppStore((state) => state.calendarPendingSyncCount);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);
  const calendarLastSyncedAt = useAppStore((state) => state.calendarLastSyncedAt);
  const lastSyncError = useAppStore((state) => state.lastSyncError);
  const calendarLastSyncError = useAppStore((state) => state.calendarLastSyncError);
  const isCalendarConnected = useAppStore((state) => state.isCalendarConnected);
  const isCalendarEnabledOnThisDevice = useAppStore((state) => state.isCalendarEnabledOnThisDevice);
  const calendarName = useAppStore((state) => state.calendarName);
  const calendarSyncStatus = useAppStore((state) => state.calendarSyncStatus);
  const disconnectDrive = useAppStore((state) => state.disconnectDrive);
  const connectCalendar = useAppStore((state) => state.connectCalendar);
  const disconnectCalendar = useAppStore((state) => state.disconnectCalendar);
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
  const refreshCalendarState = useAppStore((state) => state.refreshCalendarState);
  const runSync = useAppStore((state) => state.runSync);
  const runCalendarSync = useAppStore((state) => state.runCalendarSync);
  const [isDrivePromptOpen, setIsDrivePromptOpen] = useState(false);
  const [isBuilderToastVisible, setIsBuilderToastVisible] = useState(false);
  const [hasLoadedDrivePrompt, setHasLoadedDrivePrompt] = useState(false);
  const builderTapCountRef = useRef(0);
  const builderTapResetTimeoutRef = useRef<number | null>(null);
  const builderToastTimeoutRef = useRef<number | null>(null);
  const { playTick } = useSoundFeedback();
  const version = typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version : '1.0.0';

  useEffect(() => {
    void refreshSyncState();
    void refreshCalendarState();
  }, [refreshCalendarState, refreshSyncState]);

  useEffect(() => {
    return () => {
      if (builderTapResetTimeoutRef.current !== null) {
        window.clearTimeout(builderTapResetTimeoutRef.current);
      }

      if (builderToastTimeoutRef.current !== null) {
        window.clearTimeout(builderToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isDrivePromptOpen) {
      setHasLoadedDrivePrompt(true);
    }
  }, [isDrivePromptOpen]);

  const handleBuilderTap = () => {
    builderTapCountRef.current += 1;

    if (builderTapResetTimeoutRef.current !== null) {
      window.clearTimeout(builderTapResetTimeoutRef.current);
    }

    builderTapResetTimeoutRef.current = window.setTimeout(() => {
      builderTapCountRef.current = 0;
      builderTapResetTimeoutRef.current = null;
    }, 3000);

    if (builderTapCountRef.current < 3) {
      return;
    }

    builderTapCountRef.current = 0;

    if (builderTapResetTimeoutRef.current !== null) {
      window.clearTimeout(builderTapResetTimeoutRef.current);
      builderTapResetTimeoutRef.current = null;
    }

    if (builderToastTimeoutRef.current !== null) {
      window.clearTimeout(builderToastTimeoutRef.current);
    }

    playTick();
    setIsBuilderToastVisible(true);
    builderToastTimeoutRef.current = window.setTimeout(() => {
      setIsBuilderToastVisible(false);
      builderToastTimeoutRef.current = null;
    }, 2500);
  };

  return (
    <div className="settings-page">
      <TopNavBar showLogo showBack />

      <PageWrapper>
        <div className="settings-content">
          <h1 className="settings-title">Settings</h1>

          <div className="settings-groups">
            <section className="settings-group">
              <h2 className="settings-group-title">CLOUD SYNC</h2>
              <Card padding="lg" className="settings-card">
                <div className="sync-status">
                  <div className={`sync-status-icon ${isConnectedToDrive ? 'sync-status-icon--active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="sync-status-info">
                    <h3 className="sync-status-text">{isConnectedToDrive ? 'Connected to Google Drive' : 'Google Drive not connected'}</h3>
                    <p className="sync-email">{pendingSyncCount > 0 ? `${pendingSyncCount} changes waiting to sync` : 'Offline-first local storage is active'}</p>
                  </div>
                </div>
                <div className="sync-meta">
                  <div>
                    <p className="sync-time">Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</p>
                    {lastSyncError && <p className="sync-time sync-time--error">{lastSyncError}</p>}
                  </div>
                  <div className="sync-meta__actions">
                    <SyncIndicator />
                    <Button variant="secondary" size="sm" onClick={() => void runSync()}>
                      Sync Now
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">CALENDAR REMINDERS</h2>
              <Card padding="lg" className="settings-card">
                <div className="sync-status">
                  <div className={`sync-status-icon ${isCalendarConnected ? 'sync-status-icon--active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div className="sync-status-info">
                    <h3 className="sync-status-text">
                      {isCalendarConnected ? `Connected to ${calendarName || 'Google Calendar'}` : 'Google Calendar not connected'}
                    </h3>
                    <p className="sync-email">
                      {isCalendarConnected && isCalendarEnabledOnThisDevice
                        ? `${calendarPendingSyncCount} calendar changes waiting`
                        : 'Calendar reminders are off on this device'}
                    </p>
                  </div>
                </div>

                <p className="calendar-owner-note">
                  Calendar reminders are managed from this device. Use only one device for Calendar reminders to avoid duplicate Google Calendar events.
                </p>

                <div className="sync-meta">
                  <div>
                    <p className="sync-time">Last synced: {calendarLastSyncedAt ? new Date(calendarLastSyncedAt).toLocaleString() : 'Never'}</p>
                    {calendarLastSyncError && <p className="sync-time sync-time--error">{calendarLastSyncError}</p>}
                  </div>
                  <div className="sync-meta__actions">
                    {isCalendarConnected ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={calendarSyncStatus === 'syncing'}
                          onClick={() => void runCalendarSync()}
                        >
                          Sync Calendar
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => void disconnectCalendar()}>
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={calendarSyncStatus === 'syncing'}
                        onClick={() => void connectCalendar()}
                      >
                        Connect Calendar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">PREFERENCES</h2>
              <Card padding="md" className="settings-card">
                <div className="setting-item">
                  <span className="setting-item-label">Fonts</span>
                  <span className="setting-item-value">System Optimized</span>
                </div>
                <div className="setting-item">
                  <span className="setting-item-label">Units</span>
                  <span className="setting-item-value">Metric (kg, cm)</span>
                </div>
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">ABOUT</h2>
              <Card padding="lg" className="settings-card settings-about-card">
                <div className="settings-about-card__brand">
                  <BrandMark className="settings-about-card__logo" decorative />
                  <h3 className="settings-about-card__name">fit.persona</h3>
                  <p className="settings-about-card__version">Version {version}</p>
                </div>

                <div className="settings-about-card__divider" />

                <div className="settings-about-card__credits">
                  <span className="settings-about-card__eyebrow">Powered by</span>
                  <button
                    type="button"
                    className="settings-about-card__builder"
                    onClick={handleBuilderTap}
                  >
                    0111
                  </button>
                </div>

                <div className="settings-about-card__divider" />

                <div className="settings-about-card__dedication">
                  <span className="settings-about-card__eyebrow">Built with ♥ for</span>
                  <span className="settings-about-card__trainer">Ajith</span>
                </div>
              </Card>
            </section>

            {isConnectedToDrive ? (
              <Button variant="danger" fullWidth size="lg" onClick={() => void disconnectDrive()}>
                Disconnect Google Drive
              </Button>
            ) : (
              <Button variant="primary" fullWidth size="lg" onClick={() => setIsDrivePromptOpen(true)}>
                Connect Google Drive
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>

      {hasLoadedDrivePrompt ? (
        <Suspense fallback={null}>
          <DriveConnectAlert
            visible={isDrivePromptOpen}
            onClose={() => setIsDrivePromptOpen(false)}
            onConnected={refreshSyncState}
          />
        </Suspense>
      ) : null}

      <div
        className={`settings-builder-toast ${isBuilderToastVisible ? 'settings-builder-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        Hello from the builder 👋
      </div>
    </div>
  );
}
