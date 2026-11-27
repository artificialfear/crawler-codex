# Dungeon Crawler Codex

(Repo, Sheet and Apps Script project keep the original name "crawler-codex" / "Crawler Codex".)

Spoiler-safe character companion for listening to *Dungeon Crawler Carl* together at different points in the series.

App: https://artificialfear.github.io/crawler-codex/

## Setup (once)
1. Create a Google Sheet on your personal account named **Crawler Codex**.
2. Extensions → Apps Script. Replace `Code.gs` with `apps-script/Code.gs`. Add a script file named `Seed` and paste `apps-script/Seed.gs`. Save.
3. Select `setup` in the function dropdown → Run → approve access. The passphrase appears in the execution log (and on the Config tab).
4. Deploy → New deployment → type **Web app** → Execute as **Me**, Who has access **Anyone** → Deploy. Copy the URL ending in `/exec`.
5. Open the app on your phone → Settings → paste URL + passphrase → Save & sync → pick your name.
6. Settings → "Copy setup link for the other phone" → text it to Emily → she opens it and taps her name.
7. On each phone: browser menu → Add to Home Screen.

Later code updates: paste the new files, then Deploy → Manage deployments → pencil → Version: New version → Deploy (never "New deployment" — that changes the URL).
