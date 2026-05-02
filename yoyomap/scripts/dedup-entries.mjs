// Bulk-delete known duplicate entries via the admin API.
// Usage:
//   ADMIN_TOKEN=xxx SITE_URL=https://your-site.com node scripts/dedup-entries.mjs
//   (add --dry to preview without deleting)

const TOKEN = process.env.ADMIN_TOKEN;
const SITE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const DRY = process.argv.includes('--dry');

if (!TOKEN) {
  console.error('Set ADMIN_TOKEN env var.');
  process.exit(1);
}

// Emails to delete. Each pair = [keep, delete]; only the second is removed.
const DELETIONS = [
  { keep: 'newyorkyoyoclub@gmail.com',                           del: 'dmvthrowers+club-new-york-yo-yo-club@gmail.com' },
  { keep: 'dmvthrowers+club-nashville-yo-yo-club@gmail.com',     del: 'club+yoyonashville@example.com' },
  { keep: 'chrisnotes86@yahoo.com',                              del: 'club+cleveyoyo@example.com' },
  { keep: 'dmvthrowers+club-central-florida-yo-yo-club@gmail.com', del: 'club+orlando@example.com' },
  { keep: 'hectorete20071@gmail.com',                            del: 'hectorete20071@gmail.con' },
  { keep: 'downloadico42@gmail.com',                             del: 'downloadico@gmail.com' },
];

const headers = { 'x-admin-token': TOKEN, 'Content-Type': 'application/json' };

const res = await fetch(`${SITE}/api/admin/data`, { headers });
if (!res.ok) {
  console.error(`GET /api/admin/data → ${res.status}`);
  process.exit(1);
}
const { entries } = await res.json();

const byEmail = new Map();
for (const e of entries) {
  const k = e.email.toLowerCase();
  if (!byEmail.has(k)) byEmail.set(k, []);
  byEmail.get(k).push(e);
}

let deleted = 0, missing = 0;
for (const { keep, del } of DELETIONS) {
  const matches = byEmail.get(del.toLowerCase()) || [];
  const keepRow = (byEmail.get(keep.toLowerCase()) || [])[0];
  if (!matches.length) {
    console.log(`SKIP   ${del}  (not found)`);
    missing++;
    continue;
  }
  if (!keepRow) {
    console.log(`WARN   keep target ${keep} not found — still deleting ${del}`);
  }
  for (const row of matches) {
    const label = `${row.display_name} <${row.email}> [${row.id}]`;
    if (DRY) {
      console.log(`DRY    would delete ${label}`);
      continue;
    }
    const r = await fetch(`${SITE}/api/admin/action`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete_entry', id: row.id }),
    });
    if (r.ok) {
      console.log(`DEL    ${label}`);
      deleted++;
    } else {
      const msg = await r.text();
      console.log(`FAIL   ${label} → ${r.status} ${msg}`);
    }
  }
}

console.log(`\n${DRY ? '[dry-run] ' : ''}Done. deleted=${deleted}  missing=${missing}`);
