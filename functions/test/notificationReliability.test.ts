import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  class FakeTimestamp {
    private readonly millis: number;

    constructor(millis: number) {
      this.millis = millis;
    }

    static now(): FakeTimestamp {
      return new FakeTimestamp(Date.now());
    }

    static fromDate(date: Date): FakeTimestamp {
      return new FakeTimestamp(date.getTime());
    }

    static fromMillis(millis: number): FakeTimestamp {
      return new FakeTimestamp(millis);
    }

    toMillis(): number {
      return this.millis;
    }
  }

  class FakeDocumentReference {
    constructor(
      readonly firestore: FakeFirestore,
      readonly collectionName: string,
      readonly id: string,
    ) {}

    async get(): Promise<FakeDocumentSnapshot> {
      return this.firestore.getDocument(this.collectionName, this.id, this);
    }

    async set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void> {
      this.firestore.setDocument(this.collectionName, this.id, data, options);
    }

    async update(data: Record<string, unknown>): Promise<void> {
      this.firestore.updateDocument(this.collectionName, this.id, data);
    }
  }

  class FakeDocumentSnapshot {
    constructor(
      readonly ref: FakeDocumentReference,
      private readonly value: Record<string, unknown> | undefined,
    ) {}

    get id(): string {
      return this.ref.id;
    }

    get exists(): boolean {
      return Boolean(this.value);
    }

    data(): Record<string, unknown> | undefined {
      return this.value ? { ...this.value } : undefined;
    }
  }

  class FakeQuerySnapshot {
    constructor(readonly docs: FakeDocumentSnapshot[]) {}

    get empty(): boolean {
      return this.docs.length === 0;
    }

    get size(): number {
      return this.docs.length;
    }
  }

  type QueryFilter = {
    field: string;
    op: '==' | '<=';
    value: unknown;
  };

  class FakeQuery {
    constructor(
      readonly firestore: FakeFirestore,
      readonly collectionName: string,
      readonly filters: QueryFilter[] = [],
      readonly orderField: string | null = null,
      readonly limitCount: number | null = null,
    ) {}

    where(field: string, op: '==' | '<=', value: unknown): FakeQuery {
      return new FakeQuery(this.firestore, this.collectionName, [...this.filters, { field, op, value }], this.orderField, this.limitCount);
    }

    orderBy(field: string): FakeQuery {
      return new FakeQuery(this.firestore, this.collectionName, this.filters, field, this.limitCount);
    }

    limit(count: number): FakeQuery {
      return new FakeQuery(this.firestore, this.collectionName, this.filters, this.orderField, count);
    }

    async get(): Promise<FakeQuerySnapshot> {
      return this.firestore.query(this);
    }
  }

  class FakeCollectionReference extends FakeQuery {
    constructor(firestore: FakeFirestore, collectionName: string) {
      super(firestore, collectionName);
    }

    doc(id: string): FakeDocumentReference {
      return new FakeDocumentReference(this.firestore, this.collectionName, id);
    }
  }

  class FakeBatch {
    private readonly operations: Array<() => void> = [];

    constructor(private readonly firestore: FakeFirestore) {}

    set(ref: FakeDocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): void {
      this.operations.push(() => this.firestore.setDocument(ref.collectionName, ref.id, data, options));
    }

    update(ref: FakeDocumentReference, data: Record<string, unknown>): void {
      this.operations.push(() => this.firestore.updateDocument(ref.collectionName, ref.id, data));
    }

    async commit(): Promise<void> {
      this.operations.forEach((operation) => operation());
    }
  }

  class FakeTransaction {
    private readonly operations: Array<() => void> = [];

    constructor(private readonly firestore: FakeFirestore) {}

    async get(target: FakeDocumentReference | FakeQuery): Promise<FakeDocumentSnapshot | FakeQuerySnapshot> {
      if (target instanceof FakeDocumentReference) {
        return this.firestore.getDocument(target.collectionName, target.id, target);
      }
      return this.firestore.query(target);
    }

    set(ref: FakeDocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): void {
      this.operations.push(() => this.firestore.setDocument(ref.collectionName, ref.id, data, options));
    }

    update(ref: FakeDocumentReference, data: Record<string, unknown>): void {
      this.operations.push(() => this.firestore.updateDocument(ref.collectionName, ref.id, data));
    }

    commit(): void {
      this.operations.forEach((operation) => operation());
    }
  }

  class FakeFirestore {
    private collections = new Map<string, Map<string, Record<string, unknown>>>();
    private transactionQueue: Promise<void> = Promise.resolve();

    reset(): void {
      this.collections = new Map();
      this.transactionQueue = Promise.resolve();
    }

    collection(name: string): FakeCollectionReference {
      return new FakeCollectionReference(this, name);
    }

    batch(): FakeBatch {
      return new FakeBatch(this);
    }

    async runTransaction<T>(callback: (transaction: FakeTransaction) => Promise<T>): Promise<T> {
      const previous = this.transactionQueue;
      let release = () => undefined;
      this.transactionQueue = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous;
      const transaction = new FakeTransaction(this);
      try {
        const result = await callback(transaction);
        transaction.commit();
        return result;
      } finally {
        release();
      }
    }

    seed(collectionName: string, id: string, data: Record<string, unknown>): void {
      this.setDocument(collectionName, id, data);
    }

    read(collectionName: string, id: string): Record<string, unknown> | undefined {
      return this.collections.get(collectionName)?.get(id);
    }

    count(collectionName: string): number {
      return this.collections.get(collectionName)?.size || 0;
    }

    getDocument(collectionName: string, id: string, ref = new FakeDocumentReference(this, collectionName, id)): FakeDocumentSnapshot {
      const value = this.collections.get(collectionName)?.get(id);
      return new FakeDocumentSnapshot(ref, value);
    }

    setDocument(collectionName: string, id: string, data: Record<string, unknown>, options?: { merge?: boolean }): void {
      const collection = this.ensureCollection(collectionName);
      const existing = collection.get(id);
      collection.set(id, options?.merge && existing ? { ...existing, ...data } : { ...data });
    }

    updateDocument(collectionName: string, id: string, data: Record<string, unknown>): void {
      const collection = this.ensureCollection(collectionName);
      const existing = collection.get(id);
      if (!existing) {
        throw new Error(`Missing document ${collectionName}/${id}`);
      }
      collection.set(id, { ...existing, ...data });
    }

    query(query: FakeQuery): FakeQuerySnapshot {
      const collection = this.collections.get(query.collectionName) || new Map<string, Record<string, unknown>>();
      let docs = Array.from(collection.entries())
        .filter(([, value]) => query.filters.every((filter) => matchesFilter(value, filter)))
        .map(([id, value]) => new FakeDocumentSnapshot(new FakeDocumentReference(this, query.collectionName, id), value));

      if (query.orderField) {
        docs = docs.sort((left, right) => compareValues(left.data()?.[query.orderField!], right.data()?.[query.orderField!]));
      }

      if (query.limitCount !== null) {
        docs = docs.slice(0, query.limitCount);
      }

      return new FakeQuerySnapshot(docs);
    }

    private ensureCollection(collectionName: string): Map<string, Record<string, unknown>> {
      let collection = this.collections.get(collectionName);
      if (!collection) {
        collection = new Map();
        this.collections.set(collectionName, collection);
      }
      return collection;
    }
  }

  function toComparable(value: unknown): unknown {
    return value instanceof FakeTimestamp ? value.toMillis() : value;
  }

  function compareValues(left: unknown, right: unknown): number {
    const comparableLeft = toComparable(left);
    const comparableRight = toComparable(right);
    if (typeof comparableLeft === 'number' && typeof comparableRight === 'number') {
      return comparableLeft - comparableRight;
    }
    return String(comparableLeft).localeCompare(String(comparableRight));
  }

  function matchesFilter(value: Record<string, unknown>, filter: QueryFilter): boolean {
    const left = toComparable(value[filter.field]);
    const right = toComparable(filter.value);
    if (filter.op === '==') {
      return left === right;
    }
    if (typeof left === 'number' && typeof right === 'number') {
      return left <= right;
    }
    return String(left) <= String(right);
  }

  return {
    FakeTimestamp,
    firestore: new FakeFirestore(),
    messaging: {
      sendEachForMulticast: vi.fn(),
    },
  };
});

class TestHttpsError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {},
  Timestamp: testState.FakeTimestamp,
  getFirestore: () => testState.firestore,
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => testState.messaging,
}));

vi.mock('firebase-functions/v2', () => ({
  setGlobalOptions: vi.fn(),
}));

vi.mock('firebase-functions/v2/https', () => ({
  HttpsError: TestHttpsError,
  onCall: (handler: unknown) => handler,
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_schedule: string, handler: unknown) => handler,
}));

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

type FunctionsModule = typeof import('../src/index');

let functionsModule: FunctionsModule;

const accountA = 'account_A';
const accountB = 'account_B';
const sessionId = 'session_1';
const clientId = 'client_1';

function scopedDocId(...parts: string[]): string {
  return Buffer.from(parts.join(':'), 'utf8').toString('base64url');
}

function dueTimestamp(): InstanceType<typeof testState.FakeTimestamp> {
  return testState.FakeTimestamp.fromMillis(Date.now() - 60_000);
}

function futureTimestamp(): InstanceType<typeof testState.FakeTimestamp> {
  return testState.FakeTimestamp.fromMillis(Date.now() + 60_000);
}

function seedEntity(accountId = accountA, version = '1', state: 'active' | 'cancelled' = 'active'): void {
  testState.firestore.seed('notification_entities', scopedDocId(accountId, 'session', sessionId), {
    google_account_id: accountId,
    entity_type: 'session',
    entity_id: sessionId,
    current_version: version,
    notification_state: state,
    updated_at: testState.FakeTimestamp.now(),
  });
}

function seedJob(overrides: Record<string, unknown> = {}, id = 'job_1'): string {
  testState.firestore.seed('notification_jobs', id, {
    google_account_id: accountA,
    type: 'session_log_2min',
    scheduled_at: dueTimestamp(),
    status: 'pending',
    title: 'Session Log Pending',
    body: 'Client: log the session.',
    entity_type: 'session',
    entity_id: sessionId,
    entity_version: '1',
    client_id: clientId,
    dedupe_key: id,
    created_at: testState.FakeTimestamp.now(),
    updated_at: testState.FakeTimestamp.now(),
    delivered_at: null,
    cancelled_at: null,
    skipped_stale_at: null,
    attempt_count: 0,
    last_error: null,
    next_retry_at: null,
    delivery_lock_id: null,
    delivery_locked_at: null,
    ...overrides,
  });
  return id;
}

function seedToken(id: string, accountId: string, token: string, active = true): void {
  testState.firestore.seed('device_tokens', id, {
    google_account_id: accountId,
    google_email: `${accountId}@example.com`,
    device_id: id,
    fcm_token: token,
    platform: 'web',
    user_agent: 'vitest',
    active,
    created_at: testState.FakeTimestamp.now(),
    updated_at: testState.FakeTimestamp.now(),
    last_seen_at: testState.FakeTimestamp.now(),
  });
}

function validJobInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'session_log_2min',
    scheduled_at: new Date(Date.now() + 60_000).toISOString(),
    title: 'Session Log Pending',
    body: 'Client: log the session.',
    entity_type: 'session',
    entity_id: sessionId,
    entity_version: '1',
    client_id: clientId,
    dedupe_key: 'session:session_1:session_log_2min:1',
    ...overrides,
  };
}

async function runScheduler(): Promise<void> {
  await (functionsModule.sendDueNotifications as unknown as () => Promise<void>)();
}

async function callCreateNotificationJob(data: Record<string, unknown>): Promise<unknown> {
  return (functionsModule.createNotificationJob as unknown as (request: { data: Record<string, unknown> }) => Promise<unknown>)({ data });
}

beforeAll(async () => {
  functionsModule = await import('../src/index');
});

beforeEach(() => {
  testState.firestore.reset();
  testState.messaging.sendEachForMulticast.mockReset();
  testState.messaging.sendEachForMulticast.mockResolvedValue({
    successCount: 1,
    responses: [{ success: true, messageId: 'message_1' }],
  });
  (globalThis as { fetch: unknown }).fetch = vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
    const token = init?.headers?.Authorization?.replace('Bearer ', '');
    if (token === 'token_A') {
      return {
        ok: true,
        json: async () => ({ sub: accountA, email: 'a@example.com' }),
      };
    }
    if (token === 'token_B') {
      return {
        ok: true,
        json: async () => ({ sub: accountB, email: 'b@example.com' }),
      };
    }
    return {
      ok: false,
      json: async () => ({}),
    };
  });
});

describe('sendDueNotifications reliability', () => {
  it('skips stale session jobs when entity version has moved forward', async () => {
    seedJob({ entity_version: '1' });
    seedEntity(accountA, '2', 'active');
    seedToken('device_A', accountA, 'token_A');

    await runScheduler();

    expect(testState.messaging.sendEachForMulticast).not.toHaveBeenCalled();
    expect(testState.firestore.read('notification_jobs', 'job_1')?.status).toBe('skipped_stale');
    expect(testState.firestore.read('notification_jobs', 'job_1')?.delivered_at).toBeNull();
  });

  it('skips jobs for cancelled notification entities', async () => {
    seedJob({ type: 'session_log_2hour', entity_version: '1' });
    seedEntity(accountA, '1', 'cancelled');
    seedToken('device_A', accountA, 'token_A');

    await runScheduler();

    expect(testState.messaging.sendEachForMulticast).not.toHaveBeenCalled();
    expect(testState.firestore.read('notification_jobs', 'job_1')?.status).toBe('skipped_stale');
  });

  it('invalidates old jobs after reschedule while keeping the new version pending', async () => {
    seedJob({ entity_version: '1' }, 'job_old');
    seedJob({ entity_version: '2', scheduled_at: futureTimestamp() }, 'job_new');
    seedEntity(accountA, '2', 'active');
    seedToken('device_A', accountA, 'token_A');

    await runScheduler();

    expect(testState.messaging.sendEachForMulticast).not.toHaveBeenCalled();
    expect(testState.firestore.read('notification_jobs', 'job_old')?.status).toBe('skipped_stale');
    expect(testState.firestore.read('notification_jobs', 'job_new')?.status).toBe('pending');
  });

  it('claims jobs transactionally so overlapping scheduler runs deliver only once', async () => {
    seedJob();
    seedEntity(accountA, '1', 'active');
    seedToken('device_A', accountA, 'token_A');

    await Promise.all([
      runScheduler(),
      runScheduler(),
    ]);

    expect(testState.messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(testState.firestore.read('notification_jobs', 'job_1')?.status).toBe('delivered');
  });

  it('keeps transient FCM failures retryable with backoff metadata', async () => {
    const error = new Error('temporary FCM outage') as Error & { code: string };
    error.code = 'messaging/internal-error';
    testState.messaging.sendEachForMulticast.mockRejectedValue(error);
    seedJob();
    seedEntity(accountA, '1', 'active');
    seedToken('device_A', accountA, 'token_A');

    await runScheduler();

    const job = testState.firestore.read('notification_jobs', 'job_1');
    expect(job?.status).toBe('pending');
    expect(job?.attempt_count).toBe(1);
    expect(job?.next_retry_at).toBeInstanceOf(testState.FakeTimestamp);
    expect(job?.last_error).toBe('temporary FCM outage');
  });

  it('deactivates invalid tokens while delivering to valid tokens', async () => {
    testState.messaging.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      responses: [
        {
          success: false,
          error: {
            code: 'messaging/registration-token-not-registered',
            message: 'token expired',
          },
        },
        { success: true, messageId: 'message_1' },
      ],
    });
    seedJob();
    seedEntity(accountA, '1', 'active');
    seedToken('device_invalid', accountA, 'token_invalid');
    seedToken('device_valid', accountA, 'token_valid');

    await runScheduler();

    expect(testState.firestore.read('device_tokens', 'device_invalid')?.active).toBe(false);
    expect(testState.firestore.read('device_tokens', 'device_valid')?.active).toBe(true);
    expect(testState.firestore.read('notification_jobs', 'job_1')?.status).toBe('delivered');
  });

  it('sends only to tokens matching the job google_account_id', async () => {
    seedJob();
    seedEntity(accountA, '1', 'active');
    seedToken('device_A', accountA, 'token_A');
    seedToken('device_B', accountB, 'token_B');

    await runScheduler();

    expect(testState.messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(testState.messaging.sendEachForMulticast.mock.calls[0]?.[0].tokens).toEqual(['token_A']);
  });
});

describe('runtime input validation', () => {
  it.each([
    ['unknown notification type', { jobs: [validJobInput({ type: 'unknown_type' })] }],
    ['missing entity_id', { jobs: [validJobInput({ entity_id: '' })] }],
    ['missing google_account_id', { google_account_id: undefined, jobs: [validJobInput()] }],
    ['invalid scheduled_at', { jobs: [validJobInput({ scheduled_at: 'not-a-date' })] }],
    ['empty title', { jobs: [validJobInput({ title: '   ' })] }],
    ['empty body', { jobs: [validJobInput({ body: '' })] }],
    ['invalid entity_type', { jobs: [validJobInput({ entity_type: 'client' })] }],
    ['malformed payload', null],
  ])('rejects %s without creating notification docs', async (_label, payload) => {
    const data = payload === null
      ? null
      : {
          google_access_token: 'token_A',
          google_account_id: accountA,
          ...payload,
        };

    await expect(callCreateNotificationJob(data as Record<string, unknown>)).rejects.toBeInstanceOf(TestHttpsError);
    expect(testState.firestore.count('notification_jobs')).toBe(0);
    expect(testState.firestore.count('notification_entities')).toBe(0);
  });

  it('rejects mismatched google_account_id before writing Firestore', async () => {
    await expect(callCreateNotificationJob({
      google_access_token: 'token_A',
      google_account_id: accountB,
      jobs: [validJobInput()],
    })).rejects.toMatchObject({ code: 'permission-denied' });

    expect(testState.firestore.count('notification_jobs')).toBe(0);
  });
});
