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
    <p>{accessDocs.length} Accesses</p>
    {accessDocs.map((accessDoc) =>
      <div key={accessDoc._id.toString()} className={styles.accessLogEntry}>
        {(new Date(accessDoc._creationTime)).toString()}
        {accessDoc.geolocation ? ' at ' + accessDoc.geolocation : null}
        {accessDoc.ip ? ' from ' + accessDoc.ip : null}
      </div>
    )}
  </div>);
};

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
    if (name === undefined || creatorKey === undefined || password === undefined) {
      return;
    }
  }, [router]);
  const copy = () => {
    if (name === undefined || password === undefined) {
      return;
    }
    navigator.clipboard.writeText(makeURL(name, password));
  };

  return (
    <Whisper>
        {
          (name && password && creatorKey) ? (
            <div className={styles.description}>
              Share this URL
            <div className={styles.shareURL}>{makeURL(name, password)}</div>
            <button className={styles.button} onClick={copy}>
              Copy to Clipboard
            </button>
            <AccessLog whisperName={name} creatorKey={creatorKey} />
            </div>
          ) : null
        }
      </Whisper>
  )
}

export default Created
