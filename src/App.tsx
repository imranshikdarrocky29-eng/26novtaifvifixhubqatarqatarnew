/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  RoutePath,
  parseLocationToRoute,
  routeToPath,
} from './types/navigation';
import { BLOG_POSTS, type PlumbingService } from './data/plumbingData';
import type { TradeServiceDetail } from './data/tradeServicesData';
import {
  ServicesContentProvider,
  useServicesContent,
} from './context/ServicesContentContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingContactButtons } from './components/FloatingContactButtons';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { TradeServicePage } from './pages/TradeServicePage';
import { ResidentialPage } from './pages/ResidentialPage';
import { CommercialPage } from './pages/CommercialPage';
import { ServiceAreasPage } from './pages/ServiceAreasPage';
import { WorkGalleryPage } from './pages/WorkGalleryPage';
import { BlogPage } from './pages/BlogPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPanelPage } from './pages/AdminPanelPage';

function getPageSeo(
  route: RoutePath,
  plumbingServices: PlumbingService[],
  tradeServices: TradeServiceDetail[]
): { title: string; description: string } {
  switch (route.page) {
    case 'home':
      return {
        title: 'FixHub Qatar – Reliable Plumbing, Electric & Home Maintenance in Qatar',
        description:
          'Reliable plumbing, electric, AC service, satellite repair, painting, carpentry, TV installation, handyman, and welding solutions across Doha and Qatar.',
      };
    case 'about':
      return {
        title: 'About Us – FixHub Qatar | Home & Commercial Maintenance in Doha',
        description:
          'Learn about FixHub Qatar, our experienced technicians, quality materials, and commitment to reliable residential and commercial maintenance across Qatar.',
      };
    case 'services':
    case 'plumbing-service':
      return {
        title: 'Plumbing Service in Qatar – FixHub Qatar',
        description:
          'Explore 9 specialized plumbing services in Qatar including emergency repairs, pipe replacement, drain cleaning, bathrooms, kitchens, and water tanks.',
      };
    case 'service-detail': {
      const svc = plumbingServices.find((s) => s.slug === route.slug);
      return {
        title: svc
          ? `${svc.title} in Qatar – FixHub Qatar`
          : 'Plumbing Service Details – FixHub Qatar',
        description:
          svc?.summary ||
          'Professional plumbing repair and installation details from FixHub Qatar.',
      };
    }
    case 'trade-service': {
      const svc = tradeServices.find((s) => s.slug === route.slug);
      return {
        title: svc
          ? `${svc.label} in Qatar – FixHub Qatar`
          : 'Our Services – FixHub Qatar',
        description:
          svc?.summary ||
          'Reliable residential and commercial maintenance services across Doha and Qatar.',
      };
    }
    case 'residential':
      return {
        title: 'Residential Plumbing & Maintenance Qatar – Villas & Apartments | FixHub Qatar',
        description:
          'Dependable residential plumbing and home maintenance in Doha, Lusail, The Pearl, and Al Waab for leaks, electrical, AC, bathrooms, kitchens, and tanks.',
      };
    case 'commercial':
      return {
        title: 'Commercial Plumbing & Facility Maintenance Qatar | FixHub Qatar',
        description:
          'Commercial plumbing, electrical, AC maintenance, booster pump servicing, and Annual Maintenance Contracts across Doha and Qatar.',
      };
    case 'areas':
      return {
        title: 'Service Areas in Doha & Qatar – FixHub Qatar',
        description:
          'Check technician dispatch coverage across West Bay, The Pearl, Lusail, Al Sadd, Al Mansoura, Um Salal Muhammad, Al Khessa, Ferroj Al Sudan, Bin Omran, Al Wakrah, and more.',
      };
    case 'work-gallery':
      return {
        title: 'Work Gallery – Completed Maintenance Projects in Qatar | FixHub Qatar',
        description:
          'View completed plumbing, electrical, AC servicing, painting, carpentry, TV mounting, satellite, handyman, and welding projects across Doha and Qatar.',
      };
    case 'blog': {
      const post = route.slug
        ? BLOG_POSTS.find((p) => p.slug === route.slug)
        : undefined;
      return {
        title: post
          ? `${post.title} | FixHub Qatar Blog`
          : 'Maintenance Guides & Tips for Qatar Homes – FixHub Qatar Blog',
        description:
          post?.excerpt ||
          'Practical maintenance guides for Qatar homes and commercial buildings covering plumbing, water tanks, leak detection, heaters, and drains.',
      };
    }
    case 'contact':
      return {
        title: 'Contact FixHub Qatar – Book a Technician in Doha (24/7)',
        description:
          'Call +974 3103 6428, message on WhatsApp, or book an online inspection or quotation with FixHub Qatar.',
      };
    case 'panel':
      return {
        title: 'Admin Panel – FixHub Qatar Service Manager',
        description:
          'Manage service photos, titles, descriptions, and technical checklists for FixHub Qatar.',
      };
  }
}

function AppContent() {
  const { plumbingServices, tradeServices } = useServicesContent();
  const [route, setRoute] = useState<RoutePath>(() =>
    parseLocationToRoute(window.location.pathname, window.location.search)
  );

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseLocationToRoute(window.location.pathname, window.location.search));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const seo = getPageSeo(route, plumbingServices, tradeServices);
    document.title = seo.title;
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) {
      descTag.setAttribute('content', seo.description);
    }
  }, [route, plumbingServices, tradeServices]);

  const handleNavigate = (nextRoute: RoutePath) => {
    const nextPath = routeToPath(nextRoute);
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const isPanel = route.page === 'panel';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-[#041E42]">
      {!isPanel && <Header currentRoute={route} onNavigate={handleNavigate} />}

      <main className="flex-1">
        {route.page === 'home' && <HomePage onNavigate={handleNavigate} />}
        {route.page === 'about' && <AboutPage onNavigate={handleNavigate} />}
        {(route.page === 'services' || route.page === 'plumbing-service') && (
          <ServicesPage onNavigate={handleNavigate} />
        )}
        {route.page === 'service-detail' && (
          <ServiceDetailPage slug={route.slug} onNavigate={handleNavigate} />
        )}
        {route.page === 'trade-service' && (
          <TradeServicePage slug={route.slug} onNavigate={handleNavigate} />
        )}
        {route.page === 'residential' && (
          <ResidentialPage onNavigate={handleNavigate} />
        )}
        {route.page === 'commercial' && (
          <CommercialPage onNavigate={handleNavigate} />
        )}
        {route.page === 'areas' && <ServiceAreasPage onNavigate={handleNavigate} />}
        {route.page === 'work-gallery' && <WorkGalleryPage onNavigate={handleNavigate} />}
        {route.page === 'blog' && (
          <BlogPage slug={route.slug} onNavigate={handleNavigate} />
        )}
        {route.page === 'contact' && (
          <ContactPage preselectedService={route.preselectedService} />
        )}
        {route.page === 'panel' && <AdminPanelPage onNavigate={handleNavigate} />}
      </main>

      {!isPanel && <Footer onNavigate={handleNavigate} />}
      {!isPanel && <FloatingContactButtons />}
    </div>
  );
}

export default function App() {
  return (
    <ServicesContentProvider>
      <AppContent />
    </ServicesContentProvider>
  );
}
