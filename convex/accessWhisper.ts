import { DatabaseWriter, mutation } from './_generated/server';
import {
  countInvalidAccesses,
  failedAccesses,
  getValidWhisper,
  maxAccessFailures,
  scheduleDeletion,
} from '../expiration';
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
        await registerAccessFailure(db, whisperName, e.data, accessKey, ip);
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
    console.info(`whisper authorized access from ${ip}`);
    await scheduleDeletion(scheduler, db, whisperName, whisperDoc.creatorKey);
  },
});

const registerAccessFailure = async (
  db: DatabaseWriter,
  whisperName: string,
  reason: string,
  accessKey: string,
  ip: string | null
) => {
  console.warn(`whisper unauthorized access from ${ip}: ${reason}`);
  await db.insert('accessFailures', {
    name: whisperName,
    accessKey,
    reason,
    geolocation: null,
    ip,
  });
  const accessFailures = await countInvalidAccesses(db, whisperName);
  if (accessFailures >= maxAccessFailures) {
    try {
      const whisperDoc = await getValidWhisper(db, whisperName, true);
      await db.patch(whisperDoc._id, {
        expiration: failedAccesses,
      });
    } catch (e: unknown) {
      // if the whisper has already expired, we're done.
    }
  }
};
