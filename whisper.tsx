import styles from './styles/Home.module.css'
import Head from 'next/head'
import Image from 'next/image'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Whisper = ({ children }: any) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Whisper</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.header}>
      { /* eslint-disable-next-line @next/next/no-html-link-for-pages */ }
      <a href="/" className={styles.title}>
        Whisper
      </a>
      <div className={styles.subtitle}>frictionless end-to-end encrypted secret sharing</div>
      </div>
      <main className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div>
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
          <a href="https://github.com/ldanilek/whisper/blob/main/README.md">
            Open sourced&nbsp;<span className={styles.footerLink}>on Github</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

export default Whisper
