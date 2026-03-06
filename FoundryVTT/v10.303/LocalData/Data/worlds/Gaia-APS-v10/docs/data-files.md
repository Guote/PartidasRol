# World Data Files — Gaia-APS-v10

All files are in `data/`. Each is a NeDB flat file where **every line is one JSON document**.
Do not read these files whole — use Grep for targeted searches.

| File | Contains |
|------|----------|
| `actors.db` | Player characters and NPCs with full stat blocks, inventory, skills |
| `items.db` | Standalone items not embedded in actors |
| `macros.db` | All world macros (scripts and chat macros) |
| `journal.db` | Journal entries — lore, session notes, GM notes |
| `scenes.db` | Scene definitions (maps, lighting, walls, tokens) |
| `messages.db` | Chat message history — very large, rarely useful to search |
| `playlists.db` | Audio playlist definitions |
| `settings.db` | World-level settings (module configs, system configs) |
| `folders.db` | Folder structure for organizing documents |
| `tables.db` | Rollable tables |
| `combats.db` | Combat tracker snapshots |
| `cards.db` | Card deck data |
| `drawings.db` | Canvas drawings |
| `fog.db` | Fog of war exploration data — large, never useful to read |
| `magia.db` | Custom spells/magic items (world-specific) |
| `mentalismo.db` | Mentalism powers (world-specific) |
| `users.db` | User accounts and permissions |

## Tips

- `actors.db` and `scenes.db` are typically the largest files.
- `macros.db` is useful when looking for automation scripts.
- `settings.db` stores module configuration — useful for debugging module behavior.
- `fog.db` and `messages.db` are never worth reading; skip them.
