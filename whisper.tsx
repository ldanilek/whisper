import styles from './styles/Home.module.css';
import Head from 'next/head';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Whisper = ({ children }: any) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Whisper</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
          key="viewport"
        />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={styles.title}>
          Whisper
        </a>
        <div className={styles.subtitle}>
          frictionless end-to-end encrypted secret sharing
        </div>
      </div>
      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div>
          <a
            href="https://www.convex.dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by{' '}
            <span className={styles.logo}>
              <picture>
                <source
                  media="(prefers-color-scheme: dark)"
                  srcSet="/convex-dark.svg"
                />
                <img
                  src="/convex.svg"
                  alt="Convex Logo"
                  width={90}
                  height={18}
                />
              </picture>
            </span>
          </a>
          <a href="https://github.com/ldanilek/whisper/blob/main/README.md">
            Open sourced&nbsp;
            <span className={styles.footerLink}>on Github</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Whisper;
