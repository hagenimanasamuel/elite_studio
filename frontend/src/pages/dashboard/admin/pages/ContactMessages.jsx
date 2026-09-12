// frontend/src/pages/dashboard/admin/pages/ContactMessages.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaSearch, FaEye, FaTrash, FaReply, FaCheck, FaClock, FaUser, FaPhone, FaMailBulk } from 'react-icons/fa';
import api from '../../../../config/axiosConfig';
import toast from 'react-hot-toast';

const ContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // ─── Fetch Messages ──────────────────────────────────────────
  const fetchMessages = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/contact?page=${page}&limit=20&search=${search}`);
      if (res.data.success) {
        setMessages(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [search]);

  // ─── Handle Search ──────────────────────────────────────────
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  // ─── Mark as Read ────────────────────────────────────────────
  const markAsRead = async (id) => {
    try {
      const res = await api.put(`/contact/${id}/status`, { status: 'read' });
      if (res.data.success) {
        toast.success('Marked as read');
        fetchMessages(pagination.page);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // ─── Mark as Replied ─────────────────────────────────────────
  const markAsReplied = async (id) => {
    try {
      const res = await api.put(`/contact/${id}/status`, { status: 'replied' });
      if (res.data.success) {
        toast.success('Marked as replied');
        fetchMessages(pagination.page);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // ─── Delete Message ──────────────────────────────────────────
  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const res = await api.delete(`/contact/${id}`);
      if (res.data.success) {
        toast.success('Message deleted');
        fetchMessages(pagination.page);
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // ─── Status Badge ────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const styles = {
      unread: 'bg-red-500/20 text-red-400 border-red-500/30',
      read: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      replied: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return styles[status] || styles.unread;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Booking Inquiries</h2>
          <p className="text-gray-400 text-sm">Manage client messages and booking requests</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {messages.filter(m => m.status === 'unread').length} unread
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <FaMailBulk size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
              <p className="text-gray-400 text-sm">Total Messages</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
              <FaClock size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {messages.filter(m => m.status === 'unread').length}
              </p>
              <p className="text-gray-400 text-sm">Unread</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
              <FaCheck size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {messages.filter(m => m.status === 'replied').length}
              </p>
              <p className="text-gray-400 text-sm">Replied</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <FaEnvelope size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {messages.filter(m => m.status === 'read').length}
              </p>
              <p className="text-gray-400 text-sm">Read</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="glass-card rounded-xl p-6 border border-amber/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search by name, email or subject..."
              value={search}
              onChange={handleSearch}
              className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase border-b border-white/10">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Email</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Subject</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg, index) => (
                    <motion.tr
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        msg.status === 'unread' ? 'bg-amber/5' : ''
                      }`}
                    >
                      <td className="py-3 text-white text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {msg.status === 'unread' && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                          {msg.name}
                        </div>
                      </td>
                      <td className="py-3 text-gray-400 text-sm hidden md:table-cell">{msg.email}</td>
                      <td className="py-3 text-gray-400 text-sm hidden lg:table-cell">{msg.subject || '—'}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(msg.status)}`}>
                          {msg.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedMessage(msg)}
                            className="p-1.5 text-gray-400 hover:text-amber transition-colors"
                            title="View"
                          >
                            <FaEye size={14} />
                          </button>
                          {msg.status === 'unread' && (
                            <button
                              onClick={() => markAsRead(msg.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Mark as read"
                            >
                              <FaCheck size={14} />
                            </button>
                          )}
                          {msg.status !== 'replied' && (
                            <button
                              onClick={() => markAsReplied(msg.id)}
                              className="p-1.5 text-gray-400 hover:text-green-400 transition-colors"
                              title="Mark as replied"
                            >
                              <FaReply size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No messages found
                </div>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchMessages(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm text-gray-400 border border-white/10 rounded-lg hover:text-amber hover:border-amber/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchMessages(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 text-sm text-gray-400 border border-white/10 rounded-lg hover:text-amber hover:border-amber/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── View Message Modal ──────────────────────────────────── */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-2xl p-6 max-w-2xl w-full border border-amber/10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Message Details</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-xs uppercase">Name</p>
                  <p className="text-white font-medium">{selectedMessage.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase">Email</p>
                  <p className="text-white font-medium">{selectedMessage.email}</p>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase">Phone</p>
                    <p className="text-white font-medium">{selectedMessage.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-xs uppercase">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                </div>
                {selectedMessage.subject && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs uppercase">Subject</p>
                    <p className="text-white font-medium">{selectedMessage.subject}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs uppercase">Message</p>
                  <p className="text-white bg-charcoal/30 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs uppercase">Received</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-white/5">
                {selectedMessage.status === 'unread' && (
                  <button
                    onClick={() => {
                      markAsRead(selectedMessage.id);
                      setSelectedMessage(null);
                    }}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 transition-colors"
                  >
                    Mark as Read
                  </button>
                )}
                {selectedMessage.status !== 'replied' && (
                  <button
                    onClick={() => {
                      markAsReplied(selectedMessage.id);
                      setSelectedMessage(null);
                    }}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 transition-colors"
                  >
                    Mark as Replied
                  </button>
                )}
                <button
                  onClick={() => {
                    window.location.href = `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`;
                  }}
                  className="px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors ml-auto"
                >
                  Reply via Email
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ContactMessages;