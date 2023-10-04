import { query } from './_generated/server'
import { readExpiration } from '../expiration';
import { timingSafeEqual } from './security';
import { ConvexError } from 'convex/values';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query(async ({ db }, {name, creatorKey, currentTime}: {name: string, creatorKey: string, currentTime: number}): Promise<[string, number | null, boolean]> => {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', q => q.eq('name', name))
    .unique();
  if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
    throw new ConvexError('invalid creator key');
  }
  return readExpiration(db, name);
});
