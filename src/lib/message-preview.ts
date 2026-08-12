/**
 * Centralized message type detection & preview label formatter.
 *
 * Every screen that needs a human-readable message preview should call one of
 * the helpers exported from this module instead of rolling ad-hoc switch/if
 * chains.  The detection follows a strict priority order:
 *
 *   1. Explicit `attachmentType` from the backend (`IMAGE`, `AUDIO`, `VIDEO`, `FILE`)
 *   2. MIME-type sniffing (`image/*`, `video/*`, `audio/*`)
 *   3. File extension fallback
 *   4. Generic `message.type` field (e.g. on `lastMessage` in chat list)
 *
 * Backward-compatible: old messages stored as `type: 'FILE'` or
 * `attachmentType: 'FILE'` will be re-classified using the MIME type so
 * images/voice-notes are never shown as "Document".
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMediaType =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'audio'
  | 'document'
  | 'gif'
  | 'sticker'
  | 'location'
  | 'contact';

/** Ionicons icon name — kept as string so consumers can cast if needed. */
export type MediaPreview = {
  icon: string | null;
  label: string;
};

/** Shape of a single attachment as returned by the messages API. */
export type AttachmentLike = {
  attachmentType?: string | null;
  mimeType?: string | null;
  name?: string | null;
  url?: string | null;
  durationSeconds?: number | null;
};

/** Shape of a full message (DirectMessage / GroupMessage). */
export type MessageLike = {
  content?: string | null;
  type?: string | null;
  attachments?: AttachmentLike[];
};

/** Shape of `lastMessage` on the chat list (limited fields). */
export type LastMessageLike = {
  content?: string | null;
  type?: string | null;
  attachmentType?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

/** Shape used by the in-app notification socket payload. */
export type NotificationAttachmentLike = {
  attachmentType?: string | null;
  mimeType?: string | null;
};

// ─── Preview label + icon map (NO emojis — use Ionicons) ──────────────────────

const PREVIEW_MAP: Record<ChatMediaType, MediaPreview> = {
  text:     { icon: null,             label: '' },
  image:    { icon: 'camera',         label: 'Photo' },
  video:    { icon: 'videocam',       label: 'Video' },
  voice:    { icon: 'mic',            label: 'Voice' },
  audio:    { icon: 'musical-notes',  label: 'Audio' },
  document: { icon: 'document-text',  label: 'Document' },
  gif:      { icon: 'images',         label: 'GIF' },
  sticker:  { icon: 'happy',          label: 'Sticker' },
  location: { icon: 'location',       label: 'Location' },
  contact:  { icon: 'person',         label: 'Contact' },
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'svg',
]);
const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'webm', '3gp', 'flv', 'wmv',
]);
const AUDIO_EXTENSIONS = new Set([
  'm4a', 'mp3', 'wav', 'aac', 'ogg', 'opus', 'wma', 'flac',
]);

function extensionFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match ? match[1].toLowerCase() : null;
}

function isGifMime(mime: string): boolean {
  return mime === 'image/gif';
}

// ─── Core detection ───────────────────────────────────────────────────────────

/**
 * Resolve the media type for a single attachment.
 *
 * Uses explicit `attachmentType`, then MIME type, then file extension.
 * Voice-note detection: `attachmentType === 'AUDIO'` or MIME starts with
 * `audio/` **combined with** evidence of being a recording (durationSeconds,
 * or a voice-note naming pattern).
 */
export function resolveAttachmentType(attachment: AttachmentLike): ChatMediaType {
  const at = attachment.attachmentType?.toUpperCase?.() ?? '';
  const mime = (attachment.mimeType ?? '').toLowerCase();
  const ext = extensionFromName(attachment.name);
  const name = (attachment.name ?? '').toLowerCase();

  // ── GIF (check before generic image) ──
  if (isGifMime(mime) || ext === 'gif') return 'gif';

  // ── Explicit attachmentType from backend ──
  if (at === 'IMAGE') {
    if (isGifMime(mime)) return 'gif';
    return 'image';
  }

  if (at === 'VIDEO') return 'video';

  if (at === 'AUDIO') {
    if (isVoiceNote(attachment, name)) return 'voice';
    return 'audio';
  }

  // ── MIME-based detection (covers `attachmentType === 'FILE'` or missing) ──
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';

  if (mime.startsWith('audio/')) {
    if (isVoiceNote(attachment, name)) return 'voice';
    return 'audio';
  }

  // ── Extension-based fallback ──
  if (ext && IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (ext && VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (ext && AUDIO_EXTENSIONS.has(ext)) {
    if (isVoiceNote(attachment, name)) return 'voice';
    return 'audio';
  }

  // ── Default: treat as document ──
  return 'document';
}

/**
 * Heuristic to tell apart a recorded voice note from a user-uploaded audio
 * file.  A voice note typically:
 *   - Has a `durationSeconds` field populated by the recorder
 *   - Has a filename starting with "voice-" (generated by VoiceRecorderBar)
 */
function isVoiceNote(attachment: AttachmentLike, nameLC: string): boolean {
  if (typeof attachment.durationSeconds === 'number' && attachment.durationSeconds > 0) {
    return true;
  }
  if (nameLC.startsWith('voice-')) return true;
  return false;
}

// ─── Public preview helpers ───────────────────────────────────────────────────

/**
 * Return the Ionicons icon name + text label for a given media type.
 */
export function getPreviewForMediaType(mediaType: ChatMediaType): MediaPreview {
  return PREVIEW_MAP[mediaType] ?? { icon: null, label: 'Message' };
}

/**
 * Return just the text label for a given media type (no emoji, no icon).
 */
export function getLabelForMediaType(mediaType: ChatMediaType): string {
  return PREVIEW_MAP[mediaType]?.label || 'Message';
}

/**
 * Generate a preview (icon + label) for a single attachment.
 */
export function getAttachmentPreview(attachment: AttachmentLike): MediaPreview {
  const type = resolveAttachmentType(attachment);

  // For documents, show the filename if available
  if (type === 'document' && attachment.name) {
    return { icon: 'document-text', label: attachment.name };
  }

  return getPreviewForMediaType(type);
}

/**
 * Generate a preview string (text only) for a full message object
 * (DirectMessage shape). Used by message-actions, forward-picker, etc.
 * Priority: text content → attachment label → generic fallback.
 */
export function getMessagePreview(message: MessageLike | null | undefined): string {
  if (!message) return 'Message';

  const content = message.content?.trim();
  if (content) return content;

  const attachments = message.attachments ?? [];
  if (attachments.length > 0) {
    const first = attachments[0];
    const type = resolveAttachmentType(first);

    if (type === 'image' && attachments.length > 1) {
      const imgCount = attachments.filter(
        (a) => resolveAttachmentType(a) === 'image'
      ).length;
      if (imgCount > 1) return `${imgCount} Photos`;
    }

    return getAttachmentPreview(first).label;
  }

  return 'Message';
}

/**
 * Generate a structured preview (icon + label) for a full message.
 * Used by components that render Ionicons alongside the text.
 */
export function getMessagePreviewWithIcon(message: MessageLike | null | undefined): MediaPreview {
  if (!message) return { icon: null, label: 'Message' };

  const content = message.content?.trim();
  if (content) return { icon: null, label: content };

  const attachments = message.attachments ?? [];
  if (attachments.length > 0) {
    const first = attachments[0];
    const type = resolveAttachmentType(first);

    if (type === 'image' && attachments.length > 1) {
      const imgCount = attachments.filter(
        (a) => resolveAttachmentType(a) === 'image'
      ).length;
      if (imgCount > 1) return { icon: 'camera', label: `${imgCount} Photos` };
    }

    return getAttachmentPreview(first);
  }

  return { icon: null, label: 'Message' };
}

/**
 * Generate a preview for a `lastMessage` on the chat list.
 *
 * The chat-list API returns a limited `lastMessage` shape that may not include
 * full attachment data.  We use `type`, `attachmentType`, and `mimeType` fields
 * (if present) to detect media type with backward-compat fallbacks.
 */
export function getLastMessagePreview(
  lastMessage: LastMessageLike | null | undefined,
): MediaPreview {
  if (!lastMessage) return { icon: null, label: 'No messages yet' };

  const content = lastMessage.content?.trim();
  if (content) return { icon: null, label: content };

  // Build a synthetic attachment-like object from the limited fields
  const syntheticAttachment: AttachmentLike = {
    attachmentType: lastMessage.attachmentType ?? lastMessage.type ?? null,
    mimeType: lastMessage.mimeType ?? null,
    name: lastMessage.fileName ?? null,
  };

  // Map the message type to an attachmentType if it looks like a media type
  const msgType = (lastMessage.type ?? '').toUpperCase();
  if (['IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'VOICE', 'GIF', 'STICKER', 'LOCATION', 'CONTACT'].includes(msgType)) {
    syntheticAttachment.attachmentType = msgType;
  }

  // Special-case for 'VOICE' type
  if (msgType === 'VOICE') {
    return PREVIEW_MAP.voice;
  }

  // If no attachment info at all and type is just TEXT/DEFAULT, show generic
  if (
    !syntheticAttachment.attachmentType ||
    ['TEXT', 'DEFAULT', ''].includes(msgType)
  ) {
    if (!lastMessage.mimeType && !lastMessage.attachmentType) {
      return { icon: null, label: 'New message' };
    }
  }

  const mediaType = resolveAttachmentType(syntheticAttachment);
  const preview = getPreviewForMediaType(mediaType);

  return preview.label ? preview : { icon: null, label: 'New message' };
}

/**
 * Generate a preview for a notification socket payload.
 * Returns text-only (notifications don't render Ionicons).
 */
export function getNotificationPreview(payload: {
  content?: string | null;
  attachments?: NotificationAttachmentLike[];
}): string {
  if (payload.content?.trim()) return payload.content.trim();

  const attachments = payload.attachments ?? [];
  if (attachments.length > 0) {
    const first = attachments[0];
    const type = resolveAttachmentType({
      attachmentType: first.attachmentType,
      mimeType: first.mimeType,
    });
    return getLabelForMediaType(type);
  }

  return 'Sent a message';
}

/**
 * Generate a preview from an `attachmentType` string (used by pinned
 * banner and reply-to metadata where only the type string is stored).
 *
 * Returns { icon, label } for rendering with Ionicons.
 */
export function getPreviewFromAttachmentType(
  attachmentType: string | null | undefined,
  mimeType?: string | null,
): MediaPreview {
  if (!attachmentType && !mimeType) return { icon: null, label: 'Message' };

  const type = resolveAttachmentType({
    attachmentType: attachmentType,
    mimeType: mimeType ?? null,
  });

  return getPreviewForMediaType(type);
}
