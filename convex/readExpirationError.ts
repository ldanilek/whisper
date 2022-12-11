import { query } from './_generated/server'
import { getValidWhisper, readExpiration } from '../expiration';
import { Document } from './_generated/dataModel';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query(async ({ db }, name: string, passwordHash: string, currentTime: number): Promise<[string, number | null]> => {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', (q) => q.eq('name', name))
    .unique();
  if (whisperDoc!.passwordHash !== passwordHash) {
    throw Error('invalid password hash');
  }
  return readExpiration(db, name);
});
