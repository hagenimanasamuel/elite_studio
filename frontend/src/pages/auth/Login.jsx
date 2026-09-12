import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { FaLock, FaUser, FaArrowLeft, FaCamera, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from "../../context/AuthContext";
import Button from '../../components/ui/Button';
import api from "../../config/axiosConfig";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);
    
    try {
      const res = await api.post("/auth/login", { email, password });
      
      if (res.data.success && res.data.user) {
        login(res.data.user);
        setSuccess(true);
        setMessage("Login successful! Redirecting...");
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      }
    } catch (error) {
      setSuccess(false);
      setMessage(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber/5 via-transparent to-amber-dark/5" aria-hidden="true" />
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,163,115,0.05) 0%, transparent 70%)' }} aria-hidden="true" />

      <button
        onClick={handleBackToHome}
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-gray-400 hover:text-amber transition-colors duration-200 z-10"
      >
        <FaArrowLeft size={16} />
        <span className="text-sm">Back to Home</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 border border-amber/15 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber/10 border border-amber/20 mb-4">
              <FaCamera className="text-amber text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Elite<span className="text-amber">Studio</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm mb-6 px-4 py-3 rounded-xl ${
              success ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-500 text-sm" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="admin@eliteimages.rw"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-500 text-sm" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <Button type="submit" className="w-full py-3.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">Secure access. All activities are logged.</p>
            <p className="text-xs text-gray-600 mt-1">Designed by <span className="text-amber">Oliviuus Ltd</span></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;