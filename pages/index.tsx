import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import { useState } from 'react';
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
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<null | File>(null);
  const makeUploadURL = useMutation(api.fileUploadURL.default);
  const create = async () => {
    const createResponse = await createWhisper(
      secret,
      selectedFile,
      expiration,
      password,
      createWhisperMutation,
      makeUploadURL
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
        password{' '}
        <input
          placeholder="leave blank to generate random"
          type="text"
          className={styles.passwordInput}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className={styles.button} onClick={create}>
        Create Whisper
      </button>
    </Whisper>
  );
};

export default Home;
