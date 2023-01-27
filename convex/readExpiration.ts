import { query } from './_generated/server'
import { readExpiration } from '../expiration';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query(async ({ db }, name: string, creatorKey: string, currentTime: number): Promise<[string, number | null]> => {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', (q) => q.eq('name', name))
    .unique();
  if (whisperDoc!.creatorKey !== creatorKey) {
    throw Error('invalid creator key');
  }
  return readExpiration(db, name);
});
