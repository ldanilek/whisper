import { query } from './_generated/server'
import { getValidWhisper, readExpiration } from '../expiration';
import { Document } from './_generated/dataModel';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query(async ({ db }, name: string, creatorKey: string, currentTime: number): Promise<[string, number | null]> => {
  const whisperDoc = await db
    .table('whispers')
    .index('by_name').range((q) => q.eq('name', name))
    .unique();
  if (whisperDoc.creatorKey !== creatorKey) {
    throw Error('invalid creator key');
  }
  return readExpiration(db, name);
});
