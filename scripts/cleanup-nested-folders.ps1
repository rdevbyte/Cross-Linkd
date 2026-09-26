<#
.SYNOPSIS
    CrossLinkd — safe cleanup of stale generated artifacts after a code refresh.

.DESCRIPTION
    Finds and (optionally) deletes items that are safe to remove after pasting
    the refreshed codebase into your project folder:

      1. Nested duplicate copies of the project (e.g.  <root>\Cross-Linkd)
         — the old "checked out inside itself" copies.
      2. The generated local Postgres cluster   <root>\data\db
      3. (only with -IncludeNodeModules)        <root>\node_modules

    The script NEVER touches: source code, git history, .env files, your
    production database, or anything it does not positively recognise.
    Anything that merely *looks* like a project copy is FLAGGED for manual
    review instead of being deleted.

    By default this is a DRY RUN: it only prints what it would delete.
    Pass -Execute to actually delete.

.PARAMETER Execute
    Actually delete the recognised stale items (default: dry run).

.PARAMETER IncludeNodeModules
    Also remove <root>\node_modules (safe — `npm install` regenerates it).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\cleanup-nested-folders.ps1
    Dry run: prints the plan, deletes nothing.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\cleanup-nested-folders.ps1 -Execute
    Deletes the recognised stale items.
#>
[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$IncludeNodeModules
)

$ErrorActionPreference = 'Stop'

# --------------------------------------------------------------------------
# Step 1 — locate the project root (the folder that contains package.json).
# We start at this script's folder and walk up until we find it.
# --------------------------------------------------------------------------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = $scriptDir
while ($root -and -not (Test-Path (Join-Path $root 'package.json'))) {
    $parent = Split-Path -Parent $root
    if ($parent -eq $root) { break }
    $root = $parent
}
if (-not $root -or -not (Test-Path (Join-Path $root 'package.json'))) {
    Write-Host 'ERROR: could not find the project root (folder with package.json).' -ForegroundColor Red
    exit 1
}
Write-Host "Project root: $root" -ForegroundColor Cyan
Write-Host ''

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
function Get-FolderSizeMB([string]$path) {
    try {
        $bytes = (Get-ChildItem -LiteralPath $path -Recurse -File -ErrorAction SilentlyContinue |
                  Measure-Object -Property Length -Sum).Sum
        if ($null -eq $bytes) { return 0.0 }
        return [math]::Round($bytes / 1MB, 1)
    } catch { return 0.0 }
}

# Collects: [pscustomobject]@{ Path, Reason, Safe (bool) }
$plan = @()
$flags = @()

# --------------------------------------------------------------------------
# Step 2 — recognise stale items (only fixed, well-known patterns).
# --------------------------------------------------------------------------

# 2a. Nested duplicate copies of the project inside the root.
foreach ($name in @('Cross-Linkd', 'crosslinkd', 'cross-linkd')) {
    $p = Join-Path $root $name
    if (Test-Path $p -PathType Container) {
        if (Test-Path (Join-Path $p 'package.json')) {
            # A full nested copy (package.json inside) — the old inner checkout.
            $plan += [pscustomobject]@{ Path = $p; Reason = 'Nested duplicate project copy (contains its own package.json)' }
        } else {
            # A folder with the project name but no package.json — ambiguous.
            $flags += [pscustomobject]@{ Path = $p; Note = 'Folder named like the project but WITHOUT package.json — not removed, review manually.' }
        }
    }
}

# 2b. Same duplicates one level ABOVE the root (if the root itself was the
#     inner copy, the old outer shell may sit next to it).
$parentOfRoot = Split-Path -Parent $root
foreach ($name in @('Cross-Linkd', 'crosslinkd', 'cross-linkd')) {
    $p = Join-Path $parentOfRoot $name
    if ((Test-Path $p -PathType Container) -and ((Resolve-Path $p).Path -ne (Resolve-Path $root).Path)) {
        if (Test-Path (Join-Path $p 'package.json')) {
            # Only claim it when our root is nested *inside* it (true outer shell).
            if ((Resolve-Path $root).Path.StartsWith((Resolve-Path $p).Path + [IO.Path]::DirectorySeparatorChar)) {
                $flags += [pscustomobject]@{ Path = $p; Note = 'Outer shell that contains this project — remove it only if you moved the project up one level.' }
            } else {
                $flags += [pscustomobject]@{ Path = $p; Note = 'Sibling folder with its own package.json — a separate checkout? Review manually.' }
            }
        }
    }
}

# 2c. Generated local Postgres cluster (data\db under the root).
$pgDir = Join-Path $root 'data\db'
if (Test-Path $pgDir -PathType Container) {
    $plan += [pscustomobject]@{ Path = $pgDir; Reason = 'Generated local Postgres cluster (regenerates via: node scripts/start-pg.mjs + npm run db:reset)' }
}

# 2d. node_modules (opt-in).
if ($IncludeNodeModules) {
    $nm = Join-Path $root 'node_modules'
    if (Test-Path $nm -PathType Container) {
        $plan += [pscustomobject]@{ Path = $nm; Reason = 'node_modules (regenerates via: npm install)' }
    }
}

# --------------------------------------------------------------------------
# Step 3 — report.
# --------------------------------------------------------------------------
Write-Host '================ STALE ITEMS RECOGNISED ================' -ForegroundColor Yellow
if ($plan.Count -eq 0) {
    Write-Host '  (none found — nothing to clean up)' -ForegroundColor Green
}
foreach ($item in $plan) {
    $mb = Get-FolderSizeMB $item.Path
    Write-Host ('  {0,10} MB   {1}' -f $mb, $item.Path) -ForegroundColor White
    Write-Host ('              {0}' -f $item.Reason) -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '================ FLAGGED FOR MANUAL REVIEW ==============' -ForegroundColor Magenta
if ($flags.Count -eq 0) {
    Write-Host '  (nothing ambiguous)' -ForegroundColor Green
}
foreach ($f in $flags) {
    Write-Host ('  {0}' -f $f.Path) -ForegroundColor White
    Write-Host ('      {0}' -f $f.Note) -ForegroundColor DarkGray
}

# --------------------------------------------------------------------------
# Step 4 — delete (only with -Execute), with per-path safety checks.
# --------------------------------------------------------------------------
if (-not $Execute) {
    Write-Host ''
    Write-Host 'DRY RUN — nothing was deleted. Re-run with -Execute to delete the items above.' -ForegroundColor Cyan
    exit 0
}

Write-Host ''
Write-Host '================ DELETING (Execute mode) ================' -ForegroundColor Red
$deleted = 0
foreach ($item in $plan) {
    # Safety 1: the target must be strictly INSIDE the project root.
    $full = (Resolve-Path $item.Path).Path
    $rootFull = (Resolve-Path $root).Path
    if (-not $full.StartsWith($rootFull + [IO.Path]::DirectorySeparatorChar)) {
        Write-Host "  SKIPPED (outside project root): $full" -ForegroundColor Yellow
        continue
    }
    # Safety 2: never delete a path that contains our own package.json.
    if (Test-Path (Join-Path $full 'package.json')) {
        Write-Host "  SKIPPED (contains a package.json — not recognised as generated): $full" -ForegroundColor Yellow
        continue
    }
    Write-Host "  Removing $full ..." -ForegroundColor White
    Remove-Item -LiteralPath $full -Recurse -Force
    $deleted++
}
Write-Host ''
Write-Host "Done. Removed $deleted item(s)." -ForegroundColor Green
Write-Host 'Next steps: npm install  →  node scripts/start-pg.mjs  →  npm run db:reset  →  npm run dev' -ForegroundColor Cyan
