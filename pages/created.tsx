import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useCallback, useState, useEffect } from 'react'
import { makeURL } from '../common'
import { expirationOptions } from '../expiration'
import { useRouter } from 'next/router'
import Whisper from '../whisper'

const AccessLog = ({whisperName, creatorKey}: {whisperName: string, creatorKey: string}) => {
  const accessDocs = useQuery('readAccessLog', whisperName, creatorKey);
  if (accessDocs === undefined) {
    return null;
  }
  return (<div className={styles.accessLog}>
    <p>{accessDocs.length} {accessDocs.length === 1 ? "Access" : "Accesses"}</p>
    {accessDocs.map((accessDoc) =>
      <div key={accessDoc._id.toString()} className={styles.accessLogEntry}>
        {(new Date(accessDoc._creationTime)).toString()}
        {accessDoc.geolocation ? ' at ' + accessDoc.geolocation : null}
        {accessDoc.ip ? ' from ' + accessDoc.ip : null}
      </div>
    )}
  </div>);
};

const Copiable = ({text}: {text: string}) => {
  const copy = () => {
    navigator.clipboard.writeText(text);
  };
  return (
    <div className={styles.copiable}>
    <div className={styles.shareURL}>{text}</div>
    <button className={styles.button} onClick={copy}>
      Copy to Clipboard
    </button>
    </div>
  );
}

const Created: NextPage = () => {
  const router = useRouter();
  const [name, setName] = useState<string | undefined>(undefined);
  const [creatorKey, setCreatorKey] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  useEffect(() => {
    let name = router.query['name'] as string;
    let password = router.query['password'] as string;
    let creatorKey = router.query['creatorKey'] as string;
    setName(name);
    setCreatorKey(creatorKey);
    setPassword(password);
  }, [router]);

  return (
    <Whisper>
        {
          (name && password && creatorKey) ? (
            <div className={styles.description}>
              Share this Private URL
              <Copiable text={makeURL(name, password)} />
            Or Share this Public URL and the password
            <div className={styles.sharePair}>
              <Copiable text={makeURL(name, null)} />
              <Copiable text={password} />
            </div>
            <AccessLog whisperName={name} creatorKey={creatorKey} />
            </div>
          ) : null
        }
      </Whisper>
  )
}

export default Created
