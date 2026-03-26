# ============================================================
# ANTIGRAVITY-SYNC.PS1 (Alpha Framework - Windows)
# Automated Migration & Sync Orchestrator
# ============================================================

Write-Host "[ANTIGRAVITY] Initiating Alpha Rollout Sync..." -ForegroundColor Cyan

# 1. Check for Supabase CLI
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "[NOTICE] Supabase CLI not found. Reverting to Manual Extraction Mode." -ForegroundColor Yellow
    Write-Host "Per caricare l'intera infrastruttura, copia il contenuto di:"
    Write-Host "supabase/migrations/999_full_alpha_rollout.sql" -ForegroundColor Green
    Write-Host "nel Supabase Dashboard SQL Editor."
    
    # Still attempt to sync the app-level state
    node scripts/antigravity.js sync
    exit 0
}

# 2. Automated Push using Supabase CLI
Write-Host "[PUSH] Pushing all Alpha Migrations..." -ForegroundColor Cyan
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database migrations pushed successfully." -ForegroundColor Green
    # Force initial sync
    node scripts/antigravity.js sync
} else {
    Write-Host "[ERROR] Migration push failed. Check Supabase login status." -ForegroundColor Red
    exit 1
}

Write-Host "[DONE] Vibe Alpha is fully operational." -ForegroundColor Green
