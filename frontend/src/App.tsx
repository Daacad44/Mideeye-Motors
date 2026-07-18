import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

import Home from '@/pages/Home';
const Fleet = lazy(() => import('@/pages/Fleet'));
const VehicleDetails = lazy(() => import('@/pages/VehicleDetails'));
const Booking = lazy(() => import('@/pages/Booking'));
const About = lazy(() => import('@/pages/About'));
const Services = lazy(() => import('@/pages/Services'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Contact = lazy(() => import('@/pages/Contact'));
const Faq = lazy(() => import('@/pages/Faq'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Login = lazy(() => import('@/pages/Login'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Admin = lazy(() => import('@/pages/Admin'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.main>
  );
}

export default function App() {
  const location = useLocation();
  const bare = location.pathname === '/login' || location.pathname === '/reset-password' || location.pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!location.pathname.startsWith('/admin') && <Navbar />}

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Suspense key={location.pathname} fallback={<LoadingScreen />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Home /></Page>} />
            <Route path="/fleet" element={<Page><Fleet /></Page>} />
            <Route path="/fleet/:slug" element={<Page><VehicleDetails /></Page>} />
            <Route path="/booking" element={<Page><Booking /></Page>} />
            <Route path="/about" element={<Page><About /></Page>} />
            <Route path="/services" element={<Page><Services /></Page>} />
            <Route path="/pricing" element={<Page><Pricing /></Page>} />
            <Route path="/contact" element={<Page><Contact /></Page>} />
            <Route path="/faq" element={<Page><Faq /></Page>} />
            <Route path="/terms" element={<Page><Terms /></Page>} />
            <Route path="/privacy" element={<Page><Privacy /></Page>} />
            <Route path="/login" element={<Page><Login /></Page>} />
            <Route path="/reset-password" element={<Page><ResetPassword /></Page>} />
            <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
            <Route path="/admin" element={<Page><Admin /></Page>} />
            <Route path="*" element={<Page><NotFound /></Page>} />
          </Routes>
          </Suspense>
        </AnimatePresence>
      </div>

      {!bare && <Footer />}
    </div>
  );
}
