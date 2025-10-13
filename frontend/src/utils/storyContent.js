const DEFAULT_TEXT_STYLE = {
  text: '',
  color: '#ffffff',
  align: 'center',
  fontFamily: 'Inter',
  fontSize: 42,
  letterSpacing: 0,
  weight: 600,
  highlight: 'transparent',
  templateId: null,
  filter: 'none',
  musicTrack: null,
  taggedFriends: [],
  cta: {
    label: '',
    url: '',
  },
};

export const getDefaultTextStoryStyle = () => ({
  ...DEFAULT_TEXT_STYLE,
  taggedFriends: [...DEFAULT_TEXT_STYLE.taggedFriends],
  cta: { ...DEFAULT_TEXT_STYLE.cta },
});

export const decodeTextStoryContent = (rawContent) => {
  if (!rawContent) {
    return getDefaultTextStoryStyle();
  }

  if (typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    const base = {
      ...getDefaultTextStoryStyle(),
      ...rawContent,
      text: typeof rawContent.text === 'string' ? rawContent.text : '',
    };
    base.taggedFriends = Array.isArray(base.taggedFriends) ? base.taggedFriends : [];
    base.musicTrack =
      base.musicTrack && typeof base.musicTrack === 'object'
        ? base.musicTrack
        : null;
    base.cta =
      base.cta && typeof base.cta === 'object'
        ? {
            label: base.cta.label || '',
            url: base.cta.url || '',
          }
        : { label: '', url: '' };
    return base;
  }

  if (typeof rawContent === 'string') {
    const trimmed = rawContent.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return decodeTextStoryContent(parsed);
        }
      } catch {
        // Fallback to plain string handling.
      }
    }

    return {
      ...getDefaultTextStoryStyle(),
      text: rawContent,
    };
  }

  return getDefaultTextStoryStyle();
};

export const encodeTextStoryContent = (content) => {
  const payload = decodeTextStoryContent(content);
  return JSON.stringify({
    ...payload,
    taggedFriends: Array.isArray(payload.taggedFriends) ? payload.taggedFriends : [],
    musicTrack:
      payload.musicTrack && typeof payload.musicTrack === 'object'
        ? payload.musicTrack
        : null,
    cta:
      payload.cta && typeof payload.cta === 'object'
        ? {
            label: payload.cta.label || '',
            url: payload.cta.url || '',
          }
        : { label: '', url: '' },
  });
};

export const decodeStoryCaption = (rawCaption) => {
  if (!rawCaption) {
    return {
      text: '',
      overlays: [],
      stickers: [],
      musicTrack: null,
      cta: { label: '', url: '' },
      taggedFriends: [],
      templateId: null,
      filter: 'none',
    };
  }

  if (typeof rawCaption === 'object' && !Array.isArray(rawCaption)) {
    const textValue = typeof rawCaption.text === 'string' ? rawCaption.text : '';
    const overlaysValue = Array.isArray(rawCaption.overlays)
      ? rawCaption.overlays
      : [];
    const stickersValue = Array.isArray(rawCaption.stickers)
      ? rawCaption.stickers
      : [];
    const musicValue =
      rawCaption.musicTrack && typeof rawCaption.musicTrack === 'object'
        ? rawCaption.musicTrack
        : null;
    const ctaValue =
      rawCaption.cta && typeof rawCaption.cta === 'object'
        ? {
            label: rawCaption.cta.label || '',
            url: rawCaption.cta.url || '',
          }
        : { label: '', url: '' };
    const tagsValue = Array.isArray(rawCaption.taggedFriends)
      ? rawCaption.taggedFriends
      : [];
    return {
      text: textValue,
      overlays: overlaysValue,
      stickers: stickersValue,
      musicTrack: musicValue,
      cta: ctaValue,
      taggedFriends: tagsValue,
      templateId: rawCaption.templateId ?? null,
      filter: rawCaption.filter || 'none',
    };
  }

  if (typeof rawCaption === 'string') {
    const trimmed = rawCaption.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return decodeStoryCaption(parsed);
        }
      } catch {
        // Fallback to plain string handling.
      }
    }
    return {
      text: rawCaption,
      overlays: [],
      stickers: [],
      musicTrack: null,
      cta: { label: '', url: '' },
      taggedFriends: [],
      templateId: null,
      filter: 'none',
    };
  }

  return {
    text: '',
    overlays: [],
    stickers: [],
    musicTrack: null,
    cta: { label: '', url: '' },
    taggedFriends: [],
    templateId: null,
    filter: 'none',
  };
};

export const encodeStoryCaption = ({
  text = '',
  overlays = [],
  stickers = [],
  musicTrack = null,
  cta = { label: '', url: '' },
  taggedFriends = [],
  templateId = null,
  filter = 'none',
} = {}) => {
  const sanitizedText = typeof text === 'string' ? text : '';
  const sanitizedOverlays = Array.isArray(overlays)
    ? overlays.filter((overlay) => typeof overlay?.text === 'string' && overlay.text.trim())
    : [];
  const sanitizedStickers = Array.isArray(stickers)
    ? stickers.filter((sticker) => typeof sticker?.id === 'string')
    : [];
  const sanitizedCTA =
    cta && typeof cta === 'object'
      ? {
          label: cta.label || '',
          url: cta.url || '',
        }
      : { label: '', url: '' };
  const sanitizedMusic =
    musicTrack && typeof musicTrack === 'object' ? musicTrack : null;
  const sanitizedTags = Array.isArray(taggedFriends) ? taggedFriends : [];

  const hasRichContent =
    sanitizedOverlays.length ||
    sanitizedStickers.length ||
    sanitizedMusic ||
    sanitizedCTA.label ||
    sanitizedCTA.url ||
    sanitizedTags.length ||
    templateId ||
    (filter && filter !== 'none');

  if (!sanitizedOverlays.length && !hasRichContent) {
    return sanitizedText;
  }

  return JSON.stringify({
    text: sanitizedText,
    overlays: sanitizedOverlays.map((overlay) => ({
      id: overlay.id,
      text: overlay.text.trim(),
      color: overlay.color || '#ffffff',
      align: overlay.align || 'center',
      fontFamily: overlay.fontFamily || 'Inter',
      fontSize: overlay.fontSize || 32,
      weight: overlay.weight || 600,
      highlight: overlay.highlight || 'transparent',
      x: overlay.x ?? 50,
      y: overlay.y ?? 50,
    })),
    stickers: sanitizedStickers.map((sticker) => ({
      id: sticker.id,
      content: sticker.content,
      size: sticker.size ?? 1,
      x: sticker.x ?? 50,
      y: sticker.y ?? 50,
      rotation: sticker.rotation ?? 0,
      type: sticker.type || 'emoji',
    })),
    musicTrack: sanitizedMusic,
    cta: sanitizedCTA,
    taggedFriends: sanitizedTags,
    templateId,
    filter,
  });
};
