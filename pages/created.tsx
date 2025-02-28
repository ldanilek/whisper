import type { NextPage } from 'next'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from 'convex/react'
import { useState, useEffect } from 'react'
import { makeURL } from '../common'
import { useRouter } from 'next/router'
import Whisper from '../whisper'
import { api } from '../convex/_generated/api'

const AccessLog = ({whisperName, creatorKey}: {whisperName: string, creatorKey: string}) => {
  const accessDocs = useQuery(api.readAccessLog.default, {name: whisperName, creatorKey}) || [];
  const [currentTime, setCurrentTime] = useState((new Date()).getTime());
  const expiration = useQuery(api.readExpiration.default, {name: whisperName, creatorKey, currentTime});
  const [expirationText, setExpirationText] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const expireNow = useMutation(api.expireNow.default);
  const accessFailureDocs = useQuery(api.readAccessLog.failures, {name: whisperName, creatorKey}) || [];
  useEffect(() => {
    if (expiration === undefined) {
      return;
    }
    const nextTime = expiration[1];
    setExpirationText(expiration[0]);
    setIsExpired(expiration[2]);
    if (nextTime) {
      setTimeout(() => {
        setCurrentTime((new Date()).getTime());
      }, nextTime - (new Date()).getTime());
    }
  }, [expiration]);
  return (<div className={styles.accessLog}>
    <p>{accessDocs.length} {accessDocs.length === 1 ? "access" : "accesses"}; {expirationText ?? ''}</p>
    {
      isExpired ? // already expired
      null :
      <div><button className={styles.button} onClick={() => expireNow({whisperName, creatorKey})}>Expire Now</button></div>
    }
    <table className={styles.accessLogTable}>
      <thead>
        <tr>
          <td>Access time</td>
          <td>Location</td>
          <td>IP</td>
        </tr>
      </thead>
      <tbody>
        {accessDocs.map((accessDoc) =>
          <tr key={accessDoc._id}>
            <td className={styles.accessLogEntry}>{(new Date(accessDoc._creationTime)).toLocaleString()}</td>
            <td className={styles.accessLogEntry}><Location geolocation={accessDoc.geolocation} /></td>
            <td className={styles.accessLogEntry}>{accessDoc.ip}</td>
          </tr>
        )}
      </tbody>
    </table>
    {
      accessFailureDocs.length ?
      <><p>Failed access attempts</p>
      <table className={styles.accessLogTable}>
        <thead>
          <tr>
            <td>Failure reason</td>
            <td>Time</td>
            <td>Location</td>
            <td>IP</td>
          </tr>
        </thead>
        <tbody>
        {
          accessFailureDocs.map((accessFailureDoc) =>
            <tr key={accessFailureDoc._id}>
              <td className={styles.accessLogEntry}>{accessFailureDoc.reason}</td>
              <td className={styles.accessLogEntry}>{new Date(accessFailureDoc._creationTime).toLocaleString()}</td>
              <td className={styles.accessLogEntry}><Location geolocation={accessFailureDoc.geolocation} /></td>
              <td className={styles.accessLogEntry}>{accessFailureDoc.ip}</td>
            </tr>
          )
        }
        </tbody>
      </table>
      </>
      : null
    }
  </div>);
};

const Location = ({geolocation}: {geolocation?: string | null}) => {
  if (!geolocation) {
    return null;
  }
  const regex = /Latitude\s+([\d.-]+),\s*Longitude\s+([\d.-]+)/;
  const matches = geolocation.match(regex);
  if (!matches) {
    return null;
  }

  const latitude = matches[1];
  const longitude = matches[2];
  
  return <a target='_blank' rel="noopener noreferrer"
    href={`https://maps.google.com/?q=${latitude},${longitude}`}
  >{geolocation}</a>;
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
    const nameParam = router.query['name'] as string;
    const passwordParam = router.query['password'] as string;
    const creatorKeyParam = router.query['creatorKey'] as string;
    setName(nameParam);
    setCreatorKey(creatorKeyParam);
    setPassword(passwordParam);
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
