param (
    [string]$ZipFile = "cpanel-deploy.zip"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$absZip = (Resolve-Path $ZipFile).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($absZip)

Write-Host "Total entries in $($ZipFile): $($archive.Entries.Count)"

$sampleTargets = @('.htaccess', 'data/.htaccess', 'index.html', 'service.html', 'api/contact.php', 'api/admin.php', 'admin/login.html', 'admin/enquiry.html', 'data/enquiries.json')

foreach ($target in $sampleTargets) {
    $entry = $archive.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq $target }
    if ($entry) {
        Write-Host "  [OK] $target (Length: $($entry.Length) bytes)"
    } else {
        Write-Host "  [FAIL] Missing: $target"
    }
}

$archive.Dispose()
