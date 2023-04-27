import { mutation } from './_generated/server'
import { directExpirationOption, getValidWhisper, scheduleDeletion } from '../expiration'
import { timingSafeEqual } from './security';

export default mutation(
  async ({ db, scheduler }, {whisperName, creatorKey}: {whisperName: string, creatorKey: string}): Promise<void> => {
    const whisperDoc = await getValidWhisper(db, whisperName, false);
    if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
      throw Error('invalid creator key');
    }
    await db.patch(whisperDoc!._id, {
      expiration: directExpirationOption,
    })
    await scheduleDeletion(scheduler, db, whisperName, creatorKey);
  }
)
