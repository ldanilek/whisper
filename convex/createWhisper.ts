import { mutation } from './_generated/server';
import { scheduleDeletion } from '../expiration';
import { ConvexError, v } from 'convex/values';

export default mutation({
  args: {
    whisperName: v.string(),
    encryptedSecret: v.string(),
    storageIds: v.array(v.string()),
    passwordHash: v.string(),
    creatorKey: v.string(),
    expiration: v.string(),
    requestGeolocation: v.boolean(),
  },
  handler: async (
    { db, scheduler },
    {
      whisperName,
      encryptedSecret,
      storageIds,
      passwordHash,
      creatorKey,
      expiration,
      requestGeolocation,
    }
  ) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', whisperName))
      .unique();
    if (whisperDoc !== null) {
      throw new ConvexError('whisper already exists');
    }
    await db.insert('whispers', {
      name: whisperName,
      encryptedSecret,
      storageIds,
      passwordHash,
      creatorKey,
      expiration,
      requestGeolocation,
    });
    await scheduleDeletion(scheduler, db, whisperName, creatorKey);
  },
});
