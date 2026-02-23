#!/usr/bin/env node
/**
 * Writes Vite env vars from process.env into .env.production.local
 * so Cloudflare (and other CI) build env vars are picked up by Vite.
 * Run before `vite build` when deploying (e.g. Cloudflare Pages).
 */
import { writeFileSync } from 'node:fs';

const vars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
};

const content = Object.entries(vars)
  .map(([k, v]) => `${k}=${String(v).replace(/\n/g, ' ')}`)
  .join('\n');

writeFileSync('.env.production.local', content, 'utf8');
console.log('Wrote .env.production.local from process.env (VITE_SUPABASE_*)');
// Don't log values for security
