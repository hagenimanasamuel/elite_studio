import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaPlus, FaTrash, FaSave, FaImages, FaChevronLeft, FaChevronRight,
  FaCloudUploadAlt, FaGlobeAfrica, FaEye,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../../../../config/axiosConfig';
import Toggle from '../../../../components/ui/Toggle';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { useSiteContent } from '../../../../context/SiteContentContext';
import { GALLERY_CATEGORIES } from '../../../../constants';

const MAX_LANDING_IMAGES = 60;

const GalleryManagement = () => {
  const { content, refresh, ready } = useSiteContent();
  const cmsGallery = content.gallery || {};
  const [enabled, setEnabled] = useState(cmsGallery.enabled ?? true);
  const [images, setImages] = useState(Array.isArray(cmsGallery.images) ? [...cmsGallery.images] : []);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);

  // Sync local editor with published content until the user makes edits
  useEffect(() => {
    if (!ready || dirty) return;
    setEnabled(content.gallery?.enabled ?? true);
    setImages(Array.isArray(content.gallery?.images) ? [...content.gallery.images] : []);
  }, [ready, content, dirty]);

  // ─── Upload Images ───────────────────────────────────────────
  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024
    );
    if (files.length === 0) {
      toast.error('Please choose image files under 15MB');
      return;
    }

    const room = MAX_LANDING_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Maximum of ${MAX_LANDING_IMAGES} landing images`);
      return;
    }
    const batch = files.slice(0, room);

    setUploading(true);
    let uploadToast = toast.loading(`Uploading 0/${batch.length}...`);
    const uploaded = [];

    try {
      for (let i = 0; i < batch.length; i++) {
        const fd = new FormData();
        fd.append('image', batch[i]);
        const res = await api.put('/content/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.success) {
          uploaded.push({
            url: res.data.data.url,
            caption: '',
            category: 'Studio Shoot',
          });
        }
        toast.dismiss(uploadToast);
        uploadToast = toast.loading(`Uploading ${i + 1}/${batch.length}...`);
      }
      setImages((prev) => [...prev, ...uploaded]);
      setDirty(true);
      toast.dismiss(uploadToast);
      toast.success(`${uploaded.length} image(s) ready — press Save to publish`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.dismiss(uploadToast);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Mutations ───────────────────────────────────────────────
  const updateImage = (index, patch) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
    setDirty(true);
  };

  const moveImage = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === null) return;
    setImages((prev) => prev.filter((_, i) => i !== deleteTarget));
    setDeleteTarget(null);
    setDirty(true);
  };

  // ─── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/content/gallery', {
        data: {
          enabled,
          images: images.filter((img) => img.url),
        },
      });
      await refresh();
      setDirty(false);
      toast.success('Landing gallery published!');
    } catch (error) {
      console.error('Save gallery error:', error);
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Reset the landing gallery to its default photos?')) return;
    try {
      await api.delete('/content/gallery');
      setDirty(false); // lets the sync effect pull fresh defaults
      await refresh();
      toast.success('Reset to default gallery');
    } catch {
      toast.error('Failed to reset');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaImages className="text-amber" />
            Landing Gallery Management
          </h2>
          <p className="text-gray-400 text-sm">These photos appear in the Gallery section of your public landing page</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading || !dirty}
            className="flex items-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-40"
          >
            <FaSave size={14} />
            {saving ? 'Publishing...' : dirty ? 'Save & Publish' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Visibility toggle + upload zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border border-amber/10 flex items-center">
          <Toggle
            checked={enabled}
            onChange={(v) => {
              setEnabled(v);
              setDirty(true);
            }}
            label={
              <span className="flex items-center gap-2">
                <FaGlobeAfrica className="text-amber" /> Show gallery on website
              </span>
            }
            description="Turn off to hide the whole section from visitors"
          />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`lg:col-span-2 glass-card rounded-xl p-5 border-2 border-dashed transition-all duration-200 text-left
            ${uploading ? 'border-amber bg-amber/10 opacity-70' : 'border-amber/30 hover:border-amber/60 hover:bg-amber/5'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            <FaCloudUploadAlt className={`text-3xl ${uploading ? 'text-amber animate-pulse' : 'text-amber/50'}`} />
            <div>
              <p className="text-white font-semibold text-sm">
                {uploading ? 'Uploading images...' : 'Add portfolio photos'}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Click to select · up to {MAX_LANDING_IMAGES} photos · 15MB max each ({images.length} added)
              </p>
            </div>
            <FaPlus className="ml-auto text-amber/50" />
          </div>
        </button>
      </div>

      {/* Image grid editor */}
      {images.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 py-16 text-center">
          <FaImages className="text-4xl text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No portfolio photos yet — add some above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((img, i) => (
            <motion.div
              key={`${img.url}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="glass-card rounded-xl overflow-hidden border border-white/5 group"
            >
              <div className="relative aspect-[4/3] bg-charcoal-light">
                <img
                  src={assetUrl(img.url)}
                  alt={img.caption || `Portfolio ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 text-[10px] bg-charcoal/80 px-2 py-0.5 rounded text-gray-300">
                  #{i + 1}
                </span>

                <div className="absolute top-2 right-2 flex gap-1">
                  <a
                    href={assetUrl(img.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Preview full size"
                    className="p-1.5 bg-charcoal/80 rounded text-gray-300 hover:text-amber transition-colors"
                  >
                    <FaEye size={11} />
                  </a>
                  <button
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    title="Move earlier"
                    className="p-1.5 bg-charcoal/80 rounded text-gray-300 hover:text-amber disabled:opacity-30 transition-colors"
                  >
                    <FaChevronLeft size={11} />
                  </button>
                  <button
                    onClick={() => moveImage(i, 1)}
                    disabled={i === images.length - 1}
                    title="Move later"
                    className="p-1.5 bg-charcoal/80 rounded text-gray-300 hover:text-amber disabled:opacity-30 transition-colors"
                  >
                    <FaChevronRight size={11} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(i)}
                    title="Remove"
                    className="p-1.5 bg-charcoal/80 rounded text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <FaTrash size={11} />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={img.caption || ''}
                  onChange={(e) => updateImage(i, { caption: e.target.value })}
                  placeholder="Caption..."
                  maxLength={120}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-amber focus:outline-none transition-colors"
                />
                <select
                  value={img.category || 'Studio Shoot'}
                  onChange={(e) => updateImage(i, { category: e.target.value })}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-amber focus:outline-none transition-colors"
                >
                  {GALLERY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Unsaved changes bar */}
      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 glass-card rounded-xl p-4 border border-amber/30 flex items-center justify-between"
        >
          <p className="text-gray-300 text-sm">You have unpublished changes</p>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50 text-sm"
          >
            <FaSave size={13} />
            {saving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Remove this photo?"
        message="It will disappear from the landing page after you save."
        confirmLabel="Remove Photo"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default GalleryManagement;
