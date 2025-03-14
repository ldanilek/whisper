import type { GetServerSideProps, NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect } from 'react';
import { hashPassword } from '../common';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import React from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

const Attachment = ({
  url,
  filename,
  password,
}: {
  url: string | null;
  filename: string;
  password: string;
}) => {
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  filename = filename ? filename : 'unnamed';
  useEffect(() => {
    if (!url) {
      return;
    }
    fetch(url).then(async (resp) => {
      const b = await resp.blob();
      const encrypted = await b.text(); // `encrypted` is base64
      const decrypted = CryptoJS.AES.decrypt(encrypted, password);
      const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8); // this is also base64
      const decoded = Buffer.from(decryptedStr, 'base64');
      const blob = new Blob([decoded]);
      setFileBlob(blob);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, filename]);
  if (url === null) {
    return (
      <span>
        <br />
        {`missing attachment '${filename}'`}
      </span>
    );
  }
  if (fileBlob === null) {
    return (
      <span>
        <br />
        {`Loading attachment ${filename}`}
      </span>
    );
  }
  const blobURL = window.URL.createObjectURL(fileBlob);
  return (
    <span>
      <br />
      <a className={styles.secretAttachment} href={blobURL} download={filename}>
        {filename}
      </a>
    </span>
  );
};

const SecretDisplay = ({
  name,
  accessKey,
  password,
}: {
  name: string;
  accessKey: string;
  password: string;
}) => {
  const { encryptedSecret, storageURLs } = useQuery(api.readSecret.default, {
    whisperName: name,
    accessKey,
    passwordHash: hashPassword(password),
  }) ?? { encryptedSecret: undefined, storageURLs: [] };
  if (!encryptedSecret) {
    return (
      <div className={styles.secretDisplay + ' ' + styles.secretOutput}>
        {'Loading...'}
      </div>
    );
  }
  let decryptedSecret: string = CryptoJS.AES.decrypt(
    encryptedSecret,
    password
  ).toString(CryptoJS.enc.Utf8);
  const attachments = [];
  for (const [storageId, url] of Object.entries(storageURLs)) {
    console.log('storageURL', url);
    const matches =
      decryptedSecret.match(
        new RegExp(`Attachment: '[0-9a-fA-F]*' ${storageId}`)
      ) ?? [];
    for (const match of matches) {
      let filenameHex = match.match(/'[0-9a-fA-F]*'/)![0];
      filenameHex = filenameHex.slice(1, filenameHex.length - 1);
      const filename = Buffer.from(filenameHex, 'hex').toString();
      attachments.push(
        <Attachment
          key={storageId}
          url={url}
          filename={filename}
          password={password}
        />
      );
      decryptedSecret = decryptedSecret.replace(match, '');
    }
  }
  return (
    <div className={styles.secretDisplay + ' ' + styles.secretOutput}>
      {decryptedSecret}
      {attachments}
    </div>
  );
};

const getGeolocation = async (): Promise<string | null> => {
  if (!navigator.geolocation) {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const positionString = `Latitude ${position.coords.latitude.toFixed(
          3
        )}, Longitude ${position.coords.longitude.toFixed(3)}`;
        resolve(positionString);
      },
      () => {
        resolve(null);
      }
    );
  });
};

const ExpirationDisplay = ({
  whisperName,
  passwordHash,
}: {
  whisperName: string;
  passwordHash: string;
}) => {
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const expiration = useQuery(api.readExpirationError.default, {
    name: whisperName,
    passwordHash,
    currentTime,
  });
  const [expirationText, setExpirationText] = useState<string | null>(null);
  useEffect(() => {
    if (expiration === undefined) {
      return;
    }
    const [newExpirationText, refresh] = expiration;
    if (refresh) {
      setTimeout(() => {
        setCurrentTime(new Date().getTime());
      }, refresh - new Date().getTime());
    }
    if (newExpirationText) {
      setExpirationText(newExpirationText);
    }
  }, [expiration]);
  return (
    <div className={styles.description}>
      {expirationText ? expirationText : 'Loading...'}
    </div>
  );
};

type ExpirationWrapperProps = {
  whisperName: string;
  passwordHash: string;
  inputError: string | null;
  children?: React.ReactNode;
};

type ExpirationWrapperState = {
  caughtError: string;
};

class ExpirationWrapper extends React.Component<
  ExpirationWrapperProps,
  ExpirationWrapperState
> {
  constructor(props: ExpirationWrapperProps) {
    super(props);
    this.state = { caughtError: '' };
  }

  render() {
    if (this.state.caughtError) {
      console.error(this.state.caughtError);
      // Avoid loops in case ExpirationDisplay is throwing "invalid password" errors.
      return (
        <Whisper>
          <div>{this.state.caughtError}</div>
          <div>Try again.</div>
        </Whisper>
      );
    }
    if (this.props.inputError) {
      console.error(this.props.inputError);
      return (
        <Whisper>
          <ExpirationDisplay
            whisperName={this.props.whisperName}
            passwordHash={this.props.passwordHash}
          />
        </Whisper>
      );
    }
    return <Whisper>{this.props.children}</Whisper>;
  }

  // This is why it needs to be a class component.
  static getDerivedStateFromError(error: { data?: string }) {
    console.log('getDerivedStateFromError');
    let caughtError = error.data;
    if (!caughtError) {
      caughtError = 'ERROR';
    }
    return { caughtError };
  }
}

interface AccessPageProps {
  accessKey: string | null;
  accessError: string | null;
  requestGeolocation: boolean;
}

const AccessPage: NextPage<AccessPageProps> = ({
  accessKey,
  accessError,
  requestGeolocation,
}) => {
  const router = useRouter();
  const [name, setName] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const recordGeolocation = useMutation(api.recordAccessGeolocation.default);
  const recordGeolocationForFailure = useMutation(
    api.recordAccessGeolocation.forFailure
  );
  const [inputPassword, setInputPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(accessError);
  useEffect(() => {
    const passwordParam = router.query['password'] as string;
    setPassword(passwordParam);
    const nameParam = router.query['name'] as string;
    setName(nameParam);
    if (nameParam === undefined) {
      return;
    }
    if (passwordParam && !accessError && requestGeolocation) {
      getGeolocation().then((position) => {
        recordGeolocation({
          whisperName: nameParam,
          accessKey: accessKey!,
          geolocation: position,
          passwordHash: hashPassword(passwordParam),
        }).catch((err) => {
          setError(err.toString());
        });
      });
    }
    if (accessError && requestGeolocation) {
      getGeolocation().then((position) => {
        recordGeolocationForFailure({
          whisperName: nameParam,
          accessKey: accessKey!,
          geolocation: position,
        }).catch((err) => console.error(err));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (error) {
    return (
      <ExpirationWrapper
        inputError={error}
        whisperName={name ?? ''}
        passwordHash={hashPassword(password ?? '')}
      ></ExpirationWrapper>
    );
  }

  if (name && !password) {
    console.log('requesting password');
    return (
      <Whisper>
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
          onClick={() =>
            router.push(`/access?name=${name}&password=${inputPassword}`)
          }
        >
          Access Secret
        </button>
      </Whisper>
    );
  }

  if (!(name && accessKey && password)) {
    return (
      <Whisper>
        <div className={styles.description}>Loading...</div>
      </Whisper>
    );
  }

  return (
    <ExpirationWrapper
      inputError={error}
      whisperName={name}
      passwordHash={hashPassword(password)}
    >
      Someone whispered this secret to you
      <SecretDisplay name={name} accessKey={accessKey} password={password} />
    </ExpirationWrapper>
  );
};

export const getServerSideProps: GetServerSideProps<AccessPageProps> = async ({
  req,
}) => {
  if (req === undefined) {
    return { props: { ip: null, accessKey: null, accessError: null, requestGeolocation: false } };
  }
  const ip =
    (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || null;
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const name = url.searchParams.get('name')!;
  const password = url.searchParams.get('password')!;
  if (!password) {
    return { props: { accessKey: null, accessError: null, requestGeolocation: false } };
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (!process.env.SSR_KEY) {
    throw new Error('need SSR_KEY');
  }
  const accessKey = uuidv4();
  const passwordHash = hashPassword(password);
  const { accessError, requestGeolocation } = await convex.mutation(
    api.accessWhisper.default,
    {
      whisperName: name,
      passwordHash,
      accessKey,
      ip,
      ssrKey: process.env.SSR_KEY!,
    }
  );
  return { props: { accessKey, accessError, requestGeolocation } };
};

export default AccessPage;
