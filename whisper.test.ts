import { convexTest } from 'convex-test';
import { test, expect } from 'vitest';
import { api } from './convex/_generated/api';
import schema from './convex/schema';

// @ts-expect-error import.meta.glob types
export const modules = import.meta.glob('./convex/**/!(*.*.*)*.*s');

process.env.SSR_KEY = 'test-ssr-key';

test('full whisper flow', async () => {
  const t = convexTest(schema, modules);

  // Test data
  const whisperName = 'test-whisper';
  const encryptedSecret = 'encrypted-data';
  const encryptedSender = 'encrypted-sender';
  const passwordHash = 'hashed-password';
  const creatorKey = 'creator123';
  const accessKey = 'access123';
  const expiration = 'after one access';

  // Create whisper
  await t.mutation(api.createWhisper.default, {
    whisperName,
    encryptedSecret,
    encryptedSender,
    storageIds: [],
    passwordHash,
    creatorKey,
    expiration,
    requestGeolocation: true,
  });

  // Access whisper
  await t.mutation(api.accessWhisper.default, {
    whisperName,
    passwordHash,
    accessKey,
    ip: '127.0.0.1',
    ssrKey: process.env.SSR_KEY || 'test-ssr-key',
  });

  // Read secret
  const result = await t.query(api.readSecret.default, {
    whisperName,
    accessKey,
    passwordHash,
  });

  expect(result.encryptedSecret).toBe(encryptedSecret);
  expect(result.encryptedSender).toBe(encryptedSender);
  expect(result.storageURLs).toEqual({});
});

test('readSecret returns one attached file', async () => {
  const t = convexTest(schema, modules);
  const storageId = await t.run(async (ctx) => {
    return await ctx.storage.store(new Blob(['solo']));
  });

  await t.mutation(api.createWhisper.default, {
    whisperName: 'one-file',
    encryptedSecret: 'encrypted-data',
    encryptedSender: 'encrypted-sender',
    storageIds: [storageId],
    passwordHash: 'hashed-password',
    creatorKey: 'creator123',
    expiration: 'never',
    requestGeolocation: false,
  });
  await t.mutation(api.accessWhisper.default, {
    whisperName: 'one-file',
    passwordHash: 'hashed-password',
    accessKey: 'access-one',
    ip: '127.0.0.1',
    ssrKey: process.env.SSR_KEY || 'test-ssr-key',
  });

  const result = await t.query(api.readSecret.default, {
    whisperName: 'one-file',
    accessKey: 'access-one',
    passwordHash: 'hashed-password',
  });

  expect(Object.keys(result.storageURLs)).toEqual([storageId]);
  expect(result.storageURLs[storageId]).toEqual(expect.any(String));
});

test('readSecret returns every attached file', async () => {
  const t = convexTest(schema, modules);
  const storageIds = await t.run(async (ctx) => {
    return await Promise.all([
      ctx.storage.store(new Blob(['one'])),
      ctx.storage.store(new Blob(['two'])),
      ctx.storage.store(new Blob(['three'])),
    ]);
  });

  await t.mutation(api.createWhisper.default, {
    whisperName: 'multi-file',
    encryptedSecret: 'encrypted-data',
    encryptedSender: 'encrypted-sender',
    storageIds,
    passwordHash: 'hashed-password',
    creatorKey: 'creator123',
    expiration: 'never',
    requestGeolocation: false,
  });
  await t.mutation(api.accessWhisper.default, {
    whisperName: 'multi-file',
    passwordHash: 'hashed-password',
    accessKey: 'access-multi',
    ip: '127.0.0.1',
    ssrKey: process.env.SSR_KEY || 'test-ssr-key',
  });

  const result = await t.query(api.readSecret.default, {
    whisperName: 'multi-file',
    accessKey: 'access-multi',
    passwordHash: 'hashed-password',
  });

  expect(Object.keys(result.storageURLs).sort()).toEqual(
    [...storageIds].sort()
  );
  for (const storageId of storageIds) {
    expect(result.storageURLs[storageId]).toEqual(expect.any(String));
  }
});

test('expiring a whisper deletes every attachment', async () => {
  const t = convexTest(schema, modules);
  const storageIds = await t.run(async (ctx) => {
    return await Promise.all([
      ctx.storage.store(new Blob(['one'])),
      ctx.storage.store(new Blob(['two'])),
    ]);
  });
  const whisperName = 'expire-files';
  const creatorKey = 'creator123';
  await t.mutation(api.createWhisper.default, {
    whisperName,
    encryptedSecret: 'encrypted-data',
    encryptedSender: 'encrypted-sender',
    storageIds,
    passwordHash: 'hashed-password',
    creatorKey,
    expiration: 'never',
    requestGeolocation: false,
  });

  await t.mutation(api.expireNow.default, { whisperName, creatorKey });
  await t.mutation(api.deleteExpired.default, { whisperName, creatorKey });

  const afterDelete = await t.run(async (ctx) => {
    const whisper = await ctx.db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', whisperName))
      .unique();
    const urls = await Promise.all(
      storageIds.map((storageId) => ctx.storage.getUrl(storageId))
    );
    return { encryptedSecret: whisper?.encryptedSecret, urls };
  });
  expect(afterDelete.encryptedSecret).toBe('');
  expect(afterDelete.urls).toEqual([null, null]);
});
