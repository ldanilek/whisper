import { mutation } from './_generated/server'
import { directExpirationOption, getValidWhisper } from '../expiration'

export default mutation(
  async ({ db }, whisperName: string, creatorKey: string): Promise<void> => {
    let whisperDoc;
    try {
      whisperDoc = await getValidWhisper(db, whisperName, false);
    } catch (e) {
      // Expired. Delete the encrypted secret.
      whisperDoc = await db
        .query('whispers')
        .withIndex('by_name', q => q.eq('name', whisperName))
        .unique();
      if (whisperDoc!.creatorKey !== creatorKey) {
        throw Error('invalid creator key');
      }
      await db.patch(whisperDoc!._id, {
        encryptedSecret: "",
      });
      return;
    }
    if (whisperDoc!.creatorKey !== creatorKey) {
      throw Error('invalid creator key');
    }
    await db.patch(whisperDoc!._id, {
      expiration: directExpirationOption,
    })
  }
)
