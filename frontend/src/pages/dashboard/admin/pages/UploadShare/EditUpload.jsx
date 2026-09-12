import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft, FaLock, FaLink, FaCalendarAlt, FaEye,
  FaCloudUploadAlt, FaTrash, FaUpload, FaMagic, FaEyeSlash,
  FaCopy, FaSave, FaStar, FaSyncAlt, FaImage,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../../../../../config/axiosConfig';
import Toggle from '../../../../../components/ui/Toggle';
import ConfirmModal from '../../../../../components/ui/ConfirmModal';
import { MAX_IMAGES } from '../../../../../constants';
import { buildShareLink, formatDate, formatBytes, getLiveStatus } from '../../../../../utils/galleryHelpers';

const EXPIRY_OPTIONS = [
  { value: 'custom', label: 'Custom Date...' },
  { value: 'never', label: 'Never Expires' },
];

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const EditUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [images, setImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  // ─── Form state ──────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiryMode, setExpiryMode] = useState('never');
  const [customDate, setCustomDate] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [deleteAfterView, setDeleteAfterView] = useState(false);
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);

  const [imageTarget, setImageTarget] = useState(null); // image pending delete
  const [uploadingNew, setUploadingNew] = useState(false);

  // ─── Fetch Gallery ───────────────────────────────────────────
  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/galleries/${id}`);
      const g = res.data.data;
      setGallery(g);
      setImages(g.images || []);
      setTitle(g.title);
      setDescription(g.description || '');
      setRequirePassword(!!g.has_password);
      setAllowDownload(!!g.allow_download);
      setMaxViews(g.max_views ?? '');
      setDeleteAfterView(!!g.delete_after_view);
      setDeleteAfterDownload(!!g.delete_after_download);

      if (g.expires_at) {
        const d = new Date(g.expires_at);
        if (!isNaN(d.getTime())) {
          setExpiryMode('custom');
          setCustomDate(d.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Fetch gallery error:', error);
      toast.error('Failed to load gallery');
      navigate('/dashboard/upload-share');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // ─── Save Settings ───────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) return toast.error('Title cannot be empty');
    if (requirePassword && passwordChanged && !password.trim()) {
      return toast.error('Enter a new password or disable password protection');
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        allowDownload,
        deleteAfterView,
        deleteAfterDownload,
        maxViews: maxViews === '' ? null : maxViews,
        expiresAt:
          expiryMode === 'never'
            ? null
            : customDate || undefined,
      };

      if (deleteAfterView) payload.allowDownload = false;

      if (requirePassword && passwordChanged) payload.password = password.trim();
      if (!requirePassword) payload.password = ''; // removes protection

      await api.put(`/galleries/${gallery.uuid}`, payload);
      toast.success('Gallery updated successfully');
      setPasswordChanged(false);
      fetchGallery();
    } catch (error) {
      console.error('Update gallery error:', error);
      toast.error(error.response?.data?.message || 'Failed to update gallery');
    } finally {
      setSaving(false);
    }
  };

  // ─── Upload New Images ───────────────────────────────────────
  const handleAddImages = async () => {
    if (newFiles.length === 0) return;
    setUploadingNew(true);
    try {
      const fd = new FormData();
      newFiles.forEach((p) => fd.append('images', p.file));
      const res = await api.post(`/galleries/${gallery.uuid}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Images added');
      setNewFiles([]);
      fetchGallery();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add images');
    } finally {
      setUploadingNew(false);
    }
  };

  // ─── Image Actions ───────────────────────────────────────────
  const confirmDeleteImage = async () => {
    if (!imageTarget) return;
    try {
      await api.delete(`/galleries/${gallery.uuid}/images/${imageTarget.id}`);
      toast.success('Image deleted');
      setImageTarget(null);
      fetchGallery();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete image');
    }
  };

  const saveCaption = async (imageId, nextCaption, currentCaption) => {
    if (nextCaption === currentCaption) return;
    try {
      await api.put(`/galleries/${gallery.uuid}/images/${imageId}`, { caption: nextCaption });
      setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, caption: nextCaption } : img)));
      toast.success('Caption saved');
    } catch {
      toast.error('Failed to save caption');
    }
  };

  const setCover = async (image) => {
    try {
      await api.put(`/galleries/${gallery.uuid}`, { coverImageId: image.id });
      toast.success('Cover image updated');
      fetchGallery();
    } catch {
      toast.error('Failed to set cover');
    }
  };

  const regenerateLink = async () => {
    if (!window.confirm('Generate a new share link? The current link will stop working immediately.')) return;
    try {
      await api.post(`/galleries/${gallery.uuid}/regenerate-token`);
      toast.success('New share link generated');
      fetchGallery();
    } catch {
      toast.error('Failed to regenerate link');
    }
  };

  // ─── Derived ─────────────────────────────────────────────────
  const status = getLiveStatus(gallery || {});
  const remainingSlots = MAX_IMAGES - images.length - newFiles.length;
  const totalNewSize = newFiles.reduce((s, p) => s + p.size, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/dashboard/upload-share')}
          className="p-2 text-gray-400 hover:text-amber transition-colors"
          aria-label="Back"
        >
          <FaArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            Edit Gallery
            <span className={`text-xs px-2 py-1 rounded-full border ${status.style}`}>{status.label}</span>
          </h2>
          <p className="text-gray-400 text-sm">{images.length} images · {formatBytes(gallery.total_size)} · {Number(gallery.view_count)} views · {Number(gallery.download_count)} downloads</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50"
        >
          <FaSave size={14} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Share Link Bar */}
      <div className="glass-card rounded-xl p-4 border border-amber/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FaLink className="text-amber flex-shrink-0" />
          <span className="text-gray-300 text-sm truncate">{buildShareLink(gallery.share_token)}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              navigator.clipboard.writeText(buildShareLink(gallery.share_token));
              toast.success('Link copied!');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20 transition-colors text-sm font-medium"
          >
            <FaCopy size={12} /> Copy
          </button>
          <button
            onClick={() => window.open(buildShareLink(gallery.share_token), '_blank')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-amber hover:border-amber/30 transition-colors text-sm"
          >
            <FaEye size={12} /> Open
          </button>
          <button
            onClick={regenerateLink}
            title="Invalidate current link and generate a new one"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-amber hover:border-amber/30 transition-colors text-sm"
          >
            <FaSyncAlt size={11} /> Re-link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: Images ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-4">
            <h3 className="text-white font-semibold">Details</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
              maxLength={255}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Description for the recipient..."
              className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors resize-none"
            />
          </div>

          {/* Existing images */}
          <div className="glass-card rounded-xl p-6 border border-amber/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FaImage className="text-amber text-sm" />
                Images ({images.length}/{MAX_IMAGES})
              </h3>
            </div>

            {images.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No images in this gallery yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((image) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative group rounded-lg overflow-hidden border border-white/5"
                  >
                    <img
                      src={assetUrl(image.url)}
                      alt={image.original_name || 'Gallery image'}
                      loading="lazy"
                      decoding="async"
                      className="w-full aspect-square object-cover"
                    />

                    {/* Cover badge */}
                    {gallery.cover_image_url === image.url ? (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] bg-amber text-charcoal px-1.5 py-0.5 rounded font-bold">
                        <FaStar size={8} /> COVER
                      </span>
                    ) : (
                      <button
                        onClick={() => setCover(image)}
                        title="Set as cover"
                        className="absolute top-1.5 left-1.5 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 hover:text-amber text-gray-300 transition-all"
                      >
                        <FaStar size={11} />
                      </button>
                    )}

                    <button
                      onClick={() => setImageTarget(image)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete image"
                    >
                      <FaTrash size={9} />
                    </button>

                    <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1.5 py-1">
                      <input
                        type="text"
                        defaultValue={image.caption || ''}
                        placeholder="Add caption..."
                        maxLength={255}
                        onBlur={(e) => saveCaption(image.id, e.target.value, image.caption)}
                        className="w-full bg-transparent text-[10px] text-white placeholder-gray-400 focus:outline-none"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Add more images */}
          <div className="glass-card rounded-xl p-6 border border-amber/10">
            <h3 className="text-white font-semibold mb-3">Add More Images</h3>
            {remainingSlots <= 0 ? (
              <p className="text-red-400 text-sm">Limit reached — this gallery already holds the maximum of {MAX_IMAGES} images.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-amber/30 hover:border-amber/60 hover:bg-amber/5 rounded-xl p-6 text-center transition-all duration-200"
                >
                  <FaCloudUploadAlt className="text-3xl text-amber/40 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">Click to select additional images ({remainingSlots} slots left)</p>
                </button>
                <input
                  ref={addInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={(e) => {
                    const files = Array.from(e.target.files)
                      .filter((f) => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024)
                      .slice(0, remainingSlots)
                      .map((file) => ({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        file,
                        url: URL.createObjectURL(file),
                      }));
                    setNewFiles(files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {newFiles.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {newFiles.map((p) => (
                        <div key={p.id} className="relative group aspect-square">
                          <img src={p.url} alt="New" className="w-full h-full object-cover rounded-lg" />
                          <button
                            onClick={() => {
                              URL.revokeObjectURL(p.url);
                              setNewFiles(newFiles.filter((x) => x.id !== p.id));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove"
                          >
                            <FaTrash size={8} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">{newFiles.length} selected ({formatSize(totalNewSize)})</span>
                      <button
                        onClick={handleAddImages}
                        disabled={uploadingNew}
                        className="flex items-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50 text-sm"
                      >
                        <FaUpload size={13} />
                        {uploadingNew ? 'Uploading...' : `Upload ${newFiles.length} Image(s)`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── Right: Settings ──────────────────────────────────── */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FaLock className="text-amber text-sm" />
              Sharing Conditions
            </h3>

            <Toggle
              checked={requirePassword && !deleteAfterView}
              onChange={(v) => {
                setRequirePassword(v);
                setPasswordChanged(true);
                if (v) setDeleteAfterView(false);
              }}
              disabled={deleteAfterView}
              label="Require password to view"
              description={
                gallery.has_password && !passwordChanged
                  ? 'A password is currently set'
                  : 'Visitors must enter a password first'
              }
            />

            {requirePassword && !deleteAfterView && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordChanged(true);
                    }}
                    placeholder={passwordChanged ? 'New password' : 'Leave unchanged'}
                    className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-3 pr-9 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
                    let pwd = '';
                    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
                    setPassword(pwd);
                    setShowPassword(true);
                    setPasswordChanged(true);
                  }}
                  title="Generate strong password"
                  className="px-3 py-2 rounded-lg border border-amber/30 text-amber hover:bg-amber/10 transition-colors"
                >
                  <FaMagic size={14} />
                </button>
              </div>
            )}

            <hr className="border-white/5" />

            <Toggle
              checked={allowDownload && !deleteAfterView}
              onChange={(v) => {
                setAllowDownload(v);
              }}
              disabled={deleteAfterView}
              label="Allow downloads"
              description="Recipients can download single photos or the full ZIP"
            />

            <hr className="border-white/5" />

            <Toggle
              checked={deleteAfterView}
              onChange={(v) => {
                setDeleteAfterView(v);
                if (v) {
                  setAllowDownload(false);
                  toast('Gallery will self-destruct after the next view', { icon: '💥' });
                }
              }}
              label="Delete after first view"
              description="Destroys everything once opened"
            />

            <Toggle
              checked={deleteAfterDownload}
              onChange={setDeleteAfterDownload}
              disabled={deleteAfterView}
              label="Delete after first download"
              description="Erases everything once a download completes"
            />
          </div>

          {/* Expiry */}
          <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FaCalendarAlt className="text-amber text-sm" />
              Expiry Rules
            </h3>

            <select
              value={expiryMode}
              onChange={(e) => setExpiryMode(e.target.value)}
              className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {expiryMode === 'custom' && (
              <input
                type="date"
                value={customDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
              />
            )}

            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">Max Views</label>
              <input
                type="number"
                min="1"
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
              />
              <p className="text-gray-500 text-xs mt-1">
                Currently {Number(gallery.view_count)} view(s) recorded{gallery.last_viewed_at ? ` · last opened ${formatDate(gallery.last_viewed_at)}` : ''}
              </p>
            </div>
          </div>

          {/* Danger zone */}
          <ConfirmModal
            isOpen={!!imageTarget}
            title="Delete this image?"
            message="The file will be removed from storage immediately and can't be recovered."
            confirmLabel="Delete Image"
            onConfirm={confirmDeleteImage}
            onCancel={() => setImageTarget(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default EditUpload;
