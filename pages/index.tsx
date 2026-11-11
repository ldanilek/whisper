import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import { useRef, useState } from 'react';
import { createWhisper } from '../common';
import {
  ExpirationLimits,
  expirationOptions,
  maxCustomAccesses,
  optionUsesExpiresAt,
  optionUsesMaxAccesses,
} from '../expiration';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import { api } from '../convex/_generated/api';

// Formats a timestamp as the local-time value a datetime-local input expects.
function toDateTimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Reads a datetime-local value as local time. Browsers report '' while the
// value is incomplete (iOS until every field is picked), which yields NaN so
// validation asks for a date instead of guessing one.
function parseDateTimeLocal(value: string): number {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(
      value
    );
  if (!match) {
    return NaN;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0)
  ).getTime();
}

const Home: NextPage = () => {
  const createWhisperMutation = useMutation(api.createWhisper.default);
  const [secret, setSecret] = useState('');
  const [sender, setSender] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  // The page is prerendered, so the default date is filled in when the sender
  // picks a date option rather than at build time.
  const [expiresAtInput, setExpiresAtInput] = useState('');
  const [maxAccessesInput, setMaxAccessesInput] = useState('3');
  const usesExpiresAt = optionUsesExpiresAt(expiration);
  const usesMaxAccesses = optionUsesMaxAccesses(expiration);
  const chooseExpiration = (option: string) => {
    setExpiration(option);
    if (optionUsesExpiresAt(option) && expiresAtInput === '') {
      setExpiresAtInput(
        toDateTimeLocal(new Date().getTime() + 24 * 60 * 60 * 1000)
      );
    }
  };
  const expirationLimits = (): ExpirationLimits => {
    const limits: ExpirationLimits = {};
    if (usesExpiresAt) {
      limits.expiresAt = parseDateTimeLocal(expiresAtInput);
    }
    if (usesMaxAccesses) {
      limits.maxAccesses = Number(maxAccessesInput);
    }
    return limits;
  };
  const [password, setPassword] = useState('');
  const [requestGeolocation, setRequestGeolocation] = useState(false);
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const makeUploadURL = useMutation(api.fileUploadURL.default);
  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const added = Array.from(fileList);
    setSelectedFiles((current) => [...current, ...added]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const removeFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, i) => i !== index));
  };
  const create = async () => {
    if (creating) {
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const createResponse = await createWhisper(
        secret,
        sender,
        selectedFiles,
        expiration,
        password,
        createWhisperMutation,
        makeUploadURL,
        requestGeolocation,
        expirationLimits()
      );
      await router.push(
        `/created?name=${createResponse.name}&creatorKey=${createResponse.creatorKey}&password=${createResponse.password}`
      );
    } catch (error) {
      console.error(error);
      setCreateError(
        error instanceof Error ? error.message : 'failed to create whisper'
      );
      setCreating(false);
    }
  };

  return (
    <Whisper>
      <textarea
        className={styles.secretDisplay}
        placeholder="secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
      />
      <div>
        sender{' '}
        <input
          type="text"
          className={styles.passwordInput}
          placeholder="your name (optional)"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
      </div>
      <div className={styles.attachFiles}>
        <div className={styles.attachRow}>
          <span id="attach-files-label">attach secret files</span>
          <button
            type="button"
            className={styles.chooseFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFiles.length === 0 ? 'Choose files' : 'Add files'}
          </button>
          <input
            ref={fileInputRef}
            className={styles.hiddenFileInput}
            type="file"
            multiple
            tabIndex={-1}
            aria-labelledby="attach-files-label"
            onChange={(event) => addFiles(event.target.files)}
          />
        </div>
        {selectedFiles.length > 0 ? (
          <ul className={styles.fileList} aria-label="Selected files">
            {selectedFiles.map((file, index) => (
              <li
                className={styles.fileListItem}
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              >
                <span className={styles.fileName}>{file.name}</span>
                <button
                  type="button"
                  className={styles.removeFile}
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(index)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {createError ? <div>{createError}</div> : null}
      <div className={styles.expiresRow}>
        <label>
          <span>expires&nbsp;</span>
          <select
            value={expiration}
            onChange={(e) => chooseExpiration(e.target.value)}
          >
            {expirationOptions.map((o) => (
              <option value={o} key={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
      {usesExpiresAt || usesMaxAccesses ? (
        <div className={styles.expirationLimits}>
          {usesExpiresAt ? (
            <label>
              at{' '}
              <input
                type="datetime-local"
                value={expiresAtInput}
                min={toDateTimeLocal(new Date().getTime())}
                required
                onChange={(e) => setExpiresAtInput(e.target.value)}
              />
            </label>
          ) : null}
          {usesExpiresAt && usesMaxAccesses ? <span>or</span> : null}
          {usesMaxAccesses ? (
            <label className={styles.accessCountLabel}>
              after{' '}
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                className={styles.accessCountInput}
                min={1}
                max={maxCustomAccesses}
                step={1}
                value={maxAccessesInput}
                required
                onChange={(e) => setMaxAccessesInput(e.target.value)}
              />{' '}
              {maxAccessesInput === '1' ? 'access' : 'accesses'}
            </label>
          ) : null}
          {usesExpiresAt && usesMaxAccesses ? (
            <span className={styles.expirationHint}>whichever is first</span>
          ) : null}
        </div>
      ) : null}
      <div>
        password{' '}
        <input
          placeholder="leave blank to generate random"
          type="text"
          className={styles.passwordInput}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label>
          request geolocation{' '}
          <input
            type="checkbox"
            checked={requestGeolocation}
            onChange={(e) => setRequestGeolocation(e.target.checked)}
          />
        </label>
      </div>
      <button className={styles.button} onClick={create} disabled={creating}>
        {creating ? 'Creating Whisper...' : 'Create Whisper'}
      </button>
    </Whisper>
  );
};

export default Home;
