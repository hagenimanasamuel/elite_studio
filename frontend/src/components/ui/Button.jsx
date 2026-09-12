import { motion } from 'framer-motion';

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '', 
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = 'relative overflow-hidden px-6 py-3 rounded-lg font-bold tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal';
  
  const variants = {
    primary: 'bg-amber text-charcoal hover:bg-amber-light disabled:opacity-50 focus-visible:ring-amber',
    secondary: 'border border-amber/30 text-amber hover:bg-amber/10 disabled:opacity-50 focus-visible:ring-amber',
    outline: 'border border-white/20 text-white hover:bg-white/10 disabled:opacity-50 focus-visible:ring-white',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};

export default Button;