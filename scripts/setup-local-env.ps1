param(
  [string]$SecretsPath = ".local-secrets.txt"
)

$ErrorActionPreference = "Stop"

function Read-LocalSecrets {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing $Path. Copy .local-secrets.example to $Path and fill it locally."
  }

  $secrets = @{}
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) { return }
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($key) { $secrets[$key] = $value }
  }

  return $secrets
}

function Require-Key {
  param(
    [hashtable]$Secrets,
    [string]$Key
  )

  if (-not $Secrets.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Secrets[$Key])) {
    throw "Missing required key: $Key"
  }
}

$secrets = Read-LocalSecrets -Path $SecretsPath

$requiredKeys = @(
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
)

foreach ($key in $requiredKeys) {
  Require-Key -Secrets $secrets -Key $key
}

if (-not $secrets.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -or [string]::IsNullOrWhiteSpace($secrets["NEXT_PUBLIC_SUPABASE_URL"])) {
  $secrets["NEXT_PUBLIC_SUPABASE_URL"] = $secrets["SUPABASE_URL"]
}

New-Item -ItemType Directory -Force -Path "apps/web" | Out-Null
New-Item -ItemType Directory -Force -Path "scraper" | Out-Null

$webEnv = @(
  "NEXT_PUBLIC_SUPABASE_URL=$($secrets["NEXT_PUBLIC_SUPABASE_URL"])",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($secrets["NEXT_PUBLIC_SUPABASE_ANON_KEY"])"
)

$scraperEnv = @(
  "SUPABASE_URL=$($secrets["SUPABASE_URL"])",
  "SUPABASE_SERVICE_ROLE_KEY=$($secrets["SUPABASE_SERVICE_ROLE_KEY"])",
  "TELEGRAM_BOT_TOKEN=$($secrets["TELEGRAM_BOT_TOKEN"])",
  "TELEGRAM_MAINTAINER_CHAT_ID=$($secrets["TELEGRAM_MAINTAINER_CHAT_ID"])"
)

Set-Content -LiteralPath "apps/web/.env.local" -Value $webEnv -Encoding utf8
Set-Content -LiteralPath "scraper/.env" -Value $scraperEnv -Encoding utf8

Write-Host "Local env files created:"
Write-Host "- apps/web/.env.local"
Write-Host "- scraper/.env"
Write-Host "Secret values were not printed."

