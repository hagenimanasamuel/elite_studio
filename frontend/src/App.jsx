import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteContentProvider } from './context/SiteContentContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import Services from './components/sections/Services';
import About from './components/sections/About';
import Gallery from './components/sections/Gallery';
import Testimonials from './components/sections/Testimonials';
import CTA from './components/sections/CTA';
import Contact from './components/sections/Contact';
import { COMPANY } from './constants';

// ─── Route-level code splitting keeps the initial bundle light ──
const Login = lazy(() => import('./pages/auth/Login'));
const ShareViewer = lazy(() => import('./pages/ShareViewer'));
const AdminDashboard = lazy(() => import('./pages/dashboard/admin/AdminDashboard'));

// ─── Admin Page Components ──────────────────────────────────
const DashboardContent = lazy(() => import('./pages/dashboard/admin/pages/DashboardContent'));
const Users = lazy(() => import('./pages/dashboard/admin/pages/Users'));
const GalleryManagement = lazy(() => import('./pages/dashboard/admin/pages/GalleryManagement'));
const UploadShare = lazy(() => import('./pages/dashboard/admin/pages/UploadShare'));
const CreateUpload = lazy(() => import('./pages/dashboard/admin/pages/UploadShare/CreateUpload'));
const EditUpload = lazy(() => import('./pages/dashboard/admin/pages/UploadShare/EditUpload'));
const CMS = lazy(() => import('./pages/dashboard/admin/pages/CMS'));
const Account = lazy(() => import('./pages/dashboard/admin/pages/Account'));
const ContactMessages = lazy(() => import('./pages/dashboard/admin/pages/ContactMessages'));

function HomePage({ scrollToSection }) {
  return (
    <>
      <Hero scrollToSection={scrollToSection} />
      <Gallery />
      <Services />
      <About />
      <Testimonials />
      <CTA scrollToSection={scrollToSection} />
      <Contact />
    </>
  );
}

// ─── Admin Layout ─────────────────────────────────────────────
function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AdminDashboard />;
}

function AppRoutes() {
  const { loading } = useAuth();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      }
    >
      <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <>
            <Navbar scrollToSection={scrollToSection} />
            <main>
              <HomePage scrollToSection={scrollToSection} />
            </main>
            <Footer scrollToSection={scrollToSection} />
          </>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/g/:token" element={<ShareViewer />} />

      {/* Admin Routes */}
      <Route path="/dashboard" element={<AdminLayout />}>
        <Route index element={<DashboardContent />} />
        <Route path="users" element={<Users />} />
        <Route path="gallery" element={<GalleryManagement />} />
        <Route path="upload-share" element={<UploadShare />} />
        <Route path="upload-share/create" element={<CreateUpload />} />
        <Route path="upload-share/edit/:id" element={<EditUpload />} />
        <Route path="contacts" element={<ContactMessages />} />
        <Route path="cms" element={<CMS />} />
        <Route path="account" element={<Account />} />
      </Route>

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const seoData = {
    title: `Elite Images Studio | ${COMPANY.tagline}`,
    description: COMPANY.description,
    keywords: "photography Musanze, studio shoot Rwanda, outdoor photography Rwanda, video ads Rwanda, wedding photography Rwanda, event photography, professional photography, videography, creative studio",
    url: COMPANY.website,
    image: "https://eliteimages.rw/og-image.jpg",
    siteName: COMPANY.name,
    locale: "en_RW",
    type: "website"
  };

  return (
    <Router>
      <AuthProvider>
        <SiteContentProvider>
          <Helmet>
            <title>{seoData.title}</title>
            <meta name="title" content={seoData.title} />
            <meta name="description" content={seoData.description} />
            <meta name="keywords" content={seoData.keywords} />
            <meta name="robots" content="index, follow" />
            <meta name="language" content="English" />
            <meta name="revisit-after" content="7 days" />
            <meta name="author" content={COMPANY.name} />
            <meta name="copyright" content={COMPANY.name} />
            <meta name="geo.region" content="RW" />
            <meta name="geo.placename" content="Musanze" />

            <meta property="og:type" content={seoData.type} />
            <meta property="og:url" content={seoData.url} />
            <meta property="og:title" content={seoData.title} />
            <meta property="og:description" content={seoData.description} />
            <meta property="og:image" content={seoData.image} />
            <meta property="og:site_name" content={seoData.siteName} />
            <meta property="og:locale" content={seoData.locale} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoData.title} />
            <meta name="twitter:description" content={seoData.description} />
            <meta name="twitter:image" content={seoData.image} />

            <link rel="canonical" href={seoData.url} />
          </Helmet>

          <AppRoutes />

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#E6F1FF',
                border: '1px solid #D4A373',
              },
            }}
          />
        </SiteContentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;