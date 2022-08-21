import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useCallback, useEffect, useState } from 'react'
import { CreateResponse, createWhisper } from '../common'
import { expirationOptions } from '../expiration'
import { useRouter } from 'next/router'
import Whisper from '../whisper'

const Home: NextPage = () => {
  const createWhisperMutation = useMutation('createWhisper');
  const [secret, setSecret] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  const [password, setPassword] = useState('');
  const router = useRouter();
  const create = async () => {
    const createResponse = await createWhisper(secret, expiration, password, createWhisperMutation);
    router.push(`/created?name=${createResponse.name}&creatorKey=${createResponse.creatorKey}&password=${createResponse.password}`);
  };

  return (
    <Whisper>
        <textarea className={styles.secretDisplay} placeholder='secret' value={secret} onChange={(e) => setSecret(e.target.value)} />
        <div><span>expires&nbsp;</span>
        <select value={expiration} onChange={(e) => setExpiration(e.target.value)}>
          {
            expirationOptions.map((o) => <option value={o} key={o}>{o}</option>)
          }
        </select>
        </div>
        <div>password <input placeholder='leave blank to generate random' type='text' className={styles.passwordInput} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className={styles.button} onClick={create}>
          Create Whisper
        </button>
    </Whisper>
  )
}

export default Home
