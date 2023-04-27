import { mutation } from './_generated/server'
import { scheduleDeletion } from "../expiration"

export default mutation(
  async ({ db, scheduler },
    {whisperName, encryptedSecret, storageIds, passwordHash, creatorKey, expiration}:
    {whisperName: string,
    encryptedSecret: string,
    storageIds: string[],
    passwordHash: string,
    creatorKey: string,
    expiration: string},
  ) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', q => q.eq('name', whisperName))
      .unique();
    if (whisperDoc !== null) {
      throw Error('whisper already exists');
    }
    await db.insert('whispers', {
      name: whisperName,
      encryptedSecret,
      storageIds,
      passwordHash,
      creatorKey,
      expiration,
    });
    await scheduleDeletion(scheduler, db, whisperName, creatorKey);
  }
)
