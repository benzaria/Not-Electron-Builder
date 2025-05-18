#!/usr/bin/env pwsh

param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [ValidateSet("SHA256", "SHA1", "MD5")]
    [string]$Algorithm = "SHA256"
)

function Get-FileHashValue {
    param (
        [string]$FilePath,
        [string]$Algorithm
    )

    if (Test-Path $FilePath -PathType Leaf) {
        $hash = Get-FileHash -Path $FilePath -Algorithm $Algorithm
        return "$($hash.Hash) $(($FilePath -split "out[\\/]", 2)[1])"
    } else {
        return "❌ File not found: $FilePath"
    }
}

function Get-DirectoryHash {
    param (
        [string]$DirectoryPath,
        [string]$Algorithm
    )

    if (!(Test-Path $DirectoryPath -PathType Container)) {
        return "❌ Directory not found: $DirectoryPath"
    }

    $allFiles = Get-ChildItem -Path $DirectoryPath -Recurse -File | Sort-Object FullName
    foreach ($file in $allFiles) {
        Get-FileHashValue -FilePath $file.FullName -Algorithm $Algorithm
    }
}

if (Test-Path $Path -PathType Leaf) {
    Get-FileHashValue -FilePath $Path -Algorithm $Algorithm
} elseif (Test-Path $Path -PathType Container) {
    Get-DirectoryHash -DirectoryPath $Path -Algorithm $Algorithm
} else {
    Write-Host "❌ Path does not exist: $Path"
}
