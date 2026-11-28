import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PLUMBING_SERVICES, type PlumbingService } from '../data/plumbingData';
import {
  OUR_SERVICES_MENU,
  TRADE_SERVICES,
  type OurServiceMenuItem,
  type TradeServiceDetail,
} from '../data/tradeServicesData';
import type { ServicesCmsData } from '../types/cms';

interface ServicesContentContextValue {
  coreServices: OurServiceMenuItem[];
  tradeServices: TradeServiceDetail[];
  plumbingServices: PlumbingService[];
  cmsOverrides: ServicesCmsData;
  refreshServices: () => Promise<void>;
}

const EMPTY_CMS: ServicesCmsData = {
  coreServices: {},
  tradeServices: {},
  plumbingServices: {},
};

const ServicesContentContext = createContext<ServicesContentContextValue>({
  coreServices: OUR_SERVICES_MENU,
  tradeServices: TRADE_SERVICES,
  plumbingServices: PLUMBING_SERVICES,
  cmsOverrides: EMPTY_CMS,
  refreshServices: async () => {},
});

export function ServicesContentProvider({ children }: { children: ReactNode }) {
  const [cmsOverrides, setCmsOverrides] = useState<ServicesCmsData>(EMPTY_CMS);

  const refreshServices = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/services', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<ServicesCmsData>;
      setCmsOverrides({
        coreServices: data.coreServices || {},
        tradeServices: data.tradeServices || {},
        plumbingServices: data.plumbingServices || {},
        updatedAt: data.updatedAt,
      });
    } catch {
      // Fall back silently to static service defaults
    }
  }, []);

  useEffect(() => {
    void refreshServices();
  }, [refreshServices]);

  const coreServices = useMemo<OurServiceMenuItem[]>(() => {
    return OUR_SERVICES_MENU.map((item) => {
      const override = cmsOverrides.coreServices[item.slug];
      if (!override) return item;
      return {
        ...item,
        label: override.label || item.label,
        propertyScope: override.propertyScope || item.propertyScope,
        responseWindow: override.responseWindow || item.responseWindow,
        summary: override.summary || item.summary,
        image: override.image || item.image,
        imageAlt: override.imageAlt || item.imageAlt,
      };
    });
  }, [cmsOverrides.coreServices]);

  const tradeServices = useMemo<TradeServiceDetail[]>(() => {
    return TRADE_SERVICES.map((item) => {
      const override = cmsOverrides.tradeServices[item.slug];
      if (!override) return item;
      return {
        ...item,
        label: override.label || item.label,
        propertyScope: override.propertyScope || item.propertyScope,
        responseWindow: override.responseWindow || item.responseWindow,
        summary: override.summary || item.summary,
        description: override.description || item.description,
        qatarContext: override.qatarContext || item.qatarContext,
        checklist: override.checklist?.length ? override.checklist : item.checklist,
        idealFor: override.idealFor?.length ? override.idealFor : item.idealFor,
        image: override.image || item.image,
        imageAlt: override.imageAlt || item.imageAlt,
      };
    });
  }, [cmsOverrides.tradeServices]);

  const plumbingServices = useMemo<PlumbingService[]>(() => {
    return PLUMBING_SERVICES.map((item) => {
      const override = cmsOverrides.plumbingServices[item.slug];
      if (!override) return item;
      return {
        ...item,
        title: override.title || item.title,
        shortTitle: override.shortTitle || item.shortTitle,
        category: override.category || item.category,
        propertyScope: override.propertyScope || item.propertyScope,
        responseWindow: override.responseWindow || item.responseWindow,
        summary: override.summary || item.summary,
        description: override.description || item.description,
        qatarContext: override.qatarContext || item.qatarContext,
        checklist: override.checklist?.length ? override.checklist : item.checklist,
        materials: override.materials?.length ? override.materials : item.materials,
        idealFor: override.idealFor?.length ? override.idealFor : item.idealFor,
        image: override.image || item.image,
        imageAlt: override.imageAlt || item.imageAlt,
      };
    });
  }, [cmsOverrides.plumbingServices]);

  const value = useMemo<ServicesContentContextValue>(
    () => ({
      coreServices,
      tradeServices,
      plumbingServices,
      cmsOverrides,
      refreshServices,
    }),
    [coreServices, tradeServices, plumbingServices, cmsOverrides, refreshServices]
  );

  return (
    <ServicesContentContext.Provider value={value}>
      {children}
    </ServicesContentContext.Provider>
  );
}

export function useServicesContent(): ServicesContentContextValue {
  return useContext(ServicesContentContext);
}
