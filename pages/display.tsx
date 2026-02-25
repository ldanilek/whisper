import type { GetServerSideProps, NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect, useMemo } from 'react';
import { hashPassword } from '../common';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import React from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  decodeWhisperPayload,
  makeAttachmentToken,
  splitBodyByAttachmentTokens,
  StoredAttachment,
} from '../secretPayload';

const Attachment = ({
  url,
  filename,
  password,
  kind,
  contentType,
}: {
  url: string | null;
  filename: string;
  password: string;
  kind: 'image' | 'file';
  contentType: string;
}) => {
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  filename = filename ? filename : 'unnamed';
  useEffect(() => {
    if (!url) {
      return;
    }
    fetch(url).then(async (resp) => {
      const b = await resp.blob();
      const encrypted = await b.text(); // `encrypted` is base64
      const decrypted = CryptoJS.AES.decrypt(encrypted, password);
      const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8); // this is also base64
      const decoded = Buffer.from(decryptedStr, 'base64');
      const blob = new Blob([decoded], { type: contentType });
      setFileBlob(blob);
    });
  }, [url, filename, password, contentType]);
  const blobURL = useMemo(() => {
    if (!fileBlob) {
      return null;
    }
    return window.URL.createObjectURL(fileBlob);
  }, [fileBlob]);
  useEffect(() => {
    if (!blobURL) {
      return;
    }
    return () => {
      window.URL.revokeObjectURL(blobURL);
    };
  }, [blobURL]);
  if (url === null) {
    return (
      <span className={styles.attachmentMissing}>
        {`[missing attachment '${filename}']`}
      </span>
    );
  }
  if (fileBlob === null) {
    return (
      <span className={styles.attachmentLoading}>
        {`[loading attachment ${filename}]`}
      </span>
    );
  }
  if (blobURL === null) {
    return null;
  }
  if (kind === 'image') {
    return (
      <span className={styles.inlineAttachment}>
        <a className={styles.secretAttachment} href={blobURL} download={filename}>
          <img
            className={styles.inlineAttachmentImage}
            src={blobURL}
            alt={filename}
          />
        </a>
      </span>
    );
  }
  return (
    <span className={styles.inlineAttachment}>
      <a className={styles.secretAttachment} href={blobURL} download={filename}>
        {filename}
      </a>
    </span>
  );
};

const SecretDisplay = ({
  name,
  accessKey,
  password,
}: {
  name: string;
  accessKey: string;
  password: string;
}) => {
  const { encryptedSecret, encryptedSender, storageURLs } = useQuery(
    api.readSecret.default,
    {
      whisperName: name,
      accessKey,
      passwordHash: hashPassword(password),
    }
  ) ?? { encryptedSecret: undefined, encryptedSender: null, storageURLs: {} };
  if (!encryptedSecret) {
    return (
      <div className={styles.secretDisplay + ' ' + styles.secretOutput}>
        {'Loading...'}
      </div>
    );
  }
  const decryptedSender = encryptedSender
    ? CryptoJS.AES.decrypt(encryptedSender, password)
        .toString(CryptoJS.enc.Utf8)
        .trim()
    : '';
  const senderDisplay =
    decryptedSender.length > 0 ? decryptedSender : 'Someone';
  const decryptedSecret: string = CryptoJS.AES.decrypt(
    encryptedSecret,
    password
  ).toString(CryptoJS.enc.Utf8);
  const attachmentById: Record<string, StoredAttachment> = {};
  let mode: 'plain' | 'markdown' = 'plain';
  let body = decryptedSecret;
  const payload = decodeWhisperPayload(decryptedSecret);
  if (payload) {
    mode = payload.mode;
    body = payload.body;
    for (const attachment of payload.attachments) {
      attachmentById[attachment.id] = attachment;
    }
  } else {
    for (const storageId of Object.keys(storageURLs)) {
      const markerRegex = new RegExp(
        `Attachment: '([0-9a-fA-F]*)' ${storageId}`,
        'g'
      );
      body = body.replace(markerRegex, (_, fileNameHex: string) => {
        attachmentById[storageId] = {
          id: storageId,
          storageId,
          fileNameHex,
          contentType: 'application/octet-stream',
          kind: 'file',
        };
        return makeAttachmentToken(storageId);
      });
    }
  }
  const outputClassName = `${styles.secretDisplay} ${styles.secretOutput} ${
    mode === 'markdown' ? styles.secretOutputMarkdown : ''
  }`;
  const renderedParts = splitBodyByAttachmentTokens(body).map((part, index) => {
    if (part.type === 'text') {
      if (part.value.length === 0) {
        return null;
      }
      if (mode === 'markdown') {
        return (
          <ReactMarkdown
            key={`text-${index}`}
            className={styles.editorMarkdownSegment}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {part.value}
          </ReactMarkdown>
        );
      }
      return (
        <span key={`text-${index}`} className={styles.editorPlainSegment}>
          {part.value}
        </span>
      );
    }
    const attachment = attachmentById[part.id];
    if (!attachment) {
      return (
        <span key={`missing-${index}`} className={styles.attachmentMissing}>
          [missing attachment]
        </span>
      );
    }
    const filename = Buffer.from(attachment.fileNameHex, 'hex').toString('utf8');
    return (
      <Attachment
        key={`attachment-${index}`}
        url={storageURLs[attachment.storageId] ?? null}
        filename={filename}
        password={password}
        kind={attachment.kind}
        contentType={attachment.contentType}
      />
    );
  });
  return (
    <>
      <div
        className={styles.description}
      >{`${senderDisplay} whispered this secret to you`}</div>
      <div className={outputClassName}>{renderedParts}</div>
    </>
  );
};

const getGeolocation = async (): Promise<string | null> => {
  if (!navigator.geolocation) {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const positionString = `Latitude ${position.coords.latitude.toFixed(
          3
        )}, Longitude ${position.coords.longitude.toFixed(3)}`;
        resolve(positionString);
      },
      () => {
        resolve(null);
      }
    );
  });
};

const ExpirationDisplay = ({
  whisperName,
  passwordHash,
}: {
  whisperName: string;
  passwordHash: string;
}) => {
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const expiration = useQuery(api.readExpirationError.default, {
    name: whisperName,
    passwordHash,
    currentTime,
  });
  const [expirationText, setExpirationText] = useState<string | null>(null);
  useEffect(() => {
    if (expiration === undefined) {
      return;
    }
    const [newExpirationText, refresh] = expiration;
    if (refresh) {
      setTimeout(() => {
        setCurrentTime(new Date().getTime());
      }, refresh - new Date().getTime());
    }
    if (newExpirationText) {
      setExpirationText(newExpirationText);
    }
  }, [expiration]);
  return (
    <div className={styles.description}>
      {expirationText ? expirationText : 'Loading...'}
    </div>
  );
};

type ExpirationWrapperProps = {
  whisperName: string;
  passwordHash: string;
  inputError: string | null;
  children?: React.ReactNode;
};

type ExpirationWrapperState = {
  caughtError: string;
};

class ExpirationWrapper extends React.Component<
  ExpirationWrapperProps,
  ExpirationWrapperState
> {
  constructor(props: ExpirationWrapperProps) {
    super(props);
    this.state = { caughtError: '' };
  }

  render() {
    if (this.state.caughtError) {
      console.error(this.state.caughtError);
      // Avoid loops in case ExpirationDisplay is throwing "invalid password" errors.
      return (
        <Whisper>
          <div>{this.state.caughtError}</div>
          <div>Try again.</div>
        </Whisper>
      );
    }
    if (this.props.inputError) {
      console.error(this.props.inputError);
      return (
        <Whisper>
          <ExpirationDisplay
            whisperName={this.props.whisperName}
            passwordHash={this.props.passwordHash}
          />
        </Whisper>
      );
    }
    return <Whisper>{this.props.children}</Whisper>;
  }

  // This is why it needs to be a class component.
  static getDerivedStateFromError(error: { data?: string }) {
    console.log('getDerivedStateFromError');
    let caughtError = error.data;
    if (!caughtError) {
      caughtError = 'ERROR';
    }
    return { caughtError };
  }
}

interface DisplayPageProps {
  accessKey: string | null;
  accessError: string | null;
  requestGeolocation: boolean;
}

const DisplayPage: NextPage<DisplayPageProps> = ({
  accessKey,
  accessError,
  requestGeolocation,
}) => {
  const router = useRouter();
  const nameParam = router.query['name'];
  const name = typeof nameParam === 'string' ? nameParam : undefined;
  const passwordParam = router.query['password'];
  const password =
    typeof passwordParam === 'string' ? passwordParam : undefined;
  const recordGeolocation = useMutation(api.recordAccessGeolocation.default);
  const recordGeolocationForFailure = useMutation(
    api.recordAccessGeolocation.forFailure
  );
  const [error, setError] = useState<string | null>(accessError);
  useEffect(() => {
    if (name === undefined || password === undefined) {
      return;
    }
    if (requestGeolocation) {
      void (async () => {
        const position = await getGeolocation();
        if (!accessError) {
          recordGeolocation({
            whisperName: name,
            accessKey: accessKey!,
            geolocation: position,
            passwordHash: hashPassword(password),
          }).catch((err) => {
            setError(err.toString());
          });
        } else {
          recordGeolocationForFailure({
            whisperName: name,
            accessKey: accessKey!,
            geolocation: position,
          }).catch((err) => console.error(err));
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (error) {
    return (
      <ExpirationWrapper
        inputError={error}
        whisperName={name ?? ''}
        passwordHash={hashPassword(password ?? '')}
      ></ExpirationWrapper>
    );
  }

  if (!(name && accessKey && password)) {
    return (
      <Whisper>
        <div className={styles.description}>Loading...</div>
      </Whisper>
    );
  }

  return (
    <ExpirationWrapper
      inputError={error}
      whisperName={name}
      passwordHash={hashPassword(password)}
    >
      <SecretDisplay name={name} accessKey={accessKey} password={password} />
    </ExpirationWrapper>
  );
};

export const getServerSideProps: GetServerSideProps<DisplayPageProps> = async ({
  req,
}) => {
  if (req === undefined) {
    return {
      props: {
        ip: null,
        accessKey: null,
        accessError: null,
        requestGeolocation: false,
      },
    };
  }
  const ip =
    (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || null;
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const name = url.searchParams.get('name')!;
  const password = url.searchParams.get('password')!;
  if (!password) {
    return {
      props: { accessKey: null, accessError: null, requestGeolocation: false },
    };
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (!process.env.SSR_KEY) {
    throw new Error('need SSR_KEY');
  }
  const accessKey = uuidv4();
  const passwordHash = hashPassword(password);
  const { accessError, requestGeolocation } = await convex.mutation(
    api.accessWhisper.default,
    {
      whisperName: name,
      passwordHash,
      accessKey,
      ip,
      ssrKey: process.env.SSR_KEY!,
    }
  );
  return { props: { accessKey, accessError, requestGeolocation } };
};

export default DisplayPage;
