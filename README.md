# Whisper

Securely send secrets with low friction.

Send with the security of end-to-end encryption.

No need to log in! Share a secret in two steps:

1. Type your secret at whisper-convex.vercel.app
2. Send the URL to the recipient via Slack/Email/etc.

## Access Control and Observation

The creator can set the whisper's password, or leave blank for a random password.

You can configure the whisper so it expires after a number of accesses (default 1) or certain time.

After sending the whisper, you can see when it is accessed.
And you can trigger immediate expiration.

## Receiving a Whisper

Open the URL to see the secret.

## How it works

Whisper uses [Convex](https://www.convex.dev) to store secrets.

To create a Whisper, the client generates data:

1. Generate a name to identify the whisper.
2. Generate a random creator key, that will be stored in Convex, to identify the creator -- allowing them to view accesses or delete the whisper.
3. Generate a random password, or use password typed by the creator. This password will be sent to the recipient but only its hash will be stored in Convex.
4. Encrypt the Whisper secret with the password.
5. Send name, creator key, password hash, and encrypted secret to Convex's `createWhisper` mutation.

For the recipient to access a Whisper:

1. URL contains the whisper name.
2. Generate a random access key, that will be stored in Convex, to identify the access (note we can't both read the whisper and record the access because mutations can't return anything).
3. Get the password, either from the URL or entered separately.
4. Send the name, access key, and hash of password to Convex's `accessWhisper` mutation.
5. Receive the encrypted secret from Convex's `readSecret` query, by passing up the name and access key.
6. Decrypt the secret with the password.

### Why is this secure?

- The secret is only stored in plaintext within the creator and recipient browsers. On the wire and in Convex it is encrypted with the password.
- The password is only stored in plaintext within the creator and recipient browsers. On the wire and in Convex it is hashed with sha256.

Somehow the creator needs to send the password to the recipient.
They can send through any means, including speech.

If it is sent through an insecure channel and accessed by an eavesdropper, the creator can see the access,
and the recipient may notice that the secret has pre-emptively expired.

# TODO

- Show accesses
- Expire after access count
- Expire after time
- Expire manually
- Make text boxes bigger and nicer
- Custom password
