import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { createWhisper, normalizeSender } from '../common';
import { expirationOptions } from '../expiration';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import { api } from '../convex/_generated/api';

const Home: NextPage = () => {
  const createWhisperMutation = useMutation(api.createWhisper.default);
  const [secret, setSecret] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  const [sender, setSender] = useState('');
  const [password, setPassword] = useState('');
  const [requestGeolocation, setRequestGeolocation] = useState(false);
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<null | File>(null);
  const makeUploadURL = useMutation(api.fileUploadURL.default);
  const create = async () => {
    const createResponse = await createWhisper(
      secret,
      selectedFile,
      expiration,
      password,
      sender,
      createWhisperMutation,
      makeUploadURL,
      requestGeolocation
    );
    const params = new URLSearchParams();
    params.set('name', createResponse.name);
    params.set('creatorKey', createResponse.creatorKey);
    params.set('password', createResponse.password);
    const normalizedSender = normalizeSender(sender);
    if (normalizedSender !== undefined) {
      params.set('sender', normalizedSender);
    }
    router.push(`/created?${params.toString()}`);
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
        <input
          type="file"
          onChange={(event) => setSelectedFile(event.target.files![0])}
        />
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
        sender name{' '}
        <input
          placeholder="optional"
          type="text"
          className={styles.passwordInput}
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
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
