import { sessionService } from '../features/sessions/services/sessionService';
import { deriveClientStatus } from '../features/clients/utils/deriveClientStatus';
import { SessionLogInput } from '../features/sessions/types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => {
  const mockRef: any = {
    withConverter: jest.fn(() => mockRef),
  };
  return {
    collection: jest.fn(() => mockRef),
    addDoc: jest.fn(async (col, data) => ({ id: 'mock-session-id' })),
    serverTimestamp: jest.fn(() => 'mock-server-timestamp'),
    Timestamp: {
      fromDate: jest.fn((date) => ({ toDate: () => date })),
    },
  };
});

jest.mock('../database/firebase', () => ({
  db: {},
}));

jest.mock('../database/dbService', () => ({
  dbService: {
    appendOnly: jest.fn(async (col, data) => 'mock-session-id'),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => 'test-device-id'),
  setItem: jest.fn(async () => {}),
}));

describe('Session System Logic & Validation', () => {
  const { dbService } = require('../database/dbService');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Validation: Missed session needs reason
  test('Validation: Missed session requires a reason', async () => {
    const invalidInput: SessionLogInput = {
      date: new Date(),
      type: 'workout',
      status: 'missed',
      unit_system: 'metric',
      missed_reason: '   ' // empty/whitespace
    };

    await expect(sessionService.addSessionLog('client-1', invalidInput))
      .rejects.toThrow('MISSING_REASON');
  });

  // 2. Validation: Completed workout needs data
  test('Validation: Completed workout requires workout_data', async () => {
    const invalidInput: SessionLogInput = {
      date: new Date(),
      type: 'workout',
      status: 'completed',
      unit_system: 'metric',
      workout_data: undefined
    };

    await expect(sessionService.addSessionLog('client-1', invalidInput))
      .rejects.toThrow('MISSING_DATA');
  });

  // 3. Validation: Range checks
  test('Validation: Negative weight or zero reps should throw', async () => {
    const invalidInput: SessionLogInput = {
      date: new Date(),
      type: 'workout',
      status: 'completed',
      unit_system: 'metric',
      workout_data: {
        exercises: [{
          exercise_id: 'ex-1',
          name: 'Squat',
          sets: [{ reps: 0, weight_kg: 100 }] // 0 reps invalid
        }]
      }
    };

    await expect(sessionService.addSessionLog('client-1', invalidInput))
      .rejects.toThrow('INVALID_REPS');
  });

  // 4. Validation: Infinity/NaN
  test('Validation: Infinity or NaN weight/reps should throw', async () => {
    const invalidInput: SessionLogInput = {
      date: new Date(),
      type: 'workout',
      status: 'completed',
      unit_system: 'metric',
      workout_data: {
        exercises: [{
          exercise_id: 'ex-1',
          name: 'Deadlift',
          sets: [{ reps: Infinity as any, weight_kg: 100 }]
        }]
      }
    };

    await expect(sessionService.addSessionLog('client-1', invalidInput))
      .rejects.toThrow('INVALID_REPS');
  });

  // 4. Metric Conversion
  test('Metric Integrity: Imperial workout logs are converted to kg', async () => {
    const imperialInput: SessionLogInput = {
      date: new Date(),
      type: 'workout',
      status: 'completed',
      unit_system: 'imperial',
      workout_data: {
        exercises: [{
          exercise_id: 'ex-1',
          name: 'Bench Press',
          sets: [{ reps: 10, weight_kg: 220 }] // 220 lbs
        }]
      }
    };

    await sessionService.addSessionLog('client-1', imperialInput);

    expect(dbService.appendOnly).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        workout_data: expect.objectContaining({
          exercises: [expect.objectContaining({
            sets: [expect.objectContaining({
              weight_kg: 99.79 // 220 * 0.453592
            })]
          })]
        })
      })
    );
  });

  // 5. Status Derivation with Sessions
  test('Status Logic: Client becomes active if sessions exist', () => {
    const ctx = {
      storedStatus: 'active' as const,
      hasMeasurements: false,
      hasSessions: true
    };
    
    expect(deriveClientStatus(ctx)).toBe('active');
  });
});
