# CLAUDE.md — World: Gaia-APS-v10

Active FoundryVTT world for the "Amigos para siempre" Anima Beyond Fantasy campaign.
System: `animabf-guote` v1.16.0 · Core: v10.303

## Directory Structure

```
Gaia-APS-v10/
  world.json          # World manifest (system, packs, version)
  data/               # Live world data — large .db files, DO NOT read unless asked
  packs/              # Compendium packs — curated/archival content
  assets/             # Images and media used in scenes
  chat-archive/       # Exported chat logs
```

## Hard Rules

- **Never read files in `data/`** unless the user explicitly asks. They are large NeDB flat files (actors, scenes, messages, etc.) and will bloat the context window.
- **Never edit `data/` files directly.** World data is managed through FoundryVTT.
- Packs in `packs/` are also large; read only specific ones when asked.

## Sub-docs (load only when needed)

| Task | Read this file |
|------|----------------|
| Need to know what a `data/*.db` file contains | `docs/data-files.md` |
| Need to know what a `packs/*.db` compendium contains | `docs/packs.md` |

## Searching World Data

If you must search inside a `.db` file, use **Grep** with a targeted pattern rather than reading the whole file. Each line in a `.db` is a self-contained JSON document.

Example: find an actor named "Kira" in actors.db:
```
Grep pattern: "name":"Kira" in data/actors.db
```
