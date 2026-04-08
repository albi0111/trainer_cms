import { dbService } from '../database/dbService';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(async (col, data) => ({ id: 'mock-id' })),
  setDoc: jest.fn(async (doc, data, options) => {}),
  updateDoc: jest.fn(async (doc, data) => {}),
  serverTimestamp: jest.fn(() => 'mock-server-timestamp'),
}));

describe('dbService Hardening Validation', () => {
  const { setDoc, addDoc, updateDoc } = require('firebase/firestore');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('safeUpdate: strips invalid fields (sanitization)', async () => {
    const mockRef = {} as any;
    const dirtyData = {
      name: 'Alice',
      email: '',          // Should be stripped
      phone: null,        // Should be stripped
      occupation: undefined // Should be stripped
    };

    await dbService.safeUpdate(mockRef, dirtyData);

    expect(setDoc).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({
        name: 'Alice',
      }),
      { merge: true }
    );

    const payload = setDoc.mock.calls[0][1];
    expect(payload.email).toBeUndefined();
    expect(payload.phone).toBeUndefined();
    expect(payload.occupation).toBeUndefined();
  });

  test('safeUpdate: injects updated_at timestamp', async () => {
    const mockRef = {} as any;
    await dbService.safeUpdate(mockRef, { name: 'Alice' });

    expect(setDoc).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({
        updated_at: 'mock-server-timestamp'
      }),
      { merge: true }
    );
  });

  test('appendOnly: does not sanitize but provides audit trail via caller', async () => {
    const mockCol = {} as any;
    const data = { client_id: '123', weight_kg: 80 };

    await dbService.appendOnly(mockCol, data);

    expect(addDoc).toHaveBeenCalledWith(
      mockCol,
      data
    );
  });

  test('internal_unsafeWrite: bypasses sanitization (baseline check)', async () => {
    const mockRef = {} as any;
    const dirtyData = { email: '' };

    await dbService.internal_unsafeWrite(mockRef, dirtyData);

    expect(setDoc).toHaveBeenCalledWith(
      mockRef,
      { email: '' },
      { merge: true }
    );
  });
});
