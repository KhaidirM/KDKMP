param([int]$Port = 8014)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = $repoRoot
$distDir = Join-Path $repoRoot 'dist'
$assetSource = Join-Path $repoRoot 'assets'
$assetTarget = Join-Path $distDir 'assets'

Set-Location $repoRoot
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
New-Item -ItemType Directory -Path $assetTarget -Force | Out-Null

$appFiles = @('index.html','app.js','auth.js','app.css','pages.css','auth.css','supabase-config.js')
foreach ($name in $appFiles) {
  $source = Join-Path $sourceDir $name
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "File aplikasi tidak ditemukan: $source"
  }
  Copy-Item -LiteralPath $source -Destination $distDir -Force
}
Get-ChildItem -LiteralPath $assetSource -Force | Copy-Item -Destination $assetTarget -Recurse -Force

$listener = $null
$selectedPort = $Port
while ($selectedPort -lt ($Port + 100)) {
  try {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $selectedPort)
    $candidate.Start()
    $listener = $candidate
    break
  } catch [System.Net.Sockets.SocketException] {
    $selectedPort++
  }
}
if ($null -eq $listener) {
  throw "Tidak menemukan port lokal yang tersedia mulai dari $Port."
}

$basePath = [System.IO.Path]::GetFullPath($distDir)
$basePrefix = $basePath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$mimeTypes = @{
  '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
  '.webp'='image/webp'; '.avif'='image/avif'; '.woff2'='font/woff2'
}

$url = "http://127.0.0.1:$selectedPort/"
Write-Host "KDKMP LIVE Supabase berjalan di $url" -ForegroundColor Green
Write-Host 'Buka alamat tersebut di browser. Simpanan akan dikirim ke Supabase.' -ForegroundColor Yellow
Write-Host 'Biarkan jendela ini tetap terbuka. Tekan Ctrl+C untuk berhenti.' -ForegroundColor Yellow

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 5000
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($null -ne ($headerLine = $reader.ReadLine()) -and $headerLine.Length -gt 0) { }

      $status = '200 OK'
      $body = [byte[]]@()
      $contentType = 'text/plain; charset=utf-8'
      $method = 'GET'
      if ($requestLine) {
        $parts = $requestLine.Split(' ')
        if ($parts.Length -ge 2) {
          $method = $parts[0].ToUpperInvariant()
          $uri = [System.Uri]::new([System.Uri]::new('http://127.0.0.1/'), $parts[1])
          $relative = [System.Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))
          if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
          $filePath = [System.IO.Path]::GetFullPath((Join-Path $basePath $relative))

          if (-not $filePath.StartsWith($basePrefix, [System.StringComparison]::OrdinalIgnoreCase) -and $filePath -ne (Join-Path $basePath 'index.html')) {
            $status = '403 Forbidden'
          } elseif ($method -notin @('GET','HEAD')) {
            $status = '405 Method Not Allowed'
          } elseif (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            $status = '404 Not Found'
          } else {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
            if ($mimeTypes.ContainsKey($extension)) { $contentType = $mimeTypes[$extension] }
            if ($method -eq 'GET') { $body = [System.IO.File]::ReadAllBytes($filePath) }
          }
        } else {
          $status = '400 Bad Request'
        }
      } else {
        $status = '400 Bad Request'
      }

      $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($method -eq 'GET' -and $body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
      $stream.Flush()
      $reader.Dispose()
      $stream.Dispose()
    } catch {
      Write-Host "Permintaan browser gagal: $($_.Exception.Message)" -ForegroundColor DarkYellow
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
