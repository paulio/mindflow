[CmdletBinding()]
param(
    [string]$ConfigPath = "deploy.staticwebapp.secret.json",
    [string]$Name,
    [string]$ResourceGroup,
    [string]$Subscription,
    [string]$DeploymentToken,
    [string]$Source,
    [string]$Branch,
    [string]$Sku,
    [string]$Tags,
    [switch]$NoWait,
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ConfigValue {
    param(
        [psobject]$Config,
        [string]$Property
    )

    if ($null -eq $Config) { return $null }
    $prop = $Config.PSObject.Properties[$Property]
    if ($null -eq $prop) { return $null }
    return $prop.Value
}

function Resolve-TextValue {
    param(
        [object]$Value
    )

    if ($null -eq $Value) { return $null }
    if ($Value -is [string]) { return $Value }
    if ($Value -is [System.Collections.IEnumerable]) {
        $parts = @()
        foreach ($item in $Value) {
            if ($null -ne $item) {
                $parts += [string]$item
            }
        }
        if ($parts.Count -gt 0) {
            return ($parts -join ' ')
        }
        return $null
    }
    return [string]$Value
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..') | Select-Object -ExpandProperty Path

Push-Location $repoRoot
try {
    $config = $null
    if (Test-Path $ConfigPath) {
        Write-Host ("[info] Using configuration from {0}" -f $ConfigPath)
        $config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
    } else {
        Write-Host ("[info] Config file not found at {0}. Supply parameters to override." -f $ConfigPath)
    }

    $resolvedName = if ($Name) { $Name } else { Get-ConfigValue -Config $config -Property 'name' }
    $resolvedResourceGroup = if ($ResourceGroup) { $ResourceGroup } else { Get-ConfigValue -Config $config -Property 'resourceGroup' }
    $resolvedSubscription = if ($Subscription) { $Subscription } else { Get-ConfigValue -Config $config -Property 'subscription' }
    $resolvedToken = if ($DeploymentToken) { $DeploymentToken } else { Resolve-TextValue (Get-ConfigValue -Config $config -Property 'deploymentToken') }
    if (-not $resolvedToken) {
        $resolvedToken = Resolve-TextValue (Get-ConfigValue -Config $config -Property 'token')
    }

    $resolvedSource = if ($Source) { $Source } else { Resolve-TextValue (Get-ConfigValue -Config $config -Property 'source') }
    $resolvedBranch = if ($Branch) { $Branch } else { Resolve-TextValue (Get-ConfigValue -Config $config -Property 'branch') }
    $resolvedSku = if ($Sku) { $Sku } else { Resolve-TextValue (Get-ConfigValue -Config $config -Property 'sku') }
    $resolvedTags = if ($Tags) { $Tags } else { Resolve-TextValue (Get-ConfigValue -Config $config -Property 'tags') }

    if (-not $resolvedName -or -not $resolvedResourceGroup) {
        throw 'Static Web App name and resource group are required. Provide them via config or parameters.'
    }

    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI (az) not found on PATH. Install it from https://aka.ms/install-azure-cli.'
    }

    if (-not $SkipBuild.IsPresent) {
        Write-Host '[info] npm run build skipped by default when using az staticwebapp update (no build artifact upload).' -ForegroundColor Yellow
    }

    $updateArgs = @('staticwebapp','update','--name',$resolvedName,'--resource-group',$resolvedResourceGroup)

    if ($resolvedSubscription) {
        $updateArgs += @('--subscription',$resolvedSubscription)
    }

    if ($resolvedSource) {
        $updateArgs += @('--source',$resolvedSource)
    }

    if ($resolvedBranch) {
        $updateArgs += @('--branch',$resolvedBranch)
    }

    if ($resolvedToken) {
        $updateArgs += @('--token',$resolvedToken)
    }

    if ($resolvedSku) {
        $updateArgs += @('--sku',$resolvedSku)
    }

    if ($resolvedTags) {
        $updateArgs += @('--tags',$resolvedTags)
    }

    if ($NoWait.IsPresent) {
        $updateArgs += '--no-wait'
    }

    $logArgs = @()
    for ($i = 0; $i -lt $updateArgs.Length; $i++) {
        if ($resolvedToken -and $updateArgs[$i] -eq '--token' -and $i + 1 -lt $updateArgs.Length) {
            $logArgs += '--token'
            $logArgs += '***'
            $i++
        } else {
            $logArgs += $updateArgs[$i]
        }
    }

    Write-Host ("[step] Running: az {0}" -f ($logArgs -join ' ')) -ForegroundColor Cyan
    & az @updateArgs
    if ($LASTEXITCODE -ne 0) {
        throw ("Azure CLI update failed with exit code {0}" -f $LASTEXITCODE)
    }

    Write-Host '[done] Static Web App update complete (source control configuration refreshed).' -ForegroundColor Green
}
finally {
    Pop-Location
}
