import type { NextPage } from 'next'
import styles from '../styles/Home.module.css'
import { useMutation } from '../convex/_generated/react'
import { useState } from 'react'
import { createWhisper } from '../common'
import { expirationOptions } from '../expiration'
import { useRouter } from 'next/router'
import Whisper from '../whisper'
var CryptoJS = require("crypto-js");

const Home: NextPage = () => {
  const createWhisperMutation = useMutation('createWhisper');
  const [secret, setSecret] = useState('');
  const [expiration, setExpiration] = useState(expirationOptions[0]);
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<null | File>(null);
  const makeUploadURL = useMutation('fileUploadURL');
  const create = async () => {
    const storageIds = [];
    let fullSecret = secret;
    if (selectedFile) {
      const uploadURL = await makeUploadURL();
      const fName = selectedFile.name;
      const result = await fetch(uploadURL, {
        method: "POST",
        headers: { "Content-Type": 'application/octet-stream' },
        body: selectedFile,
      });
      const resultJson = await result.json();
      console.log(`storage result`, resultJson);
      const storageId = resultJson['storageId'];
      storageIds.push(storageId);
      const name = Buffer.from(selectedFile.name, 'ascii').toString('hex');
      console.log('file name is ', name);
      fullSecret += `\nAttachment: '${name}' ${storageId}`;
    }
    const createResponse = await createWhisper(fullSecret, storageIds, expiration, password, createWhisperMutation);
    router.push(`/created?name=${createResponse.name}&creatorKey=${createResponse.creatorKey}&password=${createResponse.password}`);
  };

  return (
    <Whisper>
        <textarea
          className={styles.secretDisplay}
          placeholder='secret'
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <div>upload secret file <input type="file" onChange={(event) => setSelectedFile(event.target.files![0])} /></div>
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
