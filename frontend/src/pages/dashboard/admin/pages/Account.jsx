import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaSave, 
  FaTimes, FaCamera, FaUserCircle, FaKey, FaLock,
  FaCheck, FaEye, FaEyeSlash
} from 'react-icons/fa';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../config/axiosConfig';
import toast from 'react-hot-toast';

const Account = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // ─── Load User Data ──────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
      });
    }
  }, [user]);

  // ─── Handle Form Change ─────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // ─── Update Profile ──────────────────────────────────────────
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const res = await api.put('/users/profile', formData);
      if (res.data.success) {
        // Update user in context using setUser
        const updatedUser = { ...user, ...res.data.data };
        setUser(updatedUser);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Change Password ─────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Validate passwords
    if (passwordData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await api.put('/users/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      if (res.data.success) {
        toast.success('Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // ─── Get Role Badge ──────────────────────────────────────────
  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      staff: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return styles[role] || styles.staff;
  };

  // ─── Get Status Badge ────────────────────────────────────────
  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
      suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return styles[status] || styles.inactive;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Account Settings</h2>
          <p className="text-gray-400 text-sm">Manage your profile information</p>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber/10 border border-amber/20 text-amber rounded-lg font-bold hover:bg-amber/20 transition-colors"
        >
          <FaKey size={14} />
          Change Password
        </button>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-xl p-6 border border-amber/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-amber/10 border-2 border-amber/30 flex items-center justify-center">
              {user.profile_image_url ? (
                <img 
                  src={user.profile_image_url} 
                  alt={user.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <FaUserCircle className="text-amber text-5xl" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-amber rounded-full text-charcoal hover:bg-amber-light transition-colors">
              <FaCamera size={12} />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white">{user.full_name}</h3>
            <p className="text-gray-400">{user.email}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`text-xs px-3 py-1 rounded-full border ${getRoleBadge(user.role)}`}>
                {user.role}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full border ${getStatusBadge(user.status)}`}>
                {user.status}
              </span>
              <span className="text-xs text-gray-500">
                Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="glass-card rounded-xl p-6 border border-amber/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FaUser className="text-amber" />
          Edit Profile
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-500 text-sm" />
                </div>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-500 text-sm" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="john@eliteimages.rw"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-500 text-sm" />
                </div>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="+250 788 123 456"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">
                Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaMapMarkerAlt className="text-gray-500 text-sm" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="Musanze, Rwanda"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50"
            >
              {updating ? (
                <>
                  <div className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Change Password Modal ──────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-2xl p-6 max-w-md w-full border border-amber/10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaKey className="text-amber" />
                Change Password
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    current_password: '',
                    new_password: '',
                    confirm_password: '',
                  });
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">
                  Current Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-500 text-sm" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    required
                    className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-12 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-500 text-sm" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    required
                    className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-12 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showNewPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-white text-sm font-medium mb-1.5 block">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaCheck className="text-gray-500 text-sm" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    required
                    className="w-full bg-charcoal/50 border border-white/10 rounded-lg pl-10 pr-12 py-2.5 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
                {passwordData.new_password && passwordData.confirm_password && (
                  <p className={`text-xs mt-1 ${passwordData.new_password === passwordData.confirm_password ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordData.new_password === passwordData.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-charcoal/30 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-gray-400">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <FaKey size={14} />
                      Change Password
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      current_password: '',
                      new_password: '',
                      confirm_password: '',
                    });
                  }}
                  className="px-4 py-2.5 border border-white/20 text-gray-400 rounded-lg font-bold hover:bg-white/5 transition-colors"
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

export default Account;