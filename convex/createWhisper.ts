import { mutation } from './_generated/server';
import { scheduleDeletion, validateExpirationInput } from '../expiration';
import { ConvexError, v } from 'convex/values';

export default mutation({
  args: {
    whisperName: v.string(),
    encryptedSecret: v.string(),
    encryptedSender: v.string(),
    storageIds: v.array(v.string()),
    passwordHash: v.string(),
    creatorKey: v.string(),
    expiration: v.string(),
    expiresAt: v.optional(v.number()),
    maxAccesses: v.optional(v.number()),
    requestGeolocation: v.boolean(),
  },
  handler: async (
    { db, scheduler },
    {
      whisperName,
      encryptedSecret,
      encryptedSender,
      storageIds,
      passwordHash,
      creatorKey,
      expiration,
      expiresAt,
      maxAccesses,
      requestGeolocation,
    }
  ) => {
    validateExpirationInput(
      expiration,
      { expiresAt, maxAccesses },
      new Date().getTime()
    );
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
      encryptedSender,
      storageIds,
      passwordHash,
      creatorKey,
      expiration,
      expiresAt,
      maxAccesses,
      requestGeolocation,
    });
    await scheduleDeletion(scheduler, db, whisperName, creatorKey);
  },
});
