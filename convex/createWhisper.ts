import { mutation } from './_generated/server'
import { estimatedExpiration, readExpiration } from "../expiration"

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
    const expireTime = await estimatedExpiration(db, whisperName);
    if (expireTime !== null) {
      await scheduler.runAt(expireTime, "expireNow", whisperName, creatorKey);
    }
  }
)
