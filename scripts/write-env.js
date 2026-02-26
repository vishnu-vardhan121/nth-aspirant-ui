#!/usr/bin/env node
/**
 * Writes Vite env vars into .env.production.local so Vite picks them up.
 * - On Cloudflare/CI: use process.env (injected by the platform).
 * - Local: loads .env so your local values are used when running npm run build.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

function loadEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (key.startsWith('VITE_')) out[key] = val;
  }
  return out;
}

const fromFile = loadEnvFile('.env');
const vars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? fromFile.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? fromFile.VITE_SUPABASE_ANON_KEY ?? '',
  ...fromFile,
};
for (const key of Object.keys(process.env)) {
  if (key.startsWith('VITE_')) vars[key] = process.env[key];
}

// Diagnose why env might not connect (e.g. on Cloudflare)
const hasUrl = !!vars.VITE_SUPABASE_URL;
const hasKey = !!vars.VITE_SUPABASE_ANON_KEY;
const fromProcessEnv = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
const fromDotEnv = !!fromFile.VITE_SUPABASE_URL && !!fromFile.VITE_SUPABASE_ANON_KEY;
const isCiLike =
  process.env.CI === 'true' ||
  process.env.CF_PAGES === '1' ||
  !!process.env.CF_PAGES_URL ||
  !!process.env.CLOUDFLARE_ACCOUNT_ID;
console.log('[Supabase] build env:', {
  hasUrl,
  hasKey,
  source: fromProcessEnv ? 'process.env (e.g. Cloudflare)' : fromDotEnv ? '.env file' : 'MISSING',
  isCiLike,
});
if (!hasUrl || !hasKey) {
  const msg =
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is empty. Set them in .env (local) or Cloudflare Pages → Settings → Environment variables, then rebuild. See DEPLOY.md for Cloudflare setup.';
  if (isCiLike) console.warn(msg);
  else console.warn(msg);
}

const content = Object.keys(vars).length
  ? Object.entries(vars)
      .map(([k, v]) => `${k}=${String(v).replace(/\n/g, ' ')}`)
      .join('\n')
  : '# No Vite env vars\n';

writeFileSync('.env.production.local', content, 'utf8');
console.log('Wrote .env.production.local');
