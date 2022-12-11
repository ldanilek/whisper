import { mutation } from './_generated/server'
import { directExpirationOption } from '../expiration'

export default mutation(
  async ({ db }, whisperName: string, creatorKey: string) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', whisperName))
      .unique();
    if (whisperDoc!.creatorKey !== creatorKey) {
      throw Error('invalid creator key');
    }
    db.patch(whisperDoc!._id, {
      expiration: directExpirationOption,
    })
  }
)
