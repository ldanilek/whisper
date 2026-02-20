import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import { useState, type ChangeEvent } from 'react';
import { createWhisper } from '../common';
import { expirationOptions } from '../expiration';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import { api } from '../convex/_generated/api';

const Home: NextPage = () => {
  const createWhisperMutation = useMutation(api.createWhisper.default);
  const [secret, setSecret] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  const [password, setPassword] = useState('');
  const [requestGeolocation, setRequestGeolocation] = useState(false);
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const makeUploadURL = useMutation(api.fileUploadURL.default);
  const onAttachFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    setSelectedFiles((previousFiles) => previousFiles.concat(files));
    // Let users pick the same file again if they removed it.
    event.target.value = '';
  };
  const removeFileAtIndex = (indexToRemove: number) => {
    setSelectedFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );
  };
  const create = async () => {
    const createResponse = await createWhisper(
      secret,
      selectedFiles,
      expiration,
      password,
      createWhisperMutation,
      makeUploadURL,
      requestGeolocation
    );
    router.push(
      `/created?name=${createResponse.name}&creatorKey=${createResponse.creatorKey}&password=${createResponse.password}`
    );
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
        attach secret file{' '}
        <input type="file" multiple onChange={onAttachFile} />
        {selectedFiles.length > 0 && (
          <ul>
            {selectedFiles.map((selectedFile, index) => (
              <li
                key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`}
              >
                {selectedFile.name}{' '}
                <button type="button" onClick={() => removeFileAtIndex(index)}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
      <button className={styles.button} onClick={create}>
        Create Whisper
      </button>
    </Whisper>
  );
};

export default Home;
