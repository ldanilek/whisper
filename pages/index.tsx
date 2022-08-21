import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useQuery, useMutation } from '../convex/_generated/react'
import { useCallback, useState } from 'react'
import { createWhisper } from '../common'
import { useRouter } from 'next/router'

const Home: NextPage = () => {
  const createWhisperMutation = useMutation('createWhisper');
  const [secret, setSecret] = useState('');
  const [url, setUrl] = useState('');
  const router = useRouter();
  const create = async () => {
    const url = await createWhisper(secret, createWhisperMutation);
    setUrl(url);
  }
  const copy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Whisper</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.header}>
      <div className={styles.title}>
        Whisper
      </div>
      </div>
      <main className={styles.main}>
        <textarea className={styles.secretDisplay} placeholder='secret' value={secret} onChange={(e) => setSecret(e.target.value)} />
        <button className={styles.button} onClick={create}>
          Create Whisper
        </button>
        {
          url ? (
            <div className={styles.description}>
              Share this URL
            <div className={styles.shareURL}>{url}</div>
            <button className={styles.button} onClick={copy}>
              Copy to Clipboard
            </button>
            </div>
          ) : null
        }
        
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
