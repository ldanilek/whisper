import { query } from './_generated/server'
import { Doc } from './_generated/dataModel';
import { timingSafeEqual } from './security';
import { ConvexError, v } from 'convex/values';

export default query({
  args: {name: v.string(), creatorKey: v.string()},
  handler: async ({db}, {name, creatorKey}) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', q => q.eq('name', name))
      .unique();
    if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
      throw new ConvexError('invalid creator key');
    }
    const accessDocs = await db
      .query('accesses')
      .withIndex('by_name_and_creation', q => q.eq('name', name)).order('desc')
      .collect();
    return accessDocs;
  },
});

export const failures = query({
  args: {name: v.string(), creatorKey: v.string()},
  handler: async ({db}, {name, creatorKey}) => {
    const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', q => q.eq('name', name))
      .unique();
    if (!timingSafeEqual(whisperDoc!.creatorKey, creatorKey)) {
      throw new ConvexError('invalid creator key');
    }
    const accessDocs = await db
      .query('accessFailures')
      .withIndex('by_name_and_creation', q => q.eq('name', name)).order('desc')
      .collect();
    return accessDocs;
  },
});
