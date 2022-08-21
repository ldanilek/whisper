import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from './styles/Home.module.css'
import { useQuery, useMutation } from './convex/_generated/react'
import { useCallback, useState, useEffect } from 'react'
import { CreateResponse, createWhisper, makeURL } from './common'
import { expirationOptions } from './expiration'
import { useRouter } from 'next/router'

const Whisper = ({children}: {children: any}) => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <Head>
        <title>Whisper</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div onClick={() => router.push('/')} className={styles.header}>
      <div className={styles.title}>
        Whisper
      </div>
      </div>
      <main className={styles.main}>
        {children}
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

export default Whisper