import { query } from './_generated/server'
import { getValidWhisper } from '../expiration';

export default query(async ({ db }, whisperName: string, accessKey: string): Promise<string> => {
  const whisperDoc = await getValidWhisper(db, whisperName, false);
  const accessDoc = await db
    .query('accesses')
    .withIndex('by_name_and_key', q => q.eq('name', whisperName).eq('accessKey', accessKey))
    .unique();
  if (!accessDoc) {
    throw new Error("accessKey invalid");
  }
  return whisperDoc.encryptedSecret;
})
