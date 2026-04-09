#!/usr/bin/env python3
import os, re, json
from pathlib import Path

ROOT = Path(".")
SRC = ROOT / "src"

def find_files(exts=(".tsx",".ts")):
    for ext in exts:
        yield from SRC.rglob(f"*{ext}")

results = {
    "next_link_misuse": [],
    "next_navigation_misuse": [],
    "missing_components": [],
    "env_vars": set(),
    "supabase_tables": set(),
    "console_errors": [],
    "todo_fixme": [],
    "hardcoded_text": [],
    "hardcoded_supabase_url": [],
}

# Known localized imports that are OK
OK_PATHS = ["i18n/navigation", "lib/i18n"]

for f in find_files():
    text = f.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    rel = str(f).replace("\\", "/")

    for i, line in enumerate(lines, 1):
        # 1. Non-localized next/link or next/navigation
        if ("from 'next/link'" in line or 'from "next/link"' in line):
            results["next_link_misuse"].append(f"{rel}:{i}: {line.strip()}")
        if ("from 'next/navigation'" in line or 'from "next/navigation"' in line):
            results["next_navigation_misuse"].append(f"{rel}:{i}: {line.strip()}")

        # 2. Env vars
        for m in re.finditer(r"process\.env\.[A-Z_]+", line):
            results["env_vars"].add(m.group())

        # 3. Supabase tables
        for m in re.finditer(r"\.from\('([^']+)'\)", line):
            results["supabase_tables"].add(m.group(1))

        # 4. Console errors
        if "console.error" in line or "console.warn" in line:
            results["console_errors"].append(f"{rel}:{i}")

        # 5. TODO/FIXME
        if re.search(r"\bTODO\b|\bFIXME\b", line, re.I):
            results["todo_fixme"].append(f"{rel}:{i}: {line.strip()[:80]}")

        # 6. Hardcoded text patterns (Centra su di me, coming soon, etc.)
        if re.search(r"Centra su di me|coming soon|lorem ipsum|PLACEHOLDER|hardcoded", line, re.I):
            results["hardcoded_text"].append(f"{rel}:{i}: {line.strip()[:80]}")

        # 7. Wrong Supabase URL
        if "kvmdeolhkpnhkomnhlsy" in line.lower():
            results["hardcoded_supabase_url"].append(f"{rel}:{i}: {line.strip()[:80]}")

# Check component imports from app pages
import_pattern = re.compile(r"from ['\"](@/components/[^'\"]+)['\"]")
all_imports = set()
for f in (SRC / "app").rglob("*.tsx"):
    text = f.read_text(encoding="utf-8", errors="ignore")
    for m in import_pattern.finditer(text):
        all_imports.add(m.group(1))

for imp in sorted(all_imports):
    # Convert @/components/foo/Bar to src/components/foo/Bar
    local = imp.replace("@/", "src/")
    candidates = [
        Path(local + ".tsx"),
        Path(local + ".ts"),
        Path(local + "/index.tsx"),
        Path(local + "/index.ts"),
    ]
    if not any(c.exists() for c in candidates):
        results["missing_components"].append(imp)

# Check .env.local exists and contains required vars
required_env = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_MAPBOX_TOKEN",
    "STRIPE_SECRET_KEY",
    "CRON_SECRET",
]
env_local = ROOT / ".env.local"
env_content = env_local.read_text(encoding="utf-8", errors="ignore") if env_local.exists() else ""
missing_env = [v for v in required_env if v not in env_content]

# Print report
print("=" * 60)
print("VIBEMEET FULL AUDIT REPORT")
print("=" * 60)

print(f"\n[1] NON-LOCALIZED next/link imports ({len(results['next_link_misuse'])}):")
for x in results["next_link_misuse"][:20]:
    print(f"  {x}")

print(f"\n[2] NON-LOCALIZED next/navigation imports ({len(results['next_navigation_misuse'])}):")
for x in results["next_navigation_misuse"][:20]:
    print(f"  {x}")

print(f"\n[3] MISSING COMPONENTS ({len(results['missing_components'])}):")
for x in results["missing_components"]:
    print(f"  {x}")

print(f"\n[4] ENV VARS USED ({len(results['env_vars'])}):")
for x in sorted(results["env_vars"]):
    print(f"  {x}")

print(f"\n[5] MISSING ENV VARS in .env.local ({len(missing_env)}):")
for x in missing_env:
    print(f"  {x}")

print(f"\n[6] SUPABASE TABLES QUERIED ({len(results['supabase_tables'])}):")
for x in sorted(results["supabase_tables"]):
    print(f"  {x}")

print(f"\n[7] TODO/FIXME ({len(results['todo_fixme'])}):")
for x in results["todo_fixme"][:20]:
    print(f"  {x}")

print(f"\n[8] HARDCODED TEXT ({len(results['hardcoded_text'])}):")
for x in results["hardcoded_text"][:20]:
    print(f"  {x}")

print(f"\n[9] WRONG SUPABASE URL ({len(results['hardcoded_supabase_url'])}):")
for x in results["hardcoded_supabase_url"]:
    print(f"  {x}")

print(f"\n[10] FILES WITH console.error/warn: {len(set(x.split(':')[0] for x in results['console_errors']))}")

print("\n" + "=" * 60)
print("SUMMARY:")
print(f"  next/link misuse: {len(results['next_link_misuse'])}")
print(f"  next/navigation misuse: {len(results['next_navigation_misuse'])}")
print(f"  Missing components: {len(results['missing_components'])}")
print(f"  Missing env vars: {len(missing_env)}")
print(f"  TODO/FIXME: {len(results['todo_fixme'])}")
print(f"  Hardcoded text: {len(results['hardcoded_text'])}")
print(f"  Wrong Supabase URL: {len(results['hardcoded_supabase_url'])}")
print("=" * 60)
