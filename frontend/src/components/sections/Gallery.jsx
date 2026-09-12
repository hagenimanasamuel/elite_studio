import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import { GALLERY_CATEGORIES } from '../../constants';
import { useSiteContent } from '../../context/SiteContentContext';
import { assetUrl } from '../../config/axiosConfig';
import { FaSearch } from 'react-icons/fa';

const Gallery = () => {
  const [ref, inView] = useInView();
  const { content } = useSiteContent();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

  // CMS images (url/caption/category) with graceful fallback to bundled defaults
  const images = useMemo(() => {
    if (!content.gallery?.enabled) return [];
    const cmsImages = Array.isArray(content.gallery.images) ? content.gallery.images : [];
    return cmsImages
      .filter((img) => img && img.url)
      .map((img, i) => ({
        id: `${i}-${img.url}`,
        title: img.caption || 'Untitled',
        category: img.category || 'Studio Shoot',
        image: assetUrl(img.url),
      }));
  }, [content.gallery]);

  const categories = useMemo(() => {
    const used = new Set(images.map((img) => img.category));
    return ['All', ...GALLERY_CATEGORIES.filter((c) => c !== 'All' && used.has(c))];
  }, [images]);

  const filtered =
    activeCategory === 'All' ? images : images.filter((item) => item.category === activeCategory);

  // Nothing to show while disabled/empty
  if (images.length === 0) {
    return (
      <section id="gallery" className="section-padding bg-charcoal" aria-label="Gallery">
        <div className="container-custom text-center">
          <p className="text-amber text-xs font-semibold tracking-widest uppercase mb-4">Our Portfolio</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Featured </span>
            <span className="gradient-text">Work</span>
          </h2>
          <p className="text-gray-500 text-sm">New work is being curated — check back soon.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="section-padding bg-charcoal" aria-labelledby="gallery-heading">
      <div ref={ref} className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="text-center mb-12"
        >
          <p className="text-amber text-xs font-semibold tracking-widest uppercase mb-4">Our Portfolio</p>
          <h2 id="gallery-heading" className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Featured </span>
            <span className="gradient-text">Work</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Explore our collection of stunning photography and videography projects
          </p>
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                ${activeCategory === cat
                  ? 'bg-amber text-charcoal shadow-[0_0_20px_rgba(212,163,115,0.2)]'
                  : 'bg-charcoal-light text-gray-400 hover:text-white border border-white/10 hover:border-amber/30'}`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Masonry Grid — CSS columns keep this fast; motion only fades in once */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedImage(item)}
              aria-label={`Open ${item.title}`}
              className="break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer w-full block"
            >
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-105 will-change-transform"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Overlay */}
                <div className="absolute inset-0 bg-charcoal/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <FaSearch className="text-amber text-3xl" />
                </div>

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-amber text-xs">{item.category}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-charcoal/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={selectedImage.title}
          >
            <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-amber transition-colors text-2xl"
                aria-label="Close image viewer"
              >
                ✕
              </button>
              <img
                src={selectedImage.image}
                alt={selectedImage.title}
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
                decoding="async"
              />
              <div className="mt-4 text-center">
                <p className="text-white font-semibold text-xl">{selectedImage.title}</p>
                <p className="text-amber">{selectedImage.category}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Gallery;
