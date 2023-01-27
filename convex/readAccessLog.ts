import { query } from './_generated/server'
import { Document } from './_generated/dataModel';

export default query(async ({ db }, name: string, creatorKey: string): Promise<Document<'accesses'>[]> => {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', q => q.eq('name', name))
    .unique();
  if (whisperDoc!.creatorKey !== creatorKey) {
    throw Error('invalid creator key');
  }
  const accessDocs = await db
    .query('accesses')
    .withIndex('by_name_and_creation', q => q.eq('name', name)).order('desc')
    .collect();
  return accessDocs;
});
