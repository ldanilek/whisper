import { afterEach, beforeEach, expect, test } from 'vitest';
import { makeURL } from './common';

type WindowLike = {
  location: {
    protocol: string;
    host: string;
  };
};

const globalWindow = globalThis as typeof globalThis & { window?: WindowLike };
let originalWindow: WindowLike | undefined;

beforeEach(() => {
  originalWindow = globalWindow.window;
  globalWindow.window = {
    location: {
      protocol: 'https:',
      host: 'example.com',
    },
  };
});

afterEach(() => {
  if (originalWindow) {
    globalWindow.window = originalWindow;
    return;
  }
  delete globalWindow.window;
});

test('makeURL includes sender and password when provided', () => {
  expect(makeURL('whisper-id', 'p@ ss', 'Alice Smith')).toBe(
    'https://example.com/access?name=whisper-id&password=p%40+ss&sender=Alice+Smith'
  );
});

test('makeURL excludes sender when blank', () => {
  expect(makeURL('whisper-id', 'password', '   ')).toBe(
    'https://example.com/access?name=whisper-id&password=password'
  );
});

test('makeURL generates public URL without password', () => {
  expect(makeURL('whisper-id', null, 'Alice')).toBe(
    'https://example.com/access?name=whisper-id&sender=Alice'
  );
});
