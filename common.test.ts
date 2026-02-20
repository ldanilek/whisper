import CryptoJS from 'crypto-js';
import { test, expect, vi, beforeEach } from 'vitest';

const { mockUuid } = vi.hoisted(() => ({
  mockUuid: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: mockUuid,
}));

import { createWhisper } from './common';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mockUuid.mockReset();
});

test('createWhisper uploads all selected files', async () => {
  mockUuid
    .mockReturnValueOnce('whisper-name')
    .mockReturnValueOnce('creator-key');

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ storageId: 'storage-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ storageId: 'storage-2' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  vi.stubGlobal('fetch', fetchMock);

  const makeUploadURLMock = vi
    .fn()
    .mockResolvedValueOnce('https://upload-url-1')
    .mockResolvedValueOnce('https://upload-url-2');
  const createWhisperMutationMock = vi.fn().mockResolvedValue(undefined);

  const response = await createWhisper(
    'top secret',
    [
      new File(['alpha'], 'alpha.txt', { type: 'text/plain' }),
      new File(['beta'], 'beta.txt', { type: 'text/plain' }),
    ],
    'after one access',
    'known-password',
    createWhisperMutationMock as Parameters<typeof createWhisper>[4],
    makeUploadURLMock as Parameters<typeof createWhisper>[5],
    false
  );

  expect(response).toEqual({
    name: 'whisper-name',
    creatorKey: 'creator-key',
    password: 'known-password',
  });
  expect(makeUploadURLMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenCalledTimes(2);

  const createPayload = createWhisperMutationMock.mock.calls[0][0];
  expect(createPayload.storageIds).toEqual(['storage-1', 'storage-2']);

  const decryptedSecret = CryptoJS.AES.decrypt(
    createPayload.encryptedSecret,
    'known-password'
  ).toString(CryptoJS.enc.Utf8);

  const alphaHex = Buffer.from('alpha.txt', 'ascii').toString('hex');
  const betaHex = Buffer.from('beta.txt', 'ascii').toString('hex');
  expect(decryptedSecret).toContain(`Attachment: '${alphaHex}' storage-1`);
  expect(decryptedSecret).toContain(`Attachment: '${betaHex}' storage-2`);
});
