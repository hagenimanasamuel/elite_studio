import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaSearch, FaPlus, FaEdit, FaTrash, FaUserPlus, FaUsers, FaShieldAlt, 
  FaTimes, FaSave, FaEye, FaUserCheck, FaUserSlash 
} from 'react-icons/fa';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../config/axiosConfig';
import toast from 'react-hot-toast';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff',
    phone_number: '',
    address: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // ─── Fetch Users ────────────────────────────────────────────
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/users?page=${page}&limit=20&search=${search}`);
      if (res.data.success) {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  // ─── Handle Search ──────────────────────────────────────────
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  // ─── Open Modal for Create/Edit ─────────────────────────────
  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role,
        phone_number: user.phone_number || '',
        address: user.address || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'staff',
        phone_number: '',
        address: '',
      });
    }
    setShowModal(true);
  };

  // ─── Close Modal ─────────────────────────────────────────────
  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'staff',
      phone_number: '',
      address: '',
    });
  };

  // ─── Handle Form Change ─────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ─── Submit Form (Create/Update) ────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let res;
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        res = await api.put(`/users/${editingUser.id}`, updateData);
        if (res.data.success) {
          toast.success('User updated successfully');
          fetchUsers(pagination.page);
        }
      } else {
        if (!formData.password) {
          toast.error('Password is required for new users');
          return;
        }
        res = await api.post('/users', formData);
        if (res.data.success) {
          toast.success('User created successfully');
          fetchUsers(pagination.page);
        }
      }
      closeModal();
    } catch (error) {
      console.error('Save user error:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  // ─── Delete User ─────────────────────────────────────────────
  const handleDelete = async (userId, userRole, userName) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (userRole === 'super_admin') {
      toast.error('Cannot delete Super Admin user');
      return;
    }

    if (currentUser?.role === 'admin' && userRole !== 'staff') {
      toast.error('Admin can only delete staff users');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/users/${userId}`);
      if (res.data.success) {
        toast.success('User deleted successfully');
        fetchUsers(pagination.page);
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  // ─── Toggle User Status ─────────────────────────────────────
  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const res = await api.put(`/users/${userId}`, { status: newStatus });
      if (res.data.success) {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchUsers(pagination.page);
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  // ─── Role Badge ──────────────────────────────────────────────
  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      staff: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return styles[role] || styles.staff;
  };

  // ─── Status Badge ────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
      suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return styles[status] || styles.inactive;
  };

  // ─── Can Edit/Delete User ───────────────────────────────────
  const canManageUser = (userRole) => {
    // Super Admin can manage everyone except other super admins
    if (currentUser?.role === 'super_admin') {
      return userRole !== 'super_admin';
    }
    // Admin can manage staff only
    if (currentUser?.role === 'admin') {
      return userRole === 'staff';
    }
    return false;
  };

  // ─── Check if user can view this page ──────────────────────
  if (currentUser?.role === 'staff') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FaShieldAlt className="text-4xl text-amber/30 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-400 text-sm">You don't have permission to view this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 text-sm">Manage your team members</p>
        </div>
        {currentUser?.role !== 'staff' && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors"
          >
            <FaUserPlus size={14} />
            Add User
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <FaUsers size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
              <p className="text-gray-400 text-sm">Total Users</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
              <FaUserCheck size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.status === 'active').length}
              </p>
              <p className="text-gray-400 text-sm">Active Users</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <FaShieldAlt size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </p>
              <p className="text-gray-400 text-sm">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="glass-card rounded-xl p-6 border border-amber/10">
        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={handleSearch}
              className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase border-b border-white/10">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 text-white text-sm font-medium">
                        {user.full_name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-[10px] text-amber">(You)</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-400 text-sm hidden sm:table-cell">{user.email}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Status - Only for non-super_admin and not self */}
                          {user.role !== 'super_admin' && user.id !== currentUser?.id && canManageUser(user.role) && (
                            <button
                              onClick={() => toggleStatus(user.id, user.status)}
                              className="p-1.5 text-gray-400 hover:text-amber transition-colors"
                              title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {user.status === 'active' ? 
                                <FaUserSlash size={14} /> : 
                                <FaUserCheck size={14} />
                              }
                            </button>
                          )}
                          
                          {/* Edit - Only if can manage */}
                          {canManageUser(user.role) && user.id !== currentUser?.id && (
                            <button
                              onClick={() => openModal(user)}
                              className="p-1.5 text-gray-400 hover:text-amber transition-colors"
                              title="Edit"
                            >
                              <FaEdit size={14} />
                            </button>
                          )}
                          
                          {/* Delete - Only if can manage and not self */}
                          {canManageUser(user.role) && user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user.id, user.role, user.full_name)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No users found
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm text-gray-400 border border-white/10 rounded-lg hover:text-amber hover:border-amber/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchUsers(pagination.page + 1)}
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

      {/* ─── Modal (Create/Edit User) ───────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-2xl p-6 max-w-md w-full border border-amber/10 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="john@eliteimages.rw"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingUser}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                >
                  <option value="staff">Staff</option>
                  {currentUser?.role !== 'staff' && (
                    <option value="admin">Admin</option>
                  )}
                  {currentUser?.role === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Phone Number</label>
                <input                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="+250 788 123 456"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="Musanze, Rwanda"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors"
                >
                  <FaSave size={14} />
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-white/20 text-gray-400 rounded-lg font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Users;