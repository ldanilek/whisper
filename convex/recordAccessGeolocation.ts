import { mutation } from './_generated/server'
import { getValidWhisper } from '../expiration';

export default mutation(
  async ({ db }, 
    whisperName: string, 
    accessKey: string, 
    geolocation: string | null, 
  ) => {
    const accessDoc = await db
      .query('accesses')
      .withIndex('by_name_and_key', q => q.eq('name', whisperName).eq('accessKey', accessKey))
      .unique();
    await db.patch(accessDoc!._id, {
      geolocation,
    });
  }
)
