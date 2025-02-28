import { query } from './_generated/server';
import { getValidWhisper } from '../expiration';
import { timingSafeEqual } from './security';
import { ConvexError, v } from 'convex/values';

export default query({
  args: {
    whisperName: v.string(),
    accessKey: v.string(),
    passwordHash: v.string(),
  },
  returns: v.object({
    encryptedSecret: v.string(),
    storageURLs: v.record(v.string(), v.union(v.string(), v.null())),
  }),
  handler: async (
    { db, storage },
    { whisperName, accessKey, passwordHash }
  ) => {
    const whisperDoc = await getValidWhisper(db, whisperName, false);
    if (!timingSafeEqual(whisperDoc.passwordHash, passwordHash)) {
      throw new ConvexError('incorrect password');
    }
    const accessDoc = await db
      .query('accesses')
      .withIndex('by_name_and_key', (q) =>
        q.eq('name', whisperName).eq('accessKey', accessKey)
      )
      .unique();
    if (!accessDoc) {
      throw new Error('accessKey invalid');
    }
    const storageURLs = await Promise.all(
      (whisperDoc.storageIds ?? []).map(
        async (storageId: string): Promise<[string, string | null]> => {
          return [storageId, await storage.getUrl(storageId)];
        }
      )
    );
    return {
      encryptedSecret: whisperDoc.encryptedSecret,
      storageURLs: Object.fromEntries(storageURLs),
    };
  },
});
