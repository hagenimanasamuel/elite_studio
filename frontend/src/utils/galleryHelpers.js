// ─── Gallery helpers shared across dashboard pages ───────────

export const buildShareLink = (shareToken) =>
  shareToken ? `${window.location.origin}/g/${shareToken}` : '';

export const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// Live status of a gallery row coming from the API
export const getLiveStatus = (gallery) => {
  if (!gallery) return { key: 'deleted', label: 'Deleted', style: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  const statuses = {
    active: { key: 'active', label: 'Active', style: 'bg-green-500/20 text-green-400 border-green-500/30' },
    expired: { key: 'expired', label: 'Expired', style: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    view_limit_reached: { key: 'view_limit_reached', label: 'View Limit Reached', style: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    deleted: { key: 'deleted', label: 'Deleted', style: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };
  return statuses[gallery.live_status] || statuses.active;
};
