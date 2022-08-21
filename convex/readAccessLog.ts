import { query } from './_generated/server'
import { getValidWhisper } from '../expiration';
import { Document } from './_generated/dataModel';

export default query(async ({ db }, name: string, creatorKey: string): Promise<Document<'accesses'>[]> => {
  const whisperDoc = await db
    .table('whispers')
    .index('by_name').range((q) => q.eq('name', name))
    .unique();
  if (whisperDoc.creatorKey !== creatorKey) {
    throw Error('invalid creator key');
  }
  const accessDocs = await db
    .table('accesses')
    .index('by_name_and_creation').range((q) => q.eq('name', name)).order('desc')
    .collect();
  return accessDocs;
});
