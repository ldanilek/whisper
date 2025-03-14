import { ReactMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

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

export async function createWhisper(
  secret: string,
  selectedFile: File | null,
  expiration: string,
  password: string,
  createWhisperMutation: ReactMutation<typeof api.createWhisper.default>,
  makeUploadURL: ReactMutation<typeof api.fileUploadURL.default>,
  requestGeolocation: boolean
): Promise<CreateResponse> {
  const name = uuidv4();
  const creatorKey = uuidv4();
  if (password.length === 0) {
    password = uuidv4();
  }
  const storageIds = [];
  if (selectedFile) {
    const [uploadURL, encryptedFile] = await Promise.all([
      makeUploadURL(),
      encryptFile(selectedFile, password),
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
    storageIds.push(storageId);
    const name = Buffer.from(selectedFile.name, 'ascii').toString('hex');
    secret += `\nAttachment: '${name}' ${storageId}`;
  }
  const encryptedSecret = CryptoJS.AES.encrypt(secret, password).toString();
  const passwordHash = hashPassword(password);
  await createWhisperMutation({
    whisperName: name,
    encryptedSecret,
    storageIds,
    passwordHash,
    creatorKey,
    expiration,
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
