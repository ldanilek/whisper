import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import React from 'react';

const senderMessage = (sender?: string) => {
  return `${sender ?? 'Someone'} sent you a secret`;
};

const PasswordInput = ({ name, sender }: { name: string; sender?: string }) => {
  const [inputPassword, setInputPassword] = useState<string>('');
  const router = useRouter();

  return (
    <>
      {senderMessage(sender)}
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
        onClick={() => {
          router.push({
            pathname: '/display',
            query: {
              name,
              password: inputPassword,
              ...(sender ? { sender } : {}),
            },
          });
        }}
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
  sender?: string;
}) => {
  const router = useRouter();
  return (
    <>
      {senderMessage(sender)}
      <button
        className={styles.button}
        onClick={() => {
          router.push({
            pathname: '/display',
            query: {
              name,
              password,
              ...(sender ? { sender } : {}),
            },
          });
        }}
      >
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
  const sender =
    typeof senderParam === 'string' && senderParam.trim().length > 0
      ? senderParam.trim()
      : undefined;

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
