import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import React from 'react';

const PasswordInput = ({ name }: { name: string }) => {
  const [inputPassword, setInputPassword] = useState<string>('');
  const [isAccessing, setIsAccessing] = useState(false);
  const router = useRouter();

  return (
    <div className={styles.formCard}>
      <p className={styles.description} style={{ margin: 0 }}>
        Enter the password to access this secret
      </p>
      <div className={styles.formGroup}>
        <span className={styles.formLabel}>Password</span>
        <input
          type="password"
          className={styles.passwordInput}
          placeholder="Enter password"
          value={inputPassword}
          onChange={(e) => setInputPassword(e.target.value)}
        />
      </div>
      <button
        className={styles.button}
        onClick={() => {
          if (isAccessing) return;
          setIsAccessing(true);
          router.push(`/display?name=${name}&password=${inputPassword}`);
        }}
        disabled={isAccessing}
      >
        {isAccessing ? 'Accessing...' : 'Access Secret'}
      </button>
    </div>
  );
};

const AccessButton = ({
  name,
  password,
}: {
  name: string;
  password: string;
}) => {
  const [isAccessing, setIsAccessing] = useState(false);
  const router = useRouter();
  return (
    <div className={styles.formCard}>
      <p className={styles.description} style={{ margin: 0 }}>
        Someone whispered a secret to you
      </p>
      <button
        className={styles.button}
        onClick={() => {
          if (isAccessing) return;
          setIsAccessing(true);
          router.push(`/display?name=${name}&password=${password}`);
        }}
        disabled={isAccessing}
      >
        {isAccessing ? 'Accessing...' : 'Access Secret'}
      </button>
    </div>
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
