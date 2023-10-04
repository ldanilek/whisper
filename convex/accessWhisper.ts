import { mutation } from './_generated/server';
import { getValidWhisper, scheduleDeletion } from '../expiration';
import { timingSafeEqual } from './security';
import { v } from 'convex/values';

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
    // @ts-ignore process global doesn't typecheck.
    if (!ssrKey || !timingSafeEqual(ssrKey, process.env.SSR_KEY)) {
      throw Error('must be called from an authorized server');
    }
    const whisperDoc = await getValidWhisper(db, whisperName, true);
    if (!timingSafeEqual(whisperDoc.passwordHash, passwordHash)) {
      throw Error('incorrect password');
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
