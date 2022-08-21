import { Document } from "./convex/_generated/dataModel";
import { DatabaseReader } from "./convex/_generated/server";

export const expirationOptions = [
    'after one access',
    'after ten accesses',
    'after five minutes',
    'never',
];

export async function countAccesses(
  db: DatabaseReader,
  name: string,
): Promise<number> {
  const allAccesses = await db
    .table('accesses')
    .index('by_name_and_key').range(q => q.eq('name', name))
    .collect();
  return allAccesses.length;
}

export async function getValidWhisper(
  db: DatabaseReader,
  name: string,
  newAccess: boolean,
): Promise<Document<'whispers'>> {
  const whisperDoc = await db
      .table('whispers')
      .index('by_name').range((q) => q.eq('name', name))
      .unique();
  const creation = new Date(whisperDoc._creationTime);
  switch (whisperDoc.expiration) {
    case 'after one access':
      if (newAccess && await countAccesses(db, name) >= 1) {
        throw Error('already accessed');
      }
      break;
    case 'after ten accesses':
      if (newAccess && await countAccesses(db, name) >= 10) {
        throw Error('already accessed ten times');
      }
      break;
    case 'after five minutes':
      const fiveAfter = new Date(creation.getTime() + 5 * 60 * 1000);
      if (fiveAfter < new Date()) {
        throw Error('expired after five minutes');
      }
      break;
    case 'never':
      break;
    default:
      throw Error(`unrecognized expiration ${whisperDoc.expiration}`);
  }
  return whisperDoc;
}