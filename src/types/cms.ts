export type PlumbingCategoryValue =
  | 'Emergency & Repairs'
  | 'Bathrooms & Kitchens'
  | 'Pipes, Tanks & Systems';

export interface CoreServiceOverride {
  label?: string;
  propertyScope?: string;
  responseWindow?: string;
  summary?: string;
  image?: string;
  imageAlt?: string;
}

export interface TradeServiceOverride {
  label?: string;
  propertyScope?: string;
  responseWindow?: string;
  summary?: string;
  description?: string;
  qatarContext?: string;
  checklist?: string[];
  idealFor?: string[];
  image?: string;
  imageAlt?: string;
}

export interface PlumbingServiceOverride {
  title?: string;
  shortTitle?: string;
  category?: PlumbingCategoryValue;
  propertyScope?: string;
  responseWindow?: string;
  summary?: string;
  description?: string;
  qatarContext?: string;
  checklist?: string[];
  materials?: string[];
  idealFor?: string[];
  image?: string;
  imageAlt?: string;
}

export interface ServicesCmsData {
  coreServices: Record<string, CoreServiceOverride>;
  tradeServices: Record<string, TradeServiceOverride>;
  plumbingServices: Record<string, PlumbingServiceOverride>;
  updatedAt?: string;
}
