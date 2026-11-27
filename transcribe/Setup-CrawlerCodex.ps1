# Crawler Codex - one-click setup + transcription for Windows.
# Lives in "<your DCC folder>\Crawler Codex\". Started by Run-Transcriber.bat.
# Installs Python + FFmpeg (via winget) if missing, installs faster-whisper with
# NVIDIA GPU libraries, then transcribes every .m4b in the parent folder.
# Safe to run again: installed pieces are skipped and finished chapters are kept.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$books = Split-Path -Parent $here
$out = Join-Path $here 'transcripts'
Set-Location $here

function Say($msg, $color = 'Cyan') { Write-Host ""; Write-Host "== $msg" -ForegroundColor $color }

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $links = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links'
    $env:Path = "$machine;$user;$links"
}

function Find-Python {
    $candidates = @()
    if (Get-Command py -ErrorAction SilentlyContinue) { $candidates += ,@('py', '-3') }
    foreach ($v in '313', '312', '311', '310') {
        $p = Join-Path $env:LOCALAPPDATA "Programs\Python\Python$v\python.exe"
        if (Test-Path $p) { $candidates += ,@($p) }
    }
    foreach ($c in $candidates) {
        try {
            $exe = $c[0]; $pre = @($c | Select-Object -Skip 1)
            $ver = & $exe @pre -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>$null
            if ($LASTEXITCODE -eq 0 -and $ver) {
                $parts = $ver.Trim().Split('.')
                if ([int]$parts[0] -eq 3 -and [int]$parts[1] -ge 10) { return ,$c }
            }
        } catch {}
    }
    return $null
}

try {
    Write-Host "Crawler Codex transcriber setup" -ForegroundColor Yellow
    Write-Host "Books folder: $books"

    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        $gpu = (nvidia-smi --query-gpu=name,memory.total --format=csv,noheader) -join ', '
        Say "GPU: $gpu" 'Green'
    } else {
        Say "No NVIDIA GPU tool found (nvidia-smi). Transcription may fall back to CPU and be very slow." 'Yellow'
    }

    Refresh-Path
    $py = Find-Python
    if (-not $py) {
        Say "Installing Python 3.12 (click Yes if Windows asks)"
        winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
        Refresh-Path
        $py = Find-Python
        if (-not $py) { throw "Python installed but couldn't be found. Close this window and run Run-Transcriber.bat again." }
    }
    $pyExe = $py[0]; $pyPre = @($py | Select-Object -Skip 1)
    Say ("Python: " + (& $pyExe @pyPre --version)) 'Green'

    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
        Say "Installing FFmpeg (click Yes if Windows asks)"
        winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
        Refresh-Path
        if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw "FFmpeg installed but couldn't be found. Close this window and run Run-Transcriber.bat again." }
    }
    Say "FFmpeg: OK" 'Green'

    Say "Installing speech model packages (a few minutes the first time)"
    & $pyExe @pyPre -m pip install --upgrade --quiet pip
    & $pyExe @pyPre -m pip install --quiet faster-whisper nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"
    if ($LASTEXITCODE -ne 0) { throw "pip install failed (see messages above)." }

    Say "Starting transcription of all books. First run downloads the model (~1.5 GB)."
    Write-Host "You can close this window any time; run Run-Transcriber.bat again to pick up where it stopped."
    $env:PYTHONUNBUFFERED = '1'
    $ErrorActionPreference = 'Continue'   # model download progress goes to stderr; don't treat it as failure
    & $pyExe @pyPre (Join-Path $here 'codex_transcribe.py') transcribe $books --out $out
    if ($LASTEXITCODE -ne 0) { throw "The transcriber stopped with an error (see messages above)." }
    Say "Finished. Transcripts are in: $out" 'Green'
}
catch {
    Say ("Something went wrong: " + $_.Exception.Message) 'Red'
    Write-Host "Copy this window's text to Claude."
}
Write-Host ""
Read-Host "Press Enter to close"
