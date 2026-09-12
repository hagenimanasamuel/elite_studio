import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import { FaCamera, FaImages, FaVideo, FaHeart, FaAward, FaUsers } from 'react-icons/fa';
import { useSiteContent } from '../../context/SiteContentContext';

const pointIcons = [FaCamera, FaImages, FaVideo, FaHeart];
const certIcons = [FaAward, FaUsers];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
};

const accents = [
  'from-amber/20 to-transparent',
  'from-blue-400/10 to-transparent',
  'from-purple-400/10 to-transparent',
  'from-red-400/10 to-transparent',
];

const About = () => {
  const { content } = useSiteContent();
  const about = content.about;
  const aboutPoints = Array.isArray(about.points) ? about.points : [];
  const certifications = Array.isArray(about.certifications) ? about.certifications : [];
  const [ref, inView] = useInView();

  return (
    <section 
      id="about" 
      className="py-16 md:py-20 bg-charcoal-light"
      aria-labelledby="about-heading"
    >
      <div className="container-custom">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 max-w-2xl mx-auto"
        >
          <p className="text-amber text-[10px] font-semibold tracking-[0.2em] uppercase mb-2">Who We Are</p>
          <h2 id="about-heading" className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">About </span>
            <span className="gradient-text">Elite Studio</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {about.description}
          </p>
        </motion.div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {certifications.map((cert, index) => (
            <div
              key={cert.title || index}
              className="group relative glass-card rounded-full px-4 py-2 border border-amber/15 hover:border-amber/40 transition-all duration-300 flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors duration-300">
                {React.createElement(certIcons[index % certIcons.length], {
                  'aria-hidden': true,
                  className: 'text-amber text-xs',
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-xs">{cert.title}</span>
                <span className="text-gray-500 text-[10px] hidden sm:inline">—</span>
                <span className="text-gray-400 text-[10px] hidden sm:inline">{cert.desc}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* About Points Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {aboutPoints.map(({ title, desc }, index) => (
            <motion.article
              key={title || index}
              variants={cardVariants}
              className="group relative glass-card rounded-xl p-4 overflow-hidden border border-white/5 hover:border-amber/25 transition-colors duration-300"
            >
              <div
                className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${accents[index % accents.length]} blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-500`}
                aria-hidden="true"
              />

              <div
                className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-amber/10 border border-amber/20 mb-3
                  group-hover:bg-amber/20 group-hover:scale-110 transition-all duration-300 flex-shrink-0"
              >
                {React.createElement(pointIcons[index % pointIcons.length], {
                  'aria-hidden': true,
                  className: 'text-amber text-sm',
                })}
              </div>

              <h3 className="relative text-white font-bold text-sm mb-1 group-hover:text-amber transition-colors duration-300">
                {title}
              </h3>
              <p className="relative text-gray-400 text-xs leading-relaxed">{desc}</p>

              <div
                className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-amber to-amber-light group-hover:w-full transition-all duration-500"
                aria-hidden="true"
              />
            </motion.article>
          ))}
        </motion.div>

        {/* Location Statement */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 text-center max-w-2xl mx-auto"
        >
          <div className="glass-card rounded-xl p-4 border border-amber/10">
            <p className="text-gray-300 text-xs leading-relaxed">
              {about.locationStatement}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber" />
                Musanze, Rwanda
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber" />
                {new Date().getFullYear() - 2020}+ Years
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber" />
                200+ Clients
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;