import { mutation } from './_generated/server'
import { getValidWhisper, scheduleDeletion } from '../expiration';
import { timingSafeEqual } from './security';

export default mutation(
  async ({ db, scheduler }, 
    {whisperName, passwordHash, accessKey, ip, ssrKey}:
    {whisperName: string, 
    passwordHash: string, 
    accessKey: string, 
    ip: string | null,  // from HTTP handler, to impede spoofing
    ssrKey: string},  // can only be called from authorized servers
  ) => {
    // @ts-ignore process global doesn't typecheck.
    if (!ssrKey || !timingSafeEqual(ssrKey, process.env.SSR_KEY)) {
      throw Error('must be called from an authorized server');
    }
    const whisperDoc = await getValidWhisper(db, whisperName, true);
    if (!timingSafeEqual(whisperDoc.passwordHash, passwordHash)) {
      throw Error('incorrect password');
    }
    await db.insert('accesses', {
      name: whisperName,
      accessKey,
      geolocation: null,
      ip,
    });
    await scheduleDeletion(scheduler, db, whisperName, whisperDoc.creatorKey);
  }
)
