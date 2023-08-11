import { query } from './_generated/server'
import { readExpiration } from '../expiration';
import { timingSafeEqual } from './security';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query(async ({ db }, {name, passwordHash, currentTime}: {name: string, passwordHash: string, currentTime: number}): Promise<[string, number | null, boolean]> => {
  throw new Error("Injected2");
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', q => q.eq('name', name))
    .unique();
  if (!timingSafeEqual(whisperDoc!.passwordHash, passwordHash)) {
    throw Error('invalid password hash');
  }
  return readExpiration(db, name);
});
