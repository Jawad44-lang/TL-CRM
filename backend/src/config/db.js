import mongoose from 'mongoose';
import dns from 'node:dns';
import env from './env.js';

const MAX_ATTEMPTS = 3;
let cachedUri = null;

/* ------------------------------------------------------------------ *
 * mongodb+srv:// → standard mongodb:// auto-conversion.
 * Node ka DNS SRV lookup (querySrv) kai networks/ISP pe block hota hai
 * — isi liye backend ek PC pe chalta tha aur doosre pe nahi. Yeh helper
 * SRV + TXT records resolve karke (local DNS fail ho to DNS-over-HTTPS
 * se) standard multi-host URI banata hai — SRV dependency khatam.
 * ------------------------------------------------------------------ */

function parseSrvUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return null;
  let rest = uri.slice('mongodb+srv://'.length);
  let userinfo = '';
  const at = rest.lastIndexOf('@');
  if (at >= 0) {
    userinfo = rest.slice(0, at + 1);
    rest = rest.slice(at + 1);
  }
  const qIdx = rest.indexOf('?');
  const hostPart = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  const search = qIdx >= 0 ? rest.slice(qIdx + 1) : '';
  const slash = hostPart.indexOf('/');
  const host = slash >= 0 ? hostPart.slice(0, slash) : hostPart;
  const pathname = slash >= 0 ? hostPart.slice(slash) : '/';
  if (!host) return null;
  return { userinfo, host, pathname, params: new URLSearchParams(search) };
}

const cleanHost = (h) => String(h).trim().replace(/\.$/, '');

async function srvLocal(name) {
  try {
    const recs = await dns.promises.resolveSrv(name);
    return recs.map((r) => `${cleanHost(r.name)}:${r.port}`);
  } catch {
    return null;
  }
}

const DOH_ENDPOINTS = ['https://dns.google/resolve', 'https://cloudflare-dns.com/dns-query'];

async function dohQuery(name, type) {
  for (const base of DOH_ENDPOINTS) {
    try {
      const res = await fetch(`${base}?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { accept: 'application/dns-json' },
      });
      if (!res.ok) continue;
      const answers = (await res.json()).Answer || [];
      if (answers.length) return answers;
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

async function srvDoh(name) {
  const answers = await dohQuery(name, 'SRV');
  const hosts = (answers || [])
    .filter((a) => a.type === 33)
    .map((a) => {
      const [, , port, ...rest] = String(a.data).trim().split(/\s+/);
      return `${cleanHost(rest.join('.'))}:${port}`;
    })
    .filter(Boolean);
  return hosts.length ? hosts : null;
}

async function txtForCluster(host) {
  try {
    const recs = await dns.promises.resolveTxt(host);
    if (recs?.length) return recs[0].join('');
  } catch {
    /* fall through to DoH */
  }
  const answers = await dohQuery(host, 'TXT');
  const txt = (answers || []).find((a) => a.type === 16);
  return txt ? String(txt.data).replace(/"/g, '') : '';
}

export async function resolveMongoUri(rawUri) {
  const parsed = parseSrvUri(rawUri);
  if (!parsed) return rawUri; // standard mongodb:// — kuch karne ki zaroorat nahi

  const srvName = `_mongodb._tcp.${parsed.host}`;
  let hosts = await srvLocal(srvName);
  let via = 'local DNS';

  if (!hosts) {
    console.log('ℹ️  DNS SRV lookup failed on this network — trying DNS-over-HTTPS fallback…');
    hosts = await srvDoh(srvName);
    via = 'DNS-over-HTTPS';
  }
  if (!hosts) {
    throw new Error(
      `Cannot resolve Atlas SRV record ${srvName} (local DNS + DoH dono fail).\n` +
        '   💡 Fix: backend/.env mein mongodb+srv:// ki jagah standard multi-host\n' +
        '      mongodb:// URI use karo (dekho .env.example), ya DNS 8.8.8.8/1.1.1.1 karo.'
    );
  }

  const txt = await txtForCluster(parsed.host);
  const rs = /replicaSet=([^&\s"]+)/.exec(txt)?.[1];

  const params = parsed.params;
  params.set('tls', 'true');
  if (rs && !params.has('replicaSet')) params.set('replicaSet', rs);
  if (!params.has('authSource')) params.set('authSource', 'admin');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  const stdUri = `mongodb://${parsed.userinfo}${hosts.join(',')}${parsed.pathname}?${params.toString()}`;
  console.log(`✅ Atlas cluster resolved via ${via} → ${hosts.length} shards | replicaSet: ${rs || 'n/a'}`);
  return stdUri;
}

function friendlyMessage(err) {
  const msg = err?.message || String(err);
  if (/querySrv|ENOTFOUND|_mongodb\._tcp/i.test(msg)) {
    return `${msg}\n   💡 DNS lookup for the Atlas cluster failed. Use a standard mongodb:// URI (see backend/.env) or set your DNS to 8.8.8.8 / 1.1.1.1.`;
  }
  if (/bad auth|Authentication/i.test(msg)) {
    return `${msg}\n   💡 Check MONGO_URI username/password in backend/.env.`;
  }
  if (/ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    return `${msg}\n   💡 Check your internet connection and Atlas Network Access (IP whitelist).`;
  }
  return msg;
}

export async function connectDB() {
  mongoose.set('strictQuery', true);
  if (!cachedUri) cachedUri = await resolveMongoUri(env.MONGO_URI);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(cachedUri, { serverSelectionTimeoutMS: 10000 });
      console.log(`✅ MongoDB connected → ${mongoose.connection.name}`);
      return mongoose.connection;
    } catch (err) {
      lastErr = err;
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw new Error(friendlyMessage(lastErr));
}
