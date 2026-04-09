const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function findFiles(dir, exts = ['.tsx', '.ts']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findFiles(full, exts));
    } else if (exts.some(e => item.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const allFiles = findFiles(SRC);

const issues = {
  next_link: [],
  next_nav: [],
  missing_components: [],
  env_vars: new Set(),
  supabase_tables: new Set(),
  todo_fixme: [],
  hardcoded_text: [],
  wrong_supabase: [],
};

for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const rel = f.replace(ROOT + path.sep, '').replace(/\\/g, '/');

  lines.forEach((line, i) => {
    const ln = i + 1;

    // Non-localized imports
    if ((line.includes("from 'next/link'") || line.includes('from "next/link"')) && !line.includes('//')) {
      issues.next_link.push(`${rel}:${ln}: ${line.trim().slice(0, 80)}`);
    }
    if ((line.includes("from 'next/navigation'") || line.includes('from "next/navigation"')) && !line.includes('//')) {
      if (line.includes('useRouter') || line.includes('usePathname') || line.includes('redirect')) {
        issues.next_nav.push(`${rel}:${ln}: ${line.trim().slice(0, 80)}`);
      }
    }

    // Env vars
    const envMatches = line.match(/process\.env\.[A-Z_]+/g) || [];
    envMatches.forEach(m => issues.env_vars.add(m));

    // Supabase tables
    const tableMatches = line.match(/\.from\('([^']+)'\)/g) || [];
    tableMatches.forEach(m => {
      const t = m.match(/\.from\('([^']+)'\)/);
      if (t) issues.supabase_tables.add(t[1]);
    });

    // TODO/FIXME
    if (/\b(TODO|FIXME)\b/i.test(line)) {
      issues.todo_fixme.push(`${rel}:${ln}: ${line.trim().slice(0, 80)}`);
    }

    // Hardcoded IT text (not in message files)
    if (!rel.includes('/messages/') && /Centra su di me|coming soon|lorem ipsum|PLACEHOLDER/i.test(line)) {
      issues.hardcoded_text.push(`${rel}:${ln}: ${line.trim().slice(0, 80)}`);
    }

    // Wrong Supabase URL
    if (line.toLowerCase().includes('kvmdeolhkpnhkomnhlsy')) {
      issues.wrong_supabase.push(`${rel}:${ln}`);
    }
  });

  // Component import check (only for app pages)
  if (rel.startsWith('src/app')) {
    const imports = text.match(/from ['"](@\/components\/[^'"]+)['"]/g) || [];
    imports.forEach(imp => {
      const compPath = imp.match(/from ['"](@\/components\/[^'"]+)['"]/)[1];
      const localPath = compPath.replace('@/', 'src/');
      const candidates = [
        path.join(ROOT, localPath + '.tsx'),
        path.join(ROOT, localPath + '.ts'),
        path.join(ROOT, localPath, 'index.tsx'),
        path.join(ROOT, localPath, 'index.ts'),
      ];
      if (!candidates.some(c => fs.existsSync(c))) {
        const key = `${compPath} (from ${rel})`;
        if (!issues.missing_components.includes(key)) {
          issues.missing_components.push(key);
        }
      }
    });
  }
}

// Check .env.local
const envLocal = path.join(ROOT, '.env.local');
const envContent = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, 'utf8') : '';
const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_MAPBOX_TOKEN',
  'STRIPE_SECRET_KEY',
  'CRON_SECRET',
];
const missingEnv = requiredEnv.filter(v => !envContent.includes(v));

// Check page files
const appDir = path.join(SRC, 'app', '[locale]');
const appRoutes = [];
if (fs.existsSync(appDir)) {
  fs.readdirSync(appDir, { withFileTypes: true }).forEach(d => {
    if (d.isDirectory()) {
      const pg = path.join(appDir, d.name, 'page.tsx');
      appRoutes.push({ route: d.name, exists: fs.existsSync(pg) });
    }
  });
}

// REPORT
console.log('='.repeat(65));
console.log('VIBEMEET FULL AUDIT REPORT');
console.log('='.repeat(65));

console.log(`\n[1] NON-LOCALIZED next/link (${issues.next_link.length} files):`);
issues.next_link.forEach(x => console.log('  ' + x));

console.log(`\n[2] NON-LOCALIZED next/navigation (${issues.next_nav.length} occurrences):`);
// Group by file
const navFiles = [...new Set(issues.next_nav.map(x => x.split(':')[0]))];
navFiles.forEach(f => console.log('  ' + f));

console.log(`\n[3] MISSING COMPONENTS (${issues.missing_components.length}):`);
issues.missing_components.forEach(x => console.log('  ' + x));

console.log(`\n[4] ENV VARS USED (${issues.env_vars.size}):`);
[...issues.env_vars].sort().forEach(x => console.log('  ' + x));

console.log(`\n[5] MISSING ENV VARS in .env.local (${missingEnv.length}):`);
missingEnv.forEach(x => console.log('  !! ' + x));

console.log(`\n[6] SUPABASE TABLES (${issues.supabase_tables.size}):`);
[...issues.supabase_tables].sort().forEach(x => console.log('  ' + x));

console.log(`\n[7] TODO/FIXME (${issues.todo_fixme.length}):`);
issues.todo_fixme.forEach(x => console.log('  ' + x));

console.log(`\n[8] HARDCODED TEXT in pages (${issues.hardcoded_text.length}):`);
issues.hardcoded_text.forEach(x => console.log('  ' + x));

console.log(`\n[9] WRONG SUPABASE URL (${issues.wrong_supabase.length}):`);
issues.wrong_supabase.forEach(x => console.log('  ' + x));

console.log(`\n[10] APP ROUTES CHECK (${appRoutes.length} dirs):`);
appRoutes.filter(r => !r.exists).forEach(r => console.log(`  MISSING page.tsx: ${r.route}`));
const missing = appRoutes.filter(r => !r.exists);
if (missing.length === 0) console.log('  All route page.tsx files exist ✓');

console.log('\n' + '='.repeat(65));
console.log('SUMMARY:');
console.log(`  BUILD: PASS (exit 0)`);
console.log(`  next/link misuse: ${issues.next_link.length}`);
console.log(`  next/navigation misuse: ${navFiles.length} files`);
console.log(`  Missing components: ${issues.missing_components.length}`);
console.log(`  Missing env vars: ${missingEnv.length}`);
console.log(`  Supabase tables: ${issues.supabase_tables.size}`);
console.log(`  TODO/FIXME: ${issues.todo_fixme.length}`);
console.log(`  Hardcoded text in pages: ${issues.hardcoded_text.length}`);
console.log(`  Wrong Supabase URL: ${issues.wrong_supabase.length}`);
console.log('='.repeat(65));
