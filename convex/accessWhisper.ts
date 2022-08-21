import { mutation } from './_generated/server'
import { getValidWhisper } from '../expiration';

export default mutation(
  async ({ db }, 
    whisperName: string, 
    passwordHash: string, 
    accessKey: string, 
    geolocation: string | null, 
    ip: string | null,
  ) => {
    const whisperDoc = await getValidWhisper(db, whisperName, true);
    if (whisperDoc.passwordHash !== passwordHash) {
      throw Error('incorrect password');
    }
    db.insert('accesses', {
      name: whisperName,
      accessKey,
      geolocation,
      ip,
    });
  }
)
