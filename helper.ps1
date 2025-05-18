#!/usr/bin/env pwsh

param(
    [string]$command,
    [string]$path,
    [switch]$force,
    [switch]$build
)

$ErrorActionPreference = "Stop"

$branch = git rev-parse --abbrev-ref HEAD
$time = $(Get-Date -Format 'hh:mmtt - dd/MM/yy')
$pkg = Get-Content -Raw package.json | ConvertFrom-Json

$repo = "benzaria/Not-Electron-Builder"
$api = "https://api.github.com/repos/$repo/releases/latest"

if ($force) { $_force = "--force" }

function git-push($msg, $force = $null) {

    git config user.name "Not-Electron[bot]"
    git config user.email "Not-Electron[bot]@users.noreply.github.com"
    
}

if ($IsWindows) { $os = 'Windows' }
elseif ($IsMacOS) { $os = 'MacOS' }
elseif ($IsLinux) { $os = 'Linux' }
else { $os = $env:os ? $env:os : 'Unknown' }

$env:new = "v$($pkg.version)"
$env:old = $res.tag_name

switch ($command) {

    deploy {
        if ($build) { 
            pnpm dist
        }
    }

    prod-test {}
    
    dev-push {}

    prod-push {
        try {
            $res = Invoke-RestMethod -Uri $api -Headers @{
                "User-Agent"  = "benzaria"
            }
            Write-Host "Latest release found: $($res.tag_name)"
        } catch {
            if ($_.Exception.Response.StatusCode.Value__ -eq 404) {
                Write-Warning "No latest release found for $repo"
                $res = @{ tag_name = "0.0.0" }
            } else {
                throw
            }
        }
    }

    publish {}

    backup {}

    clean {
        if ($env:GITHUB_CI) { break }
        Remove-Item -Path "$path" -ErrorAction SilentlyContinue 
    }

    unzip {
        Expand-Archive -Path "$path" -DestinationPath "artifact/unziped/$((Get-Item "$path").Name)"
    }

    default { . $command }
}
