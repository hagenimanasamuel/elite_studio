import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronDown, FaChevronRight, FaSave, FaPlus, FaTrash,
  FaCog, FaCheck, FaUndo,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../../../config/axiosConfig';
import { useSiteContent } from '../../../../context/SiteContentContext';

// ─── Section Registry ────────────────────────────────────────
const SECTIONS = [
  { id: 'hero', label: 'Hero Section', hint: 'Main banner, rotating specialties & stats' },
  { id: 'about', label: 'About Section', hint: 'Studio story, highlights & certifications' },
  { id: 'services', label: 'Services Section', hint: 'Service cards on the landing page' },
  { id: 'testimonials', label: 'Testimonials Section', hint: 'Client reviews carousel' },
  { id: 'contact', label: 'Contact Section', hint: 'Contact details & opening hours' },
  { id: 'footer', label: 'Footer', hint: 'Social media links' },
];

const SERVICE_ICONS = [
  'FaCamera', 'FaImage', 'FaVideo', 'FaCalendarCheck', 'FaPalette',
  'FaFolderOpen', 'FaHeart', 'FaStar', 'FaMountain', 'FaRing',
  'FaUserTie', 'FaBaby', 'FaGraduationCap', 'FaMusic',
];

const SOCIAL_PLATFORMS = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'YouTube', 'TikTok'];

// ─── Small Form Controls ─────────────────────────────────────
const Input = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <label className="block">
    <span className="text-gray-400 text-xs uppercase tracking-wide font-medium block mb-1">{label}</span>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors"
    />
  </label>
);

const TextArea = ({ label, value, onChange, rows = 3 }) => (
  <label className="block">
    <span className="text-gray-400 text-xs uppercase tracking-wide font-medium block mb-1">{label}</span>
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber transition-colors resize-none"
    />
  </label>
);

const Select = ({ label, value, options, onChange }) => (
  <label className="block">
    <span className="text-gray-400 text-xs uppercase tracking-wide font-medium block mb-1">{label}</span>
    <select
      value={value ?? options[0]}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-charcoal/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber focus:outline-none transition-colors"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt.replace('Fa', '')}</option>
      ))}
    </select>
  </label>
);

const ItemCard = ({ title, children, onRemove }) => (
  <div className="relative border border-white/10 rounded-xl p-4 bg-charcoal/30 space-y-3 group">
    <div className="flex items-center justify-between">
      <span className="text-amber text-xs font-semibold">{title}</span>
      <button
        onClick={onRemove}
        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded"
        aria-label={`Remove ${title}`}
      >
        <FaTrash size={12} />
      </button>
    </div>
    {children}
  </div>
);

const AddButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    type="button"
    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-amber/30 rounded-lg text-sm text-amber hover:bg-amber/10 hover:border-amber/50 transition-all"
  >
    <FaPlus size={12} /> {label}
  </button>
);

// ─── Main CMS Page ───────────────────────────────────────────
const CMS = () => {
  const { content, refresh, ready } = useSiteContent();
  const [expanded, setExpanded] = useState('hero');
  const [drafts, setDrafts] = useState({});
  const [savingSection, setSavingSection] = useState(null);
  const [dirty, setDirty] = useState({});
  const seededRef = useRef(false);

  // Seed drafts once real (server or default) content is available
  useEffect(() => {
    if (!ready || seededRef.current) return;
    seededRef.current = true;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of SECTIONS) {
        if (!next[s.id]) next[s.id] = JSON.parse(JSON.stringify(content[s.id] || {}));
      }
      return next;
    });
  }, [ready, content]);

  // ─── Draft helpers ──────────────────────────────────────────
  const patchDraft = (sectionId, patch) => {
    setDrafts((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], ...patch } }));
    setDirty((prev) => ({ ...prev, [sectionId]: true }));
  };

  const patchListItem = (sectionId, key, index, patch) => {
    setDrafts((prev) => {
      const list = [...(prev[sectionId]?.[key] || [])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [sectionId]: { ...prev[sectionId], [key]: list } };
    });
    setDirty((prev) => ({ ...prev, [sectionId]: true }));
  };

  const addListItem = (sectionId, key, template) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [key]: [...(prev[sectionId]?.[key] || []), template] },
    }));
    setDirty((prev) => ({ ...prev, [sectionId]: true }));
  };

  const removeListItem = (sectionId, key, index) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [key]: (prev[sectionId]?.[key] || []).filter((_, i) => i !== index) },
    }));
    setDirty((prev) => ({ ...prev, [sectionId]: true }));
  };

  // ─── Persistence ────────────────────────────────────────────
  const saveSection = async (sectionId) => {
    setSavingSection(sectionId);
    try {
      await api.put(`/content/${sectionId}`, { data: drafts[sectionId] });
      await refresh();
      setDirty((prev) => ({ ...prev, [sectionId]: false }));
      toast.success(`${SECTIONS.find((s) => s.id === sectionId)?.label} saved!`);
    } catch (error) {
      console.error('CMS save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save section');
    } finally {
      setSavingSection(null);
    }
  };

  const resetSection = async (sectionId) => {
    if (!window.confirm(`Reset "${SECTIONS.find((s) => s.id === sectionId)?.label}" to the original site defaults?`)) return;
    try {
      await api.delete(`/content/${sectionId}`);
      await refresh();
      setDrafts((prev) => ({
        ...prev,
        [sectionId]: JSON.parse(JSON.stringify(content[sectionId] || {})),
      }));
      setDirty((prev) => ({ ...prev, [sectionId]: false }));
      toast.success('Section reset to defaults');
    } catch {
      toast.error('Failed to reset section');
    }
  };

  const discardSection = (sectionId) => {
    setDrafts((prev) => ({ ...prev, [sectionId]: JSON.parse(JSON.stringify(content[sectionId] || {})) }));
    setDirty((prev) => ({ ...prev, [sectionId]: false }));
    toast('Changes discarded', { icon: '↩️' });
  };

  const dirtyCount = useMemo(() => Object.values(dirty).filter(Boolean).length, [dirty]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaCog className="text-amber" />
            Content Management System
          </h2>
          <p className="text-gray-400 text-sm">
            Every change publishes instantly to your public website
            {dirtyCount > 0 && <span className="text-amber ml-2">· {dirtyCount} unsaved section{dirtyCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-amber transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          Preview Website ↗
        </a>
      </div>

      {/* Gallery note */}
      <div className="glass-card rounded-xl p-4 border border-amber/10 flex items-center gap-3">
        <FaCheck className="text-green-400 flex-shrink-0" />
        <p className="text-gray-300 text-sm flex-1">
          The landing-page photo gallery has its own dedicated manager.
        </p>
        <a href="/dashboard/gallery" className="text-amber hover:text-amber-light text-sm font-medium whitespace-nowrap">
          Manage Gallery Photos →
        </a>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const isOpen = expanded === section.id;
          const draft = drafts[section.id];
          const isSaving = savingSection === section.id;

          return (
            <div key={section.id} className="glass-card rounded-xl border border-white/5 overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => setExpanded(isOpen ? null : section.id)}
                className="w-full flex items-center justify-between p-4 bg-charcoal/30 hover:bg-charcoal/50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="text-white font-medium">{section.label}</span>
                  {dirty[section.id] && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      Unsaved
                    </span>
                  )}
                  {!isOpen && !dirty[section.id] && (
                    <span className="text-gray-600 text-xs hidden md:inline">— {section.hint}</span>
                  )}
                </span>
                {isOpen ? (
                  <FaChevronDown className="text-gray-400" />
                ) : (
                  <FaChevronRight className="text-gray-400" />
                )}
              </button>

              {/* Accordion body */}
              <AnimatePresence initial={false}>
                {isOpen && draft && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="p-4 space-y-4 bg-charcoal/20 border-t border-white/5">
                      {/* ═══════════ HERO ═══════════ */}
                      {section.id === 'hero' && (
                        <>
                          <Input label="Tagline" value={draft.tagline} onChange={(v) => patchDraft('hero', { tagline: v })} placeholder="Capturing Stories..." />
                          <TextArea label="Description" value={draft.description} onChange={(v) => patchDraft('hero', { description: v })} />
                          <Input
                            label="Rotating Specialties (comma separated)"
                            value={Array.isArray(draft.keywords) ? draft.keywords.join(', ') : ''}
                            onChange={(v) => patchDraft('hero', { keywords: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                            placeholder="Studio Shoots, Video Ads, ..."
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="Primary Button Label" value={draft.primaryCtaLabel} onChange={(v) => patchDraft('hero', { primaryCtaLabel: v })} />
                            <Input label="Secondary Button Label" value={draft.secondaryCtaLabel} onChange={(v) => patchDraft('hero', { secondaryCtaLabel: v })} />
                          </div>
                          <Input label="Trust Text" value={draft.trustText} onChange={(v) => patchDraft('hero', { trustText: v })} />

                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <p className="text-white text-sm font-medium">Hero Stats</p>
                            {(Array.isArray(draft.stats) ? draft.stats : []).map((stat, i) => (
                              <ItemCard key={i} title={`Stat ${i + 1}`} onRemove={() => removeListItem('hero', 'stats', i)}>
                                <div className="grid grid-cols-2 gap-3">
                                  <Input label="Value" value={stat.value} onChange={(v) => patchListItem('hero', 'stats', i, { value: v })} placeholder="500+" />
                                  <Input label="Label" value={stat.label} onChange={(v) => patchListItem('hero', 'stats', i, { label: v })} placeholder="Projects Done" />
                                </div>
                              </ItemCard>
                            ))}
                            <AddButton label="Add Stat" onClick={() => addListItem('hero', 'stats', { value: '', label: '' })} />
                          </div>
                        </>
                      )}

                      {/* ═══════════ ABOUT ═══════════ */}
                      {section.id === 'about' && (
                        <>
                          <TextArea label="Short Description" value={draft.description} onChange={(v) => patchDraft('about', { description: v })} />
                          <TextArea label="Location Statement" rows={4} value={draft.locationStatement} onChange={(v) => patchDraft('about', { locationStatement: v })} />

                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <p className="text-white text-sm font-medium">Highlight Cards</p>
                            {(Array.isArray(draft.points) ? draft.points : []).map((point, i) => (
                              <ItemCard key={i} title={`Point ${i + 1}`} onRemove={() => removeListItem('about', 'points', i)}>
                                <Input label="Title" value={point.title} onChange={(v) => patchListItem('about', 'points', i, { title: v })} />
                                <TextArea label="Description" rows={2} value={point.desc} onChange={(v) => patchListItem('about', 'points', i, { desc: v })} />
                              </ItemCard>
                            ))}
                            <AddButton label="Add Highlight" onClick={() => addListItem('about', 'points', { title: '', desc: '' })} />
                          </div>

                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <p className="text-white text-sm font-medium">Certification Badges</p>
                            {(Array.isArray(draft.certifications) ? draft.certifications : []).map((cert, i) => (
                              <ItemCard key={i} title={`Badge ${i + 1}`} onRemove={() => removeListItem('about', 'certifications', i)}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <Input label="Title" value={cert.title} onChange={(v) => patchListItem('about', 'certifications', i, { title: v })} />
                                  <Input label="Subtitle" value={cert.desc} onChange={(v) => patchListItem('about', 'certifications', i, { desc: v })} />
                                </div>
                              </ItemCard>
                            ))}
                            <AddButton label="Add Badge" onClick={() => addListItem('about', 'certifications', { title: '', desc: '' })} />
                          </div>
                        </>
                      )}

                      {/* ═══════════ SERVICES ═══════════ */}
                      {section.id === 'services' && (
                        <>
                          <TextArea label="Section Subtitle" rows={2} value={draft.subtitle} onChange={(v) => patchDraft('services', { subtitle: v })} />
                          <div className="space-y-3">
                            {(Array.isArray(draft.items) ? draft.items : []).map((item, i) => (
                              <ItemCard key={i} title={`Service ${i + 1}`} onRemove={() => removeListItem('services', 'items', i)}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <Input label="Title" value={item.title} onChange={(v) => patchListItem('services', 'items', i, { title: v })} />
                                  <Select label="Icon" value={item.icon} options={SERVICE_ICONS} onChange={(v) => patchListItem('services', 'items', i, { icon: v })} />
                                </div>
                                <TextArea label="Description" rows={2} value={item.description} onChange={(v) => patchListItem('services', 'items', i, { description: v })} />
                              </ItemCard>
                            ))}
                            <AddButton label="Add Service" onClick={() => addListItem('services', 'items', { title: '', icon: 'FaCamera', description: '' })} />
                          </div>
                        </>
                      )}

                      {/* ═══════════ TESTIMONIALS ═══════════ */}
                      {section.id === 'testimonials' && (
                        <div className="space-y-3">
                          {(Array.isArray(draft.items) ? draft.items : []).map((item, i) => (
                            <ItemCard key={i} title={`Review ${i + 1}`} onRemove={() => removeListItem('testimonials', 'items', i)}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input label="Client Name" value={item.name} onChange={(v) => patchListItem('testimonials', 'items', i, { name: v })} />
                                <Input label="Role / Context" value={item.position} onChange={(v) => patchListItem('testimonials', 'items', i, { position: v })} placeholder="Wedding Client" />
                              </div>
                              <TextArea label="Review" rows={3} value={item.text} onChange={(v) => patchListItem('testimonials', 'items', i, { text: v })} />
                              <Input label="Rating (1–5)" type="number" min="1" max="5" value={item.rating} onChange={(v) => patchListItem('testimonials', 'items', i, { rating: Math.max(1, Math.min(5, parseInt(v, 10) || 5)) })} />
                            </ItemCard>
                          ))}
                          <AddButton label="Add Review" onClick={() => addListItem('testimonials', 'items', { name: '', position: '', text: '', rating: 5 })} />
                        </div>
                      )}

                      {/* ═══════════ CONTACT ═══════════ */}
                      {section.id === 'contact' && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="Email" value={draft.email} onChange={(v) => patchDraft('contact', { email: v })} />
                            <Input label="Primary Phone" value={draft.phone} onChange={(v) => patchDraft('contact', { phone: v })} />
                            <Input label="Alternate Phone" value={draft.phoneAlt} onChange={(v) => patchDraft('contact', { phoneAlt: v })} />
                            <Input label="Location" value={draft.location} onChange={(v) => patchDraft('contact', { location: v })} />
                          </div>
                          <Input label="Street Address" value={draft.address} onChange={(v) => patchDraft('contact', { address: v })} />

                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <p className="text-white text-sm font-medium">Opening Hours</p>
                            {(Array.isArray(draft.hours) ? draft.hours : []).map((h, i) => (
                              <ItemCard key={i} title={`Row ${i + 1}`} onRemove={() => removeListItem('contact', 'hours', i)}>
                                <div className="grid grid-cols-2 gap-3">
                                  <Input label="Days" value={h.days} onChange={(v) => patchListItem('contact', 'hours', i, { days: v })} placeholder="Mon - Fri" />
                                  <Input label="Time" value={h.time} onChange={(v) => patchListItem('contact', 'hours', i, { time: v })} placeholder="8:00 AM - 6:00 PM" />
                                </div>
                              </ItemCard>
                            ))}
                            <AddButton label="Add Hours Row" onClick={() => addListItem('contact', 'hours', { days: '', time: '' })} />
                          </div>
                        </>
                      )}

                      {/* ═══════════ FOOTER ═══════════ */}
                      {section.id === 'footer' && (
                        <div className="space-y-3">
                          {(Array.isArray(draft.socials) ? draft.socials : []).map((social, i) => (
                            <ItemCard key={i} title={social.platform || `Social ${i + 1}`} onRemove={() => removeListItem('footer', 'socials', i)}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Select label="Platform" value={social.platform} options={SOCIAL_PLATFORMS} onChange={(v) => patchListItem('footer', 'socials', i, { platform: v })} />
                                <Input label="Profile URL" value={social.url} onChange={(v) => patchListItem('footer', 'socials', i, { url: v })} placeholder="https://instagram.com/..." />
                              </div>
                            </ItemCard>
                          ))}
                          <AddButton label="Add Social Link" onClick={() => addListItem('footer', 'socials', { platform: 'Instagram', url: '#' })} />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 mt-2 border-t border-white/5">
                        <button
                          onClick={() => saveSection(section.id)}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-5 py-2 bg-amber text-charcoal rounded-lg font-bold hover:bg-amber-light transition-colors disabled:opacity-50 text-sm"
                        >
                          <FaSave size={13} />
                          {isSaving ? 'Saving...' : 'Save & Publish'}
                        </button>
                        {dirty[section.id] && (
                          <button
                            onClick={() => discardSection(section.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                          >
                            <FaUndo size={12} /> Discard
                          </button>
                        )}
                        {!dirty[section.id] && (
                          <button
                            onClick={() => resetSection(section.id)}
                            title="Restore the original site defaults"
                            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-400/30 transition-colors text-xs"
                          >
                            Reset to Defaults
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CMS;
