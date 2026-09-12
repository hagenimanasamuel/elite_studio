import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import { FaQuoteLeft, FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useSiteContent } from '../../context/SiteContentContext';

const variants = {
  enter: (dir) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] },
  },
  exit: (dir) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
  }),
};

const Stars = ({ rating }) => (
  <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
    {[...Array(5)].map((_, i) => (
      <FaStar
        key={i}
        size={13}
        aria-hidden="true"
        className={i < rating ? 'text-amber' : 'text-white/10'}
      />
    ))}
  </div>
);

const Initials = ({ name }) => {
  const letters = name.split(' ').slice(0, 2).map((n) => n[0]).join('');
  return (
    <div
      aria-hidden="true"
      className="w-12 h-12 rounded-full bg-amber/15 border border-amber/30 flex items-center justify-center text-amber text-sm font-bold flex-shrink-0"
    >
      {letters}
    </div>
  );
};

const Testimonials = () => {
  const { content } = useSiteContent();
  const testimonials = Array.isArray(content.testimonials.items) ? content.testimonials.items : [];
  const [sectionRef, inView] = useInView();
  const [[active, dir], setPage] = useState([0, 0]);
  const total = testimonials.length;
  const autoRef = useRef(null);

  // Reset carousel when the testimonial list changes (CMS update)
  useEffect(() => {
    setPage(([prev]) => [Math.min(prev, Math.max(0, total - 1)), 0]);
  }, [total]);

  const paginate = useCallback(
    (newDir) => {
      setPage(([prev]) => [(prev + newDir + total) % Math.max(1, total), newDir]);
    },
    [total]
  );

  const resetAuto = useCallback(() => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => paginate(1), 5000);
  }, [paginate]);

  useEffect(() => {
    resetAuto();
    return () => clearInterval(autoRef.current);
  }, [resetAuto]);

  // Guard against an empty list (after all hooks)
  if (total === 0) return null;
  const t = testimonials[Math.min(active, total - 1)];

  const goTo = (index) => {
    const d = index > active ? 1 : -1;
    setPage([index, d]);
    resetAuto();
  };

  const prev = () => { paginate(-1); resetAuto(); };
  const next = () => { paginate(1); resetAuto(); };

  return (
    <section
      id="testimonials"
      className="section-padding bg-charcoal-light"
      aria-labelledby="testimonials-heading"
    >
      <div className="container-custom">
        {/* Header */}
        <motion.div
          ref={sectionRef}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="text-center mb-14"
        >
          <p className="text-amber text-xs font-semibold tracking-widest uppercase mb-4">Client Love</p>
          <h2
            id="testimonials-heading"
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            <span className="text-white">What Our </span>
            <span className="gradient-text">Clients Say</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Real feedback from the people and businesses we've had the pleasure of working with
          </p>
        </motion.div>

        {/* Carousel stage */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Card shell */}
          <div
            className="glass-card rounded-3xl border border-white/6 shadow-[0_24px_72px_rgba(0,0,0,0.45)] overflow-hidden"
            style={{ minHeight: 300 }}
          >
            {/* Amber top-accent bar */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber/60 to-transparent" aria-hidden="true" />

            <div className="px-8 md:px-14 py-10">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.figure
                  key={active}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  {/* Top row: quote icon + stars */}
                  <div className="flex items-center justify-between">
                    <FaQuoteLeft
                      aria-hidden="true"
                      className="text-amber/20 text-3xl"
                    />
                    <Stars rating={t.rating} />
                  </div>

                  {/* Quote */}
                  <blockquote className="text-white/80 text-base md:text-lg leading-relaxed font-light">
                    "{t.text}"
                  </blockquote>

                  {/* Author */}
                  <figcaption className="flex items-center gap-4 pt-4 border-t border-white/6">
                    <Initials name={t.name} />
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{t.position}</p>
                    </div>

                    {/* Counter */}
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="ml-auto text-xs tabular-nums text-gray-500"
                    >
                      <span className="text-amber font-semibold">{active + 1}</span>
                      <span className="mx-1">/</span>
                      {total}
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation row */}
          <div className="flex items-center justify-between mt-6 px-1">
            {/* Dot indicators */}
            <div className="flex gap-2" role="tablist" aria-label="Testimonial navigation">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Testimonial ${i + 1}`}
                  onClick={() => goTo(i)}
                  className="group focus:outline-none"
                >
                  <span
                    className={`block rounded-full transition-all duration-350 ${
                      i === active
                        ? 'w-6 h-2 bg-amber'
                        : 'w-2 h-2 bg-white/20 group-hover:bg-white/40'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Arrow buttons */}
            <div className="flex gap-2">
              <button
                onClick={prev}
                aria-label="Previous testimonial"
                className="group flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5
                  hover:border-amber/40 hover:bg-amber/10 transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <FaChevronLeft
                  size={14}
                  className="text-gray-400 group-hover:text-amber transition-colors duration-200"
                  aria-hidden="true"
                />
              </button>
              <button
                onClick={next}
                aria-label="Next testimonial"
                className="group flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5
                  hover:border-amber/40 hover:bg-amber/10 transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <FaChevronRight
                  size={14}
                  className="text-gray-400 group-hover:text-amber transition-colors duration-200"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;