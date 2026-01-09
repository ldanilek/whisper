import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { createWhisper } from '../common';
import { expirationOptions } from '../expiration';
import { useRouter } from 'next/router';
import Whisper from '../whisper';
import { api } from '../convex/_generated/api';

const Home: NextPage = () => {
  const createWhisperMutation = useMutation(api.createWhisper.default);
  const [secret, setSecret] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  const [password, setPassword] = useState('');
  const [requestGeolocation, setRequestGeolocation] = useState(false);
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<null | File>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const makeUploadURL = useMutation(api.fileUploadURL.default);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const create = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const createResponse = await createWhisper(
      secret,
      selectedFile,
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
      <div className={styles.formCard}>
        <textarea
          className={styles.secretDisplay}
          placeholder="Enter your secret..."
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Attach secret file</span>
          <label
            className={`${styles.filePicker} ${isDragging ? styles.filePickerDragging : ''} ${selectedFile ? styles.filePickerHasFile : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              className={styles.fileInput}
              onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
            />
            <span className={styles.filePickerIcon}>
              {selectedFile ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </span>
            <span className={styles.filePickerLabel}>
              {selectedFile ? selectedFile.name : 'Choose a file'}
            </span>
            <span className={styles.filePickerHint}>
              {selectedFile ? 'Click to change' : 'or drag and drop'}
            </span>
          </label>
        </div>
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Expires</span>
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
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Password</span>
          <input
            placeholder="Leave blank to generate random"
            type="text"
            className={styles.passwordInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formRow} style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requestGeolocation}
              onChange={(e) => setRequestGeolocation(e.target.checked)}
            />
            <span className={styles.formLabel}>Request geolocation</span>
          </label>
        </div>
        <button
          className={styles.button}
          onClick={create}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Whisper'}
        </button>
      </div>
    </Whisper>
  );
};

export default Home;
