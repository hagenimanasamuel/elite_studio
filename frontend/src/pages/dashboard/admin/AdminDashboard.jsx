import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaHome, 
  FaUsers, 
  FaCog, 
  FaSignOutAlt, 
  FaUserCircle,
  FaChevronDown,
  FaImages,
  FaUpload,
  FaUser,
  FaEnvelope
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

// ─── Sidebar Navigation Items ──────────────────────────────
const getNavItems = (role) => {
  // Staff only gets Upload & Share + Account
  if (role === 'staff') {
    return [
      { id: 'upload-share', label: 'Upload & Share', icon: FaUpload, path: '/dashboard/upload-share' },
      { id: 'account', label: 'Account Settings', icon: FaUser, path: '/dashboard/account' },
    ];
  }

  // Admin and Super Admin get full access
  return [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome, path: '/dashboard' },
    { id: 'upload-share', label: 'Upload & Share', icon: FaUpload, path: '/dashboard/upload-share' },
    { id: 'users', label: 'Users', icon: FaUsers, path: '/dashboard/users' },
    { id: 'gallery', label: 'Gallery Management', icon: FaImages, path: '/dashboard/gallery' },
    { id: 'contacts', label: 'Booking Inquiries', icon: FaEnvelope, path: '/dashboard/contacts' },
    { id: 'cms', label: 'CMS', icon: FaCog, path: '/dashboard/cms' },
    { id: 'account', label: 'Account Settings', icon: FaUser, path: '/dashboard/account' },
  ];
};

// ─── Sidebar Component ────────────────────────────────────────
const Sidebar = ({ isOpen, setIsOpen, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = getNavItems(userRole);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-charcoal-light border-r border-amber/10 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 h-16 border-b border-amber/10">
          <span className="text-xl font-serif font-bold text-amber">
            Elite<span className="text-white">Studio</span>
          </span>
          <span className="text-[10px] text-gray-500 bg-charcoal/50 px-2 py-0.5 rounded-full border border-amber/10 ml-auto">
            {userRole}
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${active 
                    ? 'bg-amber/10 text-amber border border-amber/20' 
                    : 'text-gray-400 hover:text-amber hover:bg-amber/5'
                  }
                `}
              >
                <Icon size={18} className={active ? 'text-amber' : ''} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-amber/10">
          <div className="text-[10px] text-gray-600 text-center">
            Elite Images Studio v1.0
          </div>
        </div>
      </aside>
    </>
  );
};

// ─── Header Component ─────────────────────────────────────────
const Header = ({ user, onLogout, toggleSidebar }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getNavItems(user?.role);

  // Get current tab label from path
  const getCurrentTabLabel = () => {
    const current = navItems.find(item => item.path === location.pathname);
    return current?.label || 'Upload & Share';
  };

  return (
    <header className="bg-charcoal-light/80 backdrop-blur-sm border-b border-amber/10 px-4 md:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Left: Hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-400 hover:text-amber transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white hidden sm:block">
            {getCurrentTabLabel()}
          </h1>
        </div>

        {/* Right: Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center">
              <FaUserCircle className="text-amber text-xl" />
            </div>
            <span className="text-sm text-white hidden sm:block">
              {user?.full_name || 'Admin'}
            </span>
            <FaChevronDown 
              className={`text-gray-400 text-xs transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-charcoal-light border border-amber/10 rounded-xl shadow-xl py-1 z-50">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/dashboard/account');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-amber hover:bg-amber/5 transition-colors"
              >
                <FaUser size={16} />
                <span>Account Settings</span>
              </button>
              <hr className="border-amber/10" />
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <FaSignOutAlt size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ─── Main AdminDashboard ──────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Redirect if no user
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Staff only gets Upload & Share (+ its sub-pages) and Account
  if (user.role === 'staff') {
    const allowed =
      location.pathname.startsWith('/dashboard/upload-share') ||
      location.pathname === '/dashboard/account';
    if (!allowed) {
      navigate('/dashboard/upload-share', { replace: true });
      return null;
    }
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-charcoal flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userRole={user.role}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <Header 
          user={user} 
          onLogout={handleLogout}
          toggleSidebar={() => setIsSidebarOpen(true)}
        />
        
        <main className="p-4 md:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;