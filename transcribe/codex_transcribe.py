"""
Crawler Codex - audiobook transcriber (phase 2)

Runs on Mat's Windows PC (NVIDIA GPU). Two steps:

  1) python codex_transcribe.py chapters "D:\\path\\to\\DCC"
       Reads the chapter markers inside each .m4b and writes chapters_report.txt
       (no transcription, takes seconds). Tells us whether the markers match
       the book's real chapter numbers.

  2) python codex_transcribe.py transcribe "D:\\path\\to\\DCC" --books 1-5
       Transcribes chapter by chapter into .\\transcripts\\Book05\\ch023.txt etc.
       Safe to stop and restart: finished chapters are skipped.

Transcripts stay on this PC (or a private Drive folder). Never commit them to GitHub.
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import wave

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

BOOK_TITLES = {
    1: "dungeon crawler carl",
    2: "carls doomsday scenario",
    3: "the dungeon anarchists cookbook",
    4: "the gate of the feral gods",
    5: "the butchers masquerade",
    6: "the eye of the bedlam bride",
    7: "this inevitable ruin",
    8: "a parade of horribles",
}

# Helps Whisper spell made-up names correctly.
NAME_PROMPT = (
    "Dungeon Crawler Carl. Carl, Princess Donut, Mordecai, Katia Grim, Mongo, Bautista, "
    "Zev, Odette, Hekla, Lucia Mar, Imani, Elle McGibbons, Brandon, Agatha, Borant, "
    "Skull Empire, The Maestro, Prince Stalwart, Signet, Grimaldi, Juice Box, Loita, "
    "Gwendolyn Duet, Louis, Firas, Kane, Orren, crawler, saferoom, loot box."
)

WORDNUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90,
}


def words_to_int(text):
    """'twenty-three' -> 23, 'one hundred and four' -> 104, '23' -> 23. None if not a number."""
    text = text.lower().replace("-", " ").replace(" and ", " ").strip()
    if re.fullmatch(r"\d{1,3}", text):
        return int(text)
    total, cur, seen = 0, 0, False
    for w in text.split():
        if w in WORDNUM:
            cur += WORDNUM[w]
            seen = True
        elif w == "hundred" and seen:
            cur = (cur or 1) * 100
        else:
            break
    total += cur
    return total if seen else None


def spoken_chapter(text):
    """Find 'Chapter twenty-three' near the start of a chapter's transcript."""
    m = re.search(r"\bchapter\s+((?:\d{1,3})|(?:[a-z]+(?:[\s-]+(?:and\s+)?[a-z]+){0,3}))", text[:300], re.I)
    if not m:
        return None
    return words_to_int(m.group(1))


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", "", s.lower().replace("_", " ")).strip()


def guess_book(path):
    name = norm(os.path.splitext(os.path.basename(path))[0])
    # 1) unique titles of books 2-8 (Book 1's title is also the series name, so it goes last)
    for num in range(2, 9):
        if BOOK_TITLES[num].replace("the ", "") in name:
            return num
    # 2) an explicit number: "Book 5", "Bk 5", "#5", "Vol 5", "DCC 05", or "Dungeon Crawler Carl 5"
    m = (re.search(r"(?:book|bk|vol|volume)\s*0*(\d{1,2})\b", name)
         or re.search(r"(?:dcc|carl)\s*0*(\d{1,2})\b", name)
         or re.match(r"0*(\d{1,2})\b", name))
    if m and 1 <= int(m.group(1)) <= 8:
        return int(m.group(1))
    # 3) Book 1 by title
    if "dungeon crawler carl" in name:
        return 1
    return None


def find_books(folder):
    files = sorted(glob.glob(os.path.join(folder, "**", "*.m4b"), recursive=True))
    books = {}
    for f in files:
        n = guess_book(f)
        if n and n not in books:
            books[n] = f
        elif n is None:
            print(f"  ? could not tell which book this is: {os.path.basename(f)}")
    return books


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_chapters", "-show_format", path],
        capture_output=True, text=True, encoding="utf-8", errors="replace", check=True,
    ).stdout
    data = json.loads(out)
    chapters = []
    for i, c in enumerate(data.get("chapters", [])):
        chapters.append({
            "index": i + 1,
            "start": float(c["start_time"]),
            "end": float(c["end_time"]),
            "title": (c.get("tags") or {}).get("title", ""),
        })
    duration = float(data.get("format", {}).get("duration", 0) or 0)
    return chapters, duration


def hms(s):
    s = int(s)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


def parse_books(spec):
    if not spec:
        return None
    out = set()
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(part))
    return out


# ---------------------------------------------------------------- chapters report

def cmd_chapters(args):
    books = find_books(args.folder)
    if not books:
        sys.exit(f"No .m4b files found under {args.folder}")
    lines = []
    for n in sorted(books):
        chapters, duration = probe(books[n])
        numbered = [c for c in chapters if re.search(r"chapter\s*\d+|^\s*\d+\s*$", c["title"], re.I)]
        lines.append(f"=== Book {n}: {os.path.basename(books[n])}")
        lines.append(f"    length {hms(duration)}, {len(chapters)} chapter markers, {len(numbered)} look numbered")
        show = chapters if len(chapters) <= 14 else chapters[:8] + [None] + chapters[-4:]
        for c in show:
            if c is None:
                lines.append("    ...")
            else:
                lines.append(f"    #{c['index']:>3}  {hms(c['start'])}  {hms(c['end'] - c['start']):>8}  {c['title']!r}")
        lines.append("")
    report = "\n".join(lines)
    print(report)
    with open("chapters_report.txt", "w", encoding="utf-8") as fh:
        fh.write(report)
    print("Saved chapters_report.txt (send it to Claude).")


# ---------------------------------------------------------------- transcription

def add_cuda_dlls():
    """On Windows, the pip-installed NVIDIA libraries live in site-packages/nvidia/*/bin."""
    if os.name != "nt":
        return
    for base in sys.path:
        for d in glob.glob(os.path.join(base, "nvidia", "*", "bin")):
            try:
                os.add_dll_directory(d)
            except OSError:
                pass
            os.environ["PATH"] = d + os.pathsep + os.environ.get("PATH", "")


def load_model(name):
    add_cuda_dlls()
    from faster_whisper import WhisperModel  # imported late so `chapters` works without it
    tries = [(name, "cuda", "float16")]
    if name == "large-v3-turbo":
        tries.append(("large-v3", "cuda", "float16"))
    tries.append(("medium.en", "cpu", "int8"))
    last = None
    for model, device, ctype in tries:
        try:
            m = WhisperModel(model, device=device, compute_type=ctype)
            print(f"Model: {model} on {device.upper()} ({ctype})")
            if device == "cpu":
                print("  WARNING: running on CPU - this will be very slow. The GPU libraries didn't load.")
            return m
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"  couldn't load {model} on {device}: {str(e).splitlines()[0][:160]}")
    sys.exit(f"No model could be loaded: {last}")


def extract(path, start, end, wav):
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", path,
         "-vn", "-ac", "1", "-ar", "16000", wav],
        check=True,
    )


def load_wav(path):
    """Read the 16 kHz mono WAV ffmpeg made, as float32 samples.
    Passing samples (not a path) skips faster-whisper's PyAV decoder, whose API
    breaks between PyAV versions."""
    import numpy as np
    with wave.open(path, "rb") as w:
        assert w.getframerate() == 16000 and w.getnchannels() == 1 and w.getsampwidth() == 2
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def keep_awake(on=True):
    """Windows: stop the PC from sleeping while we work (screen may still turn off).
    Released automatically when the process exits."""
    if os.name != "nt":
        return
    import ctypes
    ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
    flags = ES_CONTINUOUS | (ES_SYSTEM_REQUIRED if on else 0)
    ctypes.windll.kernel32.SetThreadExecutionState(flags)
    if on:
        print("Keeping the PC awake until transcription finishes (screen can still turn off).")


def cmd_transcribe(args):
    keep_awake(True)
    books = find_books(args.folder)
    want = parse_books(args.books)
    todo = {n: p for n, p in books.items() if want is None or n in want}
    if not todo:
        sys.exit("No matching books found.")
    model = load_model(args.model)
    out_root = os.path.abspath(args.out)
    tmpdir = tempfile.mkdtemp(prefix="codex_")
    for n in sorted(todo):
        path = todo[n]
        chapters, duration = probe(path)
        if not chapters:
            chapters = [{"index": 1, "start": 0.0, "end": duration, "title": "whole book"}]
        bdir = os.path.join(out_root, f"Book{n:02d}")
        os.makedirs(bdir, exist_ok=True)
        manifest_path = os.path.join(bdir, "manifest.json")
        manifest = json.load(open(manifest_path, encoding="utf-8")) if os.path.exists(manifest_path) else {}
        print(f"\n=== Book {n}: {os.path.basename(path)} ({len(chapters)} markers, {hms(duration)})")
        t_book = time.time()
        done_audio = 0.0
        for c in chapters:
            fname = os.path.join(bdir, f"m{c['index']:03d}.txt")
            length = c["end"] - c["start"]
            if os.path.exists(fname):
                continue
            wav = os.path.join(tmpdir, "chunk.wav")
            t0 = time.time()
            extract(path, c["start"], c["end"], wav)
            audio = load_wav(wav)
            segments, _info = model.transcribe(
                audio, language="en", vad_filter=True, beam_size=5,
                initial_prompt=NAME_PROMPT, condition_on_previous_text=True,
            )
            text = " ".join(s.text.strip() for s in segments).strip()
            spoken = spoken_chapter(text)
            header = (f"# Book {n} | marker {c['index']} | title {c['title']!r} | "
                      f"{hms(c['start'])}-{hms(c['end'])} | spoken_chapter {spoken}\n")
            tmp = fname + ".part"
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(header + text + "\n")
            os.replace(tmp, fname)  # only appears when complete -> safe to resume
            manifest[str(c["index"])] = {"title": c["title"], "start": c["start"], "end": c["end"],
                                         "spoken_chapter": spoken, "file": os.path.basename(fname)}
            with open(manifest_path, "w", encoding="utf-8") as fh:
                json.dump(manifest, fh, indent=1)
            done_audio += length
            took = time.time() - t0
            speed = length / took if took else 0
            print(f"  marker {c['index']:>3}/{len(chapters)}  {c['title'][:30]!r:<32} "
                  f"spoken ch {spoken!s:>4}  {speed:4.0f}x realtime")
        print(f"Book {n} done in {hms(time.time() - t_book)}.")
    try:
        os.remove(os.path.join(tmpdir, "chunk.wav"))
        os.rmdir(tmpdir)
    except OSError:
        pass
    keep_awake(False)
    print(f"\nAll done. Transcripts are in {out_root}")


def main():
    p = argparse.ArgumentParser(description="Crawler Codex audiobook transcriber")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("chapters", help="report chapter markers (fast, no transcription)")
    a.add_argument("folder")
    b = sub.add_parser("transcribe", help="transcribe chapter by chapter (resumable)")
    b.add_argument("folder")
    b.add_argument("--books", help="e.g. 1-5 or 1,2,7 (default: all found)")
    b.add_argument("--model", default="large-v3-turbo")
    b.add_argument("--out", default="transcripts")
    args = p.parse_args()
    {"chapters": cmd_chapters, "transcribe": cmd_transcribe}[args.cmd](args)


if __name__ == "__main__":
    main()
