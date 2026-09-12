import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../constants';

const Navbar = ({ scrollToSection }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          setAtTop(currentY < 20);
          if (currentY < 80) {
            setVisible(true);
          } else if (currentY > lastScrollY.current + 8) {
            setVisible(false);
            setIsOpen(false);
          } else if (currentY < lastScrollY.current - 8) {
            setVisible(true);
          }
          lastScrollY.current = currentY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <motion.header
      role="banner"
      initial={false}
      animate={{ y: visible ? 0 : '-110%' }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        atTop
          ? 'bg-transparent'
          : 'bg-charcoal/90 backdrop-blur-xl border-b border-amber/10 shadow-[0_1px_24px_rgba(0,0,0,0.35)]'
      }`}
    >
      <nav aria-label="Main navigation" className="container-custom">
        <div className="flex items-center justify-between h-[72px] md:h-20">
          {/* Logo */}
          <motion.a
            href="#home"
            aria-label="Elite Images Studio – home"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded"
          >
            <span className="text-2xl font-serif font-bold text-amber">
              Elite<span className="text-white">Studio</span>
            </span>
          </motion.a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link, i) => (
              <motion.button
                key={link.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                onClick={() => scrollToSection(link.id)}
                className="relative px-4 py-2 text-sm font-medium text-gray-300 hover:text-amber transition-colors duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded"
              >
                {link.name}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </motion.button>
            ))}
            
            {/* Logout button if logged in */}
            {user ? (
              <button
                onClick={handleLogout}
                className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-amber/20 text-amber hover:bg-amber/10 transition-colors duration-200"
              >
                <FaSignOutAlt size={14} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            ) : (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: NAV_LINKS.length * 0.07 }}
                onClick={() => scrollToSection('contact')}
                className="ml-4 relative overflow-hidden px-6 py-2.5 rounded-lg bg-amber text-charcoal text-sm font-bold tracking-wide
                  before:absolute before:inset-0 before:bg-white/0 hover:before:bg-white/15 before:transition-colors before:duration-300
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
              >
                Book a Shoot
              </motion.button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            className="md:hidden p-2 text-gray-300 hover:text-amber transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded"
            onClick={() => setIsOpen((o) => !o)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isOpen ? 'close' : 'open'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                {isOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden md:hidden"
            >
              <div className="bg-charcoal-light/98 backdrop-blur-xl border border-amber/10 rounded-xl mx-0 mb-4 px-5 py-6 flex flex-col gap-1 shadow-2xl">
                {NAV_LINKS.map((link, i) => (
                  <motion.button
                    key={link.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => { scrollToSection(link.id); setIsOpen(false); }}
                    className="text-left py-3 px-3 text-gray-300 hover:text-amber hover:bg-white/5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    {link.name}
                  </motion.button>
                ))}
                
                {user ? (
                  <button
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="mt-3 py-3 px-3 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors duration-200"
                  >
                    <FaSignOutAlt size={14} />
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={() => { scrollToSection('contact'); setIsOpen(false); }}
                    className="mt-3 py-3 px-3 bg-amber text-charcoal rounded-lg text-sm font-bold text-center hover:bg-amber-light transition-colors duration-200"
                  >
                    Book a Shoot
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Navbar;