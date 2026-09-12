import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaPlus, FaSearch, FaEye, FaEdit, FaTrash, FaLink, FaCopy, FaCheck,
  FaCalendarAlt, FaLock, FaImage, FaTh, FaShareAlt,
  FaCloudUploadAlt, FaDatabase, FaDownload, FaSyncAlt, FaBan,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../../../../../config/axiosConfig';
import ConfirmModal from '../../../../../components/ui/ConfirmModal';
import { buildShareLink, formatBytes, formatDate, getLiveStatus } from '../../../../../utils/galleryHelpers';

const UploadShare = () => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [meta, setMeta] = useState({ total_images: 0, total_storage: 0, total_storage_formatted: '0 B' });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [copiedToken, setCopiedToken] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Galleries ─────────────────────────────────────────
  const fetchGalleries = useCallback(async (opts = {}) => {
    try {
      setLoading(true);
      const res = await api.get('/galleries', {
        params: {
          page: opts.page ?? page,
          limit: 24,
          search: (opts.search ?? search) || undefined,
        },
      });
      setGalleries(res.data.data || []);
      setMeta(res.data.meta || meta);
      setPagination(res.data.pagination || pagination);
    } catch (error) {
      console.error('Fetch galleries error:', error);
      toast.error(error.response?.data?.message || 'Failed to load galleries');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Actions ─────────────────────────────────────────────────
  const handleCopy = (gallery) => {
    navigator.clipboard.writeText(buildShareLink(gallery.share_token));
    setCopiedToken(gallery.share_token);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/galleries/${deleteTarget.uuid}`);
      toast.success('Gallery permanently deleted');
      setDeleteTarget(null);
      fetchGalleries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete gallery');
    } finally {
      setDeleting(false);
    }
  };

  const handleRegenerate = async (gallery) => {
    if (!window.confirm('Generate a new link? The current share link will stop working immediately.')) return;
    try {
      await api.post(`/galleries/${gallery.uuid}/regenerate-token`);
      toast.success('New share link generated');
      fetchGalleries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to regenerate link');
    }
  };

  // ─── Status Badge ────────────────────────────────────────────
  const StatusBadge = ({ gallery }) => {
    const s = getLiveStatus(gallery);
    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${s.style}`}>
        {s.label}
      </span>
    );
  };

  // ─── Gallery Card ────────────────────────────────────────────
  const GalleryCard = (gallery) => (
    <motion.div
      key={gallery.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-xl overflow-hidden border border-white/5 hover:border-amber/20 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-charcoal-light">
        {gallery.cover_image_url ? (
          <img
            src={assetUrl(gallery.cover_image_url)}
            alt={gallery.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FaImage className="text-4xl text-amber/20" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge gallery={gallery} />
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="text-xs bg-charcoal/80 px-2 py-1 rounded text-white">
            {Number(gallery.images_count)} images
          </span>
          <span className="text-xs bg-charcoal/80 px-2 py-1 rounded text-gray-300">
            {gallery.total_size_formatted || formatBytes(gallery.total_size)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm line-clamp-1">{gallery.title}</h3>
        {gallery.description && (
          <p className="text-gray-400 text-xs line-clamp-2 mt-1">{gallery.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FaCalendarAlt size={10} />
            {formatDate(gallery.created_at)}
          </span>
          {gallery.has_password ? (
            <span className="flex items-center gap-1 text-amber">
              <FaLock size={10} />
              Password
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <FaBan size={10} />
              No password
            </span>
          )}
          <span className={gallery.allow_download ? 'text-green-400' : 'text-gray-600'}>
            {gallery.allow_download ? 'Download allowed' : 'View only'}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><FaEye size={11} /> {Number(gallery.view_count)} views</span>
          <span className="flex items-center gap-1"><FaDownload size={11} /> {Number(gallery.download_count)} downloads</span>
          {gallery.expires_at && (
            <span className="flex items-center gap-1 text-orange-400/80">
              <FaCalendarAlt size={10} /> Expires {formatDate(gallery.expires_at)}
            </span>
          )}
        </div>

        {/* Share Link */}
        <div className="flex items-center gap-2 mt-3 p-2 bg-charcoal/30 rounded-lg">
          <FaLink className="text-amber text-xs flex-shrink-0" />
          <span className="text-gray-400 text-xs truncate flex-1">{buildShareLink(gallery.share_token)}</span>
          <button
            onClick={() => handleCopy(gallery)}
            className="text-gray-400 hover:text-amber transition-colors flex-shrink-0"
            aria-label="Copy share link"
          >
            {copiedToken === gallery.share_token ? <FaCheck className="text-green-400" size={12} /> : <FaCopy size={12} />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5">
          <button
            onClick={() => window.open(buildShareLink(gallery.share_token), '_blank')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-amber transition-colors"
          >
            <FaEye size={12} />
            View
          </button>
          <button
            onClick={() => navigate(`/dashboard/upload-share/edit/${gallery.uuid}`)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-amber transition-colors"
          >
            <FaEdit size={12} />
            Edit
          </button>
          <button
            onClick={() => handleRegenerate(gallery)}
            title="Regenerate share link"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-amber transition-colors"
          >
            <FaSyncAlt size={11} />
            Re-link
          </button>
          <button
            onClick={() => setDeleteTarget(gallery)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-red-400 transition-colors ml-auto"
          >
            <FaTrash size={12} />
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaCloudUploadAlt className="text-amber" />
            Upload & Share
          </h2>
          <p className="text-gray-400 text-sm">Create password-protected client galleries with download control and expiry</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/upload-share/create')}
          className="flex items-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <FaPlus size={14} />
          New Gallery
        </button>
      </div>

      {/* Stats Overview */}
      <div className="glass-card rounded-xl p-6 border border-amber/10">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FaDatabase className="text-amber" />
          Storage Overview
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-charcoal/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Galleries</p>
            <p className="text-2xl font-bold text-white">{pagination.total}</p>
          </div>
          <div className="bg-charcoal/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Images</p>
            <p className="text-2xl font-bold text-white">{meta.total_images}</p>
          </div>
          <div className="bg-charcoal/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Storage Used</p>
            <p className="text-2xl font-bold text-white">{meta.total_storage_formatted}</p>
          </div>
          <div className="bg-charcoal/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Views</p>
            <p className="text-2xl font-bold text-white">
              {galleries.reduce((sum, g) => sum + Number(g.view_count || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card rounded-xl p-4 border border-amber/10">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="Search galleries by title or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
          />
        </div>
      </div>

      {/* Loading / Grid / Empty */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : galleries.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {galleries.map(GalleryCard)}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-amber disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-amber disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : search ? (
        <div className="text-center py-16 glass-card rounded-xl border border-white/5">
          <FaSearch className="text-4xl text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">No results for "{search}"</h3>
          <p className="text-gray-500 text-sm">Try a different search term</p>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 glass-card rounded-xl border border-white/5">
          <div className="w-20 h-20 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto mb-4">
            <FaCloudUploadAlt className="text-4xl text-amber/40" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">No Galleries Yet</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Upload up to 100 images per gallery, protect them with passwords, allow or block downloads,
            and set expiry or self-destruct rules.
          </p>
          <button
            onClick={() => navigate('/dashboard/upload-share/create')}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors mx-auto"
          >
            <FaPlus size={14} />
            Create Your First Gallery
          </button>
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-500">
            <span className="flex items-center gap-2"><FaTh className="text-amber/50" /> Up to 100 images each</span>
            <span className="flex items-center gap-2"><FaLock className="text-amber/50" /> Password protection</span>
            <span className="flex items-center gap-2"><FaShareAlt className="text-amber/50" /> Instant public links</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete this gallery?"
        message={`"${deleteTarget?.title}" and all its images will be permanently destroyed. Anyone with the share link will immediately lose access.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Forever'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default UploadShare;
