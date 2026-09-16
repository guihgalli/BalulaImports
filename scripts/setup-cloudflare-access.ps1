# Cria aplicacoes Cloudflare Access para /admin e /api/admin
# Requer API Token com: Account > Zero Trust > Edit
#
# Uso:
#   $env:CLOUDFLARE_API_TOKEN = "seu-token"
#   .\scripts\setup-cloudflare-access.ps1
#   .\scripts\setup-cloudflare-access.ps1 -AdminEmail "seu@email.com"

param(
  [string]$AccountId = "e952397a6876f6326b0457d5b1ec6471",
  [string]$Hostname = "balula.importsv1.workers.dev",
  [string]$AdminEmail = "guilherme.galli@live.com"
)

if (-not $env:CLOUDFLARE_API_TOKEN) {
  Write-Error "Defina CLOUDFLARE_API_TOKEN com permissao Zero Trust Edit."
  exit 1
}

$headers = @{
  Authorization = "Bearer $env:CLOUDFLARE_API_TOKEN"
  "Content-Type" = "application/json"
}

function New-AccessApp {
  param(
    [string]$Name,
    [string]$Path
  )

  $body = @{
    name = $Name
    type = "self_hosted"
    domain = $Hostname
    self_hosted_domains = @($Hostname)
    path = $Path
    session_duration = "24h"
    app_launcher_visible = $false
    policies = @(
      @{
        decision = "allow"
        name = "Allow admin"
        include = @(
          @{
            email = @{
              email = $AdminEmail
            }
          }
        )
      }
    )
  } | ConvertTo-Json -Depth 8

  $uri = "https://api.cloudflare.com/client/v4/accounts/$AccountId/access/apps"
  $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body

  if (-not $response.success) {
    throw ($response.errors | ConvertTo-Json -Depth 6)
  }

  return $response.result
}

Write-Host "Criando Access para $Hostname ..."
Write-Host "E-mail autorizado: $AdminEmail"
Write-Host ""

$apps = @(
  @{ Name = "Balula Admin UI"; Path = "/admin*" },
  @{ Name = "Balula Admin API"; Path = "/api/admin*" }
)

foreach ($app in $apps) {
  try {
    $created = New-AccessApp -Name $app.Name -Path $app.Path
    Write-Host "[OK] $($app.Name) -> $($app.Path) (id: $($created.id))"
  } catch {
    Write-Warning "[ERRO] $($app.Name): $_"
  }
}

Write-Host ""
Write-Host "Teste: https://$Hostname/admin"
