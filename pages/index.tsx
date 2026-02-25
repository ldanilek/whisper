import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createWhisper, DraftWhisperAttachment } from '../common';
import { expirationOptions } from '../expiration';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import { api } from '../convex/_generated/api';
import { v4 as uuidv4 } from 'uuid';
import {
  WhisperContentMode,
  collectAttachmentTokenIds,
  makeAttachmentToken,
  reorderAttachmentTokens,
  splitBodyByAttachmentTokens,
} from '../secretPayload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const InlineAttachmentPreview = ({
  attachment,
}: {
  attachment: DraftWhisperAttachment;
}) => {
  const blobURL = useMemo(
    () => window.URL.createObjectURL(attachment.file),
    [attachment.file]
  );
  useEffect(() => {
    return () => window.URL.revokeObjectURL(blobURL);
  }, [blobURL]);
  if (attachment.kind === 'image') {
    return (
      <span className={styles.inlineAttachment}>
        <img
          className={styles.inlineAttachmentImage}
          src={blobURL}
          alt={attachment.file.name}
        />
      </span>
    );
  }
  return <span className={styles.inlineAttachmentFile}>{attachment.file.name}</span>;
};

const Home: NextPage = () => {
  const createWhisperMutation = useMutation(api.createWhisper.default);
  const [secretBody, setSecretBody] = useState('');
  const [secretMode, setSecretMode] = useState<WhisperContentMode>('plain');
  const [attachments, setAttachments] = useState<Array<DraftWhisperAttachment>>(
    []
  );
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [draggedAttachmentId, setDraggedAttachmentId] = useState<string | null>(
    null
  );
  const [sender, setSender] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  const [password, setPassword] = useState('');
  const [requestGeolocation, setRequestGeolocation] = useState(false);
  const secretRef = useRef<HTMLTextAreaElement | null>(null);
  const attachRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const makeUploadURL = useMutation(api.fileUploadURL.default);

  useEffect(() => {
    if (secretMode === 'plain') {
      setShowFormatMenu(false);
    }
  }, [secretMode]);

  useEffect(() => {
    const referencedAttachmentIds = new Set(collectAttachmentTokenIds(secretBody));
    setAttachments((current) =>
      current.filter((attachment) => referencedAttachmentIds.has(attachment.id))
    );
  }, [secretBody]);

  const attachmentsById = useMemo(() => {
    const mapped: Record<string, DraftWhisperAttachment> = {};
    for (const attachment of attachments) {
      mapped[attachment.id] = attachment;
    }
    return mapped;
  }, [attachments]);

  const attachmentIdsInBody = useMemo(() => {
    return collectAttachmentTokenIds(secretBody);
  }, [secretBody]);

  const bodyParts = useMemo(() => {
    return splitBodyByAttachmentTokens(secretBody);
  }, [secretBody]);

  const setSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      if (!secretRef.current) {
        return;
      }
      secretRef.current.focus();
      secretRef.current.setSelectionRange(start, end);
    });
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    if (!secretRef.current) {
      return;
    }
    const start = secretRef.current.selectionStart;
    const end = secretRef.current.selectionEnd;
    const selected = secretBody.slice(start, end);
    const nextBody = `${secretBody.slice(0, start)}${prefix}${selected}${suffix}${secretBody.slice(end)}`;
    setSecretBody(nextBody);
    setSelection(start + prefix.length, start + prefix.length + selected.length);
  };

  const addHeader = () => {
    if (!secretRef.current) {
      return;
    }
    const cursor = secretRef.current.selectionStart;
    const lineStart = secretBody.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
    const nextBody = `${secretBody.slice(0, lineStart)}# ${secretBody.slice(lineStart)}`;
    setSecretBody(nextBody);
    const nextCursor = cursor + 2;
    setSelection(nextCursor, nextCursor);
  };

  const insertLink = () => {
    if (!secretRef.current) {
      return;
    }
    const start = secretRef.current.selectionStart;
    const end = secretRef.current.selectionEnd;
    const selected = secretBody.slice(start, end) || 'link text';
    const snippet = `[${selected}](https://)`;
    const nextBody = `${secretBody.slice(0, start)}${snippet}${secretBody.slice(end)}`;
    setSecretBody(nextBody);
    const cursorStart = start + snippet.length - 1;
    const cursorEnd = cursorStart;
    setSelection(cursorStart, cursorEnd);
  };

  const removeAttachment = (id: string) => {
    setSecretBody((current) => current.replace(makeAttachmentToken(id), ''));
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id)
    );
  };

  const insertFiles = (files: Array<File>) => {
    if (!files.length) {
      return;
    }
    const start = secretRef.current?.selectionStart ?? secretBody.length;
    const end = secretRef.current?.selectionEnd ?? start;
    let nextBody = `${secretBody.slice(0, start)}${secretBody.slice(end)}`;
    let cursor = start;
    const nextAttachments: Array<DraftWhisperAttachment> = [];
    for (const file of files) {
      const attachmentId = uuidv4();
      const token = makeAttachmentToken(attachmentId);
      nextBody = `${nextBody.slice(0, cursor)}${token}${nextBody.slice(cursor)}`;
      cursor += token.length;
      nextAttachments.push({
        id: attachmentId,
        file,
        kind: file.type.startsWith('image/') ? 'image' : 'file',
      });
    }
    setSecretBody(nextBody);
    setAttachments((current) => [...current, ...nextAttachments]);
    setSelection(cursor, cursor);
  };

  const onSecretDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    insertFiles(files);
  };

  const onSecretKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (secretMode !== 'markdown') {
      return;
    }
    const command = event.metaKey || event.ctrlKey;
    if (!command) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      wrapSelection('**', '**');
      return;
    }
    if (key === 'i') {
      event.preventDefault();
      wrapSelection('*', '*');
    }
  };

  const onAttachmentInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    insertFiles(files);
    event.target.value = '';
  };

  const reorderByDrag = (targetId: string) => {
    if (!draggedAttachmentId) {
      return;
    }
    setSecretBody((current) =>
      reorderAttachmentTokens(current, draggedAttachmentId, targetId)
    );
    setDraggedAttachmentId(null);
  };

  const create = async () => {
    const createResponse = await createWhisper(
      secretBody,
      secretMode,
      attachments,
      sender,
      expiration,
      password,
      createWhisperMutation,
      makeUploadURL,
      requestGeolocation
    );
    router.push(
      `/created?name=${createResponse.name}&creatorKey=${createResponse.creatorKey}&password=${createResponse.password}`
    );
  };

  return (
    <Whisper>
      <div className={styles.editorShell}>
        <div className={styles.editorToolbar}>
          <div className={styles.editorModeToggle}>
            <button
              type="button"
              className={`${styles.editorModeButton} ${
                secretMode === 'plain' ? styles.editorModeButtonActive : ''
              }`}
              onClick={() => setSecretMode('plain')}
            >
              Plain
            </button>
            <button
              type="button"
              className={`${styles.editorModeButton} ${
                secretMode === 'markdown' ? styles.editorModeButtonActive : ''
              }`}
              onClick={() => setSecretMode('markdown')}
            >
              Markdown
            </button>
          </div>
          {secretMode === 'markdown' ? (
            <>
              <button
                type="button"
                className={styles.editorToolbarButton}
                onClick={() => wrapSelection('**', '**')}
              >
                B
              </button>
              <button
                type="button"
                className={styles.editorToolbarButton}
                onClick={() => wrapSelection('*', '*')}
              >
                I
              </button>
              <button
                type="button"
                className={styles.editorToolbarButton}
                onClick={() => setShowFormatMenu((open) => !open)}
              >
                ⋯
              </button>
            </>
          ) : (
            <div className={styles.editorToolbarHint}>plaintext mode</div>
          )}
          <button
            type="button"
            className={styles.editorToolbarButton}
            onClick={() => attachRef.current?.click()}
          >
            +
          </button>
          <input
            className={styles.hiddenInput}
            type="file"
            multiple
            ref={attachRef}
            onChange={onAttachmentInput}
          />
        </div>
        {secretMode === 'markdown' && showFormatMenu ? (
          <div className={styles.editorMenu}>
            <button
              type="button"
              className={styles.editorMenuItem}
              onClick={addHeader}
            >
              Insert header
            </button>
            <button
              type="button"
              className={styles.editorMenuItem}
              onClick={insertLink}
            >
              Insert link
            </button>
            <button
              type="button"
              className={styles.editorMenuItem}
              onClick={() => wrapSelection('$', '$')}
            >
              Inline LaTeX
            </button>
            <button
              type="button"
              className={styles.editorMenuItem}
              onClick={() => attachRef.current?.click()}
            >
              Insert file or image
            </button>
          </div>
        ) : null}
        <textarea
          ref={secretRef}
          className={`${styles.secretDisplay} ${styles.editorInput}`}
          placeholder="secret"
          value={secretBody}
          onChange={(e) => setSecretBody(e.target.value)}
          onKeyDown={onSecretKeyDown}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onSecretDrop}
        />
        <div className={styles.editorHint}>
          Drag files and images into the input to place them inline.
        </div>
        {attachmentIdsInBody.length > 1 ? (
          <div className={styles.attachmentOrderRow}>
            {attachmentIdsInBody.map((id, index) => {
              const attachment = attachmentsById[id];
              if (!attachment) {
                return null;
              }
              return (
                <div
                  key={`${id}-${index}`}
                  className={styles.attachmentOrderItem}
                  draggable
                  onDragStart={() => setDraggedAttachmentId(id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    reorderByDrag(id);
                  }}
                  onDragEnd={() => setDraggedAttachmentId(null)}
                >
                  <span>{attachment.file.name}</span>
                  <button
                    type="button"
                    className={styles.attachmentOrderRemove}
                    onClick={() => removeAttachment(id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        <div
          className={`${styles.secretDisplay} ${styles.secretOutput} ${styles.editorPreview} ${
            secretMode === 'markdown' ? styles.editorPreviewMarkdown : ''
          }`}
        >
          {bodyParts.map((part, index) => {
            if (part.type === 'attachment') {
              const attachment = attachmentsById[part.id];
              if (!attachment) {
                return (
                  <span key={`${part.id}-${index}`} className={styles.attachmentMissing}>
                    [missing attachment]
                  </span>
                );
              }
              return (
                <InlineAttachmentPreview
                  key={`${part.id}-${index}`}
                  attachment={attachment}
                />
              );
            }
            if (part.value.length === 0) {
              return null;
            }
            if (secretMode === 'markdown') {
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
          })}
        </div>
      </div>
      <div>
        sender{' '}
        <input
          type="text"
          className={styles.passwordInput}
          placeholder="your name (optional)"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
      </div>
      <div>
        <span>expires&nbsp;</span>
        <select
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
        >
          {expirationOptions.map((o) => (
            <option value={o} key={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div>
        password{' '}
        <input
          placeholder="leave blank to generate random"
          type="text"
          className={styles.passwordInput}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label>
          request geolocation{' '}
          <input
            type="checkbox"
            checked={requestGeolocation}
            onChange={(e) => setRequestGeolocation(e.target.checked)}
          />
        </label>
      </div>
      <button className={styles.button} onClick={create}>
        Create Whisper
      </button>
    </Whisper>
  );
};

export default Home;
