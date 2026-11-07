import { afterEach, expect, test } from 'vitest';
import CryptoJS from 'crypto-js';
import { ReactMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import {
  createWhisper,
  formatAttachmentLine,
  hashPassword,
  listAttachments,
  takeAttachment,
} from './common';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

type CreatedWhisper = {
  whisperName: string;
  encryptedSecret: string;
  encryptedSender: string;
  storageIds: string[];
  passwordHash: string;
  creatorKey: string;
  expiration: string;
  requestGeolocation: boolean;
};

function decryptText(encrypted: string, password: string): string {
  return CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);
}

async function decryptUploadedFile(
  body: Blob,
  password: string
): Promise<Uint8Array> {
  const encrypted = await body.text();
  const decrypted = CryptoJS.AES.decrypt(encrypted, password);
  const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
  return new Uint8Array(Buffer.from(decryptedStr, 'base64'));
}

function mockUploads(bodies: Map<string, Blob>, failSecond = false) {
  let n = 0;
  const makeUploadURL = async () => {
    n += 1;
    return `https://uploads.test/${n}`;
  };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (failSecond && url.endsWith('/2')) {
      return new Response(JSON.stringify({ error: 'upload failed' }), {
        status: 500,
      });
    }
    bodies.set(url, init?.body as Blob);
    const id = url.split('/').pop();
    return new Response(JSON.stringify({ storageId: `storage-${id}` }), {
      status: 200,
    });
  };
  return {
    makeUploadURL: makeUploadURL as unknown as ReactMutation<
      typeof api.fileUploadURL.default
    >,
    uploadCount: () => n,
  };
}

test('createWhisper stores no attachment when no files are selected', async () => {
  const bodies = new Map<string, Blob>();
  const uploads = mockUploads(bodies);
  const created: CreatedWhisper[] = [];
  const password = 'pw';

  await createWhisper(
    'no files',
    'ada',
    [],
    'never',
    password,
    (async (args: CreatedWhisper) => {
      created.push(args);
    }) as unknown as ReactMutation<typeof api.createWhisper.default>,
    uploads.makeUploadURL,
    false
  );

  expect(uploads.uploadCount()).toBe(0);
  expect(created).toHaveLength(1);
  expect(created[0].storageIds).toEqual([]);
  expect(decryptText(created[0].encryptedSecret, password)).toBe('no files');
  expect(decryptText(created[0].encryptedSender, password)).toBe('ada');
  expect(created[0].passwordHash).toBe(hashPassword(password));
});

test('createWhisper encrypts a single attachment the same way as before', async () => {
  const bodies = new Map<string, Blob>();
  const uploads = mockUploads(bodies);
  const created: CreatedWhisper[] = [];
  const password = 'pw';
  const bytes = Uint8Array.from([1, 2, 3, 255]);
  const file = new File([bytes], 'notes 1.txt');

  await createWhisper(
    'hello',
    'ada',
    [file],
    'after one access',
    password,
    (async (args: CreatedWhisper) => {
      created.push(args);
    }) as unknown as ReactMutation<typeof api.createWhisper.default>,
    uploads.makeUploadURL,
    true
  );

  expect(created[0].storageIds).toEqual(['storage-1']);
  expect(created[0].requestGeolocation).toBe(true);
  const decrypted = decryptText(created[0].encryptedSecret, password);
  expect(decrypted).toBe(
    `hello\n${formatAttachmentLine('notes 1.txt', 'storage-1')}`
  );
  const taken = takeAttachment(decrypted, 'storage-1');
  expect(taken?.filename).toBe('notes 1.txt');
  expect(taken?.secret).toBe('hello\n');
  expect(
    Array.from(
      await decryptUploadedFile(bodies.get('https://uploads.test/1')!, password)
    )
  ).toEqual(Array.from(bytes));
});

test('createWhisper encrypts every selected file with the whisper password', async () => {
  const bodies = new Map<string, Blob>();
  const uploads = mockUploads(bodies);
  const created: CreatedWhisper[] = [];
  const files = [
    new File([Uint8Array.from([9, 8, 7])], 'a.txt'),
    new File([Uint8Array.from([4, 5])], 'b.txt'),
    new File([Uint8Array.from([6])], "quote's.bin"),
  ];

  const response = await createWhisper(
    'shared secret',
    '  ada  ',
    files,
    'after ten accesses',
    '',
    (async (args: CreatedWhisper) => {
      created.push(args);
    }) as unknown as ReactMutation<typeof api.createWhisper.default>,
    uploads.makeUploadURL,
    false
  );

  expect(response.password.length).toBeGreaterThan(0);
  expect(created[0].passwordHash).toBe(hashPassword(response.password));
  expect(created[0].storageIds).toEqual([
    'storage-1',
    'storage-2',
    'storage-3',
  ]);
  expect(decryptText(created[0].encryptedSender, response.password)).toBe(
    'ada'
  );

  let remaining = decryptText(created[0].encryptedSecret, response.password);
  const filenames = ['a.txt', 'b.txt', "quote's.bin"];
  const expectedBytes = [[9, 8, 7], [4, 5], [6]];
  for (let i = 0; i < files.length; i++) {
    const storageId = `storage-${i + 1}`;
    const taken = takeAttachment(remaining, storageId);
    expect(taken?.filename).toBe(filenames[i]);
    remaining = taken?.secret ?? '';
    expect(
      Array.from(
        await decryptUploadedFile(
          bodies.get(`https://uploads.test/${i + 1}`)!,
          response.password
        )
      )
    ).toEqual(expectedBytes[i]);
  }
  expect(remaining.replace(/\n+$/g, '')).toBe('shared secret');
});

test('createWhisper does not save a whisper when an upload fails', async () => {
  const bodies = new Map<string, Blob>();
  const uploads = mockUploads(bodies, true);
  let saved = false;

  await expect(
    createWhisper(
      'secret',
      'ada',
      [new File(['one'], 'a.txt'), new File(['two'], 'b.txt')],
      'never',
      'pw',
      (async () => {
        saved = true;
      }) as unknown as ReactMutation<typeof api.createWhisper.default>,
      uploads.makeUploadURL,
      false
    )
  ).rejects.toThrow('failed to upload b.txt');
  expect(saved).toBe(false);
});

test('takeAttachment reads an existing one-file line', () => {
  const legacy = "secret\nAttachment: '6161612e747874' kg2file";
  const taken = takeAttachment(legacy, 'kg2file');
  expect(taken?.filename).toBe('aaa.txt');
  expect(taken?.secret).toBe('secret\n');
});

test('takeAttachment keeps every file when storage ids share a prefix', () => {
  const secret = [
    'hello',
    formatAttachmentLine('longer.txt', 'abcde'),
    formatAttachmentLine('short.txt', 'abc'),
    formatAttachmentLine('dotted.txt', 'id.1'),
    formatAttachmentLine('other.txt', 'idx1'),
  ].join('\n');

  const short = takeAttachment(secret, 'abc');
  expect(short?.filename).toBe('short.txt');
  expect(short?.secret).toContain(formatAttachmentLine('longer.txt', 'abcde'));

  const dotted = takeAttachment(secret, 'id.1');
  expect(dotted?.filename).toBe('dotted.txt');
  expect(dotted?.secret).toContain(formatAttachmentLine('other.txt', 'idx1'));

  let remaining = secret;
  const filenames: string[] = [];
  for (const storageId of ['abcde', 'abc', 'id.1', 'idx1']) {
    const taken = takeAttachment(remaining, storageId);
    filenames.push(taken?.filename ?? '');
    remaining = taken?.secret ?? remaining;
  }
  expect(filenames).toEqual([
    'longer.txt',
    'short.txt',
    'dotted.txt',
    'other.txt',
  ]);
  expect(remaining.replace(/\n+$/g, '')).toBe('hello');
  expect(takeAttachment(remaining, 'abc')).toBeNull();
});

test('listAttachments keeps creator order and every file url', () => {
  const secret = [
    'hello',
    formatAttachmentLine('second.txt', 'id-2'),
    formatAttachmentLine('first.txt', 'id-1'),
    formatAttachmentLine('missing.txt', 'id-3'),
  ].join('\n');
  const listed = listAttachments(secret, {
    'id-1': 'https://files/1',
    'id-2': null,
    'id-9': 'https://files/unused',
  });
  expect(listed.attachments).toEqual([
    { storageId: 'id-2', filename: 'second.txt', url: null },
    { storageId: 'id-1', filename: 'first.txt', url: 'https://files/1' },
  ]);
  expect(listed.secret).toContain('hello');
  expect(listed.secret).toContain(formatAttachmentLine('missing.txt', 'id-3'));
  expect(listed.secret).not.toContain(
    formatAttachmentLine('second.txt', 'id-2')
  );
  expect(listed.secret).not.toContain(
    formatAttachmentLine('first.txt', 'id-1')
  );
});
