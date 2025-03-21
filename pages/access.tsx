import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import React from 'react';

const PasswordInput = ({ name }: { name: string }) => {
  const [inputPassword, setInputPassword] = useState<string>('');
  const router = useRouter();

  return (
    <>
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
          router.push(`/display?name=${name}&password=${inputPassword}`);
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
}: {
  name: string;
  password: string;
}) => {
  const router = useRouter();
  return (
    <>
      Someone whispered a secret to you
      <button
        className={styles.button}
        onClick={() => {
          router.push(`/display?name=${name}&password=${password}`);
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
        <AccessButton name={name} password={password} />
      ) : (
        <PasswordInput name={name} />
      )}
    </Whisper>
  );
};

export default AccessPage;
