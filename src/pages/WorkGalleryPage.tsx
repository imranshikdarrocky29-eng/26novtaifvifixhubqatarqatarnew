import { useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { RoutePath, routeToPath } from '../types/navigation';
import { ResilientImage } from '../components/ResilientImage';
import { CallToActionBand } from '../components/CallToActionBand';

interface WorkGalleryPageProps {
  onNavigate: (route: RoutePath) => void;
}

type GalleryCategory =
  | 'All Work'
  | 'Plumbing & Sanitary'
  | 'Electrical'
  | 'Satellite & Welding';

interface GalleryItem {
  id: string;
  title: string;
  category: Exclude<GalleryCategory, 'All Work'>;
  location: string;
  summary: string;
  image: string;
  imageAlt: string;
  route: RoutePath;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'double-sink-drainage',
    title: 'Double-Bowl Kitchen Sink Trap & Waste Piping',
    category: 'Plumbing & Sanitary',
    location: 'Al Mansoura, Doha',
    summary:
      'Installed twin-bowl sink waste bridge, overflow connection, and sealed under-counter drain line.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.44_PM_373a407d.jpeg',
    imageAlt: 'Under-sink double-bowl PVC trap and drainage piping installed by FixHub Qatar',
    route: { page: 'service-detail', slug: 'kitchen-plumbing-solutions' },
  },
  {
    id: 'villa-manhole-drain-repair',
    title: 'Villa Underground Drainage Pipe & Manhole Repair',
    category: 'Plumbing & Sanitary',
    location: 'Al Waab, Doha',
    summary:
      'Opened outdoor tiled inspection manhole and replaced damaged underground UPVC drainage bends.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.43_PM__3__512fda07.jpeg',
    imageAlt: 'FixHub Qatar technicians repairing underground drainage pipework inside a villa manhole',
    route: { page: 'service-detail', slug: 'blocked-drain-and-drainage-cleaning' },
  },
  {
    id: 'espa-booster-pump',
    title: 'ESPA Booster Pump & Vasser Pressure Controller',
    category: 'Plumbing & Sanitary',
    location: 'Al Khessa, North Doha',
    summary:
      'Fitted stainless multi-stage ESPA booster pump with automatic Vasser digital pressure control.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.44_PM__2__ef9f2351.jpeg',
    imageAlt: 'ESPA water booster pump and Vasser automatic pressure switch installed in Qatar',
    route: { page: 'service-detail', slug: 'water-tank-installation-and-maintenance' },
  },
  {
    id: 'three-phase-db-panel',
    title: '3-Phase Main Distribution Board & Breaker Wiring',
    category: 'Electrical',
    location: 'West Bay, Doha',
    summary:
      'Dressed 3-phase main feeders, 100A isolator switch, neutral links, and RCBO circuit breakers.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.43_PM_1452085d.jpeg',
    imageAlt: 'Three-phase electrical distribution board and RCBO breaker panel wired cleanly in Doha',
    route: { page: 'trade-service', slug: 'electric-service' },
  },
  {
    id: 'crystal-chandelier-install',
    title: 'Villa Staircase Crystal Chandelier Installation',
    category: 'Electrical',
    location: 'Al Kharatiyat, North Doha',
    summary:
      'Anchored heavy ceiling bracket and wired multi-tier crystal chandelier above marble stairs.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.42_PM_aed5f33e.jpeg',
    imageAlt: 'Multi-tier crystal chandelier installed and lit over a residential staircase in Qatar',
    route: { page: 'trade-service', slug: 'electric-service' },
  },
  {
    id: 'twin-central-water-heaters',
    title: 'Twin Central Water Heaters & Circulation Pumps',
    category: 'Plumbing & Sanitary',
    location: 'Um Salal Muhammad',
    summary:
      'Serviced twin central hot-water storage tanks, inline circulation pumps, and header valves.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.42_PM__4__04d9a89f.jpeg',
    imageAlt: 'Dual commercial central water heaters with booster circulation pumps and shut-off valves',
    route: { page: 'service-detail', slug: 'pipe-installation-and-replacement' },
  },
  {
    id: 'rooftop-satellite-dishes',
    title: 'Rooftop Twin Satellite Dish & Multi-Room Cabling',
    category: 'Satellite & Welding',
    location: 'Bin Omran, Doha',
    summary:
      'Mounted twin rooftop dishes beside outdoor AC units with bundled RG6 coax cabling.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.43_PM__2__38a0cc2d.jpeg',
    imageAlt: 'Twin rooftop satellite dishes installed with multi-LNB cabling on a Doha roof',
    route: { page: 'trade-service', slug: 'satellite-installation-and-repair' },
  },
  {
    id: 'steel-gate-welding',
    title: 'Villa Steel Entrance Gate Lock & Latch Welding',
    category: 'Satellite & Welding',
    location: 'Al Rayyan, Qatar',
    summary:
      'On-site arc welding to fit and reinforce a heavy security lock onto a double steel villa gate.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.44_PM__3__5c45957f.jpeg',
    imageAlt: 'Technician arc welding a new security lock onto a carved steel villa gate in Qatar',
    route: { page: 'trade-service', slug: 'welding-service' },
  },
  {
    id: 'single-sink-bottle-trap',
    title: 'Kitchen Bottle Trap & Angle Valve Replacement',
    category: 'Plumbing & Sanitary',
    location: 'Al Sadd, Doha',
    summary:
      'Replaced leaking sink drain trap with new gray bottle trap, overflow line, and angle valves.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.43_PM__1__6db3c73e.jpeg',
    imageAlt: 'Clean under-sink gray bottle trap and stainless angle valves installed in a Doha kitchen',
    route: { page: 'service-detail', slug: 'kitchen-plumbing-solutions' },
  },
  {
    id: 'satellite-diseqc-cabling',
    title: 'Multi-LNB Satellite Splitter & Signal Alignment',
    category: 'Satellite & Welding',
    location: 'Ferroj Al Sudan, Doha',
    summary:
      'Configured outdoor DiSEqC splitters and quad-LNB connections for multi-room satellite TV.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.42_PM__2__35a4ea4c.jpeg',
    imageAlt: 'Dual rooftop satellite dishes wired through outdoor DiSEqC multi-switches',
    route: { page: 'trade-service', slug: 'satellite-installation-and-repair' },
  },
  {
    id: 'basin-mixers-shower-columns',
    title: 'Basin Mixers & Rain Shower Column Selection',
    category: 'Plumbing & Sanitary',
    location: 'The Pearl-Qatar',
    summary:
      'Supplied and installed chrome and brushed-gold basin mixers paired with tall shower columns.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.42_PM__1__a1de1082.jpeg',
    imageAlt: 'Selection of modern chrome and gold basin mixer faucets and shower columns in Qatar',
    route: { page: 'service-detail', slug: 'tap-faucet-and-mixer-replacement' },
  },
  {
    id: 'shower-mixers-sanitaryware',
    title: 'Shower Mixers, Kitchen Taps & Sanitary Fittings',
    category: 'Plumbing & Sanitary',
    location: 'Lusail City',
    summary:
      'Fitted wall-mounted shower mixers, swivel kitchen spouts, and dual-flush toilet cisterns.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-26_at_6.45.41_PM_b780e9cc.jpeg',
    imageAlt: 'Chrome wall-mounted shower mixers, kitchen faucets, and dual-flush toilet cisterns',
    route: { page: 'service-detail', slug: 'shower-and-sanitary-fittings-installation' },
  },
];

const CATEGORIES: GalleryCategory[] = [
  'All Work',
  'Plumbing & Sanitary',
  'Electrical',
  'Satellite & Welding',
];

export function WorkGalleryPage({ onNavigate }: WorkGalleryPageProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<GalleryCategory>('All Work');

  const filtered =
    selectedCategory === 'All Work'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === selectedCategory);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, route: RoutePath) => {
    e.preventDefault();
    onNavigate(route);
  };

  return (
    <div>
      <section className="bg-[#041E42] text-white border-b border-[#0E3366] py-10 sm:py-14 lg:py-20">
        <div className="w-full px-4 sm:px-20 lg:px-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#F5B700]">Completed Projects</p>
            <h1 className="mt-2 font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white text-balance">
              FixHub Qatar Work Gallery
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed">
              Browse real plumbing, drainage, booster pump, electrical panel, chandelier, satellite dish, and gate welding jobs completed by our technicians across Doha and Qatar.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter gallery photos by trade"
            className="mt-8 inline-flex flex-wrap items-center gap-1 p-1 bg-[#072754] rounded-lg border border-[#163C70]"
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#F5B700] text-[#041E42] font-semibold shadow-xs'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-slate-50">
        <div className="w-full px-4 sm:px-20 lg:px-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#041E42]/40 transition-colors"
              >
                <div>
                  <div className="aspect-[4/5] bg-slate-100 overflow-hidden border-b border-slate-200">
                    <ResilientImage
                      src={item.image}
                      alt={item.imageAlt}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      containerClassName="w-full h-full"
                      fallbackLabel={item.title}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-amber-700">{item.category}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#041E42]" aria-hidden="true" />
                        <span>{item.location}</span>
                      </span>
                    </div>
                    <h2 className="mt-2.5 font-display text-lg font-semibold text-[#041E42]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-slate-100">
                  <a
                    href={routeToPath(item.route)}
                    onClick={(e) => handleNav(e, item.route)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#041E42] bg-slate-100 hover:bg-[#F5B700] border border-slate-200 hover:border-[#F5B700] rounded-lg underline decoration-[#041E42]/30 underline-offset-4 hover:decoration-[#041E42] transition-colors whitespace-nowrap"
                  >
                    <span>Explore related service</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CallToActionBand
        title="Need Similar Work Completed at Your Property?"
        description="Contact FixHub Qatar now by phone or WhatsApp for fast technician dispatch and upfront pricing across Doha and Qatar."
        onNavigate={onNavigate}
      />
    </div>
  );
}
