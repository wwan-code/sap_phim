import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FaChevronDown,
  FaChevronUp,
  FaFont,
  FaGlobe,
  FaImage,
  FaLink,
  FaLock,
  FaMagic,
  FaMusic,
  FaPalette,
  FaPlus,
  FaShare,
  FaSmile,
  FaTag,
  FaTimes,
  FaUserCheck,
  FaUserFriends,
  FaUserMinus,
  FaVideo,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import MultiSelect from '@/components/common/MultiSelect';
import classNames from '@/utils/classNames';
import { getAvatarUrl } from '@/utils/getAvatarUrl';
import {
  encodeStoryCaption,
  encodeTextStoryContent,
  getDefaultTextStoryStyle,
} from '@/utils/storyContent';
import { useCreateStory, useGetStoryUploadStatuses } from '@/hooks/useStoryQueries';
import { useGetFriends } from '@/hooks/useFriendQueries';
import { useStoryComposerStore } from '@/stores/useStoryComposerStore';
import { PinturaEditorOverlay } from '@pqina/react-pintura';
import '@pqina/pintura/pintura.css';
import {
  createDefaultImageReader,
  createDefaultImageWriter,
  effectBrightness,
  effectClarity,
  effectContrast,
  effectExposure,
  effectGamma,
  effectSaturation,
  effectTemperature,
  locale_en_gb,
  plugin_crop,
  plugin_filter,
  plugin_finetune,
  plugin_resize,
  setPlugins,
} from '@pqina/pintura';
import "../../assets/scss/components/_story-composer.scss";

const STORY_ASPECT_RATIO = 9 / 16;

setPlugins(plugin_crop, plugin_filter, plugin_finetune, plugin_resize);

const pinturaLocale = {
  ...locale_en_gb,
  finetuneLabelClarity: 'Blur',
};

const pinturaBaseOptions = {
  imageReader: createDefaultImageReader(),
  imageWriter: createDefaultImageWriter(),
  locale: pinturaLocale,
  utils: ['crop', 'filter', 'finetune'],
  finetuneControlConfiguration: {
    brightness: effectBrightness,
    contrast: effectContrast,
    saturation: effectSaturation,
    exposure: effectExposure,
    temperature: effectTemperature,
    gamma: effectGamma,
    clarity: effectClarity,
  },
  imageCropAspectRatio: STORY_ASPECT_RATIO,
  imageCropLimitToImage: true,
  cropEnableButtonFlipHorizontal: true,
  cropEnableButtonFlipVertical: true,
  cropEnableButtonRotateLeft: true,
  cropEnableButtonRotateRight: true,
  cropEnableRotationInput: true,
  cropEnableZoomInput: true,
  cropEnableImageSelection: true,
};

const PRIVACY_OPTIONS = [
  {
    value: 'public',
    icon: FaGlobe,
    label: 'Cong khai',
    description: 'Tat ca ban be cua ban deu co the xem.',
  },
  {
    value: 'friends',
    icon: FaUserFriends,
    label: 'Ban be',
    description: 'Chi nhung nguoi ban da ket noi moi xem duoc.',
  },
  {
    value: 'friends_except',
    icon: FaUserMinus,
    label: 'Ban be ngoai tru',
    description: 'An story voi mot vai nguoi cu the.',
  },
  {
    value: 'specific_users',
    icon: FaUserCheck,
    label: 'Chi dinh ban be',
    description: 'Chi hien thi cho nhung nguoi ban chon.',
  },
];

const STORY_TYPES = [
  { value: 'image', icon: FaImage, label: 'Anh' },
  { value: 'video', icon: FaVideo, label: 'Video' },
  { value: 'text', icon: FaFont, label: 'Van ban' },
];

const GRADIENT_PRESETS = [
  { id: 'sunset', label: 'Sunset', value: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
  { id: 'aurora', label: 'Aurora', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { id: 'mint', label: 'Mint', value: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  { id: 'dream', label: 'Dream', value: 'linear-gradient(135deg, #9795f0 0%, #fbc8d4 100%)' },
  { id: 'coral', label: 'Coral', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
];

const STICKER_PRESETS = [
  { id: 'sticker-haha', label: 'Haha', content: 'HA!', type: 'text' },
  { id: 'sticker-fire', label: 'Fire', content: 'FIRE', type: 'text' },
  { id: 'sticker-heart', label: 'Love', content: 'LOVE', type: 'text' },
  { id: 'sticker-star', label: 'Star', content: 'STAR', type: 'text' },
  { id: 'sticker-100', label: '100', content: '100', type: 'text' },
];

const TEXT_COLOR_OPTIONS = ['#ffffff', '#e8c26e', '#1f2937', '#f97316', '#0ea5e9'];
const TEXT_ALIGN_OPTIONS = ['left', 'center', 'right'];

const MUSIC_LIBRARY = [
  { id: 'track-lofi', title: 'Sunrise Lofi', artist: 'Mellow Keys', duration: 94 },
  { id: 'track-chill', title: 'Chill Garden', artist: 'Dreamer', duration: 120 },
  { id: 'track-pop', title: 'Pop Candy', artist: 'Luna', duration: 87 },
  { id: 'track-epic', title: 'Epic Glow', artist: 'Nova', duration: 105 },
];

const CTA_PRESETS = [
  { id: 'cta-shop', label: 'Mua ngay', url: 'https://example.com/shop' },
  { id: 'cta-watch', label: 'Xem them', url: 'https://example.com' },
  { id: 'cta-book', label: 'Dat lich', url: 'https://example.com/reserve' },
];

const STORY_TEMPLATES = [
  {
    id: 'template-champagne',
    name: 'Champagne Glow',
    description: 'Phong cach sang trong voi sac vang.',
    backgroundType: 'gradient',
    gradientId: 'aurora',
    background: 'linear-gradient(150deg, rgba(19,19,22,0.96) 0%, rgba(39,33,22,0.92) 100%)',
    filter: 'warm',
    textLayers: [
      {
        id: 'headline',
        text: 'Chia se khoanh khac ruc ro!',
        color: '#ffffff',
        align: 'center',
        fontFamily: 'Inter',
        fontSize: 38,
        weight: 700,
        highlight: 'rgba(232,194,110,0.25)',
        x: 50,
        y: 24,
      },
    ],
    stickerLayers: [
      {
        id: 'sparkle',
        content: 'STAR',
        type: 'text',
        size: 1.2,
        x: 82,
        y: 38,
        rotation: 8,
      },
    ],
  },
  {
    id: 'template-fun',
    name: 'Pop Fun',
    description: 'Tre trung va day nang luong.',
    backgroundType: 'gradient',
    gradientId: 'coral',
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    filter: 'vivid',
    textLayers: [
      {
        id: 'pop-title',
        text: 'Ngay vui ron rang!',
        color: '#1f2937',
        align: 'center',
        fontFamily: 'Poppins',
        fontSize: 34,
        weight: 700,
        highlight: 'rgba(255,255,255,0.6)',
        x: 50,
        y: 20,
      },
    ],
    stickerLayers: [
      {
        id: 'pop-left',
        content: 'LOL',
        type: 'text',
        size: 1.1,
        x: 20,
        y: 70,
        rotation: -12,
      },
      {
        id: 'pop-right',
        content: 'FIRE',
        type: 'text',
        size: 1.25,
        x: 78,
        y: 62,
        rotation: 14,
      },
    ],
  },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatDuration = (seconds = 0) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60).toString().padStart(1, '0');
  const secs = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

const createTextLayer = (overrides = {}) => ({
  id: `text-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  text: 'Viet loi nhan cua ban...',
  color: '#ffffff',
  align: 'center',
  fontFamily: 'Inter',
  fontSize: 32,
  weight: 600,
  highlight: 'transparent',
  x: 50,
  y: 50,
  ...overrides,
});

const createStickerLayer = (sticker) => ({
  id: `sticker-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  content: sticker.content,
  type: sticker.type || 'text',
  size: 1,
  x: 50,
  y: 70,
  rotation: 0,
});

const Accordion = ({ title, icon: Icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`story-composer__accordion ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="story-composer__accordion-toggle"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="story-composer__accordion-title">
          {Icon && <Icon />}
          <span>{title}</span>
        </div>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {open && <div className="story-composer__accordion-body">{children}</div>}
    </div>
  );
};

const StoryPreviewCard = ({
  currentUser,
  storyType,
  background,
  backgroundType,
  mediaPreview,
  textLayers,
  stickerLayers,
  musicTrack,
  cta,
  taggedFriends,
  templateId,
  onPointerDownCanvas,
  onPointerDownLayer,
  activeLayerId,
  previewRef,
}) => {
  const backgroundStyle =
    storyType === 'text' || !mediaPreview
      ? {
          background:
            backgroundType === 'gradient' || background.includes('gradient')
              ? background
              : `linear-gradient(160deg, rgba(18,18,19,0.92) 0%, rgba(18,18,21,0.82) 100%), ${background}`,
        }
      : {};

  return (
    <div className="story-composer__preview-card">
      <div className="story-composer__preview-header">
        <div className="story-composer__preview-user">
          <img
            src={getAvatarUrl(currentUser)}
            alt={currentUser?.username}
            className="story-composer__preview-avatar"
          />
          <div>
            <span>{currentUser?.username}</span>
            <small>Story tren trang ca nhan</small>
          </div>
        </div>
        {musicTrack && (
          <div className="story-composer__preview-music">
            <FaMusic />
            <div>
              <span>{musicTrack.title}</span>
              <small>{musicTrack.artist}</small>
            </div>
          </div>
        )}
      </div>

      <div
        ref={previewRef}
        className={classNames('story-composer__preview-stage', {
          'is-text': storyType === 'text',
          'has-template': Boolean(templateId),
        })}
        style={backgroundStyle}
        onPointerDown={onPointerDownCanvas}
      >
        {storyType === 'image' && mediaPreview && (
          <div
            className="story-composer__preview-media"
            style={{
              backgroundImage: `url(${mediaPreview})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
            }}
          />
        )}

        {storyType === 'video' && mediaPreview && (
          <video
            className="story-composer__preview-video"
            src={mediaPreview}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {storyType === 'text' && (
          <p className="story-composer__preview-text">
            {textLayers.length > 0
              ? textLayers[0].text
              : 'Nhap noi dung o ben phai de bat dau ke chuyen.'}
          </p>
        )}

        {textLayers.map((layer) => {
          const lines = layer.text.split(/\r?\n/);
          return (
            <button
              key={layer.id}
              type="button"
              className={classNames('story-composer__layer', 'story-composer__layer--text', {
                'is-active': activeLayerId === layer.id,
              })}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                textAlign: layer.align,
              }}
              onPointerDown={(event) => onPointerDownLayer(event, layer.id)}
            >
              <span
                className="story-composer__layer-content"
                style={{
                  color: layer.color,
                  fontFamily: layer.fontFamily,
                  fontWeight: layer.weight,
                  fontSize: `${layer.fontSize}px`,
                  background:
                    layer.highlight === 'transparent'
                      ? 'transparent'
                      : layer.highlight,
                }}
              >
                {lines.map((line, index) => (
                  <React.Fragment key={`${layer.id}-${index}`}>
                    {line || '\u00A0'}
                    {index < lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            </button>
          );
        })}

        {stickerLayers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={classNames(
              'story-composer__layer',
              'story-composer__layer--sticker',
              {
                'is-active': activeLayerId === layer.id,
              },
            )}
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              transform: `translate(-50%, -50%) scale(${layer.size}) rotate(${layer.rotation}deg)`,
            }}
            onPointerDown={(event) => onPointerDownLayer(event, layer.id)}
          >
            <span className="story-composer__layer-content story-composer__layer-content--sticker">
              {layer.content}
            </span>
          </button>
        ))}
      </div>

      <div className="story-composer__preview-meta">
        {cta?.label && (
          <a
            href={cta.url || '#'}
            className="story-composer__preview-cta"
            onClick={(event) => event.preventDefault()}
          >
            <FaLink />
            <span>{cta.label}</span>
          </a>
        )}

        {taggedFriends.length > 0 && (
          <div className="story-composer__preview-tags">
            <FaTag />
            <span>
              Dang gan the{' '}
              {taggedFriends.length === 1
                ? taggedFriends[0].title
                : `${taggedFriends.length} nguoi ban`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
const CreateStoryModal = ({ isOpen, onClose }) => {
  useGetStoryUploadStatuses();
  const currentUser = useSelector((state) => state.auth.user);
  const { data: friendsData } = useGetFriends();
  const composer = useStoryComposerStore();
  const {
    storyType,
    mediaFile,
    mediaPreview,
    background,
    backgroundType,
    filter,
    videoAdjustments,
    captionText,
    textLayers,
    stickerLayers,
    taggedFriends,
    musicTrack,
    cta,
    privacy,
    allowedUsers,
    excludedUsers,
    templateId,
    activeLayerId,
    setStoryType,
    setMedia,
    clearMedia,
    setBackground,
    setFilter,
    setVideoAdjustments,
    setCaptionText,
    setTextLayers,
    setStickerLayers,
    setMusicTrack,
    setTaggedFriends,
    setCTA,
    setPrivacy,
    setAllowedUsers,
    setExcludedUsers,
    setActiveLayerId,
    applyTemplatePreset,
    resetComposer,
  } = composer;

  const { mutate: createStory, isPending } = useCreateStory();
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const pinturaEditorRef = useRef(null);
  const [isPinturaOpen, setIsPinturaOpen] = useState(false);
  const [pinturaSrc, setPinturaSrc] = useState(null);
  const [pinturaInitialState, setPinturaInitialState] = useState(null);
  const [lastPinturaState, setLastPinturaState] = useState(null);
  const editorObjectUrlRef = useRef(null);
  const processingPreviewRef = useRef(false);
  const queuedPreviewRef = useRef(false);
  const autoProcessingRef = useRef(false);
  const editorMediaTypeRef = useRef('image');

  const friendsList = friendsData?.pages?.flatMap((page) => page.data) || [];
  const friendOptions = useMemo(
    () =>
      friendsList.map((friend) => ({
        id: friend.id,
        title: friend.username,
      })),
    [friendsList],
  );

  const activeTextLayer = useMemo(
    () => textLayers.find((layer) => layer.id === activeLayerId) || null,
    [textLayers, activeLayerId],
  );

  const activeStickerLayer = useMemo(
    () => stickerLayers.find((layer) => layer.id === activeLayerId) || null,
    [stickerLayers, activeLayerId],
  );

  const updateTextLayer = useCallback(
    (layerId, updater) => {
      setTextLayers((prev) =>
        prev.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                ...(typeof updater === 'function' ? updater(layer) : updater),
              }
            : layer,
        ),
      );
    },
    [setTextLayers],
  );

  const updateStickerLayer = useCallback(
    (layerId, updater) => {
      setStickerLayers((prev) =>
        prev.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                ...(typeof updater === 'function' ? updater(layer) : updater),
              }
            : layer,
        ),
      );
    },
    [setStickerLayers],
  );

  useEffect(() => {
    return () => {
      if (editorObjectUrlRef.current) {
        URL.revokeObjectURL(editorObjectUrlRef.current);
        editorObjectUrlRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!isOpen) return undefined;

    if (storyType === 'text' && textLayers.length === 0) {
      setTextLayers([createTextLayer()]);
    }

    return () => {
      dragRef.current = null;
    };
  }, [isOpen, storyType, textLayers.length, setTextLayers]);

  const handleClose = useCallback(() => {
    if (editorObjectUrlRef.current) {
      URL.revokeObjectURL(editorObjectUrlRef.current);
      editorObjectUrlRef.current = null;
    }
    setIsPinturaOpen(false);
    setPinturaSrc(null);
    setPinturaInitialState(null);
    setLastPinturaState(null);
    processingPreviewRef.current = false;
    queuedPreviewRef.current = false;
    autoProcessingRef.current = false;
    editorMediaTypeRef.current = 'image';
    resetComposer();
    onClose();
  }, [resetComposer, onClose]);

  const openPinturaEditor = useCallback(
    (file, { restoreState = false } = {}) => {
      if (!file) return;

      if (editorObjectUrlRef.current) {
        URL.revokeObjectURL(editorObjectUrlRef.current);
        editorObjectUrlRef.current = null;
      }

      const objectUrl = URL.createObjectURL(file);
      editorObjectUrlRef.current = objectUrl;

      editorMediaTypeRef.current = file.type.startsWith('video/') ? 'video' : 'image';
      queuedPreviewRef.current = false;
      processingPreviewRef.current = false;
      autoProcessingRef.current = false;

      setPinturaSrc(objectUrl);
      setPinturaInitialState(restoreState && lastPinturaState ? lastPinturaState : null);
      setIsPinturaOpen(true);
    },
    [lastPinturaState],
  );

  const handleFileSelected = useCallback(
    (file) => {
      if (!file) return;

      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }

      const isVideo = file.type.startsWith('video/');
      const previewUrl = URL.createObjectURL(file);

      setMedia({
        file,
        preview: previewUrl,
        storyType: isVideo ? 'video' : 'image',
      });
      setFilter('none');

      if (isVideo) {
        const videoMeta = document.createElement('video');
        videoMeta.preload = 'metadata';
        videoMeta.onloadedmetadata = () => {
          const duration = Number(videoMeta.duration) || 0;
          setVideoAdjustments({
            trimStart: 0,
            trimEnd: Number.isFinite(duration) && duration > 0 ? duration : null,
            coverTime: duration ? Math.min(duration / 2, duration) : 0,
          });
          videoMeta.src = '';
        };
        videoMeta.src = previewUrl;
      }

      setLastPinturaState(null);
      openPinturaEditor(file, { restoreState: false });
    },
    [mediaPreview, openPinturaEditor, setFilter, setMedia, setVideoAdjustments],
  );

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Vui long chon file nho hon 25MB.');
        return;
      }

      handleFileSelected(file);
      event.target.value = '';
    },
    [handleFileSelected],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      handleFileSelected(file);
    },
    [handleFileSelected],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const applyEditedResult = useCallback(
    (detail) => {
      if (!detail?.dest) return;

      const editedFile = detail.dest;
      const isVideo = editedFile.type.startsWith('video/');
      const nextPreviewUrl = URL.createObjectURL(editedFile);

      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }

      setMedia({
        file: editedFile,
        preview: nextPreviewUrl,
        storyType: isVideo ? 'video' : 'image',
      });

      setLastPinturaState(detail.imageState || null);
      editorMediaTypeRef.current = isVideo ? 'video' : 'image';
      setFilter('pintura');
    },
    [mediaPreview, setMedia, setFilter],
  );

  const requestPreviewUpdate = useCallback(() => {
    const editorInstance = pinturaEditorRef.current?.editor;
    if (!editorInstance) return;

    if (processingPreviewRef.current) {
      queuedPreviewRef.current = true;
      return;
    }

    processingPreviewRef.current = true;
    autoProcessingRef.current = true;

    editorInstance
      .processImage()
      .catch((error) => {
        console.error('Khong the cap nhat preview tu Pintura:', error);
      })
      .finally(() => {
        processingPreviewRef.current = false;
        if (queuedPreviewRef.current) {
          queuedPreviewRef.current = false;
          requestPreviewUpdate();
          return;
        }
        autoProcessingRef.current = false;
      });
  }, []);

  const handleEditorUpdate = useCallback(() => {
    if (!isPinturaOpen) return;
    requestPreviewUpdate();
  }, [isPinturaOpen, requestPreviewUpdate]);

  const handleEditorReady = useCallback(() => {
    requestPreviewUpdate();
  }, [requestPreviewUpdate]);

  const handleEditorProcess = useCallback(
    (detail) => {
      if (!detail?.dest) {
        toast.error('Khong the xu ly media. Vui long thu lai.');
        return;
      }

      applyEditedResult(detail);

      if (autoProcessingRef.current) {
        autoProcessingRef.current = false;
        return;
      }

      setIsPinturaOpen(false);
      setPinturaSrc(null);
      setPinturaInitialState(null);
      processingPreviewRef.current = false;
      queuedPreviewRef.current = false;

      if (editorObjectUrlRef.current) {
        URL.revokeObjectURL(editorObjectUrlRef.current);
        editorObjectUrlRef.current = null;
      }
    },
    [applyEditedResult],
  );

  const handleEditorCancel = useCallback(() => {
    if (editorObjectUrlRef.current) {
      URL.revokeObjectURL(editorObjectUrlRef.current);
      editorObjectUrlRef.current = null;
    }
    setIsPinturaOpen(false);
    setPinturaSrc(null);
    setPinturaInitialState(null);
    processingPreviewRef.current = false;
    queuedPreviewRef.current = false;
    autoProcessingRef.current = false;
  }, []);

  const handleReopenEditor = useCallback(() => {
    if (!mediaFile) return;
    openPinturaEditor(mediaFile, { restoreState: true });
  }, [mediaFile, openPinturaEditor]);

  const handleClearMedia = useCallback(() => {
    setLastPinturaState(null);
    setPinturaInitialState(null);
    setPinturaSrc(null);
    setIsPinturaOpen(false);
    if (editorObjectUrlRef.current) {
      URL.revokeObjectURL(editorObjectUrlRef.current);
      editorObjectUrlRef.current = null;
    }
    processingPreviewRef.current = false;
    queuedPreviewRef.current = false;
    autoProcessingRef.current = false;
    setFilter('none');
    clearMedia();
  }, [clearMedia, setFilter]);

  const handleAddTextLayer = useCallback(() => {
    const next = createTextLayer();
    setTextLayers((prev) => [...prev, next]);
    setActiveLayerId(next.id);
  }, [setTextLayers, setActiveLayerId]);

  const handleAddSticker = useCallback(
    (sticker) => {
      const layer = createStickerLayer(sticker);
      setStickerLayers((prev) => [...prev, layer]);
      setActiveLayerId(layer.id);
    },
    [setStickerLayers, setActiveLayerId],
  );

  const handleRemoveLayer = useCallback(
    (layerId) => {
      setTextLayers((prev) => prev.filter((layer) => layer.id !== layerId));
      setStickerLayers((prev) => prev.filter((layer) => layer.id !== layerId));
      if (activeLayerId === layerId) {
        setActiveLayerId(null);
      }
    },
    [activeLayerId, setTextLayers, setStickerLayers, setActiveLayerId],
  );
  const updateLayerPosition = useCallback(
    (deltaX, deltaY) => {
      const dragState = dragRef.current;
      if (!dragState) return;

      const nextX = clamp(dragState.originX + deltaX, 5, 95);
      const nextY = clamp(dragState.originY + deltaY, 5, 95);

      dragRef.current = {
        ...dragState,
        currentX: nextX,
        currentY: nextY,
      };

      if (dragState.type === 'text') {
        updateTextLayer(dragState.id, { x: nextX, y: nextY });
      } else {
        updateStickerLayer(dragState.id, { x: nextX, y: nextY });
      }
    },
    [updateTextLayer, updateStickerLayer],
  );

  const handlePointerMove = useCallback(
    (event) => {
      const dragState = dragRef.current;
      if (!dragState || !previewRef.current) return;

      event.preventDefault();
      const rect = dragState.rect;
      const deltaX = ((event.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((event.clientY - dragState.startY) / rect.height) * 100;

      updateLayerPosition(deltaX, deltaY);
    },
    [updateLayerPosition],
  );

  const stopDragging = useCallback(() => {
    if (dragRef.current?.pointerId && previewRef.current) {
      previewRef.current.releasePointerCapture?.(dragRef.current.pointerId);
    }
    dragRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  const handlePointerLayer = useCallback(
    (event, layerId) => {
      event.stopPropagation();
      setActiveLayerId(layerId);

      const layer =
        textLayers.find((item) => item.id === layerId) ||
        stickerLayers.find((item) => item.id === layerId);
      if (!layer || !previewRef.current) return;

      const layerType = textLayers.some((item) => item.id === layerId)
        ? 'text'
        : 'sticker';

      const rect = previewRef.current.getBoundingClientRect();

      dragRef.current = {
        id: layerId,
        type: layerType,
        startX: event.clientX,
        startY: event.clientY,
        originX: layer.x,
        originY: layer.y,
        currentX: layer.x,
        currentY: layer.y,
        rect,
        pointerId: event.pointerId,
      };

      previewRef.current.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
    },
    [textLayers, stickerLayers, handlePointerMove, stopDragging, setActiveLayerId],
  );

  const handleCanvasPointerDown = useCallback(() => {
    setActiveLayerId(null);
  }, [setActiveLayerId]);

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    },
    [handlePointerMove, stopDragging],
  );
  const handleShareStory = useCallback(async () => {
    const formData = new FormData();
    formData.append('type', storyType);

    try {
      if (storyType === 'text') {
        const baseLayer = textLayers[0] || createTextLayer();
        const payload = {
          ...getDefaultTextStoryStyle(),
          text: baseLayer.text.trim(),
          color: baseLayer.color,
          align: baseLayer.align,
          fontFamily: baseLayer.fontFamily,
          fontSize: baseLayer.fontSize,
          weight: baseLayer.weight,
          highlight: baseLayer.highlight,
          templateId,
          filter,
          musicTrack,
          taggedFriends: taggedFriends.map((friend) => friend.id),
          cta,
        };

        if (!payload.text) {
          toast.warn('Hay viet noi dung truoc khi dang.');
          return;
        }

        formData.append('content', encodeTextStoryContent(payload));
        formData.append('backgroundColor', background);
      } else {
        if (!mediaFile) {
          toast.warn('Hay chon anh hoac video cho story.');
          return;
        }

        formData.append('media', mediaFile);

        const overlaysPayload = textLayers.map((layer) => ({
          id: layer.id,
          text: layer.text,
          color: layer.color,
          align: layer.align,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          weight: layer.weight,
          highlight: layer.highlight,
          x: layer.x,
          y: layer.y,
        }));

        const stickersPayload = stickerLayers.map((layer) => ({
          id: layer.id,
          content: layer.content,
          type: layer.type,
          size: layer.size,
          x: layer.x,
          y: layer.y,
          rotation: layer.rotation,
        }));

        const captionPayload = encodeStoryCaption({
          text: captionText.trim(),
          overlays: overlaysPayload,
          stickers: stickersPayload,
          musicTrack,
          cta,
          taggedFriends: taggedFriends.map((friend) => friend.id),
          templateId,
          filter,
        });

        if (captionPayload) {
          formData.append('caption', captionPayload);
        }

        if (storyType === 'video') {
          const trimEndValue =
            videoAdjustments.trimEnd ?? videoAdjustments.trimStart;
          formData.append('trimStart', videoAdjustments.trimStart.toFixed(2));
          if (Number.isFinite(trimEndValue) && trimEndValue > 0) {
            formData.append('trimEnd', trimEndValue.toFixed(2));
          }
          if (Number.isFinite(videoAdjustments.coverTime)) {
            formData.append('coverTime', videoAdjustments.coverTime.toFixed(2));
          }
        }
      }

      formData.append('privacy', privacy);
      if (privacy === 'friends_except' && excludedUsers.length > 0) {
        formData.append(
          'excludedUsers',
          JSON.stringify(excludedUsers.map((user) => user.id)),
        );
      }
      if (privacy === 'specific_users' && allowedUsers.length > 0) {
        formData.append(
          'allowedUsers',
          JSON.stringify(allowedUsers.map((user) => user.id)),
        );
      }

      createStory(formData, {
        onSuccess: () => {
          toast.success('Story cua ban dang duoc xu ly!');
          handleClose();
        },
      });
    } catch (error) {
      console.error(error);
      toast.error('Khong the dang story, vui long thu lai.');
    }
  }, [
    storyType,
    textLayers,
    templateId,
    filter,
    musicTrack,
    taggedFriends,
    cta,
    background,
    mediaFile,
    stickerLayers,
    captionText,
    videoAdjustments,
    privacy,
    excludedUsers,
    allowedUsers,
    createStory,
    handleClose,
  ]);

  const privacyOption = PRIVACY_OPTIONS.find(
    (option) => option.value === privacy,
  );

  const templateItems = useMemo(
    () =>
      STORY_TEMPLATES.map((template) => ({
        ...template,
        active: templateId === template.id,
      })),
    [templateId],
  );

  if (!isOpen) return null;
  return (
    <>
      {isPinturaOpen && pinturaSrc && (
        <PinturaEditorOverlay
          ref={pinturaEditorRef}
          className="story-composer__pintura-overlay"
          {...pinturaBaseOptions}
          src={pinturaSrc}
          imageState={pinturaInitialState || undefined}
          onProcess={handleEditorProcess}
          onUpdate={handleEditorUpdate}
          onReady={handleEditorReady}
          onClose={handleEditorCancel}
          onHide={handleEditorCancel}
        />
      )}
      <div className="story-composer">
        <div className="story-composer__backdrop" onClick={handleClose} />
        <div className="story-composer__dialog">
          <div className="story-composer__left">
            <div className="story-composer__left-header">
            <div>
              <h2>Create Story</h2>
              <p>Tao story voi trai nghiem giong Facebook hien dai.</p>
            </div>
            <button
              type="button"
              className="story-composer__close"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>

          <StoryPreviewCard
            currentUser={currentUser}
            storyType={storyType}
            background={background}
            backgroundType={backgroundType}
            mediaPreview={mediaPreview}
            textLayers={textLayers}
            stickerLayers={stickerLayers}
            musicTrack={musicTrack}
            cta={cta}
            taggedFriends={taggedFriends}
            templateId={templateId}
            onPointerDownCanvas={handleCanvasPointerDown}
            onPointerDownLayer={handlePointerLayer}
            activeLayerId={activeLayerId}
            previewRef={previewRef}
          />

          <div className="story-composer__template-scroll">
            {templateItems.map((template) => (
              <button
                key={template.id}
                type="button"
                className={classNames('story-composer__template-card', {
                  'is-active': template.active,
                })}
                onClick={() => applyTemplatePreset(template)}
              >
                <span className="story-composer__template-icon">
                  <FaMagic />
                </span>
                <div>
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="story-composer__right">
          <div className="story-composer__right-content">
            <div className="story-composer__type-switcher">
              {STORY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={classNames('story-composer__type-btn', {
                    'is-active': storyType === type.value,
                  })}
                  onClick={() => {
                    setStoryType(type.value);
                    if (type.value === 'text' && textLayers.length === 0) {
                      setTextLayers([createTextLayer()]);
                    }
                  }}
                >
                  <type.icon />
                  {type.label}
                </button>
              ))}
            </div>

            {storyType !== 'text' && (
              <Accordion title="Media & Layout" icon={FaImage} defaultOpen>
                <div
                  className="story-composer__dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                  <div className="story-composer__dropzone-body">
                    <FaImage />
                    <p>Keo tha anh/video hoac bam de chon</p>
                    <small>Ho tro toi da 25MB</small>
                  </div>
                </div>

                {mediaPreview && (
                  <button
                    type="button"
                    className="story-composer__clear"
                    onClick={handleClearMedia}
                  >
                    <FaTrash />
                    Go media
                  </button>
                )}

                {mediaFile && storyType !== 'text' && (
                  <div className="story-composer__editor-actions">
                    <button
                      type="button"
                      className="story-composer__btn story-composer__btn--ghost"
                      onClick={handleReopenEditor}
                    >
                      <FaMagic />
                      Chinh sua voi Pintura
                    </button>
                    <p className="story-composer__editor-hint">
                      Editor ho tro cat 9:16, xoay, them filter, dieu chinh mau va lam mo hinh anh/video.
                    </p>
                  </div>
                )}

                {storyType === 'video' && (
                  <>
                    <div className="story-composer__slider">
                      <label>Bat dau ({formatDuration(videoAdjustments.trimStart)})</label>
                      <input
                        type="range"
                        min="0"
                        max={
                          videoAdjustments.trimEnd ??
                          videoAdjustments.trimStart + 0.2
                        }
                        step="0.1"
                        value={videoAdjustments.trimStart}
                        onChange={(event) =>
                          setVideoAdjustments({
                            trimStart: Number(event.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="story-composer__slider">
                      <label>Ket thuc ({formatDuration(videoAdjustments.trimEnd)})</label>
                      <input
                        type="range"
                        min={videoAdjustments.trimStart + 0.2}
                        max={
                          videoAdjustments.trimEnd ??
                          videoAdjustments.trimStart + 0.2
                        }
                        step="0.1"
                        value={
                          videoAdjustments.trimEnd ??
                          videoAdjustments.trimStart + 0.2
                        }
                        onChange={(event) =>
                          setVideoAdjustments({
                            trimEnd: Number(event.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="story-composer__slider">
                      <label>Anh bia ({formatDuration(videoAdjustments.coverTime)})</label>
                      <input
                        type="range"
                        min={videoAdjustments.trimStart}
                        max={
                          videoAdjustments.trimEnd ??
                          videoAdjustments.trimStart + 0.2
                        }
                        step="0.1"
                        value={videoAdjustments.coverTime}
                        onChange={(event) =>
                          setVideoAdjustments({
                            coverTime: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </Accordion>
            )}

            {storyType !== 'text' && (
              <Accordion title="Text & Sticker" icon={FaSmile} defaultOpen>
                <div className="story-composer__toolbar">
                  <button
                    type="button"
                    className="story-composer__toolbar-btn"
                    onClick={handleAddTextLayer}
                  >
                    <FaFont />
                    Them van ban
                  </button>

                  <div className="story-composer__sticker-scroll">
                    {STICKER_PRESETS.map((sticker) => (
                      <button
                        key={sticker.id}
                        type="button"
                        className="story-composer__sticker-btn"
                        onClick={() => handleAddSticker(sticker)}
                      >
                        <span>{sticker.content}</span>
                        <small>{sticker.label}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {activeLayerId ? (
                  <div className="story-composer__layer-panel">
                    {activeTextLayer && (
                      <>
                        <textarea
                          className="story-composer__textarea"
                          value={activeTextLayer.text}
                          placeholder="Nhap noi dung van ban..."
                          onChange={(event) =>
                            updateTextLayer(activeTextLayer.id, { text: event.target.value })
                          }
                        />

                        <div className="story-composer__color-palette">
                          <span>Mau chu</span>
                          <div>
                            {TEXT_COLOR_OPTIONS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={classNames('story-composer__color-dot', {
                                  'is-active': activeTextLayer.color === color,
                                })}
                                style={{ background: color }}
                                onClick={() => updateTextLayer(activeTextLayer.id, { color })}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="story-composer__slider">
                          <label>Kich thuoc ({activeTextLayer.fontSize}px)</label>
                          <input
                            type="range"
                            min="22"
                            max="72"
                            value={activeTextLayer.fontSize}
                            onChange={(event) =>
                              updateTextLayer(activeTextLayer.id, {
                                fontSize: Number(event.target.value),
                              })
                            }
                          />
                        </div>

                        <div className="story-composer__alignment">
                          {TEXT_ALIGN_OPTIONS.map((alignOption) => (
                            <button
                              key={alignOption}
                              type="button"
                              className={classNames('story-composer__alignment-btn', {
                                'is-active': activeTextLayer.align === alignOption,
                              })}
                              onClick={() =>
                                updateTextLayer(activeTextLayer.id, { align: alignOption })
                              }
                            >
                              {alignOption}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="story-composer__clear"
                          onClick={() => handleRemoveLayer(activeTextLayer.id)}
                        >
                          <FaTrash />
                          Xoa layer
                        </button>
                      </>
                    )}

                    {activeStickerLayer && (
                      <div className="story-composer__slider">
                        <label>Kich thuoc ({activeStickerLayer.size.toFixed(1)}x)</label>
                        <input
                          type="range"
                          min="0.6"
                          max="1.8"
                          step="0.1"
                          value={activeStickerLayer.size}
                          onChange={(event) =>
                            updateStickerLayer(activeStickerLayer.id, {
                              size: Number(event.target.value),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="story-composer__clear"
                          onClick={() => handleRemoveLayer(activeStickerLayer.id)}
                        >
                          <FaTrash />
                          Xoa sticker
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="story-composer__empty">
                    <p>Chon mot layer tren khung preview de bat dau chinh sua.</p>
                  </div>
                )}
              </Accordion>
            )}

            <Accordion title="Background" icon={FaPalette} defaultOpen>
              <div className="story-composer__gradient-grid">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={classNames('story-composer__gradient-swatch', {
                      'is-active': background.includes(preset.value),
                    })}
                    style={{ background: preset.value }}
                    onClick={() =>
                      setBackground({
                        value: preset.value,
                        type: 'gradient',
                        gradientId: preset.id,
                      })
                    }
                  />
                ))}
              </div>
            </Accordion>

            <Accordion title="Nhac nen" icon={FaMusic}>
              <div className="story-composer__music-grid">
                {MUSIC_LIBRARY.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    className={classNames('story-composer__music-card', {
                      'is-active': musicTrack?.id === track.id,
                    })}
                    onClick={() =>
                      setMusicTrack(musicTrack?.id === track.id ? null : track)
                    }
                  >
                    <div className="story-composer__music-avatar">
                      <FaMusic />
                    </div>
                    <div>
                      <strong>{track.title}</strong>
                      <small>
                        {track.artist} · {formatDuration(track.duration)}
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            </Accordion>

            <Accordion title="CTA & Link" icon={FaLink}>
              <div className="story-composer__cta-presets">
                {CTA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={classNames('story-composer__chip', {
                      'is-selected': cta.label === preset.label && cta.url === preset.url,
                    })}
                    onClick={() => setCTA(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="story-composer__cta-form">
                <label htmlFor="cta-label">Nhan nut</label>
                <input
                  id="cta-label"
                  type="text"
                  value={cta.label}
                  placeholder="Vi du: Xem ngay"
                  onChange={(event) => setCTA({ ...cta, label: event.target.value })}
                />
                <label htmlFor="cta-url">Lien ket</label>
                <input
                  id="cta-url"
                  type="url"
                  value={cta.url}
                  placeholder="https://..."
                  onChange={(event) => setCTA({ ...cta, url: event.target.value })}
                />
              </div>
            </Accordion>

            <Accordion title="Tag ban be" icon={FaTag}>
              <MultiSelect
                options={friendOptions}
                value={taggedFriends}
                onChange={setTaggedFriends}
                placeholder="Chon ban be..."
                disabled={!friendsList.length}
              />
            </Accordion>

            <Accordion title="Ghi chu" icon={FaSmile}>
              <textarea
                className="story-composer__textarea"
                value={captionText}
                placeholder="Them mo ta cho story..."
                onChange={(event) => setCaptionText(event.target.value)}
              />
            </Accordion>

            <Accordion title="Quyen rieng tu" icon={FaLock} defaultOpen>
              <button type="button" className="story-composer__privacy-pill">
                {privacyOption && <privacyOption.icon />}
                <span>
                  <strong>{privacyOption?.label}</strong>
                  <small>{privacyOption?.description}</small>
                </span>
              </button>

              <div className="story-composer__privacy-grid">
                {PRIVACY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={classNames('story-composer__privacy-option', {
                      'is-selected': option.value === privacy,
                    })}
                    onClick={() => setPrivacy(option.value)}
                  >
                    <option.icon />
                    <div>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </div>
                  </button>
                ))}
              </div>

              {privacy === 'friends_except' && (
                <MultiSelect
                  options={friendOptions}
                  value={excludedUsers}
                  onChange={setExcludedUsers}
                  placeholder="Chon ban can an..."
                  disabled={!friendsList.length}
                />
              )}

              {privacy === 'specific_users' && (
                <MultiSelect
                  options={friendOptions}
                  value={allowedUsers}
                  onChange={setAllowedUsers}
                  placeholder="Chon ai co the xem..."
                  disabled={!friendsList.length}
                />
              )}
            </Accordion>

            <div className="story-composer__footer">
              <button
                type="button"
                className="story-composer__btn story-composer__btn--ghost"
                onClick={handleClose}
                disabled={isPending}
              >
                Huy
              </button>
              <button
                type="button"
                className="story-composer__btn story-composer__btn--primary"
                onClick={handleShareStory}
                disabled={isPending}
              >
                <FaShare />
                {isPending ? 'Dang xu ly...' : 'Dang story'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
};

export default CreateStoryModal;
