
import { clientService, MeasurementInput } from '../features/clients/services/clientService';
import { deriveClientStatus } from '../features/clients/utils/deriveClientStatus';
import { sanitizeUpdate } from '../shared/utils/sanitizeUtils';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => {
  const mockRef: any = {
    withConverter: jest.fn(() => mockRef),
  };
  return {
    collection: jest.fn(() => mockRef),
    doc: jest.fn(() => mockRef),
    addDoc: jest.fn(async (col, data) => ({ id: 'mock-id-' + Math.random().toString(36).substr(2, 5) })),
    setDoc: jest.fn(async (doc, data, options) => {}),
    updateDoc: jest.fn(async (doc, data) => {}),
    query: jest.fn(() => mockRef),
    where: jest.fn(() => mockRef),
    orderBy: jest.fn(() => mockRef),
    limit: jest.fn(() => mockRef),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
    Timestamp: {
      fromDate: jest.fn((date) => ({ toDate: () => date })),
    },
  };
});

jest.mock('../database/firebase', () => ({
  db: {},
}));

jest.mock('../database/converters/clientConverter', () => ({
  clientConverter: {},
}));

jest.mock('../database/converters/measurementConverter', () => ({
  measurementConverter: {},
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => 'test-device-id'),
  setItem: jest.fn(async () => {}),
}));

// Mock the search token generator to keep tests simple
// jest.mock('../shared/utils/searchUtils', () => ({
//   generateSearchTokens: jest.fn((name) => [name.toLowerCase()]),
// }));

describe('Trainer CMS Client System - Deep Test', () => {
  const { addDoc, setDoc, updateDoc } = require('firebase/firestore');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Create client (name only)
  test('Requirement 1: Create client with name only', async () => {
    const id = await clientService.createClient('John Doe');
    
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'John Doe',
        status: 'active',
        version: 1,
        deleted: false,
      })
    );
    expect(id).toBeDefined();
  });

  // 2. Edit multiple times (merge behavior)
  test('Requirement 2: Edit multiple times (merge behavior)', async () => {
    const clientId = 'client-123';
    
    // First edit: add email
    await clientService.updateProfile(clientId, { email: 'john@example.com' }, 1);
    
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: 'john@example.com',
        version: 2,
      }),
      { merge: true }
    );

    // Second edit: add phone
    await clientService.updateProfile(clientId, { phone: '555-0199' }, 2);
    
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        phone: '555-0199',
        version: 3,
      }),
      { merge: true }
    );
  });

  // 3. Test empty field updates (should not overwrite)
  test('Requirement 6: Empty field updates should NOT overwrite existing data', async () => {
    const clientId = 'client-123';
    
    // Attempting to clear name with empty string or null
    await clientService.updateProfile(clientId, { name: '', email: undefined } as any, 1);
    
    // Service should skip write if no valid fields
    expect(setDoc).not.toHaveBeenCalled();

    // Partial update with one valid and one empty
    await clientService.updateProfile(clientId, { phone: '123', occupation: '' }, 1);
    
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ occupation: '' }), // Occupation should be stripped
      { merge: true }
    );
  });

  // 4. Add multiple measurements & Append-only behavior
  test('Requirement 3 & 4: Add multiple measurements (append-only)', async () => {
    const clientId = 'client-123';
    const input1: MeasurementInput = {
      date: new Date(),
      unit_system: 'metric',
      weight: 80,
    };
    const input2: MeasurementInput = {
      date: new Date(),
      unit_system: 'metric',
      weight: 79,
    };

    await clientService.addMeasurement(clientId, input1);
    await clientService.addMeasurement(clientId, input2);

    // Verify addDoc (Append-only) was called twice
    expect(addDoc).toHaveBeenCalledTimes(2);
    
    // Verify it used the subcollection path (implied by first arg being 'collection' from mock)
    // Check metric values
    expect(addDoc).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({ weight_kg: 80 }));
    expect(addDoc).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({ weight_kg: 79 }));
  });

  // 5. Metric conversion check
  test('Verification: Imperial to Metric conversion', async () => {
    const clientId = 'client-123';
    const imperialInput: MeasurementInput = {
      date: new Date(),
      unit_system: 'imperial',
      weight: 154, // ~69.85 kg
      height: 70,  // ~177.8 cm
    };

    await clientService.addMeasurement(clientId, imperialInput);

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        weight_kg: 69.85,
        height_cm: 177.8,
      })
    );
  });

  // 6. Status updates correctly
  test('Requirement 5: Check status updates correctly (derived logic)', () => {
    // New client (stored active, but no measurements/sessions)
    expect(deriveClientStatus({ 
      storedStatus: 'active', 
      hasMeasurements: false,
      hasSessions: false 
    })).toBe('incomplete');

    // Client with measurements only
    expect(deriveClientStatus({ 
      storedStatus: 'active', 
      hasMeasurements: true,
      hasSessions: false 
    })).toBe('active');

    // Client with sessions only
    expect(deriveClientStatus({ 
      storedStatus: 'active', 
      hasMeasurements: false,
      hasSessions: true 
    })).toBe('active');

    // Inactive override
    expect(deriveClientStatus({ 
      storedStatus: 'inactive', 
      hasMeasurements: true,
      hasSessions: true 
    })).toBe('inactive');
  });

  // 7. Search Logic Improvement
  test('Requirement 7: Search tokens support multi-word retrieval (last name)', () => {
    const { generateSearchTokens } = require('../shared/utils/searchUtils');
    const tokens = generateSearchTokens('John Doe');
    
    // Should contain full prefix
    expect(tokens).toContain('john d');
    // Should now also contain last name prefixes (The Fix)
    expect(tokens).toContain('doe');
    expect(tokens).toContain('do');
  });
});
