import { Scheduler } from 'convex/server';
import { Doc } from './convex/_generated/dataModel';
import { DatabaseReader } from './convex/_generated/server';
import { api } from './convex/_generated/api';
import { ConvexError } from 'convex/values';

export const atTimeOption = 'at a specific date and time';
export const afterAccessesOption = 'after a custom number of accesses';
export const atTimeOrAfterAccessesOption =
  'at a date and time or after N accesses, whichever is first';
export const presetCombinedOption =
  'after 3 accesses or in 2 days, whichever is first';

export const expirationOptions = [
  'after one access',
  // 'after 20 seconds', // for testing
  'after ten accesses',
  'after five minutes',
  'after one week',
  presetCombinedOption,
  'never',
  atTimeOption,
  afterAccessesOption,
  atTimeOrAfterAccessesOption,
];

export const directExpirationOption = 'manually expired';
export const failedAccesses = 'too many failed accesses';
export const maxAccessFailures = 4;

export const maxCustomAccesses = 1000;
export const maxCustomExpirationMs = 365 * 24 * 60 * 60 * 1000;

const dayMs = 24 * 60 * 60 * 1000;

// Values the sender picked for the custom options. Stored on the whisper next
// to `expiration`, which still names the option.
export type ExpirationLimits = {
  expiresAt?: number;
  maxAccesses?: number;
};

type Expiration = {
  never?: boolean;
  manual?: boolean;
  afterFailedAccesses?: boolean;
  // Time limits; at most one is set. afterDuration is relative to creation.
  afterDuration?: number;
  atTime?: number;
  afterAccessCount?: number;
};

export function optionUsesExpiresAt(option: string): boolean {
  return option === atTimeOption || option === atTimeOrAfterAccessesOption;
}

export function optionUsesMaxAccesses(option: string): boolean {
  return (
    option === afterAccessesOption || option === atTimeOrAfterAccessesOption
  );
}

export function optionToExpiration(
  option: string,
  limits: ExpirationLimits = {}
): Expiration {
  switch (option) {
    case 'after one access':
      return { afterAccessCount: 1 };
    case 'after ten accesses':
      return { afterAccessCount: 10 };
    case 'after 20 seconds':
      return { afterDuration: 20 * 1000 };
    case 'after five minutes':
      return { afterDuration: 5 * 60 * 1000 };
    case 'after one week':
      return { afterDuration: 7 * dayMs };
    case presetCombinedOption:
      return { afterAccessCount: 3, afterDuration: 2 * dayMs };
    case atTimeOption:
      return { atTime: requireLimit(option, limits.expiresAt) };
    case afterAccessesOption:
      return { afterAccessCount: requireLimit(option, limits.maxAccesses) };
    case atTimeOrAfterAccessesOption:
      return {
        atTime: requireLimit(option, limits.expiresAt),
        afterAccessCount: requireLimit(option, limits.maxAccesses),
      };
    case 'never':
      return { never: true };
    case directExpirationOption:
      return { manual: true };
    case failedAccesses:
      return { afterFailedAccesses: true };
    default:
      throw Error(`unrecognized expiration '${option}'`);
  }
}

function requireLimit(option: string, value: number | undefined): number {
  if (value === undefined) {
    throw Error(`expiration '${option}' is missing its limit`);
  }
  return value;
}

// Checks what a sender may choose when creating a whisper. Runs in the browser
// before files are uploaded and again in the createWhisper mutation.
export function validateExpirationInput(
  option: string,
  limits: ExpirationLimits,
  now: number
): void {
  if (!expirationOptions.includes(option) && option !== 'after 20 seconds') {
    throw new ConvexError(`unrecognized expiration '${option}'`);
  }
  const { expiresAt, maxAccesses } = limits;
  if (optionUsesExpiresAt(option)) {
    if (expiresAt === undefined || !Number.isFinite(expiresAt)) {
      throw new ConvexError('choose a valid expiration date and time');
    }
    if (expiresAt <= now) {
      throw new ConvexError('expiration date and time must be in the future');
    }
    if (expiresAt > now + maxCustomExpirationMs) {
      throw new ConvexError('expiration date and time must be within one year');
    }
  } else if (expiresAt !== undefined) {
    throw new ConvexError(`expiration '${option}' does not take a date`);
  }
  if (optionUsesMaxAccesses(option)) {
    if (
      maxAccesses === undefined ||
      !Number.isInteger(maxAccesses) ||
      maxAccesses < 1
    ) {
      throw new ConvexError('number of accesses must be a positive integer');
    }
    if (maxAccesses > maxCustomAccesses) {
      throw new ConvexError(
        `number of accesses must be at most ${maxCustomAccesses}`
      );
    }
  } else if (maxAccesses !== undefined) {
    throw new ConvexError(
      `expiration '${option}' does not take a number of accesses`
    );
  }
}

function whisperExpiration(whisperDoc: Doc<'whispers'>): Expiration {
  return optionToExpiration(whisperDoc.expiration, {
    expiresAt: whisperDoc.expiresAt,
    maxAccesses: whisperDoc.maxAccesses,
  });
}

function expirationDeadline(
  whisperDoc: Doc<'whispers'>,
  expiration: Expiration
): number | null {
  if (expiration.afterDuration !== undefined) {
    return whisperDoc._creationTime + expiration.afterDuration;
  }
  if (expiration.atTime !== undefined) {
    return expiration.atTime;
  }
  return null;
}

function accessWord(n: number): string {
  return n === 1 ? 'access' : 'accesses';
}

export async function countAccesses(
  db: DatabaseReader,
  name: string
): Promise<number> {
  const allAccesses = await db
    .query('accesses')
    .withIndex('by_name_and_key', (q) => q.eq('name', name))
    .collect();
  return allAccesses.length;
}

export async function latestAccessTime(
  db: DatabaseReader,
  name: string
): Promise<number> {
  const allAccesses = await db
    .query('accesses')
    .withIndex('by_name_and_key', (q) => q.eq('name', name))
    .collect();
  const largestCreationTime = Math.max(
    ...allAccesses.map((access) => {
      return access._creationTime;
    })
  );
  return largestCreationTime;
}

export async function countInvalidAccesses(
  db: DatabaseReader,
  name: string
): Promise<number> {
  const allAccesses = await db
    .query('accessFailures')
    .withIndex('by_name_and_key', (q) => q.eq('name', name))
    .collect();
  return allAccesses.length;
}

// Throws a ConvexError if the whisper has expired. With newAccess, also throws
// if granting one more access would exceed the access limit; the caller must
// record that access in the same mutation so concurrent accesses conflict.
export async function getValidWhisper(
  db: DatabaseReader,
  name: string,
  newAccess: boolean
): Promise<Doc<'whispers'>> {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', (q) => q.eq('name', name))
    .unique();
  const expiration = whisperExpiration(whisperDoc!);
  if (expiration.never) {
    return whisperDoc!;
  } else if (expiration.manual) {
    throw new ConvexError(`manually expired`);
  } else if (expiration.afterFailedAccesses) {
    throw new ConvexError(`expired after ${maxAccessFailures} failed accesses`);
  }
  const deadline = expirationDeadline(whisperDoc!, expiration);
  if (deadline === null && expiration.afterAccessCount === undefined) {
    throw Error('developer error');
  }
  const currentTime = new Date().getTime();
  if (deadline !== null && currentTime >= deadline) {
    if (expiration.afterDuration !== undefined) {
      throw new ConvexError(
        `expired after ${printDuration(expiration.afterDuration)}`
      );
    }
    throw new ConvexError(
      `expired ${printDuration(currentTime - deadline)} ago`
    );
  }
  if (
    newAccess &&
    expiration.afterAccessCount !== undefined &&
    (await countAccesses(db, name)) >= expiration.afterAccessCount
  ) {
    throw new ConvexError(
      `already accessed ${expiration.afterAccessCount} time${
        expiration.afterAccessCount === 1 ? '' : 's'
      }`
    );
  }
  return whisperDoc!;
}

function splitBase(
  n: number,
  biggest: string,
  bases: [number, string][]
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
  const inBase = splitBase(duration, 'day', [
    [24, 'hour'],
    [60, 'minute'],
    [60, 'second'],
    [1000, 'millisecond'],
  ]);
  const asStrings = inBase
    .map(([count, name]) => {
      if (count === 0 || name === 'millisecond') {
        return '';
      }
      if (count === 1) {
        return `1 ${name}`;
      }
      return `${count} ${name}s`;
    })
    .filter((s) => s.length > 0);
  if (asStrings.length === 0) {
    return '0 seconds';
  }
  return asStrings.join(', ');
}

export async function whenShouldDelete(
  db: DatabaseReader,
  name: string
): Promise<Date | null> {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', (q) => q.eq('name', name))
    .unique();
  const currentTime = new Date().getTime();
  const expiration = whisperExpiration(whisperDoc!);
  if (expiration.never) {
    return null;
  } else if (expiration.manual || expiration.afterFailedAccesses) {
    return new Date();
  }
  const deadline = expirationDeadline(whisperDoc!, expiration);
  if (deadline === null && expiration.afterAccessCount === undefined) {
    throw Error('developer error');
  }
  // Whichever limit is hit first decides when the content is deleted.
  const candidates: number[] = [];
  if (deadline !== null) {
    candidates.push(Math.max(deadline, currentTime));
  }
  if (expiration.afterAccessCount !== undefined) {
    const accesses = await countAccesses(db, name);
    if (accesses >= expiration.afterAccessCount) {
      // In case the new access caused the secret to expire, give everyone with
      // access keys a day to readSecret, then delete it.
      const lastAccessTime = await latestAccessTime(db, name);
      candidates.push(lastAccessTime + dayMs);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return new Date(Math.min(...candidates));
}

export async function readExpiration(
  db: DatabaseReader,
  name: string
): Promise<[string, number | null, boolean]> {
  const whisperDoc = await db
    .query('whispers')
    .withIndex('by_name', (q) => q.eq('name', name))
    .unique();
  const expiration = whisperExpiration(whisperDoc!);
  if (expiration.never) {
    return ['will never expire', null, false];
  } else if (expiration.manual) {
    return ['manually expired', null, true];
  } else if (expiration.afterFailedAccesses) {
    return ['too many failed accesses', null, true];
  }
  const deadline = expirationDeadline(whisperDoc!, expiration);
  if (deadline === null && expiration.afterAccessCount === undefined) {
    throw Error('developer error');
  }
  const currentTime = new Date().getTime();
  const refresh = deadline === null ? null : currentTime + 1000;
  if (deadline !== null && currentTime >= deadline) {
    return [
      `expired ${printDuration(currentTime - deadline)} ago`,
      refresh,
      true,
    ];
  }
  let remainingAccesses: number | null = null;
  if (expiration.afterAccessCount !== undefined) {
    const accesses = await countAccesses(db, name);
    if (accesses >= expiration.afterAccessCount) {
      return [`expired after ${accesses} ${accessWord(accesses)}`, null, true];
    }
    remainingAccesses = expiration.afterAccessCount - accesses;
  }
  if (deadline === null) {
    return [
      `will expire after ${remainingAccesses} more ${accessWord(
        remainingAccesses!
      )}`,
      null,
      false,
    ];
  }
  const inTime = `will expire in ${printDuration(deadline - currentTime)}`;
  if (remainingAccesses === null) {
    return [inTime, refresh, false];
  }
  return [
    `${inTime} or after ${remainingAccesses} more ${accessWord(
      remainingAccesses
    )}, whichever is first`,
    refresh,
    false,
  ];
}

export async function scheduleDeletion(
  scheduler: Scheduler,
  db: DatabaseReader,
  whisperName: string,
  creatorKey: string
) {
  const expireTime = await whenShouldDelete(db, whisperName);
  if (expireTime) {
    await scheduler.runAt(expireTime, api.deleteExpired.default, {
      whisperName,
      creatorKey,
    });
  }
}
