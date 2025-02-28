import { query } from './_generated/server'
import { readExpiration } from '../expiration';
import { timingSafeEqual } from './security';
import { ConvexError, v } from 'convex/values';

// Returns description of when the whisper expires, and a timestamp of when to next check.
// Input currentTime invalidates the cache.
export default query({
  args: {name: v.string(), creatorKey: v.string(), currentTime: v.number()},
  handler: async ({ db }, {name, creatorKey, currentTime}) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', q => q.eq('name', name))
      .unique();
    if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
      throw new ConvexError('invalid creator key');
    }
    return readExpiration(db, name);
  },
});
