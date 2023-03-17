import { query } from './_generated/server'
import { Doc } from './_generated/dataModel';
import { timingSafeEqual } from './security';

export default query(async ({ db }, name: string, creatorKey: string): Promise<Doc<'accesses'>[]> => {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', q => q.eq('name', name))
    .unique();
  if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
    throw Error('invalid creator key');
  }
  const accessDocs = await db
    .query('accesses')
    .withIndex('by_name_and_creation', q => q.eq('name', name)).order('desc')
    .collect();
  return accessDocs;
});
