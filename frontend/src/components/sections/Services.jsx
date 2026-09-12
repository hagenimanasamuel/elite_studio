import { motion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import {
  FaCamera, FaImage, FaVideo, FaCalendarCheck, FaPalette,
  FaFolderOpen, FaHeart, FaStar, FaMountain, FaRing,
  FaUserTie, FaBaby, FaGraduationCap, FaMusic,
} from 'react-icons/fa';
import { useSiteContent } from '../../context/SiteContentContext';

// Named map keeps tree-shaking intact (a wildcard * import would pull
// the entire 1.3MB icon library into the bundle)
const ICONS = {
  FaCamera, FaImage, FaVideo, FaCalendarCheck, FaPalette,
  FaFolderOpen, FaHeart, FaStar, FaMountain, FaRing,
  FaUserTie, FaBaby, FaGraduationCap, FaMusic,
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } },
};

const getIcon = (iconName) => {
  const Icon = ICONS[iconName];
  return Icon ? <Icon aria-hidden="true" /> : null;
};

const Services = () => {
  const { content } = useSiteContent();
  const items = Array.isArray(content.services.items) ? content.services.items : [];
  const [ref, inView] = useInView({ threshold: 0.05 });

  return (
    <section id="services" className="section-padding bg-charcoal" aria-labelledby="services-heading">
      <div ref={ref} className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="text-center mb-16"
        >
          <p className="text-amber text-xs font-semibold tracking-widest uppercase mb-4">What We Offer</p>
          <h2 id="services-heading" className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Our </span>
            <span className="gradient-text">Services</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {content.services.subtitle}
          </p>
        </motion.div>

        <motion.ul
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 list-none"
          role="list"
        >
          {items.map((service, index) => (
            <motion.li
              key={service.title || index}
              variants={itemVariants}
              className="group glass-card rounded-2xl p-7 border border-white/5 hover:border-amber/20 transition-all duration-300
                hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)] cursor-default"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber/10 border border-amber/20 mb-5 text-amber text-3xl
                  group-hover:bg-amber group-hover:text-charcoal group-hover:scale-105 transition-all duration-300"
              >
                {getIcon(service.icon)}
              </div>

              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber transition-colors duration-300">
                {service.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>

              <div
                className="mt-5 h-0.5 bg-gradient-to-r from-amber/30 to-transparent w-10 group-hover:w-full transition-all duration-500"
                aria-hidden="true"
              />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
};

export default Services;