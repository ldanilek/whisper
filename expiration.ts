import { Document } from "./convex/_generated/dataModel";
import { DatabaseReader } from "./convex/_generated/server";

export const expirationOptions = [
    'after one access',
    //'after 20 seconds', // for testing
    'after ten accesses',
    'after five minutes',
    'after one week',
    'never',
];

export const directExpirationOption = 'manually expired';

type Expiration = {
  never?: boolean,
  manual?: boolean,
  afterDuration?: number,
  afterAccessCount?: number,
}

function optionToExpiration(option: string): Expiration {
  switch (option) {
    case 'after one access':
      return {afterAccessCount: 1};
    case 'after ten accesses':
      return {afterAccessCount: 10};
    case 'after 20 seconds':
      return {afterDuration: 20 * 1000};
    case 'after five minutes':
      return {afterDuration: 5 * 60 * 1000};
    case 'after one week':
      return {afterDuration: 7 * 24 * 60 * 60 * 1000};
    case 'never':
      return {never: true};
    case directExpirationOption:
      return {manual: true};
    default:
      throw Error(`unrecognized expiration '${option}'`);
  }
}

export async function countAccesses(
  db: DatabaseReader,
  name: string,
): Promise<number> {
  const allAccesses = await db
    .query('accesses')
    .withIndex('by_name_and_key', q => q.eq('name', name))
    .collect();
  return allAccesses.length;
}

export async function getValidWhisper(
  db: DatabaseReader,
  name: string,
  newAccess: boolean,
): Promise<Document<'whispers'>> {
  const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', name))
      .unique();
  const creation = whisperDoc!._creationTime;
  const expiration = optionToExpiration(whisperDoc!.expiration);
  if (expiration.never) {
    return whisperDoc!;
  } else if (expiration.manual) {
    throw Error(`manually expired`);
  } else if (expiration.afterAccessCount) {
    if (newAccess && await countAccesses(db, name) >= expiration.afterAccessCount) {
      throw Error(`already accessed ${expiration.afterAccessCount} time${expiration.afterAccessCount === 1 ? '' : 's'}`);
    }
  } else if (expiration.afterDuration) {
      const after = creation + expiration.afterDuration;
      if (after < new Date().getTime()) {
        throw Error(`expired after ${printDuration(expiration.afterDuration)}`);
      }
  } else {
    throw Error('developer error');
  }
  return whisperDoc!;
}

function splitBase(
  n: number,
  biggest: string,
  bases: [number, string][],
): [number, string][] {
  let inBase: [number, string][] = [];
  for (let i = bases.length - 1; i >= 0; i--) {
    const base = bases[i][0];
    const baseName = bases[i][1];
    const count = Math.floor(n / base);
    const remainder = n % base;
    inBase = [[remainder, baseName], ...inBase];
    n = count;
  }
  inBase = [[n, biggest], ...inBase];
  return inBase;
}

function printDuration(duration: number): string {
  let inBase = splitBase(duration, 'day', [[24, 'hour'], [60, 'minute'], [60, 'second'], [1000, 'millisecond']]);
  let asStrings = inBase.map(([count, name]) => {
    if (count === 0 || name === 'millisecond') {
      return '';
    }
    if (count === 1) {
      return `1 ${name}`;
    }
    return `${count} ${name}s`;
  }).filter((s) => s.length > 0);
  if (asStrings.length === 0) {
    return '0 seconds';
  }
  return asStrings.join(', ');
}

export async function readExpiration(
    db: DatabaseReader,
    name: string,
): Promise<[string, number | null]> {
  const whisperDoc = await db
      .query('whispers')
      .withIndex('by_name', (q) => q.eq('name', name))
      .unique();
  const creation = whisperDoc!._creationTime;
  const expiration = optionToExpiration(whisperDoc!.expiration);
  if (expiration.never) {
    return ['will never expire', null];
  } else if (expiration.manual) {
    return ['manually expired', null];
  } else if (expiration.afterAccessCount) {
    const accesses = await countAccesses(db, name);
    if (accesses >= expiration.afterAccessCount) {
      return [`expired after ${accesses} access${accesses === 1 ? '' : 'es'}`, null];
    } else {
      const remaining = expiration.afterAccessCount-accesses;
      return [`will expire after ${remaining} more access${remaining === 1 ? '' : 'es'}`, null];
    }
  } else if (expiration.afterDuration) {
    const after = creation + expiration.afterDuration;
    const currentTime = (new Date()).getTime();
    if (after < currentTime) {
      return [`expired ${printDuration(currentTime - after)} ago`, currentTime + 1000];
    } else {
      return [`will expire in ${printDuration(after - currentTime)}`, currentTime + 1000];
    }
  }
  throw Error('developer error');
}