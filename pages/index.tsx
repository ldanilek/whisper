import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useCallback, useState } from 'react'
import { createWhisper } from '../common'

const Home: NextPage = () => {
  const createWhisperMutation = useMutation('createWhisper');
  const [secret, setSecret] = useState('');
  const [url, setUrl] = useState('');
  const create = async () => {
    const url = await createWhisper(secret, createWhisperMutation);
    setUrl(url);
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Whisper</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Whisper
        </h1>

        Type secret
        <textarea placeholder='secret' value={secret} onChange={(e) => setSecret(e.target.value)} />
        <button className={styles.button} onClick={create}>
          Create Whisper
        </button>
        Share URL
        <p>{url}</p>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://www.convex.dev/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/convex.svg" alt="Convex Logo" width={90} height={18} />
          </span>
        </a>
      </footer>
    </div>
  )
}

export default Home
