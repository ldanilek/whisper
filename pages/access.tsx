import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import React from 'react';
import { normalizeSender } from '../common';

const senderLabel = (sender: string | undefined) =>
  normalizeSender(sender) ?? 'Someone';

const PasswordInput = ({
  name,
  sender,
}: {
  name: string;
  sender: string | undefined;
}) => {
  const [inputPassword, setInputPassword] = useState<string>('');
  const router = useRouter();

  const accessSecret = () => {
    const params = new URLSearchParams();
    params.set('name', name);
    params.set('password', inputPassword);
    const normalizedSender = normalizeSender(sender);
    if (normalizedSender !== undefined) {
      params.set('sender', normalizedSender);
    }
    router.push(`/display?${params.toString()}`);
  };

  return (
    <>
      {senderLabel(sender)} sent you a secret
      <div>
        Password{' '}
        <input
          type="text"
          value={inputPassword}
          onChange={(e) => setInputPassword(e.target.value)}
        />
      </div>
      <button
        className={styles.button}
        onClick={accessSecret}
      >
        Access Secret
      </button>
    </>
  );
};

const AccessButton = ({
  name,
  password,
  sender,
}: {
  name: string;
  password: string;
  sender: string | undefined;
}) => {
  const router = useRouter();
  const accessSecret = () => {
    const params = new URLSearchParams();
    params.set('name', name);
    params.set('password', password);
    const normalizedSender = normalizeSender(sender);
    if (normalizedSender !== undefined) {
      params.set('sender', normalizedSender);
    }
    router.push(`/display?${params.toString()}`);
  };

  return (
    <>
      {senderLabel(sender)} sent you a secret
      <button className={styles.button} onClick={accessSecret}>
        Access Secret
      </button>
    </>
  );
};

const AccessPage: NextPage = () => {
  const router = useRouter();
  const nameParam = router.query['name'];
  const name = typeof nameParam === 'string' ? nameParam : undefined;
  const passwordParam = router.query['password'];
  const password =
    typeof passwordParam === 'string' ? passwordParam : undefined;
  const senderParam = router.query['sender'];
  const sender = typeof senderParam === 'string' ? senderParam : undefined;

  if (!name) {
    return (
      <Whisper>
        <div className={styles.description}>Loading...</div>
      </Whisper>
    );
  }

  return (
    <Whisper>
      {password !== undefined ? (
        <AccessButton name={name} password={password} sender={sender} />
      ) : (
        <PasswordInput name={name} sender={sender} />
      )}
    </Whisper>
  );
};

export default AccessPage;
