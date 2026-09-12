import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FaArrowRight, FaCamera } from 'react-icons/fa';
import Button from '../ui/Button';
import { useSiteContent } from '../../context/SiteContentContext';

const VolcanoBackground = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 1440 800"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient id="volcanoGlow" cx="50%" cy="80%" r="70%">
        <stop offset="0%" stopColor="#E76F51" stopOpacity="0.12" />
        <stop offset="30%" stopColor="#D4A373" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0A0A0A" />
        <stop offset="50%" stopColor="#1A1A1A" />
        <stop offset="100%" stopColor="#0A0A0A" />
      </linearGradient>
    </defs>
    
    <rect width="1440" height="800" fill="url(#skyGrad)" />
    <rect width="1440" height="800" fill="url(#volcanoGlow)" />
    
    {/* Stars */}
    <circle cx="200" cy="80" r="1.5" fill="#fff" opacity="0.3" />
    <circle cx="400" cy="120" r="1" fill="#fff" opacity="0.2" />
    <circle cx="600" cy="60" r="1.5" fill="#fff" opacity="0.4" />
    <circle cx="900" cy="100" r="1" fill="#fff" opacity="0.3" />
    <circle cx="1100" cy="70" r="1.5" fill="#fff" opacity="0.2" />
    <circle cx="1300" cy="130" r="1" fill="#fff" opacity="0.4" />
    <circle cx="300" cy="180" r="0.8" fill="#fff" opacity="0.2" />
    <circle cx="800" cy="40" r="1.2" fill="#fff" opacity="0.3" />
    
    {/* Volcano silhouette - Mount Karisimbi inspired */}
    <path
      d="M0,800 L0,550 Q100,520 200,540 Q350,480 450,450 Q550,420 620,390 
         Q680,360 710,320 Q740,280 760,220 Q780,260 810,300 
         Q840,340 900,370 Q1000,400 1100,430 Q1200,460 1300,490 
         Q1380,510 1440,520 L1440,800 Z"
      fill="#0A0A0A"
      opacity="0.7"
    />
    <path
      d="M0,800 L0,580 Q150,550 300,570 Q450,530 550,500 
         Q650,470 700,440 Q730,420 750,390 Q770,360 790,320 
         Q810,360 840,390 Q880,420 950,450 Q1050,480 1150,510 
         Q1250,540 1350,560 Q1400,570 1440,580 L1440,800 Z"
      fill="#1A1A1A"
      opacity="0.9"
    />
    
    {/* Lava glow from crater */}
    <ellipse cx="760" cy="230" rx="35" ry="18" fill="#E76F51" opacity="0.25" className="animate-pulse-glow" />
    <ellipse cx="760" cy="230" rx="18" ry="10" fill="#F5D76E" opacity="0.3" className="animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
  </svg>
);

const EliteArcText = () => (
  <svg viewBox="0 0 600 120" className="w-full max-w-md mx-auto mb-2">
    <defs>
      <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#D4A373" />
        <stop offset="40%" stopColor="#F5D76E" />
        <stop offset="60%" stopColor="#F5D76E" />
        <stop offset="100%" stopColor="#D4A373" />
      </linearGradient>
    </defs>
    <text
      fill="url(#arcGradient)"
      fontFamily="'Cormorant Garamond', serif"
      fontSize="48"
      fontWeight="700"
      letterSpacing="12"
      textAnchor="middle"
      className="drop-shadow-[0_0_40px_rgba(212,163,115,0.3)]"
    >
      <textPath href="#arcPath" startOffset="50%" textAnchor="middle">
        ELITE STUDIO
      </textPath>
    </text>
    <path id="arcPath" d="M40,90 Q300,10 560,90" fill="none" />
  </svg>
);

const Hero = ({ scrollToSection }) => {
  const { content } = useSiteContent();
  const hero = content.hero;
  const keywords = useMemo(
    () => (Array.isArray(hero.keywords) && hero.keywords.length > 0 ? hero.keywords : ['Photography']),
    [hero.keywords]
  );
  const stats = Array.isArray(hero.stats) ? hero.stats : [];

  const [activeKw, setActiveKw] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveKw((i) => (i + 1) % keywords.length);
    }, 2800);
    return () => clearInterval(intervalRef.current);
  }, [keywords.length]);

  return (
    <section
      id="home"
      aria-label="Hero – Elite Images Studio, photography in Musanze, Rwanda"
      className="relative min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-80px)] flex flex-col justify-center overflow-hidden pt-20 pb-12"
    >
      <VolcanoBackground />

      <div className="container-custom relative z-10 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Elite Studio Arc */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="hidden sm:block"
            >
              <EliteArcText />
            </motion.div>

            {/* Mobile title */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight sm:hidden"
            >
              <span className="text-white block">Elite</span>
              <span className="gradient-text block">Studio</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-amber text-sm md:text-base font-serif italic tracking-wide"
            >
              {hero.tagline}
            </motion.p>

            {/* Rotating keywords */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-sm h-8"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-gray-400 flex-shrink-0 leading-none">Specializing in</span>
              <div className="relative h-8 w-[180px] overflow-hidden">
                {keywords.map((kw, i) => (
                  <motion.span
                    key={kw}
                    initial={false}
                    animate={{
                      y: i === activeKw ? 0 : i < activeKw ? -32 : 32,
                      opacity: i === activeKw ? 1 : 0,
                    }}
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap font-semibold text-amber-light leading-none"
                    style={{ willChange: 'transform, opacity' }}
                  >
                    {kw}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-400 text-base md:text-lg leading-relaxed max-w-xl"
            >
              {hero.description}
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="flex flex-wrap gap-4"
            >
              <Button onClick={() => scrollToSection('contact')}>
                {hero.primaryCtaLabel} <FaArrowRight className="inline ml-2" aria-hidden="true" />
              </Button>
              <Button variant="secondary" onClick={() => scrollToSection('gallery')}>
                {hero.secondaryCtaLabel}
              </Button>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-2"
            >
              <span className="flex -space-x-2" aria-hidden="true">
                {['E', 'S'].map((l, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-charcoal-light bg-amber/20 text-amber text-[10px] font-bold flex items-center justify-center"
                  >
                    {l}
                  </span>
                ))}
              </span>
              <span>{hero.trustText}</span>
              <span className="w-1 h-1 rounded-full bg-amber/30 hidden sm:inline" aria-hidden="true" />
              <span className="text-amber font-medium hidden sm:inline">4.9 ★ Average Rating</span>
            </motion.div>
          </div>

          {/* Right column - stats */}
          <motion.aside
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.28 }}
            aria-label="Key statistics"
            className="lg:col-span-5 hidden lg:block"
          >
            <div className="relative glass-card rounded-2xl p-8 border border-amber/15 shadow-[0_8px_64px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber/8 rounded-bl-3xl rounded-tr-2xl" aria-hidden="true" />
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber animate-pulse" aria-hidden="true" />

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center">
                  <FaCamera className="text-amber" />
                </div>
                <p className="text-xs text-amber font-semibold tracking-widest uppercase">By the numbers</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {stats.map(({ value, label }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    className="group"
                  >
                    <div className="text-3xl font-serif font-bold text-amber leading-none tabular-nums group-hover:scale-105 transition-transform duration-300">
                      {value}
                    </div>
                    <div className="text-gray-400 text-xs mt-2 leading-tight">{label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>

        {/* Mobile stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="lg:hidden grid grid-cols-4 gap-3 mt-8"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center glass-card rounded-xl py-3 px-2 border border-amber/15">
              <div className="text-lg font-bold text-amber">{value}</div>
              <div className="text-gray-400 text-[9px] mt-1 leading-tight">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;