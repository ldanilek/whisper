import { convexTest, TestConvex } from 'convex-test';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api } from './convex/_generated/api';
import schema from './convex/schema';
import {
  afterAccessesOption,
  atTimeOption,
  atTimeOrAfterAccessesOption,
  ExpirationLimits,
  presetCombinedOption,
} from './expiration';

// @ts-expect-error import.meta.glob types
const modules = import.meta.glob('./convex/**/!(*.*.*)*.*s');

process.env.SSR_KEY = 'test-ssr-key';

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;
const passwordHash = 'hashed-password';
const creatorKey = 'creator123';

type WhisperTest = TestConvex<typeof schema>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

async function storeFiles(t: WhisperTest, count: number): Promise<string[]> {
  return await t.run(async (ctx) => {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(await ctx.storage.store(new Blob([`file ${i}`])));
    }
    return ids;
  });
}

async function create(
  t: WhisperTest,
  whisperName: string,
  expiration: string,
  limits: ExpirationLimits = {},
  storageIds: string[] = []
) {
  await t.mutation(api.createWhisper.default, {
    whisperName,
    encryptedSecret: 'encrypted-data',
    encryptedSender: 'encrypted-sender',
    storageIds,
    passwordHash,
    creatorKey,
    expiration,
    ...limits,
    requestGeolocation: false,
  });
}

async function access(
  t: WhisperTest,
  whisperName: string,
  accessKey: string
): Promise<string | null> {
  const { accessError } = await t.mutation(api.accessWhisper.default, {
    whisperName,
    passwordHash,
    accessKey,
    ip: '127.0.0.1',
    ssrKey: process.env.SSR_KEY,
  });
  return accessError;
}

async function readSecret(
  t: WhisperTest,
  whisperName: string,
  accessKey: string
) {
  return await t.query(api.readSecret.default, {
    whisperName,
    accessKey,
    passwordHash,
  });
}

async function readExpiration(t: WhisperTest, name: string) {
  return await t.query(api.readExpiration.default, {
    name,
    creatorKey,
    currentTime: new Date().getTime(),
  });
}

async function storedContent(
  t: WhisperTest,
  whisperName: string,
  storageIds: string[]
) {
  return await t.run(async (ctx) => {
    const whisper = await ctx.db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', whisperName))
      .unique();
    const urls = await Promise.all(
      storageIds.map((storageId) => ctx.storage.getUrl(storageId))
    );
    return { encryptedSecret: whisper!.encryptedSecret, urls };
  });
}

async function advance(t: WhisperTest, ms: number) {
  vi.advanceTimersByTime(ms);
  await t.finishInProgressScheduledFunctions();
}

test('expires at a specific date and time', async () => {
  const t = convexTest(schema, modules);
  const storageIds = await storeFiles(t, 2);
  const expiresAt = new Date().getTime() + 3 * hour;
  await create(t, 'at-time', atTimeOption, { expiresAt }, storageIds);

  expect(await access(t, 'at-time', 'a1')).toBeNull();
  expect(await access(t, 'at-time', 'a2')).toBeNull();
  expect((await readSecret(t, 'at-time', 'a1')).encryptedSecret).toBe(
    'encrypted-data'
  );
  expect((await readExpiration(t, 'at-time'))[0]).toBe(
    'will expire in 3 hours'
  );

  await advance(t, 3 * hour - minute);
  expect(await access(t, 'at-time', 'a3')).toBeNull();

  await advance(t, minute);
  expect(await access(t, 'at-time', 'late')).toBe('expired 0 seconds ago');
  await expect(readSecret(t, 'at-time', 'a1')).rejects.toThrow(/expired/);
  expect(await readExpiration(t, 'at-time')).toEqual([
    'expired 0 seconds ago',
    expect.any(Number),
    true,
  ]);
  expect(await storedContent(t, 'at-time', storageIds)).toEqual({
    encryptedSecret: '',
    urls: [null, null],
  });
});

test('expires after a custom number of accesses', async () => {
  const t = convexTest(schema, modules);
  const storageIds = await storeFiles(t, 1);
  await create(t, 'count', afterAccessesOption, { maxAccesses: 4 }, storageIds);

  for (const key of ['a1', 'a2', 'a3']) {
    expect(await access(t, 'count', key)).toBeNull();
  }
  expect((await readExpiration(t, 'count'))[0]).toBe(
    'will expire after 1 more access'
  );
  expect(await access(t, 'count', 'a4')).toBeNull();
  expect(await access(t, 'count', 'a5')).toBe('already accessed 4 times');
  expect((await readExpiration(t, 'count'))[0]).toBe(
    'expired after 4 accesses'
  );

  // Viewers who were already let in keep their page until the cleanup runs.
  expect((await readSecret(t, 'count', 'a4')).encryptedSecret).toBe(
    'encrypted-data'
  );
  await expect(readSecret(t, 'count', 'a5')).rejects.toThrow(
    'accessKey invalid'
  );

  await advance(t, day);
  expect(await storedContent(t, 'count', storageIds)).toEqual({
    encryptedSecret: '',
    urls: [null],
  });
});

test('concurrent accesses cannot exceed the access limit', async () => {
  const t = convexTest(schema, modules);
  await create(t, 'race', afterAccessesOption, { maxAccesses: 3 });

  const results = await Promise.all(
    ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((key) => access(t, 'race', key))
  );

  expect(results.filter((error) => error === null)).toHaveLength(3);
  expect(results.filter((error) => error !== null)).toEqual([
    'already accessed 3 times',
    'already accessed 3 times',
    'already accessed 3 times',
  ]);
  const accessCount = await t.run(async (ctx) => {
    const accesses = await ctx.db
      .query('accesses')
      .withIndex('by_name_and_key', (q) => q.eq('name', 'race'))
      .collect();
    return accesses.length;
  });
  expect(accessCount).toBe(3);
});

test('combined expiration ends at the access limit when it comes first', async () => {
  const t = convexTest(schema, modules);
  const storageIds = await storeFiles(t, 1);
  const expiresAt = new Date().getTime() + 2 * hour;
  await create(
    t,
    'combo-count',
    atTimeOrAfterAccessesOption,
    { expiresAt, maxAccesses: 2 },
    storageIds
  );
  expect((await readExpiration(t, 'combo-count'))[0]).toBe(
    'will expire in 2 hours or after 2 more accesses, whichever is first'
  );

  expect(await access(t, 'combo-count', 'a1')).toBeNull();
  await advance(t, 10 * minute);
  expect(await access(t, 'combo-count', 'a2')).toBeNull();
  expect(await access(t, 'combo-count', 'a3')).toBe('already accessed 2 times');
  expect((await readExpiration(t, 'combo-count'))[0]).toBe(
    'expired after 2 accesses'
  );
  expect((await readSecret(t, 'combo-count', 'a2')).encryptedSecret).toBe(
    'encrypted-data'
  );

  // The time limit still cuts the one-day grace period for existing viewers.
  await advance(t, 2 * hour - 10 * minute);
  await expect(readSecret(t, 'combo-count', 'a2')).rejects.toThrow(/expired/);
  expect(await storedContent(t, 'combo-count', storageIds)).toEqual({
    encryptedSecret: '',
    urls: [null],
  });
});

test('combined expiration ends at the date and time when it comes first', async () => {
  const t = convexTest(schema, modules);
  const storageIds = await storeFiles(t, 2);
  const expiresAt = new Date().getTime() + hour;
  await create(
    t,
    'combo-time',
    atTimeOrAfterAccessesOption,
    { expiresAt, maxAccesses: 5 },
    storageIds
  );

  expect(await access(t, 'combo-time', 'a1')).toBeNull();
  expect((await readExpiration(t, 'combo-time'))[0]).toBe(
    'will expire in 1 hour or after 4 more accesses, whichever is first'
  );

  await advance(t, hour + 30 * 1000);
  expect(await access(t, 'combo-time', 'a2')).toBe('expired 30 seconds ago');
  await expect(readSecret(t, 'combo-time', 'a1')).rejects.toThrow(/expired/);
  expect(await storedContent(t, 'combo-time', storageIds)).toEqual({
    encryptedSecret: '',
    urls: [null, null],
  });
});

test('preset expires after 3 accesses', async () => {
  const t = convexTest(schema, modules);
  await create(t, 'preset-count', presetCombinedOption);
  expect((await readExpiration(t, 'preset-count'))[0]).toBe(
    'will expire in 2 days or after 3 more accesses, whichever is first'
  );
  for (const key of ['a1', 'a2', 'a3']) {
    expect(await access(t, 'preset-count', key)).toBeNull();
  }
  expect(await access(t, 'preset-count', 'a4')).toBe(
    'already accessed 3 times'
  );
});

test('preset expires in 2 days', async () => {
  const t = convexTest(schema, modules);
  await create(t, 'preset-time', presetCombinedOption);
  expect(await access(t, 'preset-time', 'a1')).toBeNull();
  await advance(t, 2 * day);
  expect(await access(t, 'preset-time', 'a2')).toBe('expired after 2 days');
  await expect(readSecret(t, 'preset-time', 'a1')).rejects.toThrow(
    'expired after 2 days'
  );
  expect((await storedContent(t, 'preset-time', [])).encryptedSecret).toBe('');
});

test('manual expiration still overrides custom limits', async () => {
  const t = convexTest(schema, modules);
  await create(t, 'manual', atTimeOrAfterAccessesOption, {
    expiresAt: new Date().getTime() + day,
    maxAccesses: 10,
  });
  expect(await access(t, 'manual', 'a1')).toBeNull();
  await t.mutation(api.expireNow.default, {
    whisperName: 'manual',
    creatorKey,
  });
  await advance(t, 0);
  expect(await access(t, 'manual', 'a2')).toBe('manually expired');
  await expect(readSecret(t, 'manual', 'a1')).rejects.toThrow(
    'manually expired'
  );
});

test('whispers stored before custom expirations keep working', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (const [name, expiration] of [
      ['legacy-count', 'after one access'],
      ['legacy-time', 'after five minutes'],
    ]) {
      await ctx.db.insert('whispers', {
        name,
        encryptedSecret: 'encrypted-data',
        encryptedSender: 'encrypted-sender',
        passwordHash,
        creatorKey,
        expiration,
      });
    }
  });

  expect(await access(t, 'legacy-count', 'a1')).toBeNull();
  expect(await access(t, 'legacy-count', 'a2')).toBe('already accessed 1 time');
  expect(await access(t, 'legacy-time', 'b1')).toBeNull();
  expect((await readExpiration(t, 'legacy-time'))[0]).toBe(
    'will expire in 5 minutes'
  );
  await advance(t, 5 * minute + 1000);
  expect(await access(t, 'legacy-time', 'b2')).toBe('expired after 5 minutes');
});

test.each([
  [afterAccessesOption, {}, 'number of accesses must be a positive integer'],
  [
    afterAccessesOption,
    { maxAccesses: 0 },
    'number of accesses must be a positive integer',
  ],
  [
    afterAccessesOption,
    { maxAccesses: -3 },
    'number of accesses must be a positive integer',
  ],
  [
    afterAccessesOption,
    { maxAccesses: 2.5 },
    'number of accesses must be a positive integer',
  ],
  [
    afterAccessesOption,
    { maxAccesses: NaN },
    'number of accesses must be a positive integer',
  ],
  [
    afterAccessesOption,
    { maxAccesses: 1001 },
    'number of accesses must be at most 1000',
  ],
  [atTimeOption, {}, 'choose a valid expiration date and time'],
  [
    atTimeOption,
    { expiresAt: new Date('2025-12-31T23:59:00Z').getTime() },
    'expiration date and time must be in the future',
  ],
  [
    atTimeOption,
    { expiresAt: new Date('2026-01-01T00:00:00Z').getTime() },
    'expiration date and time must be in the future',
  ],
  [
    atTimeOption,
    { expiresAt: new Date('2027-01-02T00:00:00Z').getTime() },
    'expiration date and time must be within one year',
  ],
  [
    atTimeOrAfterAccessesOption,
    { expiresAt: new Date('2026-01-02T00:00:00Z').getTime() },
    'number of accesses must be a positive integer',
  ],
  [
    atTimeOrAfterAccessesOption,
    { maxAccesses: 3 },
    'choose a valid expiration date and time',
  ],
  ['never', { maxAccesses: 3 }, "expiration 'never' does not take"],
  [
    presetCombinedOption,
    { expiresAt: new Date('2026-01-02T00:00:00Z').getTime() },
    'does not take a date',
  ],
  ['after a fortnight', {}, "unrecognized expiration 'after a fortnight'"],
  ['manually expired', {}, "unrecognized expiration 'manually expired'"],
] as [string, ExpirationLimits, string][])(
  'createWhisper rejects %s with %o',
  async (expiration, limits, message) => {
    const t = convexTest(schema, modules);
    await expect(create(t, 'invalid', expiration, limits)).rejects.toThrow(
      message
    );
    const stored = await t.run(async (ctx) => {
      return await ctx.db.query('whispers').collect();
    });
    expect(stored).toEqual([]);
  }
);
