import { mutation } from './_generated/server'
import { directExpirationOption, getValidWhisper } from '../expiration'

export default mutation(
  async ({ db }, whisperName: string, creatorKey: string): Promise<void> => {
    const whisperDoc = await getValidWhisper(db, whisperName, false);
    if (whisperDoc!.creatorKey !== creatorKey) {
      throw Error('invalid creator key');
    }
    await db.patch(whisperDoc!._id, {
      expiration: directExpirationOption,
    })
  }
)
