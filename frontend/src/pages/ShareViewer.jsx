import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLock, FaDownload, FaEye, FaCalendarAlt, FaImages,
  FaChevronLeft, FaChevronRight, FaTimes, FaHourglassHalf,
  FaExclamationTriangle, FaSearchPlus,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { API_BASE_URL, assetUrl } from '../config/axiosConfig';

// ─── Status Screens ──────────────────────────────────────────
const StatusScreen = ({ icon, title, message }) => (
  <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl border border-amber/15 p-10 max-w-md w-full text-center"
    >
      <div className="w-16 h-16 rounded-full bg-amber/10 border border-amber/25 flex items-center justify-center mx-auto mb-5">
        {icon}
      </div>
      <h1 className="text-2xl font-serif font-bold text-white mb-3">{title}</h1>
      <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      <p className="mt-8 text-xs text-gray-600 tracking-widest uppercase">
        Elite Images Studio · Musanze
      </p>
    </motion.div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-charcoal flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Opening gallery...</p>
    </div>
  </div>
);

// ─── Main Viewer ─────────────────────────────────────────────
const ShareViewer = () => {
  const { token } = useParams();

  const [phase, setPhase] = useState('loading'); // loading | locked | error | unlocked
  const [errorState, setErrorState] = useState(null);
  const [info, setInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [lightbox, setLightbox] = useState(null); // index into images

  // ─── Load Info ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(`/share/${token}`);
        if (cancelled) return;
        setInfo(res.data.data);
        setPhase('locked');
      } catch (err) {
        if (cancelled) return;
        const code = err.response?.data?.code;
        const map = {
          NOT_FOUND: {
            icon: <FaSearchPlus className="text-amber/60 text-2xl" />,
            title: 'Gallery Not Found',
            message: 'This link does not exist or the gallery has been removed by the studio.',
          },
          LINK_EXPIRED: {
            icon: <FaHourglassHalf className="text-orange-400 text-2xl" />,
            title: 'Link Expired',
            message: 'This gallery link has expired. Please contact the studio to receive a fresh one.',
          },
          TOO_MANY_ATTEMPTS: {
            icon: <FaExclamationTriangle className="text-red-400 text-2xl" />,
            title: 'Too Many Attempts',
            message: 'For security reasons this link is temporarily locked. Please try again in a few minutes.',
          },
        };
        setErrorState(
          map[code] || {
            icon: <FaExclamationTriangle className="text-red-400 text-2xl" />,
            title: 'Something Went Wrong',
            message: err.response?.data?.message || 'Could not open this gallery. Please try again later.',
          }
        );
        setPhase('error');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ─── Unlock ──────────────────────────────────────────────────
  const handleUnlock = useCallback(
    async (e) => {
      e?.preventDefault();
      setUnlocking(true);
      try {
        const res = await api.post(`/share/${token}/unlock`, { password });
        setGallery(res.data.data);
        setPhase('unlocked');
      } catch (err) {
        const code = err.response?.data?.code;
        if (code === 'INVALID_PASSWORD' || code === 'PASSWORD_REQUIRED') {
          toast.error(err.response?.data?.message || 'Incorrect password');
        } else if (code === 'LINK_EXPIRED') {
          setPhase('error');
          setErrorState({
            icon: <FaHourglassHalf className="text-orange-400 text-2xl" />,
            title: 'Link Expired',
            message: 'This gallery link has expired.',
          });
        } else if (code === 'VIEW_LIMIT_REACHED') {
          setPhase('error');
          setErrorState({
            icon: <FaEye className="text-yellow-400 text-2xl" />,
            title: 'View Limit Reached',
            message: err.response?.data?.message || 'This gallery can no longer be viewed.',
          });
        } else if (code === 'NOT_FOUND') {
          setPhase('error');
          setErrorState({
            icon: <FaSearchPlus className="text-amber/60 text-2xl" />,
            title: 'Gallery Closed',
            message: 'This gallery was viewed and has been permanently deleted by its owner.',
          });
        } else {
          toast.error(err.response?.data?.message || 'Failed to open gallery');
        }
      } finally {
        setUnlocking(false);
      }
    },
    [token, password]
  );

  // ─── Lightbox Keyboard Nav ───────────────────────────────────
  useEffect(() => {
    if (lightbox === null) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => Math.min(gallery.images.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setLightbox((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, gallery]);

  const formatDate = (v) =>
    v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  // ═══ Render States ═══
  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'error') {
    return <StatusScreen {...errorState} />;
  }

  // ─── Locked Screen ───────────────────────────────────────────
  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(212,163,115,0.14) 0%, transparent 65%)' }}
        />

        <header className="relative z-10 py-6 text-center">
          <span className="text-2xl font-serif font-bold text-amber">
            Elite<span className="text-white">Studio</span>
          </span>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="glass-card rounded-2xl border border-amber/15 p-8 md:p-10 max-w-lg w-full text-center"
          >
            <div className="w-14 h-14 rounded-full bg-amber/10 border border-amber/25 flex items-center justify-center mx-auto mb-5">
              {info?.requiresPassword ? (
                <FaLock className="text-amber" />
              ) : (
                <FaImages className="text-amber" />
              )}
            </div>

            <h1 className="text-3xl font-serif font-bold text-white mb-2 break-words">
              {info?.title}
            </h1>
            {info?.description && (
              <p className="text-gray-400 text-sm mb-4">{info.description}</p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 mb-8">
              <span className="flex items-center gap-1.5">
                <FaImages className="text-amber/70" />
                {info?.imageCount} photo{info?.imageCount === 1 ? '' : 's'}
              </span>
              {info?.expiresAt && (
                <span className="flex items-center gap-1.5">
                  <FaCalendarAlt className="text-amber/70" />
                  Available until {formatDate(info.expiresAt)}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full border ${info?.allowDownload ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                {info?.allowDownload ? 'Download enabled' : 'View only'}
              </span>
            </div>

            {info?.requiresPassword ? (
              <form onSubmit={handleUnlock} className="space-y-3">
                <div className="relative max-w-xs mx-auto">
                  <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter gallery password"
                    autoFocus
                    className="w-full bg-charcoal/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={unlocking || !password}
                  className="px-8 py-3 bg-amber text-charcoal rounded-xl font-bold hover:bg-amber-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {unlocking ? 'Verifying...' : 'View Gallery'}
                </button>
              </form>
            ) : (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="px-8 py-3 bg-amber text-charcoal rounded-xl font-bold hover:bg-amber-light transition-colors disabled:opacity-50"
              >
                {unlocking ? 'Opening...' : 'Enter Gallery'}
              </button>
            )}

            <p className="mt-8 text-xs text-gray-600 tracking-widest uppercase">
              Curated with care · Elite Images Studio
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  // ─── Unlocked Gallery ────────────────────────────────────────
  const { images, allowDownload } = gallery;

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-charcoal/90 backdrop-blur-md border-b border-amber/10">
        <div className="container-custom py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-white font-bold truncate text-lg">{gallery.title}</h1>
            <p className="text-gray-500 text-xs">
              {images.length} photo{images.length === 1 ? '' : 's'} · Elite Images Studio
            </p>
          </div>

          {allowDownload && (
            <a
              href={`${API_BASE_URL}/share/${token}/download-all?grant=${encodeURIComponent(gallery.grant)}`}
              onClick={() => toast.loading('Preparing your ZIP...', { id: 'zip' })}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors text-sm"
            >
              <FaDownload size={13} />
              Download All
            </a>
          )}
        </div>
        {gallery.description && (
          <div className="container-custom pb-3">
            <p className="text-gray-400 text-sm">{gallery.description}</p>
          </div>
        )}
      </header>

      {/* Meta strip */}
      <div className="container-custom pt-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><FaEye className="text-amber/70" /> Viewing session active</span>
          {gallery.remainingViews !== null && (
            <span className="flex items-center gap-1.5">
              <FaHourglassHalf className="text-amber/70" />
              {gallery.remainingViews} view{gallery.remainingViews === 1 ? '' : 's'} remaining
            </span>
          )}
          {gallery.expiresAt && (
            <span className="flex items-center gap-1.5">
              <FaCalendarAlt className="text-amber/70" />
              Available until {formatDate(gallery.expiresAt)}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full border ${allowDownload ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
            {allowDownload ? 'Downloads allowed' : 'Read only — downloads disabled'}
          </span>
        </div>
      </div>

      {/* Photo Grid */}
      <main className="container-custom py-8 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {images.map((img, i) => (
            <motion.figure
              key={img.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '40px' }}
              transition={{ duration: 0.35, delay: (i % 8) * 0.04 }}
              className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-amber/25 transition-colors cursor-zoom-in bg-charcoal-light"
              onClick={() => setLightbox(i)}
            >
              <div className="aspect-square">
                <img
                  src={assetUrl(img.url)}
                  alt={img.caption || `Photo ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 will-change-transform"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

              {img.caption && (
                <figcaption className="absolute bottom-0 inset-x-0 p-2.5 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                  <p className="text-white text-xs font-medium line-clamp-2">{img.caption}</p>
                </figcaption>
              )}

              {allowDownload && (
                <a
                  href={`${API_BASE_URL}/share/${token}/images/${img.id}/download?grant=${encodeURIComponent(gallery.grant)}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Download this photo"
                  className="absolute top-2 right-2 p-2 rounded-lg bg-charcoal/85 border border-white/10 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber hover:border-amber/40 transition-all duration-200"
                >
                  <FaDownload size={12} />
                </a>
              )}
            </motion.figure>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 text-xs">Delivered by</p>
          <p className="text-amber font-serif font-bold text-xl mt-1">
            Elite<span className="text-white">Studio</span>
          </p>
        </div>
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && images[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close viewer"
            >
              <FaTimes />
            </button>

            {/* Counter */}
            <span className="absolute top-5 left-5 text-gray-400 text-sm tabular-nums z-10">
              {lightbox + 1} / {images.length}
            </span>

            {/* Prev / Next */}
            {lightbox > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
                className="absolute left-3 md:left-6 z-10 p-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-amber hover:border-amber/40 transition-colors"
                aria-label="Previous photo"
              >
                <FaChevronLeft />
              </button>
            )}
            {lightbox < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
                className="absolute right-3 md:right-6 z-10 p-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-amber hover:border-amber/40 transition-colors"
                aria-label="Next photo"
              >
                <FaChevronRight />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={images[lightbox].id}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={assetUrl(images[lightbox].url)}
                alt={images[lightbox].caption || `Photo ${lightbox + 1}`}
                className="max-w-full max-h-[78vh] object-contain rounded-lg select-none"
                draggable={false}
              />
              <div className="flex items-center gap-4">
                {images[lightbox].caption && (
                  <p className="text-gray-300 text-sm text-center">{images[lightbox].caption}</p>
                )}
                {allowDownload && (
                  <a
                    href={`${API_BASE_URL}/share/${token}/images/${images[lightbox].id}/download?grant=${encodeURIComponent(gallery.grant)}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber/15 border border-amber/40 text-amber hover:bg-amber/25 transition-colors text-xs font-semibold"
                  >
                    <FaDownload size={11} /> Download
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareViewer;
