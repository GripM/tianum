param (
    [Parameter(Mandatory=$true)][string]$SourceDir,
    [Parameter(Mandatory=$true)][string]$ZipFile
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$absSource = (Resolve-Path $SourceDir).Path
$absDest = [System.IO.Path]::GetFullPath($ZipFile)

if (Test-Path $absDest) {
    Remove-Item $absDest -Force
}

Write-Host "Creating archive: $absDest from $absSource ..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($absSource, $absDest, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Host "Archive created successfully."
