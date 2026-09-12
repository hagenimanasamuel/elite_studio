import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft, FaLock,
  FaLink, FaCalendarAlt, FaEye, FaFileImage, FaCheck,
  FaCloudUploadAlt, FaTrash, FaUpload, FaMagic, FaEyeSlash, FaCopy,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../../../../config/axiosConfig';
import Toggle from '../../../../../components/ui/Toggle';
import { MAX_IMAGES } from '../../../../../constants';

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 Day' },
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: 'custom', label: 'Custom Date...' },
  { value: 'never', label: 'Never Expires' },
];

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const CreateUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // ─── Settings ────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiryMode, setExpiryMode] = useState('30');
  const [customDate, setCustomDate] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [deleteAfterView, setDeleteAfterView] = useState(false);
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);

  // ─── Files ───────────────────────────────────────────────────
  const [previews, setPreviews] = useState([]);
  const [generatedLink, setGeneratedLink] = useState(null);

  const totalSize = useMemo(() => previews.reduce((s, p) => s + p.size, 0), [previews]);

  // ─── File Selection ──────────────────────────────────────────
  const addFiles = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('Only image files are supported');
      return;
    }

    const tooBig = files.filter((f) => f.size > 15 * 1024 * 1024);
    if (tooBig.length > 0) {
      toast.error(`${tooBig.length} file(s) exceed the 15MB per-image limit`);
    }

    const room = MAX_IMAGES - previews.length;
    if (room <= 0) {
      toast.error(`Maximum of ${MAX_IMAGES} images per gallery`);
      return;
    }

    const accepted = files.filter((f) => f.size <= 15 * 1024 * 1024).slice(0, room);
    if (accepted.length === 0) return;
    if (files.length > room) {
      toast(`Only ${room} more image(s) allowed — extra files skipped`, { icon: '⚠️' });
    }

    const newPreviews = accepted.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (id) => {
    setPreviews((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) addFiles(e.dataTransfer.files);
  };

  // ─── Helpers ─────────────────────────────────────────────────
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setRequirePassword(true);
    setShowPassword(true);
  };

  const resolveExpiresAt = () => {
    if (expiryMode === 'never') return null;
    if (expiryMode === 'custom') {
      if (!customDate) return undefined; // validation error
      return customDate;
    }
    const d = new Date();
    d.setDate(d.getDate() + parseInt(expiryMode, 10));
    return d.toISOString();
  };

  const accessModeLabel = deleteAfterView
    ? 'Single view — self-destructs'
    : requirePassword && allowDownload
    ? 'Password required · View + Download'
    : requirePassword
    ? 'Password required · View only'
    : allowDownload
    ? 'Public · View + Download'
    : 'Public · View only';

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return toast.error('Please enter a gallery title');
    if (previews.length === 0) return toast.error('Please select at least one image');
    if (requirePassword && !password.trim()) return toast.error('Enter a password or disable password protection');

    const expiresAt = resolveExpiresAt();
    if (expiresAt === undefined) return toast.error('Pick an expiry date');

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('allowDownload', String(allowDownload));
      formData.append('expiresAt', expiresAt ?? '');
      formData.append('maxViews', maxViews || '');
      formData.append('deleteAfterView', String(deleteAfterView));
      formData.append('deleteAfterDownload', String(deleteAfterDownload));
      if (requirePassword && !deleteAfterView) formData.append('password', password.trim());
      previews.forEach((p) => formData.append('images', p.file));

      const res = await api.post('/galleries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 95));
        },
      });

      setUploadProgress(100);

      if (res.data.success) {
        const gallery = res.data.data;
        previews.forEach((p) => URL.revokeObjectURL(p.url));
        setGeneratedLink({
          link: `${window.location.origin}/g/${gallery.share_token}`,
          password: gallery.has_password ? password : null,
          expiry: gallery.expires_at
            ? new Date(gallery.expires_at).toLocaleDateString()
            : 'Never',
        });
        toast.success('Gallery created successfully!');
      }
    } catch (error) {
      console.error('Create gallery error:', error);
      toast.error(error.response?.data?.message || 'Failed to create gallery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/upload-share')}
          className="p-2 text-gray-400 hover:text-amber transition-colors"
          aria-label="Back to galleries"
        >
          <FaArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaCloudUploadAlt className="text-amber" />
            Create New Gallery
          </h2>
          <p className="text-gray-400 text-sm">Upload up to {MAX_IMAGES} images and share them with a secure public link</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left Column ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-5">
              <h3 className="text-white font-semibold">Gallery Details</h3>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Gallery Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Wedding Collection — Mutesi & Jean"
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="A short note for your client..."
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors resize-none"
                />
              </div>
            </div>

            {/* Upload Area */}
            <div className="glass-card rounded-xl p-6 border border-amber/10">
              <div className="flex items-center justify-between mb-1">
                <label className="text-white text-sm font-medium">Images *</label>
                <span className={`text-xs ${previews.length >= MAX_IMAGES ? 'text-red-400' : 'text-gray-500'}`}>
                  {previews.length}/{MAX_IMAGES}
                </span>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                aria-label="Upload images"
                className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
                  ${dragActive ? 'border-amber bg-amber/10' : 'border-amber/30 hover:border-amber/60 hover:bg-amber/5'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={loading}
                />
                <FaFileImage className="text-4xl text-amber/40 mx-auto mb-3" />
                <p className="text-gray-300">Drag & drop images here, or click to select</p>
                <p className="text-gray-500 text-xs mt-1">
                  JPEG, PNG, WebP, GIF, AVIF · max 15MB each · up to {MAX_IMAGES} images ({formatSize(totalSize)} selected)
                </p>
              </div>

              {/* Previews */}
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {previews.map((preview) => (
                    <motion.div
                      key={preview.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.18 }}
                      className="relative group aspect-square"
                    >
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="w-full h-full object-cover rounded-lg border border-white/5"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(preview.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove ${preview.name}`}
                      >
                        <FaTrash size={9} className="text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 right-1 pointer-events-none">
                        <p className="text-[9px] text-white bg-black/60 px-1 rounded truncate">{formatSize(preview.size)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Right Sidebar: Sharing Settings ─────────────────── */}
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FaLock className="text-amber text-sm" />
                Sharing Conditions
              </h3>

              {/* Password */}
              <Toggle
                checked={requirePassword && !deleteAfterView}
                onChange={(v) => {
                  setRequirePassword(v);
                  if (v) setDeleteAfterView(false);
                }}
                disabled={deleteAfterView}
                label="Require password to view"
                description="Visitors must enter a password before seeing any photo"
              />

              {requirePassword && !deleteAfterView && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Gallery password"
                        className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-3 pr-9 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      title="Generate strong password"
                      className="px-3 py-2 rounded-lg border border-amber/30 text-amber hover:bg-amber/10 transition-colors"
                    >
                      <FaMagic size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              <hr className="border-white/5" />

              {/* Downloads */}
              <Toggle
                checked={allowDownload && !deleteAfterView}
                onChange={setAllowDownload}
                disabled={deleteAfterView}
                label="Allow downloads"
                description="Recipients can download single photos or the full ZIP"
              />

              <hr className="border-white/5" />

              {/* Delete after read */}
              <Toggle
                checked={deleteAfterView}
                onChange={(v) => {
                  setDeleteAfterView(v);
                  if (v) {
                    setAllowDownload(false);
                    toast('Gallery will be permanently destroyed right after the first view', { icon: '💥' });
                  }
                }}
                label="Delete after first view"
                description="Self-destruct: the link dies immediately once opened"
              />

              {/* Delete after download */}
              <Toggle
                checked={deleteAfterDownload}
                onChange={setDeleteAfterDownload}
                disabled={deleteAfterView}
                label="Delete after first download"
                description="Everything is erased once a download completes"
              />
            </div>

            {/* Expiry */}
            <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FaCalendarAlt className="text-amber text-sm" />
                Expiry Rules
              </h3>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Link Expires After</label>
                <select
                  value={expiryMode}
                  onChange={(e) => setExpiryMode(e.target.value)}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

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
                <label className="text-white text-sm font-medium mb-1.5 block">Max Views (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                />
                <p className="text-gray-500 text-xs mt-1">Link locks itself after this many opens</p>
              </div>
            </div>

            {/* Summary + Submit */}
            <div className="glass-card rounded-xl p-6 border border-amber/10 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Images</span>
                <span className="text-white font-semibold">{previews.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Size</span>
                <span className="text-white">{formatSize(totalSize)}</span>
              </div>
              <div className="flex justify-between text-sm gap-3">
                <span className="text-gray-400 flex-shrink-0">Access Mode</span>
                <span className="text-amber text-right text-xs leading-snug">{accessModeLabel}</span>
              </div>

              <button
                type="submit"
                disabled={loading || previews.length === 0 || !title.trim()}
                className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <FaUpload size={16} />
                    Create Gallery & Link
                  </>
                )}
              </button>

              {/* Real upload progress bar */}
              {loading && (
                <div className="w-full h-2 bg-charcoal/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber to-amber-light rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ─── Success Modal ────────────────────────────────────── */}
      {generatedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-2xl p-8 max-w-md w-full border border-amber/20"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <FaCheck className="text-green-400 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Gallery Created!</h3>
              <p className="text-gray-400 text-sm mb-6">
                Share this public link with your client:
              </p>

              <div className="bg-charcoal/50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex items-center gap-2">
                  <FaLink className="text-amber text-sm flex-shrink-0" />
                  <span className="text-white text-sm break-all">{generatedLink.link}</span>
                </div>
                {generatedLink.password && (
                  <div className="flex items-center gap-2 text-sm">
                    <FaLock className="text-amber text-xs" />
                    <span className="text-gray-400">
                      Password: <span className="text-amber font-semibold">{generatedLink.password}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <FaCalendarAlt className="text-gray-500 text-xs" />
                  <span className="text-gray-400">Expires: <span className="text-white">{generatedLink.expiry}</span></span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink.link);
                    toast.success('Link copied!');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors"
                >
                  <FaCopy size={14} />
                  Copy Link
                </button>
                <button
                  onClick={() => window.open(generatedLink.link, '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-amber/30 text-amber rounded-lg font-bold hover:bg-amber/10 transition-colors"
                >
                  <FaEye size={14} />
                  Preview
                </button>
              </div>

              <button
                onClick={() => navigate('/dashboard/upload-share')}
                className="mt-4 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Go to My Galleries →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CreateUpload;
