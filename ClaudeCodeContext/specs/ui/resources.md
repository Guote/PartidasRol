# Resources (Header Bar)

## What it is
The resource bar in row 2 of the actor sheet V2 header. Shows current/max values for combat resources. Each resource is independently toggleable.

## Placement & structure

File: `templates/actor-v2/parts/header/header-v2.hbs`
- Row 1: portrait + name + level / resistances + TA / initiative + general mod
- Row 2: resource bar (`v2-header__resources`) — contains all resource blocks
- Each resource is wrapped in `{{#if system.ui.resourceVisibility.RESOURCE.value}}`

## Resources list

| Key | Label | Inputs | Data path |
|-----|-------|--------|-----------|
| `hp` | PV | current / max | `system.characteristics.secondaries.lifePoints.value / .max` |
| `sacrificedLife` | Vida Sacrif. | current | `system.characteristics.secondaries.lifePoints.sacrificed` |
| `fatigue` | Cansancio | current / max | `system.characteristics.secondaries.fatigue.value / .max` |
| `destiny` | PD | current | `system.general.destinyPoints.base.value` |
| `zeon` | Zeon | current / max | `system.mystic.zeon.value / .max` (via `_header.` prefix) |
| `zeonAccumulated` | Zeon Acum. | current | `system.mystic.zeonAccumulated.value` |
| `ki` | Ki | current / max | `system.domine.kiAccumulation.generic.value / .max` |
| `kiAccumulated` | Ki Acum. (total) | readonly | `totalKiAccumulated` (sheet computed) |
| `kiStr/Agi/Dex/Con/Wp/Pow` | individual ki stats | current | per-characteristic accumulated values |
| `psychicPoints` | CV | current / max | `system.psychic.psychicPoints.value / .max` |
| `shield` | Escudo | current / max | `system.mystic.shield.value / .max` |
| *(masa only)* | Nº | readonly | `system.masa.livingMembers / .totalMembers` |

## Visibility toggle

`system.ui.resourceVisibility.RESOURCE.value` — boolean, stored on actor.
Toggled in Settings tab via `vis-btn.hbs` component.

**Masa resource** (`Nº`) is an exception: shown via `{{#if system.masa.isMasa}}`, not via `resourceVisibility`. Always shown for masas, never for others.

**Level** (row 1, not a resource bar item) uses `system.general.level.value` directly as a `<span>` display.

## Token bar visibility

Separate toggle: `system.ui.tokenBarVisibility.RESOURCE.value`
Used by BarBrawl integration to configure token bar display.

## Update logic

Resources update whenever the actor document updates (Foundry reactivity). Header inputs use `_header.` name prefix to avoid name collision with tab inputs when the form submits — stripped in `_updateObject()`.

## Migration

If `resourceVisibility` is missing on older actors, `ABFActorSheetV2.getData()` initializes defaults. New resources added later must also add a migration check.

## Known gotchas
- Buttons inside the header must use `width: auto !important; display: inline-flex`
- Zeon/Ki/CV/Shield inputs use `_header.system.*` prefix — do not duplicate field names used in tabs

## Related files
- `templates/actor-v2/parts/header/header-v2.hbs`
- `templates/actor-v2/parts/tabs/settings.hbs`
- `module/actor/ABFActorSheetV2.js` — `getData()` migration section
- `template.json` — `system.ui.resourceVisibility.*` schema
