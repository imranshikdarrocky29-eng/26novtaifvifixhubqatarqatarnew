import { useEffect, useRef, useState } from 'react';
import {
  Lock,
  LogOut,
  Upload,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { RoutePath, routeToPath } from '../types/navigation';
import { useServicesContent } from '../context/ServicesContentContext';
import { ResilientImage } from '../components/ResilientImage';
import type { PlumbingCategoryValue } from '../types/cms';

interface AdminPanelPageProps {
  onNavigate: (route: RoutePath) => void;
}

interface PanelStatus {
  loading: boolean;
  configured: boolean;
  envManaged: boolean;
  authenticated: boolean;
  adminId: string | null;
}

type EditorGroup = 'core' | 'plumbing';

const PLUMBING_CATEGORIES: PlumbingCategoryValue[] = [
  'Emergency & Repairs',
  'Bathrooms & Kitchens',
  'Pipes, Tanks & Systems',
];

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AdminPanelPage({ onNavigate }: AdminPanelPageProps) {
  const {
    coreServices,
    tradeServices,
    plumbingServices,
    cmsOverrides,
    refreshServices,
  } = useServicesContent();

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<PanelStatus>({
    loading: true,
    configured: true,
    envManaged: false,
    authenticated: false,
    adminId: null,
  });

  // Auth form fields (kept clean in memory, never prefilled with hardcoded secrets)
  const [adminIdInput, setAdminIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // CMS Editor state
  const [activeGroup, setActiveGroup] = useState<EditorGroup>('core');
  const [selectedCoreSlug, setSelectedCoreSlug] = useState<string>('plumbing-service');
  const [selectedPlumbingSlug, setSelectedPlumbingSlug] = useState<string>(
    plumbingServices[0]?.slug || 'emergency-plumbing-services'
  );

  // Form Draft state
  const [titleField, setTitleField] = useState('');
  const [shortTitleField, setShortTitleField] = useState('');
  const [categoryField, setCategoryField] =
    useState<PlumbingCategoryValue>('Emergency & Repairs');
  const [propertyScopeField, setPropertyScopeField] = useState('');
  const [responseWindowField, setResponseWindowField] = useState('');
  const [summaryField, setSummaryField] = useState('');
  const [descriptionField, setDescriptionField] = useState('');
  const [qatarContextField, setQatarContextField] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [idealForText, setIdealForText] = useState('');
  const [imageUrlField, setImageUrlField] = useState('');
  const [imageAltField, setImageAltField] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch panel setup & session status
  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/panel/status', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Unable to reach panel service.');
        const data = (await res.json()) as {
          configured: boolean;
          envManaged: boolean;
          authenticated: boolean;
          adminId: string | null;
        };
        if (active) {
          setStatus({
            loading: false,
            configured: data.configured,
            envManaged: data.envManaged,
            authenticated: data.authenticated,
            adminId: data.adminId,
          });
        }
      } catch {
        if (active) {
          setStatus((prev) => ({ ...prev, loading: false }));
        }
      }
    };
    void loadStatus();
    return () => {
      active = false;
    };
  }, [token]);

  // Sync draft form whenever selection or live services change
  useEffect(() => {
    setFeedback(null);
    if (activeGroup === 'core') {
      const core =
        coreServices.find((s) => s.slug === selectedCoreSlug) || coreServices[0];
      if (!core) return;
      const trade = tradeServices.find((t) => t.slug === core.slug);
      setTitleField(core.label);
      setPropertyScopeField(core.propertyScope);
      setResponseWindowField(core.responseWindow);
      setSummaryField(core.summary);
      setImageUrlField(core.image);
      setImageAltField(core.imageAlt);
      setDescriptionField(trade?.description || '');
      setQatarContextField(trade?.qatarContext || '');
      setChecklistText((trade?.checklist || []).join('\n'));
      setIdealForText((trade?.idealFor || []).join('\n'));
      setShortTitleField('');
      setMaterialsText('');
    } else {
      const svc =
        plumbingServices.find((s) => s.slug === selectedPlumbingSlug) ||
        plumbingServices[0];
      if (!svc) return;
      setTitleField(svc.title);
      setShortTitleField(svc.shortTitle);
      setCategoryField(svc.category);
      setPropertyScopeField(svc.propertyScope);
      setResponseWindowField(svc.responseWindow);
      setSummaryField(svc.summary);
      setDescriptionField(svc.description);
      setQatarContextField(svc.qatarContext);
      setChecklistText(svc.checklist.join('\n'));
      setMaterialsText(svc.materials.join('\n'));
      setIdealForText(svc.idealFor.join('\n'));
      setImageUrlField(svc.image);
      setImageAltField(svc.imageAlt);
    }
  }, [
    activeGroup,
    selectedCoreSlug,
    selectedPlumbingSlug,
    coreServices,
    tradeServices,
    plumbingServices,
  ]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/panel/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminIdInput.trim(),
          password: passwordInput,
        }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Failed to configure admin panel.');
        return;
      }
      setToken(data.token);
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch {
      setAuthError('Network error while setting up admin account.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/panel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminIdInput.trim(),
          password: passwordInput,
        }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Invalid credentials.');
        return;
      }
      setToken(data.token);
      setPasswordInput('');
    } catch {
      setAuthError('Network error while signing in.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setStatus((prev) => ({ ...prev, authenticated: false, adminId: null }));
    setPasswordInput('');
    setAuthError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setFeedback(null);

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'Image file is too large. Please upload a photo under 5 MB.',
      });
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Could not read file.'));
          }
        };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/panel/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          dataBase64,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to upload image.',
        });
        return;
      }
      setImageUrlField(data.url);
      setFeedback({
        type: 'success',
        message: 'Photo uploaded. Click "Save Changes" to publish it live.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Upload failed. Please try another JPG, PNG, or WebP photo.',
      });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFeedback(null);
    setSaving(true);

    try {
      let res: Response;
      if (activeGroup === 'core') {
        const isTrade = selectedCoreSlug !== 'plumbing-service';
        if (isTrade) {
          res = await fetch(
            `/api/panel/services/trade/${encodeURIComponent(selectedCoreSlug)}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                label: titleField,
                propertyScope: propertyScopeField,
                responseWindow: responseWindowField,
                summary: summaryField,
                cardSummary: summaryField,
                description: descriptionField,
                qatarContext: qatarContextField,
                checklist: linesToArray(checklistText),
                idealFor: linesToArray(idealForText),
                image: imageUrlField,
                imageAlt: imageAltField,
              }),
            }
          );
        } else {
          res = await fetch(
            `/api/panel/services/core/${encodeURIComponent(selectedCoreSlug)}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                label: titleField,
                propertyScope: propertyScopeField,
                responseWindow: responseWindowField,
                summary: summaryField,
                image: imageUrlField,
                imageAlt: imageAltField,
              }),
            }
          );
        }
      } else {
        res = await fetch(
          `/api/panel/services/plumbing/${encodeURIComponent(selectedPlumbingSlug)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: titleField,
              shortTitle: shortTitleField,
              category: categoryField,
              propertyScope: propertyScopeField,
              responseWindow: responseWindowField,
              summary: summaryField,
              description: descriptionField,
              qatarContext: qatarContextField,
              checklist: linesToArray(checklistText),
              materials: linesToArray(materialsText),
              idealFor: linesToArray(idealForText),
              image: imageUrlField,
              imageAlt: imageAltField,
            }),
          }
        );
      }

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          handleSignOut();
        }
        setFeedback({
          type: 'error',
          message: data.error || 'Could not save changes.',
        });
        return;
      }

      await refreshServices();
      setFeedback({
        type: 'success',
        message: 'Saved! The live website now displays your updated service photo and content.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error while saving changes.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetService = async () => {
    if (!token) return;
    setFeedback(null);
    setSaving(true);
    try {
      const groupParam =
        activeGroup === 'plumbing'
          ? 'plumbing'
          : selectedCoreSlug === 'plumbing-service'
            ? 'core'
            : 'trade';
      const slugParam =
        activeGroup === 'plumbing' ? selectedPlumbingSlug : selectedCoreSlug;

      const res = await fetch(
        `/api/panel/services/${groupParam}/${encodeURIComponent(slugParam)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        setFeedback({ type: 'error', message: 'Failed to reset service.' });
        return;
      }
      await refreshServices();
      setFeedback({
        type: 'success',
        message: 'Service restored to its built-in default photo and copy.',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Network error while resetting.' });
    } finally {
      setSaving(false);
    }
  };

  const isTradeSelected =
    activeGroup === 'core' && selectedCoreSlug !== 'plumbing-service';

  const currentServiceRoute: RoutePath =
    activeGroup === 'core'
      ? selectedCoreSlug === 'plumbing-service'
        ? { page: 'plumbing-service' }
        : { page: 'trade-service', slug: selectedCoreSlug }
      : { page: 'service-detail', slug: selectedPlumbingSlug };

  const isCurrentCustomized =
    activeGroup === 'core'
      ? Boolean(
          cmsOverrides.coreServices[selectedCoreSlug] ||
            cmsOverrides.tradeServices[selectedCoreSlug]
        )
      : Boolean(cmsOverrides.plumbingServices[selectedPlumbingSlug]);

  if (status.loading) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-4">
        <div className="text-sm font-medium text-slate-600">
          Loading FixHub Qatar Admin Panel...
        </div>
      </div>
    );
  }

  // Unauthenticated view (First-Run Claim Setup or Admin Sign In)
  if (!token || !status.authenticated) {
    const isFirstRunSetup = !status.configured;
    return (
      <section className="min-h-[75vh] bg-slate-50 py-14 sm:py-20">
        <div className="w-full px-4 sm:px-20 lg:px-24 flex justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#041E42] px-7 py-6 text-white border-b border-[#0E3366]">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F5B700]">
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>fixhubqatar.com/panel</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
                {isFirstRunSetup ? 'Activate Admin Panel' : 'Admin Panel Sign In'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-300">
                {isFirstRunSetup
                  ? 'Set your Admin ID and password once to manage service photos and text across FixHub Qatar.'
                  : 'Sign in to edit service photos, titles, descriptions, and checklists across the website.'}
              </p>
            </div>

            <form
              onSubmit={isFirstRunSetup ? handleSetupSubmit : handleLoginSubmit}
              className="p-7 space-y-4"
            >
              {authError && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="panel-admin-id"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Admin ID
                </label>
                <input
                  id="panel-admin-id"
                  type="text"
                  required
                  autoComplete="username"
                  value={adminIdInput}
                  onChange={(e) => setAdminIdInput(e.target.value)}
                  placeholder="Enter your Admin ID"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                />
              </div>

              <div>
                <label
                  htmlFor="panel-password"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="panel-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={isFirstRunSetup ? 'new-password' : 'current-password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-[#041E42] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {isFirstRunSetup && (
                <div>
                  <label
                    htmlFor="panel-confirm-password"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="panel-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 text-sm font-semibold text-[#041E42] bg-[#F5B700] hover:bg-[#E0A700] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {authSubmitting
                  ? 'Please wait...'
                  : isFirstRunSetup
                    ? 'Save Admin Login & Open Panel'
                    : 'Sign In to Dashboard'}
              </button>

              <div className="pt-2 text-center">
                <a
                  href={routeToPath({ page: 'home' })}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'home' });
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-[#041E42] transition-colors"
                >
                  Return to FixHub Qatar Home
                </a>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Admin Header Band */}
      <section className="bg-[#041E42] text-white border-b border-[#0E3366] py-8">
        <div className="w-full px-4 sm:px-20 lg:px-24 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F5B700]">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Signed in as {status.adminId}</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Service Content &amp; Image Manager
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Select any service below to replace its photo or update titles, summaries, descriptions, and checklists live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={routeToPath({ page: 'home' })}
              onClick={(e) => {
                e.preventDefault();
                onNavigate({ page: 'home' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#072754] hover:bg-[#0A346E] border border-[#163C70] rounded-lg transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4 text-[#F5B700]" aria-hidden="true" />
              <span>View Public Site</span>
            </a>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#041E42] bg-[#F5B700] hover:bg-[#E0A700] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Dashboard Workspace */}
      <section className="pt-8">
        <div className="w-full px-4 sm:px-20 lg:px-24">
          {/* Group Tabs */}
          <div
            role="tablist"
            aria-label="Service Groups"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-white rounded-lg border border-slate-200 mb-6"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === 'core'}
              onClick={() => setActiveGroup('core')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                activeGroup === 'core'
                  ? 'bg-[#041E42] text-white'
                  : 'text-slate-600 hover:text-[#041E42]'
              }`}
            >
              Core Services ({coreServices.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === 'plumbing'}
              onClick={() => setActiveGroup('plumbing')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                activeGroup === 'plumbing'
                  ? 'bg-[#041E42] text-white'
                  : 'text-slate-600 hover:text-[#041E42]'
              }`}
            >
              Plumbing Sub-Services ({plumbingServices.length})
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Service Picker List */}
            <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-display text-sm font-bold text-[#041E42]">
                  {activeGroup === 'core'
                    ? 'Select Core Service to Edit'
                    : 'Select Plumbing Service to Edit'}
                </h2>
              </div>

              <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                {activeGroup === 'core'
                  ? coreServices.map((svc) => {
                      const active = svc.slug === selectedCoreSlug;
                      const customized = Boolean(
                        cmsOverrides.coreServices[svc.slug] ||
                          cmsOverrides.tradeServices[svc.slug]
                      );
                      return (
                        <button
                          key={svc.slug}
                          type="button"
                          onClick={() => setSelectedCoreSlug(svc.slug)}
                          className={`w-full text-left p-4 flex items-center gap-3.5 transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#041E42]/5 border-l-4 border-l-[#F5B700]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-16 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            <ResilientImage
                              src={svc.image}
                              alt={svc.label}
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                              fallbackLabel={svc.index}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-amber-700">
                                {svc.index}
                              </span>
                              {customized && (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="font-display text-sm font-semibold text-[#041E42] truncate">
                              {svc.label}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  : plumbingServices.map((svc) => {
                      const active = svc.slug === selectedPlumbingSlug;
                      const customized = Boolean(cmsOverrides.plumbingServices[svc.slug]);
                      return (
                        <button
                          key={svc.slug}
                          type="button"
                          onClick={() => setSelectedPlumbingSlug(svc.slug)}
                          className={`w-full text-left p-4 flex items-center gap-3.5 transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#041E42]/5 border-l-4 border-l-[#F5B700]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-16 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            <ResilientImage
                              src={svc.image}
                              alt={svc.title}
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                              fallbackLabel={svc.index}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-amber-700">
                                {svc.index}
                              </span>
                              {customized && (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="font-display text-sm font-semibold text-[#041E42] truncate">
                              {svc.title}
                            </div>
                          </div>
                        </button>
                      );
                    })}
              </div>
            </aside>

            {/* Right Service Editor Form */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    {activeGroup === 'core'
                      ? selectedCoreSlug === 'plumbing-service'
                        ? 'Core Service Card'
                        : 'Core Card & Trade Page'
                      : 'Plumbing Sub-Service Page'}
                  </span>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#041E42]">
                    {titleField || 'Edit Service'}
                  </h2>
                </div>

                <a
                  href={routeToPath(currentServiceRoute)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(currentServiceRoute);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#041E42] hover:text-amber-700 underline underline-offset-4 whitespace-nowrap"
                >
                  <span>Preview service page</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>

              {feedback && (
                <div
                  className={`mt-6 p-4 rounded-lg border text-sm flex items-start gap-2.5 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveService} className="mt-6 space-y-6">
                {/* Image Upload & Preview Section */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#041E42] mb-4">
                    <ImageIcon className="w-4 h-4 text-amber-700" aria-hidden="true" />
                    <span>Service Photo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-5 aspect-[4/3] rounded-lg overflow-hidden border border-slate-300 bg-white">
                      <ResilientImage
                        src={imageUrlField}
                        alt={imageAltField || titleField}
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                        fallbackLabel="No image selected"
                      />
                    </div>

                    <div className="sm:col-span-7 space-y-3.5">
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#041E42] bg-[#F5B700] hover:bg-[#E0A700] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4" aria-hidden="true" />
                          <span>
                            {uploadingImage ? 'Uploading Photo...' : 'Upload New Photo'}
                          </span>
                        </button>
                        <p className="mt-1.5 text-xs text-slate-500">
                          Supports JPG, PNG, WebP, or GIF up to 5 MB.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="cms-image-url"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Or Image URL / Path
                        </label>
                        <input
                          id="cms-image-url"
                          type="text"
                          value={imageUrlField}
                          onChange={(e) => setImageUrlField(e.target.value)}
                          placeholder="/uploads/... or https://..."
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="cms-image-alt"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Image Alt Description (SEO &amp; Accessibility)
                        </label>
                        <input
                          id="cms-image-alt"
                          type="text"
                          value={imageAltField}
                          onChange={(e) => setImageAltField(e.target.value)}
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="cms-title"
                      className="block text-sm font-medium text-slate-800 mb-1.5"
                    >
                      Service Title
                    </label>
                    <input
                      id="cms-title"
                      type="text"
                      required
                      value={titleField}
                      onChange={(e) => setTitleField(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                    />
                  </div>

                  {activeGroup === 'plumbing' ? (
                    <div>
                      <label
                        htmlFor="cms-short-title"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Short Label
                      </label>
                      <input
                        id="cms-short-title"
                        type="text"
                        required
                        value={shortTitleField}
                        onChange={(e) => setShortTitleField(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="cms-scope"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Property Scope
                      </label>
                      <input
                        id="cms-scope"
                        type="text"
                        required
                        value={propertyScopeField}
                        onChange={(e) => setPropertyScopeField(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      />
                    </div>
                  )}
                </div>

                {activeGroup === 'plumbing' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label
                        htmlFor="cms-category"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Category
                      </label>
                      <select
                        id="cms-category"
                        value={categoryField}
                        onChange={(e) =>
                          setCategoryField(e.target.value as PlumbingCategoryValue)
                        }
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      >
                        {PLUMBING_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="cms-plumbing-scope"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Property Scope
                      </label>
                      <input
                        id="cms-plumbing-scope"
                        type="text"
                        required
                        value={propertyScopeField}
                        onChange={(e) => setPropertyScopeField(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="cms-plumbing-response"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Response Window
                      </label>
                      <input
                        id="cms-plumbing-response"
                        type="text"
                        required
                        value={responseWindowField}
                        onChange={(e) => setResponseWindowField(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      />
                    </div>
                  </div>
                )}

                {activeGroup === 'core' && (
                  <div>
                    <label
                      htmlFor="cms-core-response"
                      className="block text-sm font-medium text-slate-800 mb-1.5"
                    >
                      Response Window
                    </label>
                    <input
                      id="cms-core-response"
                      type="text"
                      required
                      value={responseWindowField}
                      onChange={(e) => setResponseWindowField(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="cms-summary"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Card Summary (Shown on Service Cards)
                  </label>
                  <textarea
                    id="cms-summary"
                    rows={3}
                    required
                    value={summaryField}
                    onChange={(e) => setSummaryField(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                  />
                </div>

                {(isTradeSelected || activeGroup === 'plumbing') && (
                  <>
                    <div>
                      <label
                        htmlFor="cms-description"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Full Service Page Description
                      </label>
                      <textarea
                        id="cms-description"
                        rows={4}
                        value={descriptionField}
                        onChange={(e) => setDescriptionField(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="cms-qatar-context"
                        className="block text-sm font-medium text-slate-800 mb-1.5"
                      >
                        Qatar Context &amp; Technical Notes
                      </label>
                      <textarea
                        id="cms-qatar-context"
                        rows={3}
                        value={qatarContextField}
                        onChange={(e) => setQatarContextField(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="cms-checklist"
                          className="block text-sm font-medium text-slate-800 mb-1.5"
                        >
                          Scope Checklist (One item per line)
                        </label>
                        <textarea
                          id="cms-checklist"
                          rows={5}
                          value={checklistText}
                          onChange={(e) => setChecklistText(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="cms-ideal-for"
                          className="block text-sm font-medium text-slate-800 mb-1.5"
                        >
                          Ideal For (One item per line)
                        </label>
                        <textarea
                          id="cms-ideal-for"
                          rows={5}
                          value={idealForText}
                          onChange={(e) => setIdealForText(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                        />
                      </div>
                    </div>

                    {activeGroup === 'plumbing' && (
                      <div>
                        <label
                          htmlFor="cms-materials"
                          className="block text-sm font-medium text-slate-800 mb-1.5"
                        >
                          Approved Materials &amp; Equipment (One item per line)
                        </label>
                        <textarea
                          id="cms-materials"
                          rows={4}
                          value={materialsText}
                          onChange={(e) => setMaterialsText(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#041E42] focus:outline-none focus:ring-2 focus:ring-[#041E42]"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={saving || !isCurrentCustomized}
                    onClick={handleResetService}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Reset to Default</span>
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#041E42] bg-[#F5B700] hover:bg-[#E0A700] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" aria-hidden="true" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
