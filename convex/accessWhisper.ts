import { mutation } from './_generated/server'
import { getValidWhisper, whenShouldDelete } from '../expiration';

export default mutation(
  async ({ db, scheduler }, 
    whisperName: string, 
    passwordHash: string, 
    accessKey: string, 
    ip: string | null,  // from HTTP handler, to impede spoofing
    ssrKey: string,  // can only be called from authorized servers
  ) => {
    // @ts-ignore process global doesn't typecheck.
    if (!ssrKey || ssrKey !== process.env.SSR_KEY) {
      throw Error('must be called from an authorized server');
    }
    const whisperDoc = await getValidWhisper(db, whisperName, true);
    if (whisperDoc.passwordHash !== passwordHash) {
      throw Error('incorrect password');
    }
    await db.insert('accesses', {
      name: whisperName,
      accessKey,
      geolocation: null,
      ip,
    });
    const expireTime = await whenShouldDelete(db, whisperName);
    if (expireTime) {
      await scheduler.runAt(expireTime, "deleteExpired", whisperName, whisperDoc.creatorKey);
    }
  }
)
