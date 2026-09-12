import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaComments } from 'react-icons/fa';
import Button from '../ui/Button';
import api from '../../config/axiosConfig';
import { useSiteContent } from '../../context/SiteContentContext';

const Contact = () => {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const { content } = useSiteContent();
  const contact = content.contact;
  const hours = Array.isArray(contact.hours) ? contact.hours : [];
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = contact.email;
  const phone = contact.phone;
  const phoneAlt = contact.phoneAlt;
  const location = contact.location;
  const address = contact.address;

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const response = await api.post('/contact', {
        name: data.name,
        email: data.email,
        message: data.message,
        subject: data.subject || 'General Inquiry',
        phone: data.phone || '',
      });

      if (response.data.success) {
        toast.success('Message sent successfully! We\'ll get back to you soon.');
        reset();
      } else {
        toast.error(response.data.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact API Error:', error);
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="section-padding bg-charcoal-light">
      <div ref={ref} className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-amber text-xs font-semibold tracking-widest uppercase mb-4">Get In Touch</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Contact </span>
            <span className="gradient-text">Us</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Have a question, project idea, or want to work with us? We'd love to hear from you
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="space-y-6"
          >
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <FaEnvelope className="text-amber text-2xl mt-1" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Email</h4>
                  <a href={`mailto:${email}`} className="text-gray-400 hover:text-amber transition-colors">
                    {email}
                  </a>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <FaPhone className="text-amber text-2xl mt-1" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Phone</h4>
                  <a href={`tel:${phone}`} className="text-gray-400 hover:text-amber transition-colors block">
                    {phone}
                  </a>
                  <a href={`tel:${phoneAlt}`} className="text-gray-400 hover:text-amber transition-colors block">
                    {phoneAlt}
                  </a>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <FaMapMarkerAlt className="text-amber text-2xl mt-1" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Location</h4>
                  <p className="text-gray-400">{address}</p>
                  <p className="text-gray-500 text-sm">{location}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <FaClock className="text-amber text-2xl mt-1" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Hours</h4>
                  {hours.map(({ days, time }, i) => (
                    <p
                      key={days}
                      className={i === hours.length - 1 ? 'text-gray-500 text-sm' : 'text-gray-400'}
                    >
                      {days}: {time}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="glass-card rounded-xl p-6 md:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <FaComments className="text-amber text-xl" />
              <h3 className="text-xl font-semibold text-white">Send Us a Message</h3>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium mb-1 block">Full Name *</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg px-4 py-3 text-white focus:border-amber focus:outline-none transition-colors"
                  placeholder="Your full name"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1 block">Email Address *</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg px-4 py-3 text-white focus:border-amber focus:outline-none transition-colors"
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1 block">Phone (Optional)</label>
                <input
                  {...register('phone')}
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg px-4 py-3 text-white focus:border-amber focus:outline-none transition-colors"
                  placeholder="+250 788 123 456"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1 block">Subject (Optional)</label>
                <input
                  {...register('subject')}
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg px-4 py-3 text-white focus:border-amber focus:outline-none transition-colors"
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-1 block">Message *</label>
                <textarea
                  {...register('message', { required: 'Message is required' })}
                  rows="4"
                  className="w-full bg-charcoal/50 border border-amber/20 rounded-lg px-4 py-3 text-white focus:border-amber focus:outline-none transition-colors resize-none"
                  placeholder="Tell us how we can help..."
                />
                {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;