import { query } from './_generated/server'
import { getValidWhisper } from '../expiration';
import { timingSafeEqual } from './security';

export default query(async ({ db, storage },
  {whisperName, accessKey, passwordHash}:
  {whisperName: string,
  accessKey: string,
  passwordHash: string},
): Promise<{encryptedSecret: string, storageURLs: Record<string, string | null>}> => {
  const whisperDoc = await getValidWhisper(db, whisperName, false);
  if (!timingSafeEqual(whisperDoc.passwordHash, passwordHash)) {
    throw Error('incorrect password');
  }
  const accessDoc = await db
    .query('accesses')
    .withIndex('by_name_and_key', q => q.eq('name', whisperName).eq('accessKey', accessKey))
    .unique();
  if (!accessDoc) {
    throw new Error("accessKey invalid");
  }
  const storageURLs = await Promise.all((whisperDoc.storageIds ?? []).map(
    async (storageId: string): Promise<[string, string | null]> => {
      return [storageId, await storage.getUrl(storageId)];
    }
  ));
  return {
    encryptedSecret: whisperDoc.encryptedSecret,
    storageURLs: Object.fromEntries(storageURLs),
  };
})
