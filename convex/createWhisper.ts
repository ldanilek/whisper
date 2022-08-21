import { mutation } from './_generated/server'

export default mutation(
  async ({ db }, whisperName: string, encryptedSecret: string, passwordHash: string, creatorKey: string, expiration: string) => {
    const whisperDoc = await db
      .table('whispers')
      .index('by_name').range((q) => q.eq('name', whisperName))
      .first();
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
