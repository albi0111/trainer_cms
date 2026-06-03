import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const describeWithEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

describeWithEmulator('Firestore production rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: `fit-persona-rules-${Date.now()}`,
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it.each([
    'device_tokens/device_A',
    'notification_jobs/job_A',
    'notification_entities/entity_A',
  ])('denies browser writes to %s', async (path) => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, path), { blocked: true }));
  });

  it('allows admin writes when security rules are disabled', async () => {
    await assertSucceeds(testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notification_jobs/job_A'), { status: 'pending' });
    }));
  });
});
