import { ReactMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { ExpirationLimits, validateExpirationInput } from './expiration';

export type CreateResponse = {
  name: string;
  creatorKey: string;
  password: string;
};

const encryptFile = async (blob: Blob, password: string): Promise<Blob> => {
  // i don't know how to invert blob.text() when the file isn't ascii, so use blob.arrayBuffer().
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const encodedString = Buffer.from(uint8Array).toString('base64');
  const encrypted = CryptoJS.AES.encrypt(encodedString, password);
  const encryptedEncoded = encrypted.toString(); // base64
  return new Blob([encryptedEncoded]);
};

// Same on-the-wire line the recipient already parses. The filename is hex so
// quotes, spaces, and newlines in the name cannot break the line.
export function formatAttachmentLine(
  filename: string,
  storageId: string
): string {
  const filenameHex = Buffer.from(filename, 'ascii').toString('hex');
  return `Attachment: '${filenameHex}' ${storageId}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type AttachmentMatch = {
  secret: string;
  filename: string;
  index: number;
};

// Removes one attachment line for storageId and returns the decoded filename.
// Storage ids are matched exactly so one id cannot consume another file's line.
function findAttachment(
  secret: string,
  storageId: string
): AttachmentMatch | null {
  const pattern = new RegExp(
    `Attachment: '([0-9a-fA-F]*)' ${escapeRegExp(storageId)}(?![0-9A-Za-z_])`
  );
  const match = secret.match(pattern);
  if (!match || match.index === undefined) {
    return null;
  }
  const filename = Buffer.from(match[1] ?? '', 'hex').toString();
  return {
    secret:
      secret.slice(0, match.index) +
      secret.slice(match.index + match[0].length),
    filename,
    index: match.index,
  };
}

export function takeAttachment(
  secret: string,
  storageId: string
): { secret: string; filename: string } | null {
  const found = findAttachment(secret, storageId);
  if (!found) {
    return null;
  }
  return { secret: found.secret, filename: found.filename };
}

export function listAttachments(
  secret: string,
  storageURLs: Record<string, string | null>
): {
  secret: string;
  attachments: Array<{
    storageId: string;
    filename: string;
    url: string | null;
  }>;
} {
  const attachments: Array<{
    storageId: string;
    filename: string;
    url: string | null;
  }> = [];
  let remaining = secret;
  let pending = Object.keys(storageURLs);
  while (pending.length > 0) {
    let next: { storageId: string; index: number } | null = null;
    const stillPending: string[] = [];
    for (const storageId of pending) {
      const taken = findAttachment(remaining, storageId);
      if (!taken) {
        continue;
      }
      stillPending.push(storageId);
      if (next === null || taken.index < next.index) {
        next = { storageId, index: taken.index };
      }
    }
    if (!next) {
      break;
    }
    const taken = findAttachment(remaining, next.storageId);
    if (!taken) {
      break;
    }
    const storageId = next.storageId;
    remaining = taken.secret;
    attachments.push({
      storageId,
      filename: taken.filename,
      url: storageURLs[storageId],
    });
    pending = stillPending.filter((id) => id !== storageId);
  }
  return { secret: remaining, attachments };
}

export async function createWhisper(
  secret: string,
  sender: string,
  selectedFiles: File[],
  expiration: string,
  password: string,
  createWhisperMutation: ReactMutation<typeof api.createWhisper.default>,
  makeUploadURL: ReactMutation<typeof api.fileUploadURL.default>,
  requestGeolocation: boolean,
  expirationLimits: ExpirationLimits = {}
): Promise<CreateResponse> {
  // Fail before uploading files the whisper would never reference.
  validateExpirationInput(expiration, expirationLimits, new Date().getTime());
  const name = uuidv4();
  const creatorKey = uuidv4();
  if (password.length === 0) {
    password = uuidv4();
  }
  const uploaded = await Promise.all(
    selectedFiles.map(async (file) => {
      const [uploadURL, encryptedFile] = await Promise.all([
        makeUploadURL(),
        encryptFile(file, password),
      ]);
      const result = await fetch(uploadURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedFile,
      });
      const resultJson = await result.json();
      if (!result.ok) {
        console.error(resultJson);
      }
      const storageId = resultJson['storageId'];
      if (typeof storageId !== 'string' || storageId.length === 0) {
        throw new Error(`failed to upload ${file.name}`);
      }
      return {
        storageId,
        line: formatAttachmentLine(file.name, storageId),
      };
    })
  );
  const storageIds = uploaded.map((file) => file.storageId);
  for (const file of uploaded) {
    secret += `\n${file.line}`;
  }
  const encryptedSecret = CryptoJS.AES.encrypt(secret, password).toString();
  const encryptedSender = CryptoJS.AES.encrypt(
    sender.trim(),
    password
  ).toString();
  const passwordHash = hashPassword(password);
  await createWhisperMutation({
    whisperName: name,
    encryptedSecret,
    encryptedSender,
    storageIds,
    passwordHash,
    creatorKey,
    expiration,
    ...expirationLimits,
    requestGeolocation,
  });
  return {
    password,
    name,
    creatorKey,
  };
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

export function makeURL(name: string, password: string | null): string {
  const currentURL = window.location;
  const baseURL = currentURL.protocol + '//' + currentURL.host;
  if (password === null) {
    return `${baseURL}/access?name=${name}`;
  }
  return `${baseURL}/access?name=${name}&password=${password}`;
}
