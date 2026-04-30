# VibeMeet — Script di Deploy Unificato
# Uso: .\deploy.ps1 [--skip-supabase] [--skip-build]
# Esegue: build TypeScript → GitHub push → Supabase migration → Vercel deploy

param(
    [switch]$SkipSupabase,
    [switch]$SkipBuild,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      VibeMeet — Deploy Pipeline v1.0          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load env
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"'))
        }
    }
}

# Step 1: TypeScript check
if (-not $SkipBuild) {
    Write-Host "► Step 1/4: TypeScript check..." -ForegroundColor Yellow
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ TypeScript errors found. Fix before deploying." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ TypeScript OK" -ForegroundColor Green
}

# Step 2: GitHub push
Write-Host ""
Write-Host "► Step 2/4: GitHub push..." -ForegroundColor Yellow
if (-not $DryRun) {
    git add -A
    $status = git status --porcelain
    if ($status) {
        $msg = Read-Host "Commit message (or press Enter for auto)"
        if (-not $msg) { $msg = "chore: deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
        git commit -m $msg
    }
    git push origin main
    Write-Host "✓ GitHub push OK" -ForegroundColor Green
} else {
    Write-Host "  [DRY RUN] Skipping git push" -ForegroundColor Gray
}

# Step 3: Supabase migrations
if (-not $SkipSupabase) {
    Write-Host ""
    Write-Host "► Step 3/4: Supabase migrations..." -ForegroundColor Yellow
    if (-not $DryRun) {
        $token = $env:SUPABASE_ACCESS_TOKEN
        if ($token) {
            $env:SUPABASE_ACCESS_TOKEN = $token
            npx supabase db push --include-all
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Supabase migrations OK" -ForegroundColor Green
            } else {
                Write-Host "⚠ Supabase migration failed — check SQL editor manually" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠ SUPABASE_ACCESS_TOKEN missing — skipping migrations" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [DRY RUN] Skipping Supabase push" -ForegroundColor Gray
    }
} else {
    Write-Host "► Step 3/4: Supabase [SKIPPED]" -ForegroundColor Gray
}

# Step 4: Vercel deploy
Write-Host ""
Write-Host "► Step 4/4: Vercel production deploy..." -ForegroundColor Yellow
if (-not $DryRun) {
    npx vercel --prod --yes
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Vercel deploy OK" -ForegroundColor Green
    } else {
        Write-Host "✗ Vercel deploy failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [DRY RUN] Skipping Vercel deploy" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           DEPLOY COMPLETATO ✓                 ║" -ForegroundColor Green  
Write-Host "║   https://vibemeet-theta.vercel.app           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Green
