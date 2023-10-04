import { mutation } from './_generated/server'
import { getValidWhisper } from '../expiration';
import { timingSafeEqual } from './security';
import { ConvexError, v } from 'convex/values';

export default mutation(
  async ({ db }, 
    {whisperName, accessKey, geolocation, passwordHash}:
    {whisperName: string, 
    accessKey: string, 
    geolocation: string | null, 
    passwordHash: string},
  ) => {
    const whisperDoc = await getValidWhisper(db, whisperName, false);
    if (!timingSafeEqual(whisperDoc.passwordHash, passwordHash)) {
      throw new ConvexError('incorrect password');
    }
    const accessDoc = await db
      .query('accesses')
      .withIndex('by_name_and_key', q => q.eq('name', whisperName).eq('accessKey', accessKey))
      .unique();
    await db.patch(accessDoc!._id, {
      geolocation,
    });
  }
)

export const forFailure = mutation({
  args: { whisperName: v.string(), accessKey: v.string(), geolocation: v.union(v.string(), v.null())},
  handler: async ({db}, {whisperName, accessKey, geolocation}) => {
    // NOTE we don't call `getValidWhisper` because it might not be valid.
    // Use the accessKey to authenticate.
    const accessDoc = await db
      .query('accessFailures')
      .withIndex('by_name_and_key', q => q.eq('name', whisperName).eq('accessKey', accessKey))
      .unique();
    await db.patch(accessDoc!._id, {
      geolocation,
    });
  },
});
