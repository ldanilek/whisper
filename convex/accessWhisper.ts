import { mutation } from './_generated/server';
import { getValidWhisper, scheduleDeletion } from '../expiration';
import { timingSafeEqual } from './security';
import { ConvexError, v } from 'convex/values';

export default mutation({
  args: {
    whisperName: v.string(),
    passwordHash: v.string(),
    accessKey: v.string(),
    ip: v.union(v.string(), v.null()), // from HTTP handler, to impede spoofing
    ssrKey: v.optional(v.any()), // can only be called from authorized servers
  },
  handler: async (
    { db, scheduler },
    { whisperName, passwordHash, accessKey, ip, ssrKey }
  ) => {
    let whisperDoc;
    try {
      if (!ssrKey || !timingSafeEqual(ssrKey, process.env.SSR_KEY!)) {
        throw new ConvexError('must be called from an authorized server');
      }
      whisperDoc = await getValidWhisper(db, whisperName, true);
      if (!timingSafeEqual(whisperDoc.passwordHash, passwordHash)) {
        throw new ConvexError('incorrect password');
      }
    } catch (e: unknown) {
      if (e instanceof ConvexError) {
        await db.insert('accessFailures', {
          name: whisperName,
          accessKey,
          reason: e.data,
          geolocation: null,
          ip,
        });
        return e.data;
      }
      throw e;
    }
    await db.insert('accesses', {
      name: whisperName,
      accessKey,
      geolocation: null,
      ip,
    });
    await scheduleDeletion(scheduler, db, whisperName, whisperDoc.creatorKey);
  },
});
