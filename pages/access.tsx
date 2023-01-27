import type { GetServerSideProps, NextPage } from 'next'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useState, useEffect } from 'react'
import { accessWhisper, hashPassword } from '../common'
import { useRouter } from 'next/router'
import Whisper from '../whisper'
import React from 'react'
var CryptoJS = require("crypto-js");


const SecretDisplay = ({name, accessKey, password}: {name: string, accessKey: string, password: string}) => {
  const encryptedSecret = useQuery('readSecret', name, accessKey);
  return <div className={styles.secretDisplay + ' ' + styles.secretOutput}>{
    encryptedSecret ? CryptoJS.AES.decrypt(encryptedSecret, password).toString(CryptoJS.enc.Utf8) : "Loading..."
  }</div>;
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


const AccessPage: NextPage = ({ip}: any) => {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const accessWhisperMutation = useMutation('accessWhisper');
  const [inputPassword, setInputPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  useEffect(() => {
    let password = router.query['password'] as string;
    setPassword(password);
    let name = router.query['name'] as string;
    setName(name);
    if (name === undefined) {
      return;
    }
    let accessKey = router.query["accessKey"] as string;
    setAccessKey(accessKey);
    if (password && !accessKey) {
      getGeolocation().then((position) => {
        accessWhisper(name, password, position as string | null, ip as string | null, accessWhisperMutation).then((accessKey) => {
          router.push(`/access?name=${name}&accessKey=${accessKey}&password=${password}`);
        }, (err) => {
          setError(err.toString());
        })
      });
    }
  }, [router]);

  if (error) {
    return <ExpirationWrapper inputError={error} whisperName={name ?? ''} passwordHash={hashPassword(password ?? '')}></ExpirationWrapper>;
  }

  if (name && !password) {
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
  const ip = req.headers["x-real-ip"] || req.socket.remoteAddress || null;
  return { props: {ip} };
}

export default AccessPage
