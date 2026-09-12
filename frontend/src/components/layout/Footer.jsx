import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaLinkedin, FaTwitter, FaFacebook, FaInstagram, FaLock } from 'react-icons/fa';
import { COMPANY, NAV_LINKS } from '../../constants';
import { useSiteContent } from '../../context/SiteContentContext';
import { useNavigate } from 'react-router-dom';

const quickServices = [
  { name: 'Studio Shoot', desc: 'Professional studio photography' },
  { name: 'Outer Shoot', desc: 'Outdoor & landscape photography' },
  { name: 'Video Ads', desc: 'Cinematic video production' },
  { name: 'Client Galleries', desc: 'Secure online galleries' },
];

const SOCIAL_ICONS = {
  Instagram: FaInstagram,
  Facebook: FaFacebook,
  Twitter: FaTwitter,
  LinkedIn: FaLinkedin,
};

const FooterWatermark = () => (
  <svg
    aria-hidden="true"
    className="absolute bottom-0 right-0 pointer-events-none select-none"
    width="300"
    height="140"
    viewBox="0 0 600 280"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: 0.04 }}
  >
    <g stroke="#D4A373" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform="translate(20,40)">
      {/* E */}
      <line x1="0" y1="0" x2="0" y2="200" />
      <line x1="0" y1="0" x2="100" y2="0" />
      <line x1="0" y1="100" x2="80" y2="100" />
      <line x1="0" y1="200" x2="100" y2="200" />
      {/* L */}
      <line x1="150" y1="0" x2="150" y2="200" />
      <line x1="150" y1="200" x2="220" y2="200" />
      {/* I */}
      <line x1="270" y1="0" x2="270" y2="200" />
      {/* T */}
      <line x1="320" y1="0" x2="400" y2="0" />
      <line x1="360" y1="0" x2="360" y2="200" />
      {/* E */}
      <line x1="450" y1="0" x2="450" y2="200" />
      <line x1="450" y1="0" x2="550" y2="0" />
      <line x1="450" y1="100" x2="530" y2="100" />
      <line x1="450" y1="200" x2="550" y2="200" />
    </g>
  </svg>
);

const Footer = ({ scrollToSection }) => {
  const navigate = useNavigate();
  const { content } = useSiteContent();
  const socials = Array.isArray(content.footer.socials) ? content.footer.socials : [];
  const email = COMPANY.email;
  const phone = COMPANY.phone;
  const phoneAlt = COMPANY.phoneAlt;
  const location = COMPANY.location;

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <footer className="relative bg-charcoal-light border-t border-amber/10 overflow-hidden" aria-label="Site footer">
      <FooterWatermark />

      {/* Top zone */}
      <div className="relative container-custom pt-16 pb-10 border-b border-amber/10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          {/* Brand side */}
          <div className="max-w-sm">
            <a
              href="#home"
              onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
              className="inline-block mb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded"
              aria-label={`${COMPANY.shortName} – back to top`}
            >
              <span className="text-3xl font-serif font-bold text-amber">
                Elite<span className="text-white">Studio</span>
              </span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed">{COMPANY.description}</p>
          </div>

          {/* Contact strip */}
          <address className="not-italic flex flex-col sm:flex-row gap-6 lg:gap-10">
            <a
              href={`mailto:${email}`}
              className="group flex items-center gap-3 text-gray-400 hover:text-amber transition-colors duration-200"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-lg border border-amber/20 bg-amber/5 group-hover:bg-amber/15 transition-colors duration-200">
                <FaEnvelope className="text-amber text-sm" aria-hidden="true" />
              </span>
              <span className="text-sm">{email}</span>
            </a>

            <div className="flex items-start gap-3 text-gray-400">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg border border-amber/20 bg-amber/5 flex-shrink-0">
                <FaPhone className="text-amber text-sm" aria-hidden="true" />
              </span>
              <div className="text-sm">
                <a href={`tel:${phone}`} className="hover:text-amber transition-colors duration-200 block">{phone}</a>
                <a href={`tel:${phoneAlt}`} className="hover:text-amber transition-colors duration-200 block mt-0.5">{phoneAlt}</a>
              </div>
            </div>

            <div className="flex items-start gap-3 text-gray-400">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg border border-amber/20 bg-amber/5 flex-shrink-0">
                <FaMapMarkerAlt className="text-amber text-sm" aria-hidden="true" />
              </span>
              <span className="text-sm leading-relaxed">{location}</span>
            </div>
          </address>
        </div>
      </div>

      {/* Mid zone */}
      <div className="relative container-custom py-8 border-b border-amber/10">
        <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
          {/* Nav links */}
          <nav aria-label="Footer navigation" className="flex-shrink-0">
            <p className="text-[10px] text-amber font-semibold tracking-widest uppercase mb-3">Pages</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-sm text-gray-400 hover:text-amber transition-colors duration-200 focus:outline-none focus-visible:text-amber"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Vertical divider */}
          <div className="hidden md:block w-px self-stretch bg-amber/10 flex-shrink-0" aria-hidden="true" />

          {/* Quick services */}
          <div className="flex-1">
            <p className="text-[10px] text-amber font-semibold tracking-widest uppercase mb-3">Our Services</p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
              {quickServices.map((s) => (
                <li key={s.name}>
                  <button
                    onClick={() => scrollToSection('services')}
                    className="group text-left focus:outline-none"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-amber transition-colors duration-200 font-medium">
                      {s.name}
                    </span>
                    <span className="block text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-200">
                      {s.desc}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Vertical divider */}
          <div className="hidden md:block w-px self-stretch bg-amber/10 flex-shrink-0" aria-hidden="true" />

          {/* Socials + Login */}
          <div className="flex-shrink-0">
            <p className="text-[10px] text-amber font-semibold tracking-widest uppercase mb-3">Follow</p>
            <div className="flex gap-2 mb-4">
              {socials.map(({ platform, url }) => {
                const Icon = SOCIAL_ICONS[platform] || FaInstagram;
                return (
                  <a
                    key={platform}
                    href={url || '#'}
                    target={url && url !== '#' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    aria-label={platform}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-amber/20 bg-amber/5 text-gray-400
                      hover:bg-amber hover:text-charcoal hover:border-amber transition-all duration-250
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                  >
                    <Icon size={15} aria-hidden="true" />
                  </a>
                );
              })}
            </div>

            {/* Login Button */}
            <button
              onClick={handleLoginClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber/20 bg-amber/5 text-gray-400 hover:text-amber hover:bg-amber/10 hover:border-amber/40 transition-all duration-200 w-full justify-center"
            >
              <FaLock size={12} aria-hidden="true" />
              <span className="text-xs font-medium">Login</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative container-custom py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
          <p>
            Designed by{' '}
            <a
              href="https://oliviuus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber hover:text-amber-light transition-colors font-medium focus:outline-none focus-visible:underline"
            >
              Oliviuus Ltd
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;