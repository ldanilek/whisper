import { mutation } from './_generated/server'

export default mutation(
  async ({ db }, whisperName: string, encryptedSecret: string, passwordHash: string, creatorKey: string, expiration: string) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', whisperName))
      .unique();
    if (whisperDoc !== null) {
      throw Error('whisper already exists');
    }
    db.insert('whispers', {
      name: whisperName,
      encryptedSecret,
      passwordHash,
      creatorKey,
      expiration,
    });
  }
)
