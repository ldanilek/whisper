import type { GetServerSideProps, NextPage } from 'next'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useState, useEffect } from 'react'
import { accessWhisper, hashPassword } from '../common'
import { useRouter } from 'next/router'
import Whisper from '../whisper'
import React from 'react'
import { ConvexHttpClient } from 'convex/browser'
import { API } from '../convex/_generated/api.js'
var CryptoJS = require("crypto-js");


const SecretDisplay = ({name, accessKey, password}: {name: string, accessKey: string, password: string}) => {
  const { encryptedSecret, storageURLs } = useQuery('readSecret', name, accessKey, hashPassword(password)) ?? {encryptedSecret: undefined, storageURLs: []};
  if (!encryptedSecret) {
    return (
      <div className={styles.secretDisplay + ' ' + styles.secretOutput}>{
        "Loading..."
      }</div>
    );
  }
  let decryptedSecret: string = CryptoJS.AES.decrypt(encryptedSecret, password).toString(CryptoJS.enc.Utf8);
  const attachments = [];
  for (let [storageId, url] of Array.from(storageURLs.entries())) {
    const matches = decryptedSecret.match(new RegExp(`Attachment: '[0-9a-fA-F]*' ${storageId}`)) ?? [];
    for (let match of matches) {
      let filenameHex = match.match(/'[0-9a-fA-F]*'/)![0];
      filenameHex = filenameHex.slice(1, filenameHex.length-1);
      const filename = Buffer.from(filenameHex, 'hex').toString();
      const finalFilename = filename ? filename : 'unnamed';
      attachments.push(<br />);
      if (url === null) {
        attachments.push(<p key={storageId}>{`missing attachment '${finalFilename}'`}</p>);
      } else {
        attachments.push(<a className={styles.secretAttachment} key={storageId} href={url} download={finalFilename}>{finalFilename}</a>);
      }
      decryptedSecret = decryptedSecret.replace(match, '');
    }
  }
  return (
    <div className={styles.secretDisplay + ' ' + styles.secretOutput}>{
      decryptedSecret
    }
    {attachments}
    </div>
  );
}


const getGeolocation = async () => {
  if (!navigator.geolocation) {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const positionString = `Latitude ${position.coords.latitude.toFixed(3)}, Longitude ${position.coords.longitude.toFixed(3)}`;
        resolve(positionString);
      },
      (error) => {
        resolve(null);
      },
    );
  });
};

const ExpirationDisplay = ({whisperName, passwordHash}: {whisperName: string, passwordHash: string}) => {
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const expiration = useQuery('readExpirationError', whisperName, passwordHash, currentTime);
  const [expirationText, setExpirationText] = useState<string | null>(null);
  useEffect(() => {
    if (expiration === undefined) {
      return;
    }
    const [newExpirationText, refresh, _] = expiration;
    if (refresh) {
      setTimeout(() => {
        setCurrentTime(new Date().getTime());
      }, refresh - new Date().getTime());
    }
    if (newExpirationText) {
      setExpirationText(newExpirationText);
    }
  }, [expiration]);
  if (!expirationText) {
    return <div className={styles.description}>Loading...</div>;
  }
  return (
    <div className={styles.description}>{expirationText}</div>
  );
};

type ExpirationWrapperProps = {
  whisperName: string,
  passwordHash: string,
  inputError: string;
  children?: any;
};

type ExpirationWrapperState = {
  caughtError: string;
};

class ExpirationWrapper extends React.Component<ExpirationWrapperProps, ExpirationWrapperState> {
  constructor(props: ExpirationWrapperProps) {
    super(props);
    this.state = {caughtError: ''};
  }

  render() {
    if (this.props.inputError || this.state.caughtError) {
      if (this.props.inputError) {
        console.error(this.props.inputError);
      }
      return (
        <Whisper>
          <ExpirationDisplay whisperName={this.props.whisperName} passwordHash={this.props.passwordHash} />
        </Whisper>
      );
    }
    return <Whisper>{this.props.children}</Whisper>
  }

  // This is why it needs to be a class component.
  static getDerivedStateFromError(error: any) {
    console.log('getDerivedStateFromError');
    return {caughtError: error.toString()};
  }
}


const AccessPage: NextPage = ({accessKey, accessError}: any) => {
  const router = useRouter();
  const [name, setName] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const recordGeolocation = useMutation('recordAccessGeolocation');
  const [inputPassword, setInputPassword] = useState<string>('');
  const [error, setError] = useState<string>(accessError);
  useEffect(() => {
    let password = router.query['password'] as string;
    setPassword(password);
    let name = router.query['name'] as string;
    setName(name);
    if (name === undefined) {
      return;
    }
    if (password && !accessError) {
      getGeolocation().then((position) => {
        recordGeolocation(name, accessKey, position as string | null, hashPassword(password)).catch((err) => {
          setError(err.toString());
        })
      });
    }
  }, [router]);

  if (error) {
    return <ExpirationWrapper inputError={error} whisperName={name ?? ''} passwordHash={hashPassword(password ?? '')}></ExpirationWrapper>;
  }

  if (name && !password) {
    console.log("requesting password");
    return (
      <Whisper>
        <div>Password <input type='text' value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} />
        </div>
        <button className={styles.button} onClick={() =>
          router.push(`/access?name=${name}&password=${inputPassword}`)
        }>Access Secret</button>
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
    <ExpirationWrapper inputError={error} whisperName={name} passwordHash={hashPassword(password)}>
      Someone whispered this secret to you
      <SecretDisplay name={name} accessKey={accessKey} password={password} />
    </ExpirationWrapper>
  );
}

export const getServerSideProps: GetServerSideProps = async ({req}) => {
  if (req === undefined) {
    return { props: {ip: null} };
  }
  const ip = req.headers["x-real-ip"] as string || req.socket.remoteAddress || null;
  let url = new URL(req.url!, `http://${req.headers.host}`);
  const name = url.searchParams.get('name')!;
  const password = url.searchParams.get('password')!;
  if (!password) {
    return { props: {accessKey: null, accessError: null} };
  }
  const convex = new ConvexHttpClient<API>(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let accessKey = null;
  let accessError = null;
  await accessWhisper(name, password, ip, convex.mutation('accessWhisper')).then(
    (k) => {
      accessKey = k;
    },
    (e) => {
      accessError = e.toString();
    },
  );
  return { props: {accessKey, accessError} };
}

export default AccessPage
