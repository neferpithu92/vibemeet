#!/bin/bash
# ============================================================
# ANTIGRAVITY-SYNC.SH (Alpha Framework)
# Automated Migration & Sync Orchestrator
# ============================================================

# ANSI Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}[ANTIGRAVITY] Initiating Alpha Rollout Sync...${NC}"

# 1. Check for Supabase CLI
if ! command -v supabase &> /dev/null
then
    echo -e "${YELLOW}[NOTICE] Supabase CLI not found. Reverting to Manual Extraction Mode.${NC}"
    echo -e "Per caricare l'intera infrastruttura, copia il contenuto di:"
    echo -e "${GREEN}supabase/migrations/999_full_alpha_rollout.sql${NC}"
    echo -e "nel Supabase Dashboard SQL Editor."
    
    # Still attempt to sync the app-level state
    node scripts/antigravity.js sync
    exit 0
fi

# 2. Automated Push using Supabase CLI
echo -e "${CYAN}[PUSH] Pushing all Alpha Migrations...${NC}"
supabase db push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Database migrations pushed successfully.${NC}"
    # Force initial sync
    node scripts/antigravity.js sync
else
    echo -e "${RED}[ERROR] Migration push failed. Check Supabase login status.${NC}"
    exit 1
fi

echo -e "${GREEN}[DONE] Vibe Alpha is fully operational.${NC}"
