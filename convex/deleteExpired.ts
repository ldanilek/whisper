import { mutation } from './_generated/server'
import { whenShouldDelete, scheduleDeletion } from '../expiration'
import { timingSafeEqual } from './security';

export default mutation(
  async ({ db, scheduler }, whisperName: string, creatorKey: string): Promise<void> => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', q => q.eq('name', whisperName))
      .unique();
    if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
      throw Error('invalid creator key');
    }
    const toDelete = await whenShouldDelete(db, whisperName);
    if (!toDelete) {
      // Doesn't expire.
      return;
    }
    if (whisperDoc!.encryptedSecret.length === 0) {
      // Already deleted.
      return;
    }
    if (toDelete <= new Date()) {
      // Expired. Delete the encrypted secret.
      await db.patch(whisperDoc!._id, {
        encryptedSecret: "",
      });
    } else {
      // Schedule to delete when it will expire.
      await scheduleDeletion(scheduler, db, whisperName, creatorKey);
    }
  }
)
