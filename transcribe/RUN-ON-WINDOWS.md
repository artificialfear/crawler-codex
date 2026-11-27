# Transcribing the DCC audiobooks (Windows PC)

Transcripts stay on your PC. **Never put them in this GitHub repo** (it's public).

## Step 1: one-time install (about 5 min)
Open **PowerShell** and run:

```powershell
winget install -e --id Python.Python.3.12
winget install -e --id Gyan.FFmpeg
```

Close PowerShell and open a new one (so it sees Python and ffmpeg), then:

```powershell
mkdir C:\CrawlerCodex; cd C:\CrawlerCodex
Invoke-WebRequest https://raw.githubusercontent.com/artificialfear/crawler-codex/main/transcribe/codex_transcribe.py -OutFile codex_transcribe.py
```

## Step 2: check the chapter markers (seconds)
In File Explorer, find the folder with the .m4b files, hold **Shift**, right-click it, and choose **Copy as path**. Then:

```powershell
cd C:\CrawlerCodex
python codex_transcribe.py chapters "PASTE-THE-PATH-HERE"
```

It prints each book's markers and saves `C:\CrawlerCodex\chapters_report.txt`. Send that file to Claude.

## Step 3: transcribe (after Claude has looked at the report)
```powershell
cd C:\CrawlerCodex
python -m pip install faster-whisper nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"
python codex_transcribe.py transcribe "PASTE-THE-PATH-HERE" --books 1-8
```

- The first run downloads the speech model (about 1.5 GB).
- The first line should say **on CUDA**. If it says CPU, stop it (Ctrl+C) and tell Claude.
- You can stop it any time with Ctrl+C. Running the same command again skips the chapters that are already finished.
- Output: `C:\CrawlerCodex\transcripts\Book01\m001.txt` … plus a `manifest.json` per book.
- Leave the PC awake (Settings → System → Power → Screen and sleep → Never while plugged in).
