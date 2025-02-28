import { mutation } from './_generated/server';
import {
  directExpirationOption,
  getValidWhisper,
  scheduleDeletion,
} from '../expiration';
import { timingSafeEqual } from './security';
import { ConvexError, v } from 'convex/values';

export default mutation({
  args: { whisperName: v.string(), creatorKey: v.string() },
  handler: async (
    { db, scheduler },
    { whisperName, creatorKey }
  ): Promise<void> => {
    const whisperDoc = await getValidWhisper(db, whisperName, false);
    if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
      throw new ConvexError('invalid creator key');
    }
    await db.patch(whisperDoc!._id, {
      expiration: directExpirationOption,
    });
    await scheduleDeletion(scheduler, db, whisperName, creatorKey);
  },
});
