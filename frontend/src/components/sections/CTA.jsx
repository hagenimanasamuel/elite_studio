import { motion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import { FaArrowRight, FaCamera } from 'react-icons/fa';
import Button from '../ui/Button';

const CTA = ({ scrollToSection }) => {
  const [ref, inView] = useInView({ threshold: 0.15 });

  return (
    <section className="py-20 relative overflow-hidden" aria-label="Call to action – book a shoot">
      {/* Background treatment */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber/10 via-transparent to-amber-dark/10" aria-hidden="true" />
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,163,115,0.08) 0%, transparent 70%)' }} aria-hidden="true" />

      <div className="container-custom relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="glass-card rounded-3xl p-10 md:p-16 text-center max-w-4xl mx-auto border border-amber/15 shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 rounded-full px-4 py-2 mb-6"
          >
            <FaCamera className="text-amber text-sm" />
            <span className="text-amber text-xs font-semibold tracking-widest uppercase">Book Now</span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
            <span className="text-white">Ready to </span>
            <span className="gradient-text">Capture Your Story?</span>
          </h2>

          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Let's create something extraordinary together. From studio sessions to outdoor shoots, 
            we'll bring your vision to life.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={() => scrollToSection('contact')}>
              Book a Shoot <FaArrowRight className="inline ml-2" aria-hidden="true" />
            </Button>
            <Button variant="secondary" onClick={() => scrollToSection('gallery')}>
              View Gallery
            </Button>
          </div>

          {/* Reassurance row */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-gray-500">
            {['Free consultation', 'Custom packages', 'Fast turnaround', 'Satisfaction guaranteed'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;