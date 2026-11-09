import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import { useRef, useState } from 'react';
import { createWhisper } from '../common';
import { expirationOptions } from '../expiration';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import { api } from '../convex/_generated/api';

const Home: NextPage = () => {
  const createWhisperMutation = useMutation(api.createWhisper.default);
  const [secret, setSecret] = useState('');
  const [sender, setSender] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
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
        requestGeolocation
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
      <div>
        <span>expires&nbsp;</span>
        <select
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
        >
          {expirationOptions.map((o) => (
            <option value={o} key={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
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
