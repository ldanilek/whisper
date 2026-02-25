export type WhisperContentMode = 'plain' | 'markdown';

export type StoredAttachment = {
  id: string;
  storageId: string;
  fileNameHex: string;
  contentType: string;
  kind: 'image' | 'file';
};

export type WhisperPayloadV2 = {
  version: 2;
  mode: WhisperContentMode;
  body: string;
  attachments: Array<StoredAttachment>;
};

export type BodyPart =
  | { type: 'text'; value: string }
  | { type: 'attachment'; id: string };

export const whisperPayloadPrefix = '__WHISPER_PAYLOAD_V2__:';
export const attachmentTokenPattern = /\[\[attachment:([0-9a-fA-F-]+)\]\]/g;

export const makeAttachmentToken = (id: string): string => {
  return `[[attachment:${id}]]`;
};

export const encodeWhisperPayload = (payload: WhisperPayloadV2): string => {
  return `${whisperPayloadPrefix}${JSON.stringify(payload)}`;
};

export const decodeWhisperPayload = (
  decryptedSecret: string
): WhisperPayloadV2 | null => {
  if (!decryptedSecret.startsWith(whisperPayloadPrefix)) {
    return null;
  }
  const payload = JSON.parse(
    decryptedSecret.slice(whisperPayloadPrefix.length)
  ) as WhisperPayloadV2;
  if (payload.version !== 2) {
    return null;
  }
  return payload;
};

export const splitBodyByAttachmentTokens = (body: string): Array<BodyPart> => {
  const parts: Array<BodyPart> = [];
  let lastIndex = 0;
  const regex = new RegExp(attachmentTokenPattern.source, 'g');
  for (const match of body.matchAll(regex)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({
        type: 'text',
        value: body.slice(lastIndex, start),
      });
    }
    parts.push({
      type: 'attachment',
      id: match[1],
    });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < body.length || body.length === 0) {
    parts.push({
      type: 'text',
      value: body.slice(lastIndex),
    });
  }
  return parts;
};

export const collectAttachmentTokenIds = (body: string): Array<string> => {
  return [...body.matchAll(new RegExp(attachmentTokenPattern.source, 'g'))].map(
    (match) => match[1]
  );
};

export const reorderAttachmentTokens = (
  body: string,
  fromId: string,
  toId: string
): string => {
  if (fromId === toId) {
    return body;
  }
  const tokenIds = collectAttachmentTokenIds(body);
  const fromIndex = tokenIds.indexOf(fromId);
  const toIndex = tokenIds.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1) {
    return body;
  }
  tokenIds.splice(fromIndex, 1);
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  tokenIds.splice(adjustedToIndex, 0, fromId);
  let cursor = 0;
  return body.replace(new RegExp(attachmentTokenPattern.source, 'g'), () => {
    const id = tokenIds[cursor];
    cursor += 1;
    return makeAttachmentToken(id);
  });
};
