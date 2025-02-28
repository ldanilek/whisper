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
  const passwordHash = 'hashed-password';
  const creatorKey = 'creator123';
  const accessKey = 'access123';
  const expiration = 'after one access';

  // Create whisper
  await t.mutation(api.createWhisper.default, {
    whisperName,
    encryptedSecret,
    storageIds: [],
    passwordHash,
    creatorKey,
    expiration,
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
  expect(result.storageURLs).toEqual({});
});
