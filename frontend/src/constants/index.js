export const COMPANY = {
  name: 'Elite Images Studio',
  shortName: 'Elite Studio',
  tagline: 'Capturing Stories from the Heart of the Volcanoes',
  description: 'Premium photography studio in Musanze, Rwanda. Specializing in studio shoots, outdoor photography, and cinematic video ads.',
  founded: 2020,
  website: 'https://eliteimages.rw',
  email: import.meta.env.VITE_COMPANY_EMAIL || 'info@eliteimages.rw',
  phone: import.meta.env.VITE_COMPANY_PHONE || '+250 788 123 456',
  phoneAlt: import.meta.env.VITE_COMPANY_PHONE_ALT || '+250 788 654 321',
  location: 'Musanze, Northern Province, Rwanda',
  address: 'KG 123 St, Musanze, Rwanda',
  googleMaps: 'https://goo.gl/maps/example',
};

// ─── Gallery limits (kept in sync with the backend) ──────────
export const MAX_IMAGES = 100;
export const MAX_IMAGE_SIZE_MB = 15;

export const NAV_LINKS = [
  { id: 'home', name: 'Home' },
  { id: 'gallery', name: 'Gallery' },
  { id: 'services', name: 'Services' },
  { id: 'about', name: 'About' },
  { id: 'testimonials', name: 'Reviews' },
  { id: 'contact', name: 'Contact' },
];

export const SERVICES = [
  {
    id: 1,
    title: 'Studio Shoot',
    icon: 'FaCamera',
    description: 'Professional studio photography with premium lighting, backdrops, and creative direction.',
  },
  {
    id: 2,
    title: 'Outer Shoot',
    icon: 'FaImage',
    description: 'Breathtaking outdoor shoots with Musanze\'s volcanic landscapes as your natural backdrop.',
  },
  {
    id: 3,
    title: 'Video Ads',
    icon: 'FaVideo',
    description: 'Cinematic video production for brands, events, and commercial storytelling.',
  },
  {
    id: 4,
    title: 'Event Coverage',
    icon: 'FaCalendarCheck',
    description: 'Complete photography and videography for weddings, corporate events, and celebrations.',
  },
  {
    id: 5,
    title: 'Photo Editing',
    icon: 'FaPalette',
    description: 'Professional retouching, color grading, and creative post-production services.',
  },
  {
    id: 6,
    title: 'Client Galleries',
    icon: 'FaFolderOpen',
    description: 'Private, password-protected online galleries for secure client viewing and downloads.',
  },
];

// Sample gallery data - will be replaced with backend data
export const GALLERY_IMAGES = [
  { id: 1, title: 'Wedding at Lake Kivu', category: 'Outer Shoot', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800' },
  { id: 2, title: 'Portrait Session', category: 'Studio Shoot', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800' },
  { id: 3, title: 'Commercial Ad', category: 'Video Ads', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800' },
  { id: 4, title: 'Mountain Landscape', category: 'Outer Shoot', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800' },
  { id: 5, title: 'Fashion Editorial', category: 'Studio Shoot', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800' },
  { id: 6, title: 'Event Highlights', category: 'Event Coverage', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800' },
  { id: 7, title: 'Product Photography', category: 'Studio Shoot', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800' },
  { id: 8, title: 'Nature Documentary', category: 'Video Ads', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800' },
  { id: 9, title: 'Couple\'s Shoot', category: 'Outer Shoot', image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800' },
];

export const GALLERY_CATEGORIES = ['All', 'Studio Shoot', 'Outer Shoot', 'Video Ads', 'Event Coverage'];

// Sample testimonials - will be replaced with backend data
export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Jean-Pierre Mugabo',
    position: 'Wedding Client',
    text: 'Elite Images Studio captured our wedding day perfectly. The photos are breathtaking and the service was exceptional from start to finish.',
    rating: 5,
    image: '',
  },
  {
    id: 2,
    name: 'Alice Uwimana',
    position: 'Business Owner',
    text: 'The video ad they produced for my business increased our sales by 40%. Professional, creative, and truly world-class quality.',
    rating: 5,
    image: '',
  },
  {
    id: 3,
    name: 'David Niyonzima',
    position: 'Event Organizer',
    text: 'We\'ve worked with Elite for multiple events. Their attention to detail and ability to capture the essence of each moment is unmatched.',
    rating: 5,
    image: '',
  },
  {
    id: 4,
    name: 'Grace Mukamana',
    position: 'Fashion Designer',
    text: 'The editorial shoot they did for my collection was featured in a major magazine. Their creative vision is extraordinary.',
    rating: 5,
    image: '',
  },
  {
    id: 5,
    name: 'Olivier Nsengimana',
    position: 'Tourism Operator',
    text: 'Stunning photography that showcases the beauty of Rwanda. Our clients love the images and it has helped our business grow.',
    rating: 4,
    image: '',
  },
];

// Stats for hero
export const STATS = [
  { value: '500+', label: 'Projects Done' },
  { value: '200+', label: 'Happy Clients' },
  { value: '98%', label: 'Satisfaction' },
  { value: '4.9', label: 'Average Rating' },
];

// ─── Default CMS Content ─────────────────────────────────────
// Canonical shape for every editable site section. The backend
// stores overrides; anything missing falls back to these values.
export const DEFAULT_CONTENT = {
  hero: {
    keywords: [
      'Studio Shoots',
      'Outdoor Photography',
      'Video Ads',
      'Event Coverage',
      'Client Galleries',
    ],
    tagline: COMPANY.tagline,
    description: COMPANY.description,
    primaryCtaLabel: 'Book a Shoot',
    secondaryCtaLabel: 'View Gallery',
    trustText: 'Trusted by 200+ clients across Rwanda',
    stats: STATS,
  },
  about: {
    description: COMPANY.description,
    locationStatement:
      'Elite Images Studio is a premier photography studio based in Musanze, Rwanda. We combine artistic vision with technical excellence to deliver stunning visual stories. From the heart of the volcanoes to your memories, we capture moments that last forever.',
    points: [
      { title: 'Passionate Photography', desc: 'Every shot is crafted with artistic vision and technical excellence.' },
      { title: 'Premium Equipment', desc: 'State-of-the-art cameras, lenses, and lighting for stunning results.' },
      { title: 'Cinematic Quality', desc: 'Video production with professional-grade cameras and editing.' },
      { title: 'Client First', desc: 'Your vision is our priority. We bring your ideas to life.' },
    ],
    certifications: [
      { title: 'Award Winning', desc: 'Recognized for excellence in photography' },
      { title: '200+ Happy Clients', desc: 'Trusted by individuals and businesses across Rwanda' },
    ],
  },
  services: {
    subtitle: 'Premium photography and videography services tailored to your vision',
    items: SERVICES.map(({ title, icon, description }) => ({ title, icon, description })),
  },
  gallery: {
    enabled: true,
    images: GALLERY_IMAGES.map(({ title, category, image }) => ({
      url: image,
      caption: title,
      category,
    })),
  },
  testimonials: {
    items: TESTIMONIALS.map(({ name, position, text, rating }) => ({ name, position, text, rating })),
  },
  contact: {
    email: COMPANY.email,
    phone: COMPANY.phone,
    phoneAlt: COMPANY.phoneAlt,
    address: COMPANY.address,
    location: COMPANY.location,
    hours: [
      { days: 'Mon - Fri', time: '8:00 AM - 6:00 PM' },
      { days: 'Sat', time: '9:00 AM - 4:00 PM' },
      { days: 'Sun', time: 'By appointment' },
    ],
  },
  footer: {
    socials: [
      { platform: 'Instagram', url: '#' },
      { platform: 'Facebook', url: '#' },
      { platform: 'Twitter', url: '#' },
      { platform: 'LinkedIn', url: '#' },
    ],
  },
};