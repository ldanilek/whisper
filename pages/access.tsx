import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useCallback, useState, useEffect } from 'react'
import { accessWhisper, readWhisper } from '../common'
import { useRouter } from 'next/router'
import Whisper from '../whisper'


const SecretDisplay = ({name, accessKey, password}: {name: string, accessKey: string, password: string}) => {
  const secret = useQuery('readSecret', name, accessKey);
  return <div className={styles.secretDisplay + ' ' + styles.secretOutput}>{secret ? readWhisper(secret, password) : "Loading..."}</div>
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


const AccessPage: NextPage = ({ip}: any) => {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const accessWhisperMutation = useMutation('accessWhisper');
  useEffect(() => {
    let name = router.query['name'] as string;
    setName(name);
    if (name === undefined) {
      return;
    }
    let password = router.query['password'] as string;
    setPassword(password);
    let accessKey = router.query["accessKey"] as string;
    setAccessKey(accessKey);
    if (password && !accessKey) {
      getGeolocation().then((position) => {
        accessWhisper(name, password, position as string | null, ip as string | null, accessWhisperMutation).then((accessKey) => {
          router.push(`/access?name=${name}&accessKey=${accessKey}&password=${password}`);
        })
      });
      return;
    }
  }, [router]);

  return (
    <Whisper>
        Someone whispered this secret to you
        {
          name && accessKey && password ?
          <SecretDisplay name={name} accessKey={accessKey} password={password} /> :
          <div>"Loading..."</div>
        }
    </Whisper>
  )
}

export const getServerSideProps: GetServerSideProps = async ({req}) => {
  if (req === undefined) {
    return { props: {ip: null} };
  }
  const ip = req.headers["x-real-ip"] || req.socket.remoteAddress;
  return { props: {ip} };
}

export default AccessPage