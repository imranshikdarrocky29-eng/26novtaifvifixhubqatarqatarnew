import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type {
  CoreServiceOverride,
  PlumbingCategoryValue,
  PlumbingServiceOverride,
  ServicesCmsData,
  TradeServiceOverride,
} from './src/types/cms.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const ADMIN_FILE = path.resolve(DATA_DIR, 'admin.json');
const CMS_FILE = path.resolve(DATA_DIR, 'services-cms.json');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 15;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const VALID_PLUMBING_CATEGORIES = new Set<PlumbingCategoryValue>([
  'Emergency & Repairs',
  'Bathrooms & Kitchens',
  'Pipes, Tanks & Systems',
]);

interface AdminRecord {
  adminId: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthenticatedRequest extends Request {
  adminId?: string;
}

function getEnvAdminCredentials(): { adminId: string; password: string } | null {
  const adminId = process.env.PANEL_ADMIN_ID?.trim() || '';
  const password = process.env.PANEL_ADMIN_PASSWORD || '';
  if (adminId.length > 0 && password.length > 0) {
    return { adminId, password };
  }
  return null;
}

function readStoredAdmin(): AdminRecord | null {
  try {
    if (!fs.existsSync(ADMIN_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AdminRecord>;
    if (
      typeof parsed.adminId === 'string' &&
      typeof parsed.salt === 'string' &&
      typeof parsed.passwordHash === 'string'
    ) {
      return {
        adminId: parsed.adminId,
        salt: parsed.salt,
        passwordHash: parsed.passwordHash,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

function constantTimeStringMatch(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function signToken(adminId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: adminId,
      exp: Date.now() + TOKEN_TTL_MS,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { adminId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as { sub?: unknown; exp?: unknown };
    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Date.now()
    ) {
      return null;
    }
    return { adminId: decoded.sub };
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim() || null;
}

function requirePanelAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const verified = verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  req.adminId = verified.adminId;
  next();
}

function readCmsData(): ServicesCmsData {
  try {
    if (!fs.existsSync(CMS_FILE)) {
      return { coreServices: {}, tradeServices: {}, plumbingServices: {} };
    }
    const raw = fs.readFileSync(CMS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ServicesCmsData>;
    return {
      coreServices:
        parsed.coreServices && typeof parsed.coreServices === 'object'
          ? parsed.coreServices
          : {},
      tradeServices:
        parsed.tradeServices && typeof parsed.tradeServices === 'object'
          ? parsed.tradeServices
          : {},
      plumbingServices:
        parsed.plumbingServices && typeof parsed.plumbingServices === 'object'
          ? parsed.plumbingServices
          : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    };
  } catch {
    return { coreServices: {}, tradeServices: {}, plumbingServices: {} };
  }
}

function writeCmsData(data: ServicesCmsData): ServicesCmsData {
  const next: ServicesCmsData = {
    coreServices: data.coreServices,
    tradeServices: data.tradeServices,
    plumbingServices: data.plumbingServices,
    updatedAt: new Date().toISOString(),
  };
  const tmpFile = `${CMS_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmpFile, CMS_FILE);
  return next;
}

function sanitizeText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function sanitizeStringList(value: unknown, maxItems = 15, maxLen = 220): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
  return cleaned;
}

function sanitizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return undefined;
  if (
    (trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('/assets/') ||
      trimmed.startsWith('/src/')) &&
    !trimmed.includes('..')
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function detectImageExtension(buf: Buffer): '.jpg' | '.png' | '.webp' | '.gif' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return '.jpg';
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return '.png';
  }
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp';
  }
  const gifHeader = buf.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return '.gif';
  }
  return null;
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{2,80}$/.test(slug);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Public CMS read route
  app.get('/api/cms/services', (_req: Request, res: Response) => {
    res.json(readCmsData());
  });

  // Serve uploaded images safely
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(filename)) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }
    res.sendFile(resolved);
  });

  // Upload endpoint (larger body limit strictly scoped here)
  app.post(
    '/api/panel/upload',
    requirePanelAuth,
    express.json({ limit: '7mb' }),
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body as { dataBase64?: unknown } | undefined;
      if (!body || typeof body.dataBase64 !== 'string') {
        res.status(400).json({ error: 'Missing image payload.' });
        return;
      }
      const rawBase64 = body.dataBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const buf = Buffer.from(rawBase64, 'base64');
      if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: 'Image must be a valid file under 5 MB.' });
        return;
      }
      const ext = detectImageExtension(buf);
      if (!ext) {
        res.status(400).json({ error: 'Unsupported image format. Use JPG, PNG, WebP, or GIF.' });
        return;
      }
      const filename = `${crypto.randomUUID()}${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, filename);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        res.status(400).json({ error: 'Invalid file destination.' });
        return;
      }
      fs.writeFileSync(targetPath, buf);
      res.json({ url: `/uploads/${filename}` });
    }
  );

  // Standard JSON parser for auth & CMS APIs
  app.use('/api', express.json({ limit: '1mb' }));

  app.get('/api/panel/status', (req: Request, res: Response) => {
    const envCreds = getEnvAdminCredentials();
    const stored = readStoredAdmin();
    const token = extractBearerToken(req);
    const verified = token ? verifyToken(token) : null;
    res.json({
      configured: Boolean(envCreds || stored),
      envManaged: Boolean(envCreds),
      authenticated: Boolean(verified),
      adminId: verified?.adminId ?? null,
    });
  });

  app.post('/api/panel/setup', (req: Request, res: Response) => {
    if (getEnvAdminCredentials() || readStoredAdmin()) {
      res.status(409).json({ error: 'Admin account is already configured.' });
      return;
    }
    const body = req.body as { adminId?: unknown; password?: unknown } | undefined;
    const adminId = typeof body?.adminId === 'string' ? body.adminId.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(adminId)) {
      res.status(400).json({
        error: 'Admin ID must be 3–64 characters using letters, numbers, dots, underscores, or hyphens.',
      });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({
        error: 'Password must be between 8 and 128 characters.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const record: AdminRecord = {
      adminId,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(ADMIN_FILE, JSON.stringify(record, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
    } catch {
      res.status(409).json({ error: 'Admin account is already configured.' });
      return;
    }

    const token = signToken(adminId);
    res.json({ token, adminId });
  });

  app.post('/api/panel/login', (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    const now = Date.now();
    const record = loginAttempts.get(clientIp);
    if (record && record.resetAt > now && record.count >= MAX_LOGIN_ATTEMPTS) {
      res.status(429).json({
        error: 'Too many login attempts. Please wait 15 minutes and try again.',
      });
      return;
    }

    const body = req.body as { adminId?: unknown; password?: unknown } | undefined;
    const adminId = typeof body?.adminId === 'string' ? body.adminId.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!adminId || !password) {
      res.status(400).json({ error: 'Admin ID and password are required.' });
      return;
    }

    let valid = false;
    const envCreds = getEnvAdminCredentials();
    if (envCreds) {
      valid =
        constantTimeStringMatch(adminId, envCreds.adminId) &&
        constantTimeStringMatch(password, envCreds.password);
    } else {
      const stored = readStoredAdmin();
      if (!stored) {
        res.status(400).json({ error: 'Admin account has not been set up yet.' });
        return;
      }
      const derived = crypto.scryptSync(password, stored.salt, 64);
      const expected = Buffer.from(stored.passwordHash, 'hex');
      valid =
        constantTimeStringMatch(adminId, stored.adminId) &&
        derived.length === expected.length &&
        crypto.timingSafeEqual(derived, expected);
    }

    if (!valid) {
      const nextCount = record && record.resetAt > now ? record.count + 1 : 1;
      loginAttempts.set(clientIp, {
        count: nextCount,
        resetAt: record && record.resetAt > now ? record.resetAt : now + LOGIN_WINDOW_MS,
      });
      res.status(401).json({ error: 'Invalid Admin ID or password.' });
      return;
    }

    loginAttempts.delete(clientIp);
    const token = signToken(adminId);
    res.json({ token, adminId });
  });

  app.put(
    '/api/panel/services/core/:slug',
    requirePanelAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const slug = req.params.slug;
      if (!isValidSlug(slug)) {
        res.status(400).json({ error: 'Invalid service identifier.' });
        return;
      }
      const body = (req.body || {}) as Record<string, unknown>;
      const override: CoreServiceOverride = {};
      const label = sanitizeText(body.label, 120);
      const propertyScope = sanitizeText(body.propertyScope, 120);
      const responseWindow = sanitizeText(body.responseWindow, 120);
      const summary = sanitizeText(body.summary, 600);
      const image = sanitizeImageUrl(body.image);
      const imageAlt = sanitizeText(body.imageAlt, 240);

      if (label) override.label = label;
      if (propertyScope) override.propertyScope = propertyScope;
      if (responseWindow) override.responseWindow = responseWindow;
      if (summary) override.summary = summary;
      if (image) override.image = image;
      if (imageAlt) override.imageAlt = imageAlt;

      const cms = readCmsData();
      cms.coreServices[slug] = override;
      const saved = writeCmsData(cms);
      res.json(saved);
    }
  );

  app.put(
    '/api/panel/services/trade/:slug',
    requirePanelAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const slug = req.params.slug;
      if (!isValidSlug(slug)) {
        res.status(400).json({ error: 'Invalid service identifier.' });
        return;
      }
      const body = (req.body || {}) as Record<string, unknown>;
      const override: TradeServiceOverride = {};
      const label = sanitizeText(body.label, 120);
      const propertyScope = sanitizeText(body.propertyScope, 120);
      const responseWindow = sanitizeText(body.responseWindow, 120);
      const summary = sanitizeText(body.summary, 600);
      const description = sanitizeText(body.description, 2000);
      const qatarContext = sanitizeText(body.qatarContext, 1500);
      const checklist = sanitizeStringList(body.checklist);
      const idealFor = sanitizeStringList(body.idealFor);
      const image = sanitizeImageUrl(body.image);
      const imageAlt = sanitizeText(body.imageAlt, 240);

      if (label) override.label = label;
      if (propertyScope) override.propertyScope = propertyScope;
      if (responseWindow) override.responseWindow = responseWindow;
      if (summary) override.summary = summary;
      if (description) override.description = description;
      if (qatarContext) override.qatarContext = qatarContext;
      if (checklist) override.checklist = checklist;
      if (idealFor) override.idealFor = idealFor;
      if (image) override.image = image;
      if (imageAlt) override.imageAlt = imageAlt;

      const cms = readCmsData();
      cms.tradeServices[slug] = override;

      // Keep the matching Core Service card synced with Trade Service edits
      const cardSummary = sanitizeText(body.cardSummary, 600) || summary;
      const coreSync: CoreServiceOverride = {};
      if (label) coreSync.label = label;
      if (propertyScope) coreSync.propertyScope = propertyScope;
      if (responseWindow) coreSync.responseWindow = responseWindow;
      if (cardSummary) coreSync.summary = cardSummary;
      if (image) coreSync.image = image;
      if (imageAlt) coreSync.imageAlt = imageAlt;
      cms.coreServices[slug] = coreSync;

      const saved = writeCmsData(cms);
      res.json(saved);
    }
  );

  app.put(
    '/api/panel/services/plumbing/:slug',
    requirePanelAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const slug = req.params.slug;
      if (!isValidSlug(slug)) {
        res.status(400).json({ error: 'Invalid service identifier.' });
        return;
      }
      const body = (req.body || {}) as Record<string, unknown>;
      const override: PlumbingServiceOverride = {};
      const title = sanitizeText(body.title, 140);
      const shortTitle = sanitizeText(body.shortTitle, 80);
      const categoryRaw = sanitizeText(body.category, 60) as PlumbingCategoryValue | undefined;
      const propertyScope = sanitizeText(body.propertyScope, 120);
      const responseWindow = sanitizeText(body.responseWindow, 120);
      const summary = sanitizeText(body.summary, 600);
      const description = sanitizeText(body.description, 2000);
      const qatarContext = sanitizeText(body.qatarContext, 1500);
      const checklist = sanitizeStringList(body.checklist);
      const materials = sanitizeStringList(body.materials);
      const idealFor = sanitizeStringList(body.idealFor);
      const image = sanitizeImageUrl(body.image);
      const imageAlt = sanitizeText(body.imageAlt, 240);

      if (title) override.title = title;
      if (shortTitle) override.shortTitle = shortTitle;
      if (categoryRaw && VALID_PLUMBING_CATEGORIES.has(categoryRaw)) {
        override.category = categoryRaw;
      }
      if (propertyScope) override.propertyScope = propertyScope;
      if (responseWindow) override.responseWindow = responseWindow;
      if (summary) override.summary = summary;
      if (description) override.description = description;
      if (qatarContext) override.qatarContext = qatarContext;
      if (checklist) override.checklist = checklist;
      if (materials) override.materials = materials;
      if (idealFor) override.idealFor = idealFor;
      if (image) override.image = image;
      if (imageAlt) override.imageAlt = imageAlt;

      const cms = readCmsData();
      cms.plumbingServices[slug] = override;
      const saved = writeCmsData(cms);
      res.json(saved);
    }
  );

  app.delete(
    '/api/panel/services/:group/:slug',
    requirePanelAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const { group, slug } = req.params;
      if (!isValidSlug(slug)) {
        res.status(400).json({ error: 'Invalid service identifier.' });
        return;
      }
      const cms = readCmsData();
      if (group === 'core') {
        delete cms.coreServices[slug];
        delete cms.tradeServices[slug];
      } else if (group === 'trade') {
        delete cms.tradeServices[slug];
        delete cms.coreServices[slug];
      } else if (group === 'plumbing') {
        delete cms.plumbingServices[slug];
      } else {
        res.status(400).json({ error: 'Invalid service group.' });
        return;
      }
      const saved = writeCmsData(cms);
      res.json(saved);
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FixHub Qatar server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
