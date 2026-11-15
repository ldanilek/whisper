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
      <h1 className={styles.pageTitle}>Someone whispered a secret to you</h1>
      <div className={styles.passwordRow}>
        <label className={styles.fieldLabel} htmlFor="access-password">
          Password
        </label>
        <input
          id="access-password"
          type="text"
          value={inputPassword}
          onChange={(e) => setInputPassword(e.target.value)}
        />
        <button
          className={styles.button}
          onClick={() => {
            router.push(`/display?name=${name}&password=${inputPassword}`);
          }}
        >
          Access Secret
        </button>
      </div>
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
      <h1 className={styles.pageTitle}>Someone whispered a secret to you</h1>
      <button
        className={`${styles.button} ${styles.primaryAction}`}
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
        <div className={styles.statusText}>Loading...</div>
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
