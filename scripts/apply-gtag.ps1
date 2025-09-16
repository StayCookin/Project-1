$src = 'c:\Users\unipo\Documents\Project-1\frontend'
$backup = Join-Path $src ('backup-gtag-' + (Get-Date -Format yyyyMMddHHmmss))
New-Item -ItemType Directory -Path $backup -Force | Out-Null

$gtag = @'
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-JY9E760ZQ0"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);} 
  gtag('js', new Date());

  gtag('config', 'G-JY9E760ZQ0');
</script>
'@

Get-ChildItem -Path $src -Filter *.html -Recurse | ForEach-Object {
    $file = $_.FullName
    try {
        Copy-Item -Path $file -Destination $backup -Force
        $content = Get-Content -Raw -Path $file -ErrorAction Stop
        if ($content -match 'googletagmanager.com/gtag/js') {
            # Remove existing Google tag block (from <!-- Google tag ... </script>)
            $content = [regex]::Replace($content, '<!-- Google tag[\s\S]*?</script>\s*', '', 'IgnoreCase')
        }
        if ($content -match '(?i)<head[^>]*>') {
            $content = [regex]::Replace($content, '(?i)(<head[^>]*>)', "`$1`n$gtag", 'IgnoreCase')
        } else {
            # If no head tag found, prepend the snippet
            $content = $gtag + "`n" + $content
        }
        Set-Content -Path $file -Value $content -Force
        Write-Output "Updated: $file"
    } catch {
        Write-Error "Failed to update $file : $_"
    }
}
Write-Output 'DONE'
