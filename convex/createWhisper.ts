import { mutation } from './_generated/server'
import { whenShouldDelete, readExpiration } from "../expiration"

export default mutation(
  async ({ db, scheduler }, whisperName: string, encryptedSecret: string, passwordHash: string, creatorKey: string, expiration: string) => {
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
      passwordHash,
      creatorKey,
      expiration,
    });
    const expireTime = await whenShouldDelete(db, whisperName);
    if (expireTime) {
      await scheduler.runAt(expireTime, "deleteExpired", whisperName, creatorKey);
    }
  }
)
