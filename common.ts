var uuid = require("uuid");
var CryptoJS = require("crypto-js");

export type CreateResponse = {
  name: string,
  creatorKey: string,
  password: string,
}

export async function createWhisper(
    secret: string,
    expiration: string,
    password: string,
    createWhisperMutation: (name: string, encryptedSecret: string, passwordHash: string, creatorKey: string, expiration: string) => Promise<null>,
): Promise<CreateResponse> {
    const name = uuid.v4();
    const creatorKey = uuid.v4();
    if (password.length === 0) {
      password = uuid.v4();
    }
    const encryptedSecret = CryptoJS.AES.encrypt(secret, password).toString();
    const passwordHash = hashPassword(password);
    await createWhisperMutation(name, encryptedSecret, passwordHash, creatorKey, expiration);
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
  const baseURL = currentURL.protocol + "//" + currentURL.host;
  if (password === null) {
    return `${baseURL}/access?name=${name}`;
  }
  return `${baseURL}/access?name=${name}&password=${password}`;
}

export async function accessWhisper(
    name: string,
    password: string,
    ip: string | null,
    mutation: (name: string, passwordHash: string, accessKey: string, ip: string | null, ssrKey: string) => Promise<null>,
): Promise<string> {
    const accessKey = uuid.v4();
    const passwordHash = hashPassword(password);
    await mutation(name, passwordHash, accessKey, ip, process.env.SSR_KEY!);
    return accessKey;
}
