import { query } from './_generated/server'
import { readExpiration } from '../expiration';
import { timingSafeEqual } from './security';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query(async ({ db }, name: string, creatorKey: string, currentTime: number): Promise<[string, number | null, boolean]> => {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', q => q.eq('name', name))
    .unique();
  if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
    throw Error('invalid creator key');
  }
  return readExpiration(db, name);
});
