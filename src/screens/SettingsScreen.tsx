import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import pkg from '../../package.json';
import './SettingsScreen.css';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import BrandMark from '../components/branding/BrandMark';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { APP_SETTINGS_ID, DEFAULT_APP_SETTINGS } from '../constants/appSettings';
import { db } from '../db/db';
import { useSoundFeedback } from '../hooks/useSoundFeedback';
import { nowIsoUtc } from '../services/shared/date';
import { useAppStore } from '../store/useAppStore';

const DriveConnectAlert = lazy(() => import('../components/sync/DriveConnectAlert'));

const IMPORT_TABLE_NAMES = [
  'clients',
  'clientProfiles',
  'clientLifestyles',
  'clientAssessments',
  'measurements',
  'measurementConfigs',
  'progressPhotos',
  'plans',
  'dietPlans',
  'sessions',
  'sessionResults',
  'exercises',
  'syncQueue',
  'syncMeta',
  'clientSyncState',
  'appSettings',
  'calendarEvents',
  'calendarSyncQueue',
] as const;

type ImportTableName = typeof IMPORT_TABLE_NAMES[number];
type JsonRecord = Record<string, unknown>;
type ImportPayload = {
  tables?: Partial<Record<ImportTableName, unknown>>;
} & Partial<Record<ImportTableName, unknown>>;
type ImportTable = {
  bulkGet(keys: unknown[]): Promise<Array<JsonRecord | undefined>>;
  bulkPut(records: JsonRecord[]): Promise<unknown>;
  get(key: unknown): Promise<JsonRecord | undefined>;
  put(record: JsonRecord): Promise<unknown>;
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getImportRecords(payload: ImportPayload, tableName: ImportTableName): JsonRecord[] {
  const tableValue = isJsonRecord(payload.tables) ? payload.tables[tableName] : payload[tableName];
  return Array.isArray(tableValue) ? tableValue.filter(isJsonRecord) : [];
}

function hasKey(record: JsonRecord, key: string): boolean {
  return typeof record[key] === 'string' && String(record[key]).trim().length > 0;
}

function normalizeForCompare(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForCompare);
  }

  if (!isJsonRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<JsonRecord>((normalized, key) => {
      if (typeof value[key] !== 'undefined') {
        normalized[key] = normalizeForCompare(value[key]);
      }
      return normalized;
    }, {});
}

function areRecordsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeForCompare(left)) === JSON.stringify(normalizeForCompare(right));
}

async function putChangedRecords(
  table: ImportTable,
  records: JsonRecord[],
  getKey: (record: JsonRecord) => unknown,
): Promise<number> {
  if (records.length === 0) {
    return 0;
  }

  const keys = records.map(getKey);
  const existingRecords = await table.bulkGet(keys);
  const changedRecords = records.filter((record, index) => !areRecordsEqual(existingRecords[index], record));

  if (changedRecords.length > 0) {
    await table.bulkPut(changedRecords);
  }

  return changedRecords.length;
}

async function putChangedSingleton(table: ImportTable, key: unknown, record: JsonRecord): Promise<number> {
  const existingRecord = await table.get(key);
  if (areRecordsEqual(existingRecord, record)) {
    return 0;
  }

  await table.put(record);
  return 1;
}

export default function SettingsScreen() {
  const isGoogleConnected = useAppStore((state) => state.isGoogleConnected);
  const googleAuthStatus = useAppStore((state) => state.googleAuthStatus);
  const googleAccountEmail = useAppStore((state) => state.googleAccountEmail);
  const googlePendingSyncCount = useAppStore((state) => state.googlePendingSyncCount);
  const googleLastSyncedAt = useAppStore((state) => state.googleLastSyncedAt);
  const googleLastSyncError = useAppStore((state) => state.googleLastSyncError);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const calendarSyncStatus = useAppStore((state) => state.calendarSyncStatus);
  const isDriveSyncEnabled = useAppStore((state) => state.isDriveSyncEnabled);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
  const calendarPendingSyncCount = useAppStore((state) => state.calendarPendingSyncCount);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);
  const calendarLastSyncedAt = useAppStore((state) => state.calendarLastSyncedAt);
  const lastSyncError = useAppStore((state) => state.lastSyncError);
  const calendarLastSyncError = useAppStore((state) => state.calendarLastSyncError);
  const isCalendarEnabledOnThisDevice = useAppStore((state) => state.isCalendarEnabledOnThisDevice);
  const calendarName = useAppStore((state) => state.calendarName);
  const connectDrive = useAppStore((state) => state.connectDrive);
  const disconnectDrive = useAppStore((state) => state.disconnectDrive);
  const connectCalendar = useAppStore((state) => state.connectCalendar);
  const disconnectCalendar = useAppStore((state) => state.disconnectCalendar);
  const disconnectGoogle = useAppStore((state) => state.disconnectGoogle);
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
  const runSync = useAppStore((state) => state.runSync);
  const [isDrivePromptOpen, setIsDrivePromptOpen] = useState(false);
  const [activeFeatureToggle, setActiveFeatureToggle] = useState<'google' | 'calendar' | null>(null);
  const [isBuilderToastVisible, setIsBuilderToastVisible] = useState(false);
  const [hasLoadedDrivePrompt, setHasLoadedDrivePrompt] = useState(false);
  const [deviceDataSummary, setDeviceDataSummary] = useState('Checking local data...');
  const [isExportingData, setIsExportingData] = useState(false);
  const [isImportingData, setIsImportingData] = useState(false);
  const [dataImportMessage, setDataImportMessage] = useState<string | null>(null);
  const builderTapCountRef = useRef(0);
  const builderTapResetTimeoutRef = useRef<number | null>(null);
  const builderToastTimeoutRef = useRef<number | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const { playTick } = useSoundFeedback();
  const version = typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version : '1.0.0';
  const requiresGoogleReconnect = !isGoogleConnected
    || googleAuthStatus === 'expired'
    || googleAuthStatus === 'revoked'
    || googleAuthStatus === 'failed';
  const isGoogleReady = isGoogleConnected && !requiresGoogleReconnect;
  const isGoogleSyncActive = isGoogleReady && isDriveSyncEnabled;
  const isCalendarReminderActive = isGoogleReady && isCalendarEnabledOnThisDevice;
  const googleAccountTitle = requiresGoogleReconnect
    ? (isGoogleConnected || googleAuthStatus === 'expired' ? 'Reconnect Google' : 'Connect to Google')
    : 'Google connected';
  const googleAccountSubtitle = 'Keep app backups safe and add session reminders to your Google Calendar';
  const formatSyncTimestamp = (timestamp?: string | null) => (
    timestamp ? new Date(timestamp).toLocaleString() : 'Never'
  );

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  useEffect(() => {
    let isMounted = true;

    const loadDeviceSummary = async () => {
      const [clientCount, sessionCount, pendingDriveCount, pendingCalendarCount] = await Promise.all([
        db.clients.count(),
        db.sessions.count(),
        db.syncQueue.count(),
        db.calendarSyncQueue.count(),
      ]);

      if (!isMounted) {
        return;
      }

      const pendingCount = pendingDriveCount + pendingCalendarCount;
      setDeviceDataSummary(`${clientCount} clients · ${sessionCount} sessions · ${pendingCount} changes waiting`);
    };

    void loadDeviceSummary();

    return () => {
      isMounted = false;
    };
  }, [googlePendingSyncCount]);

  const refreshDeviceDataSummary = async () => {
    const [clientCount, sessionCount, pendingDriveCount, pendingCalendarCount] = await Promise.all([
      db.clients.count(),
      db.sessions.count(),
      db.syncQueue.count(),
      db.calendarSyncQueue.count(),
    ]);
    const pendingCount = pendingDriveCount + pendingCalendarCount;
    setDeviceDataSummary(`${clientCount} clients · ${sessionCount} sessions · ${pendingCount} changes waiting`);
  };

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

  const handleGoogleSyncToggle = async () => {
    if (activeFeatureToggle) {
      return;
    }

    if (!isGoogleReady) {
      setIsDrivePromptOpen(true);
      return;
    }

    setActiveFeatureToggle('google');
    try {
      if (isDriveSyncEnabled) {
        await disconnectDrive();
      } else {
        await connectDrive();
      }
    } finally {
      setActiveFeatureToggle(null);
    }
  };

  const handleCalendarReminderToggle = async () => {
    if (activeFeatureToggle) {
      return;
    }

    if (!isGoogleReady) {
      setIsDrivePromptOpen(true);
      return;
    }

    setActiveFeatureToggle('calendar');
    try {
      if (isCalendarReminderActive) {
        await disconnectCalendar();
      } else {
        await connectCalendar();
      }
    } finally {
      setActiveFeatureToggle(null);
    }
  };

  const handleExportJson = async () => {
    if (isExportingData) {
      return;
    }

    setIsExportingData(true);
    try {
      const exportedAt = new Date().toISOString();
      const payload = {
        metadata: {
          app: 'fit.persona',
          app_version: version,
          exported_at: exportedAt,
          format: 'fit-persona-local-indexeddb-v1',
        },
        tables: {
          clients: await db.clients.toArray(),
          clientProfiles: await db.clientProfiles.toArray(),
          clientLifestyles: await db.clientLifestyles.toArray(),
          clientAssessments: await db.clientAssessments.toArray(),
          measurements: await db.measurements.toArray(),
          measurementConfigs: await db.measurementConfigs.toArray(),
          progressPhotos: await db.progressPhotos.toArray(),
          plans: await db.plans.toArray(),
          dietPlans: await db.dietPlans.toArray(),
          sessions: await db.sessions.toArray(),
          sessionResults: await db.sessionResults.toArray(),
          exercises: await db.exercises.toArray(),
          syncQueue: await db.syncQueue.toArray(),
          syncMeta: await db.syncMeta.toArray(),
          clientSyncState: await db.clientSyncState.toArray(),
          appSettings: await db.appSettings.toArray(),
          calendarEvents: await db.calendarEvents.toArray(),
          calendarSyncQueue: await db.calendarSyncQueue.toArray(),
        },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = exportedAt.replace(/[:.]/g, '-');
      link.href = url;
      link.download = `fit-persona-data-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } finally {
      setIsExportingData(false);
    }
  };

  const importTableRecords = async (tableName: ImportTableName, records: JsonRecord[]): Promise<number> => {
    if (records.length === 0) {
      return 0;
    }

    switch (tableName) {
      case 'clients':
        return putChangedRecords(db.clients as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'clientProfiles':
        return putChangedRecords(db.clientProfiles as unknown as ImportTable, records.filter((record) => hasKey(record, 'client_id')), (record) => record.client_id);
      case 'clientLifestyles':
        return putChangedRecords(db.clientLifestyles as unknown as ImportTable, records.filter((record) => hasKey(record, 'client_id')), (record) => record.client_id);
      case 'clientAssessments':
        return putChangedRecords(db.clientAssessments as unknown as ImportTable, records.filter((record) => hasKey(record, 'client_id')), (record) => record.client_id);
      case 'measurements':
        return putChangedRecords(db.measurements as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'measurementConfigs':
        return putChangedRecords(
          db.measurementConfigs as unknown as ImportTable,
          records.filter((record) => hasKey(record, 'client_id') && hasKey(record, 'key')),
          (record) => [record.client_id, record.key],
        );
      case 'progressPhotos':
        return putChangedRecords(db.progressPhotos as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'plans':
        return putChangedRecords(db.plans as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'dietPlans':
        return putChangedRecords(db.dietPlans as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'sessions':
        return putChangedRecords(db.sessions as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'sessionResults':
        return putChangedRecords(db.sessionResults as unknown as ImportTable, records.filter((record) => hasKey(record, 'session_id')), (record) => record.session_id);
      case 'exercises':
        return putChangedRecords(db.exercises as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'syncQueue':
        return putChangedRecords(db.syncQueue as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'syncMeta': {
        const imported = records.find((record) => record.id === 'default') || records[0];
        return putChangedSingleton(db.syncMeta as unknown as ImportTable, 'default', { ...imported, id: 'default' });
      }
      case 'clientSyncState':
        return putChangedRecords(db.clientSyncState as unknown as ImportTable, records.filter((record) => hasKey(record, 'client_id')), (record) => record.client_id);
      case 'appSettings': {
        const imported = records.find((record) => record.id === APP_SETTINGS_ID) || records[0];
        return putChangedSingleton(db.appSettings as unknown as ImportTable, APP_SETTINGS_ID, {
          ...DEFAULT_APP_SETTINGS,
          ...imported,
          id: APP_SETTINGS_ID,
        });
      }
      case 'calendarEvents':
        return putChangedRecords(db.calendarEvents as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      case 'calendarSyncQueue':
        return putChangedRecords(db.calendarSyncQueue as unknown as ImportTable, records.filter((record) => hasKey(record, 'id')), (record) => record.id);
      default:
        return 0;
    }
  };

  const handleImportJsonFile = async (file: File | undefined) => {
    if (!file || isImportingData) {
      return;
    }

    setIsImportingData(true);
    setDataImportMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isJsonRecord(parsed)) {
        throw new Error('Invalid JSON file.');
      }

      const payload = parsed as ImportPayload;
      let importedCount = 0;

      await db.transaction('rw', db.tables, async () => {
        for (const tableName of IMPORT_TABLE_NAMES) {
          importedCount += await importTableRecords(tableName, getImportRecords(payload, tableName));
        }

        if (await db.appSettings.count() === 0) {
          await db.appSettings.put(DEFAULT_APP_SETTINGS);
        }

        if (await db.syncMeta.count() === 0) {
          await db.syncMeta.put({ id: 'default' });
        }
      });

      await refreshDeviceDataSummary();
      await refreshSyncState();
      setDataImportMessage(importedCount > 0
        ? `Imported ${importedCount} changes · ${nowIsoUtc()}`
        : `No changes imported · ${nowIsoUtc()}`);
    } catch (error) {
      setDataImportMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setIsImportingData(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="settings-page">
      <TopNavBar showLogo showBack />

      <PageWrapper>
        <div className="settings-content">
          <h1 className="settings-title">Settings</h1>

          <div className="settings-groups">
            <section className="settings-group">
              <h2 className="settings-group-title">GOOGLE ACCOUNT</h2>
              <Card padding="lg" className="settings-card">
                <div className="sync-status">
                  <div className="sync-status-main">
                    <div className={`sync-status-icon ${isGoogleReady ? 'sync-status-icon--active' : ''}`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div className="sync-status-info">
                      <h3 className="sync-status-text">{googleAccountTitle}</h3>
                      <p className="sync-email">{googleAccountSubtitle}</p>
                      <p className="sync-time sync-time--inline">
                        Last sync: {formatSyncTimestamp(googleLastSyncedAt)}
                      </p>
                      {!isGoogleReady && googlePendingSyncCount > 0 && (
                        <p className="sync-time sync-time--muted">{googlePendingSyncCount} Google changes waiting</p>
                      )}
                      {googleAccountEmail && isGoogleReady && <p className="sync-time sync-time--muted">{googleAccountEmail}</p>}
                      {googleLastSyncError && <p className="sync-time sync-time--error">{googleLastSyncError}</p>}
                    </div>
                  </div>
                  <div className="sync-status-action">
                    {requiresGoogleReconnect ? (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={syncStatus === 'syncing'}
                        onClick={() => setIsDrivePromptOpen(true)}
                      >
                        {isGoogleConnected || googleAuthStatus === 'expired' ? 'Reconnect Google' : 'Connect Google'}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={syncStatus === 'syncing'}
                        onClick={() => void runSync()}
                      >
                        Sync with Google
                      </Button>
                    )}
                  </div>
                </div>

                {isGoogleReady && (
                <div className="google-feature-list">
                  <div className={`google-feature-item ${isGoogleSyncActive ? 'google-feature-item--active' : 'google-feature-item--paused'}`}>
                    <span className={`google-feature-item__check ${isGoogleSyncActive ? 'is-active' : 'is-paused'}`}>
                      {isGoogleSyncActive ? '✓' : '–'}
                    </span>
                    <div>
                      <span className="setting-item-label">Backup & Sync</span>
                      <p className="sync-email">
                        {isGoogleSyncActive ? 'Backs up client data to your Google Drive' : 'Client data backup is paused'}
                      </p>
                      <p className="sync-time sync-time--muted">
                        Drive last sync: {formatSyncTimestamp(lastSyncedAt)}
                      </p>
                      {pendingSyncCount > 0 && isGoogleSyncActive && <p className="sync-time sync-time--muted">{pendingSyncCount} Drive changes waiting</p>}
                      {lastSyncError && <p className="sync-time sync-time--error">{lastSyncError}</p>}
                    </div>
                    <button
                      type="button"
                      className={`settings-toggle ${isGoogleSyncActive ? 'settings-toggle--on' : ''}`}
                      role="switch"
                      aria-checked={isGoogleSyncActive}
                      aria-label={isGoogleSyncActive ? 'Pause Backup and Sync' : 'Enable Backup and Sync'}
                      disabled={activeFeatureToggle !== null || syncStatus === 'syncing'}
                      onClick={() => void handleGoogleSyncToggle()}
                    >
                      {activeFeatureToggle === 'google' ? <span className="settings-toggle__spinner" aria-hidden="true" /> : <span className="settings-toggle__thumb" />}
                    </button>
                  </div>
                  <div className={`google-feature-item ${isCalendarReminderActive ? 'google-feature-item--active' : 'google-feature-item--paused'}`}>
                    <span className={`google-feature-item__check ${isCalendarReminderActive ? 'is-active' : 'is-paused'}`}>
                      {isCalendarReminderActive ? '✓' : '–'}
                    </span>
                    <div>
                      <span className="setting-item-label">Calendar Reminders</span>
                      <p className="sync-email">
                        {isCalendarReminderActive ? `Adds session reminders to ${calendarName || 'Google Calendar'}` : 'Session reminders are paused'}
                      </p>
                      <p className="sync-time sync-time--muted">
                        Calendar last sync: {formatSyncTimestamp(calendarLastSyncedAt)}
                      </p>
                      {calendarPendingSyncCount > 0 && isCalendarReminderActive && <p className="sync-time sync-time--muted">{calendarPendingSyncCount} Calendar changes waiting</p>}
                      {calendarLastSyncError && <p className="sync-time sync-time--error">{calendarLastSyncError}</p>}
                    </div>
                    <button
                      type="button"
                      className={`settings-toggle ${isCalendarReminderActive ? 'settings-toggle--on' : ''}`}
                      role="switch"
                      aria-checked={isCalendarReminderActive}
                      aria-label={isCalendarReminderActive ? 'Pause Calendar Reminders' : 'Enable Calendar Reminders'}
                      disabled={activeFeatureToggle !== null || calendarSyncStatus === 'syncing'}
                      onClick={() => void handleCalendarReminderToggle()}
                    >
                      {activeFeatureToggle === 'calendar' ? <span className="settings-toggle__spinner" aria-hidden="true" /> : <span className="settings-toggle__thumb" />}
                    </button>
                  </div>
                </div>
                )}
              </Card>
            </section>

            <section className="settings-group">
              <h2 className="settings-group-title">APP & DEVICE</h2>
              <Card padding="md" className="settings-card">
                <div className="setting-item">
                  <div>
                    <span className="setting-item-label">Local Data</span>
                    <p className="setting-item-description">Offline-first storage on this device</p>
                  </div>
                  <span className="setting-item-value">{deviceDataSummary}</span>
                </div>
                <div className="setting-item">
                  <div>
                    <span className="setting-item-label">JSON Data Dump</span>
                    <p className="setting-item-description">Export local clients, sessions, plans, measurements, and sync metadata</p>
                  </div>
                  <div className="setting-item-action">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={isExportingData}
                      onClick={() => void handleExportJson()}
                    >
                      Export JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={isImportingData}
                      onClick={() => importFileInputRef.current?.click()}
                    >
                      Import JSON
                    </Button>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="settings-file-input"
                      onChange={(event) => void handleImportJsonFile(event.currentTarget.files?.[0])}
                    />
                  </div>
                </div>
                {dataImportMessage && <p className="setting-import-status">{dataImportMessage}</p>}
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

            {isGoogleConnected ? (
              <Button variant="danger" fullWidth size="lg" onClick={() => void disconnectGoogle()}>
                Disconnect Google
              </Button>
            ) : null}
          </div>
        </div>
      </PageWrapper>

      {hasLoadedDrivePrompt ? (
        <Suspense fallback={null}>
          <DriveConnectAlert
            visible={isDrivePromptOpen}
            onClose={() => setIsDrivePromptOpen(false)}
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
