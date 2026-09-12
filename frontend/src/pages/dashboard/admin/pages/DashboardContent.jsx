import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaHome, FaUsers, FaImages, FaEnvelope, FaEye, FaDownload,
  FaDatabase, FaLock, FaCloudUploadAlt, FaArrowRight,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../../../../config/axiosConfig';
import { useAuth } from '../../../../context/AuthContext';
import { formatDate, buildShareLink } from '../../../../utils/galleryHelpers';

const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="glass-card rounded-xl p-5 border border-white/5 hover:border-amber/20 transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent || 'bg-amber/10 border border-amber/20'}`}>
        <Icon className="text-amber" />
      </div>
    </div>
  </div>
);

const DashboardContent = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/stats');
        setStats(res.data.data);
      } catch (error) {
        console.error('Stats error:', error);
        toast.error(error.response?.data?.message === 'Admin access required'
          ? 'Dashboard statistics are available for admins only'
          : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 border border-white/5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const g = stats?.galleries || { total: 0, expired: 0, views: 0, downloads: 0 };

  // Max day for the trend chart scaling
  const maxDayViews = Math.max(1, ...(stats?.views_trend || []).map((d) => Number(d.views)));

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FaHome className="text-amber" />
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-gray-400 text-sm">Here's what's happening across your studio right now.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FaImages} label="Client Galleries" value={g.total} sub={`${g.expired} expired link${g.expired === 1 ? '' : 's'}`} />
        <StatCard icon={FaEye} label="Total Gallery Views" value={g.views} accent="bg-blue-500/10 border border-blue-500/20" />
        <StatCard icon={FaDownload} label="Photo Downloads" value={g.downloads} accent="bg-green-500/10 border border-green-500/20" />
        <StatCard
          icon={FaEnvelope}
          label="Booking Inquiries"
          value={stats?.messages?.total ?? 0}
          sub={stats?.messages?.unread > 0 ? `${stats.messages.unread} unread` : 'All read'}
          accent={stats?.messages?.unread > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber/10 border border-amber/20'}
        />
        <StatCard icon={FaDatabase} label="Images Stored" value={stats?.images ?? 0} sub={stats?.storage_formatted} />
        <StatCard icon={FaUsers} label="Registered Users" value={stats?.users ?? 0} accent="bg-purple-500/10 border border-purple-500/20" />
        <StatCard
          icon={FaLock}
          label="Password-Protected"
          value={g.protected ?? 0}
          sub="client galleries"
          accent="bg-yellow-500/10 border border-yellow-500/20"
        />
        <StatCard icon={FaCloudUploadAlt} label="Storage Used" value={stats?.storage_formatted ?? '0 B'} sub="across all galleries" />
      </div>

      {/* Views trend */}
      {(stats?.views_trend || []).length > 0 && (
        <div className="glass-card rounded-xl p-6 border border-amber/10">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FaEye className="text-amber text-sm" />
            Views · Last 7 Days
          </h3>
          <div className="flex items-end gap-2 h-32">
            {stats.views_trend.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{day.views}</span>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-amber/30 to-amber min-h-[3px] transition-all duration-300 group-hover:from-amber/50"
                  style={{ height: `${(Number(day.views) / maxDayViews) * 100}%` }}
                />
                <span className="text-[9px] text-gray-600">{new Date(day.day).getDate()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent galleries */}
        <div className="glass-card rounded-xl p-6 border border-amber/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Galleries</h3>
            <Link to="/dashboard/upload-share" className="text-amber hover:text-amber-light text-xs flex items-center gap-1">
              View all <FaArrowRight size={10} />
            </Link>
          </div>

          {(stats?.recent_galleries || []).length === 0 ? (
            <div className="text-center py-10">
              <FaImages className="text-3xl text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No galleries yet</p>
              <Link to="/dashboard/upload-share/create" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors text-sm">
                <FaCloudUploadAlt size={13} /> Create one now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_galleries.map((gallery) => (
                <div key={gallery.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-charcoal/30 hover:bg-charcoal/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-charcoal-light flex-shrink-0">
                    {gallery.cover_image_url ? (
                      <img src={assetUrl(gallery.cover_image_url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><FaImages className="text-amber/30" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                      {gallery.title}
                      {gallery.has_password && <FaLock size={9} className="text-amber flex-shrink-0" />}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {Number(gallery.images_count)} images · {Number(gallery.view_count)} views · {formatDate(gallery.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(buildShareLink(gallery.share_token), '_blank')}
                    className="p-2 text-gray-400 hover:text-amber transition-colors flex-shrink-0"
                    aria-label={`Open ${gallery.title}`}
                  >
                    <FaArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent messages */}
        <div className="glass-card rounded-xl p-6 border border-amber/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Latest Inquiries</h3>
            <Link to="/dashboard/contacts" className="text-amber hover:text-amber-light text-xs flex items-center gap-1">
              View all <FaArrowRight size={10} />
            </Link>
          </div>

          {(stats?.recent_messages || []).length === 0 ? (
            <div className="text-center py-10">
              <FaEnvelope className="text-3xl text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No inquiries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_messages.map((msg) => (
                <Link
                  key={msg.id}
                  to="/dashboard/contacts"
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-charcoal/30 hover:bg-charcoal/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-amber/15 border border-amber/25 text-amber text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {msg.name?.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{msg.name}</p>
                    <p className="text-gray-500 text-xs truncate">{msg.subject || msg.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {msg.status === 'unread' && (
                      <span className="block text-[9px] text-red-400 font-bold uppercase mb-0.5">New</span>
                    )}
                    <span className="text-gray-600 text-[10px]">{formatDate(msg.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
