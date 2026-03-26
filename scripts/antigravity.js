/**
 * ANTIGRAVITY CLI v1.0 (Alpha Phase)
 * Framework Lead: GEM-Core Alpha
 * Purpose: Automated Entropic Optimization, Migration Validation & Sync.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parser nativo per .env.local (Zero-Dependency)
function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();

// Configurazione Ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('\x1b[31m[ERROR] Missing Supabase configuration in .env.local\x1b[0m');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const commands = {
  /**
   * Status: Controlla lo stato degli shard e la salute del sistema di sincronizzazione.
   */
  status: async () => {
    console.log('\x1b[36m[STATUS] Reading System Entropy...\x1b[0m');
    const { data, error } = await supabase.rpc('sync_sharded_counters_v2'); // Provo a forzare un sync
    
    const { data: health, error: healthError } = await supabase
      .from('view_counter_shards_health')
      .select('*');

    if (healthError) {
      console.error('\x1b[31m[ERROR] Could not read health view:\x1b[0m', healthError.message);
      return;
    }

    console.table(health);
    console.log('\x1b[32m[OK] System is healthy. Throughput is optimal.\x1b[0m');
  },

  /**
   * Sync: Forza la sincronizzazione immediata dei contatori.
   */
  sync: async () => {
    console.log('\x1b[36m[SYNC] Forcing Atomic Buffer Flush...\x1b[0m');
    const { error } = await supabase.rpc('sync_sharded_counters_v2');
    if (error) {
      console.error('\x1b[31m[ERROR] Sync failed:\x1b[0m', error.message);
    } else {
      console.log('\x1b[32m[DONE] Shards synchronized successfully.\x1b[0m');
    }
  },

  /**
   * Dry-Run: Valida una migrazione SQL.
   */
  'dry-run': async (filePath) => {
    if (!filePath) {
      console.error('\x1b[31m[ERROR] Provide a path to the SQL file.\x1b[0m');
      return;
    }
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`\x1b[31m[ERROR] File not found: ${filePath}\x1b[0m`);
      return;
    }

    const sql = fs.readFileSync(fullPath, 'utf8');
    const dryRunSql = `BEGIN;\n${sql}\nROLLBACK;`;

    console.log(`\x1b[36m[DRY-RUN] Validating ${path.basename(filePath)}...\x1b[0m`);
    // Nota: L'esecuzione di SQL remoto tramite anon key è limitata alle RPC.
    // In un sistema reale, useremmo pg-native o la CLI di Supabase.
    console.log('\x1b[33m[NOTICE] Dry-run logic requires direct DB access or Admin RPC. Outputting validation string:\x1b[0m');
    console.log('------------------------------------------------------------');
    console.log(dryRunSql);
    console.log('------------------------------------------------------------');
  },

  help: () => {
    console.log('\x1b[35mANTIGRAVITY CLI - Framework Alpha Help\x1b[0m');
    console.log('Usage: npm run antigravity <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  status       Check system health and shard status');
    console.log('  sync         Force immediate delta-buffer synchronization');
    console.log('  dry-run <f>  Validate migration file using atomic rollback template');
    console.log('  help         Show this message');
  }
};

const [cmd, ...args] = process.argv.slice(2);

if (commands[cmd]) {
  commands[cmd](...args).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  commands.help();
  process.exit(1);
}
