# ABFActorSheetV2 Design Document

## Executive Summary

This document outlines the redesign of `ABFActorSheetV2` to address layout issues, improve component reusability, and create a cleaner, more maintainable architecture.

---

## 1. Architecture Overview

### 1.1 File Structure

```
templates/
  actor-v2/
    actor-sheet-v2.hbs          # Main sheet template

    components/                  # Reusable UI components
      stat-block.hbs            # Single stat display (value + label)
      stat-pair.hbs             # Base/Final pair input
      resource-bar.hbs          # HP/Fatigue/etc with current/max
      rollable-stat.hbs         # Clickable stat with roll formula
      icon-button.hbs           # Action button with icon
      collapsible-section.hbs   # Expandable/collapsible container
      data-table.hbs            # Generic table for items
      item-row.hbs              # Row template for tables

    layout/                      # Layout primitives
      grid.hbs                  # CSS Grid wrapper
      flex-row.hbs              # Flexbox row
      flex-col.hbs              # Flexbox column
      card.hbs                  # Card container with header/body

    parts/
      header/
        header.hbs              # Main header container
        actor-portrait.hbs      # Image with level badge
        core-resources.hbs      # HP, Fatigue, Destiny
        resistances-compact.hbs # 5 resistances in row
        modifiers-display.hbs   # Physical/Supernatural modifiers
        initiative-display.hbs  # Initiative with weapon selector
        dynamic-resources.hbs   # Ki/Zeon/Psychic (conditional)
        quick-actions.hbs       # Rest, Half-rest buttons

      tabs/
        bio.hbs                 # Character bio & description
        secondaries.hbs         # Primary characteristics + secondary skills
        combat.hbs              # Weapons, armor, combat stats, notes
        mystic.hbs              # Magic system (conditional)
        domine.hbs              # Ki system (conditional)
        psychic.hbs             # Psychic system (conditional)
        inventory.hbs           # Items & money
        settings.hbs            # Configuration & active effects

module/
  actor/
    ABFActorSheetV2.js          # Sheet class

styles/
  actor-sheet-v2/               # Modular CSS
    _variables.css              # CSS custom properties
    _layout.css                 # Grid/flex utilities
    _components.css             # Component styles
    _header.css                 # Header specific
    _tabs.css                   # Tab navigation
    _forms.css                  # Input styling
    actor-sheet-v2.css          # Main import file
```

### 1.2 CSS Architecture

Use CSS custom properties for theming and consistent spacing:

```css
/* _variables.css */
:root {
  /* Colors */
  --abf-primary: #6e2917;
  --abf-primary-light: #8b3a24;
  --abf-secondary: #dcd7b7;
  --abf-background: #e7e5da;
  --abf-text: #333;
  --abf-text-muted: #666;
  --abf-border: #6e2917;
  --abf-success: #2e7d32;
  --abf-danger: #c62828;

  /* Spacing scale (4px base) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */

  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.15);
}
```

---

## 2. Header Redesign

### 2.1 New Header Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌─────────────────────────────────┐  ┌─────────────────────┐ │
│ │          │  │ HP: [===████████░░░] 85/120     │  │ Resistances (hover) │ │
│ │  PORTRAIT│  │     Sacrificed: [__5__]         │  │ RF:40 RE:35 RV:30   │ │
│ │  + Name  │  │ Fatigue: [████░░] 3/5           │  │ RM:45 RP:50         │ │
│ │  + Level │  │ Destiny: ◆◆◆◇◇ (3/5)           │  └─────────────────────┘ │
│ └──────────┘  └─────────────────────────────────┘  ┌─────────────────────┐ │
│                                                     │ Modifiers:          │ │
│ ┌──────────────────────────────────────┐           │ Phys: +10  Sup: -5  │ │
│ │ Initiative: [+45] with [Sword ▼]     │           └─────────────────────┘ │
│ └──────────────────────────────────────┘                                    │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ [if Mystic] Zeon: 150/200  Acc: 50  │ [if Domine] Ki: 30/45  Acc: 15 │  │
│ │ [if Psychic] PP: 8/12 InUse: 4      │                                 │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ Quick Actions: [🛏 Rest] [⏸ Half-Rest] [⚔ Attack] [🛡 Defend]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Header Template Structure

```handlebars
{{!-- header.hbs --}}
<header class="v2-header">
  <div class="v2-header__portrait">
    {{> "actor-v2/parts/header/actor-portrait"}}
  </div>

  <div class="v2-header__main">
    <div class="v2-header__resources">
      {{> "actor-v2/parts/header/core-resources"}}
    </div>

    <div class="v2-header__initiative">
      {{> "actor-v2/parts/header/initiative-display"}}
    </div>
  </div>

  <div class="v2-header__sidebar">
    {{> "actor-v2/parts/header/resistances-compact"}}
    {{> "actor-v2/parts/header/modifiers-display"}}
  </div>

  {{#if (or system.ui.tabVisibility.mystic.value
            system.ui.tabVisibility.domine.value
            system.ui.tabVisibility.psychic.value)}}
  <div class="v2-header__dynamic-resources">
    {{> "actor-v2/parts/header/dynamic-resources"}}
  </div>
  {{/if}}

  <div class="v2-header__actions">
    {{> "actor-v2/parts/header/quick-actions"}}
  </div>
</header>
```

### 2.3 Core Resources Component

```handlebars
{{!-- core-resources.hbs --}}
<div class="core-resources">
  {{!-- HP with sacrificed --}}
  <div class="resource resource--hp">
    <label class="resource__label">{{localize "anima.ui.general.life.current.title"}}</label>
    <div class="resource__bar">
      <input type="number" name="system.characteristics.secondaries.lifePoints.value"
             value="{{system.characteristics.secondaries.lifePoints.value}}"
             class="resource__current" />
      <span class="resource__separator">/</span>
      <input type="number" name="system.characteristics.secondaries.lifePoints.max"
             value="{{system.characteristics.secondaries.lifePoints.max}}"
             class="resource__max" />
    </div>
    <div class="resource__sacrificed">
      <label>{{localize "anima.ui.general.life.sacrificed"}}</label>
      <input type="number" name="system.characteristics.secondaries.lifePoints.sacrificed"
             value="{{system.characteristics.secondaries.lifePoints.sacrificed}}" />
    </div>
  </div>

  {{!-- Fatigue --}}
  <div class="resource resource--fatigue">
    <label class="resource__label">{{localize "anima.ui.general.fatigue.title"}}</label>
    <div class="resource__bar">
      <input type="number" name="system.characteristics.secondaries.fatigue.value"
             value="{{system.characteristics.secondaries.fatigue.value}}"
             class="resource__current" />
      <span class="resource__separator">/</span>
      <input type="number" name="system.characteristics.secondaries.fatigue.max"
             value="{{system.characteristics.secondaries.fatigue.max}}"
             class="resource__max" />
    </div>
  </div>

  {{!-- Destiny Points as pips --}}
  <div class="resource resource--destiny">
    <label class="resource__label">{{localize "anima.ui.general.destinyPoints.title"}}</label>
    <div class="resource__pips" data-current="{{system.general.destinyPoints.base.value}}"
         data-max="{{system.general.destinyPoints.final.value}}">
      {{#times system.general.destinyPoints.final.value}}
        <span class="pip {{#if (lte @index ../system.general.destinyPoints.base.value)}}pip--filled{{/if}}"
              data-index="{{@index}}"></span>
      {{/times}}
    </div>
  </div>
</div>
```

### 2.4 Data Schema Additions

Add to `template.json` for new fields:

```json
{
  "characteristics": {
    "secondaries": {
      "lifePoints": {
        "value": 100,
        "max": 100,
        "sacrificed": 0  // NEW: sacrificed HP
      }
    }
  }
}
```

---

## 3. Tab Reorganization

### 3.1 New Tab Structure

| Tab | Contents | Visibility |
|-----|----------|------------|
| **Combat** | Attack/Defense items, Weapons, Armor, Combat Notes | Always |
| **Skills** | Primary Characteristics + Secondary Skills | Always |
| **Bio** | Description, Aspect, Advantages, Disadvantages, Elan | Always |
| **Inventory** | Items, Money, Equipment | Always |
| **Mystic** | Zeon, Spells, Summoning | Conditional |
| **Domine** | Ki, Techniques, Martial Arts | Conditional |
| **Psychic** | PP, Powers, Disciplines | Conditional |
| **Settings** | Tab visibility, Fumbles, Active Effects | Always (icon) |

### 3.2 Combat Tab Design

The combat tab is the most important and should be optimized for gameplay:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMBAT                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐│
│ │ Combat Values               │  │ Equipped Armor                          ││
│ │ Attack:  [__] → 180         │  │ ┌───┬───┬───┬───┬───┬───┬───┐          ││
│ │ Block:   [__] → 150         │  │ │FIL│CON│PEN│CAL│ELE│FRI│ENE│          ││
│ │ Dodge:   [__] → 120         │  │ ├───┼───┼───┼───┼───┼───┼───┤          ││
│ │ Wear Armor: [__]            │  │ │ 4 │ 3 │ 2 │ 3 │ 2 │ 3 │ 2 │          ││
│ └─────────────────────────────┘  │ └───┴───┴───┴───┴───┴───┴───┘          ││
│                                   └─────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ ATTACKS (Weapons/Powers/Abilities)                              [+ Add]     │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ ⚔ Sword of Light     │ Atk: +25 │ Dmg: 80 │ Init: +10 │ [Roll] [Edit]│  │
│ ├───────────────────────────────────────────────────────────────────────┤  │
│ │ 🔥 Ki Blast          │ Atk: +15 │ Dmg: 60 │ Init: +0  │ [Roll] [Edit]│  │
│ ├───────────────────────────────────────────────────────────────────────┤  │
│ │ ✨ Fire Ball (spell) │ Atk: +20 │ Dmg: 100│ Init: -20 │ [Roll] [Edit]│  │
│ └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ DEFENSES                                                        [+ Add]     │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ 🛡 Block (Sword)     │ Def: +30 │ Absorb: 4│          │ [Roll] [Edit]│  │
│ ├───────────────────────────────────────────────────────────────────────┤  │
│ │ 🏃 Dodge             │ Def: +20 │          │          │ [Roll] [Edit]│  │
│ └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ARMOR PIECES                                                    [+ Add]     │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Leather Armor │ PN: -10 │ Equipped: ✓ │ [Edit] [Delete]               │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ COMBAT NOTES                                                                │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Special abilities, combat rules, situational modifiers...             │  │
│ │                                                                        │  │
│ │                                                                        │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Skills Tab (formerly Secondaries + Primary Characteristics)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SKILLS                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ PRIMARY CHARACTERISTICS                                                      │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬───┐│
│ │ AGI     │ CON     │ DEX     │ STR     │ INT     │ PER     │ POW     │WP ││
│ │ [_7_]   │ [_6_]   │ [_8_]   │ [_5_]   │ [_9_]   │ [_7_]   │ [_6_]   │[_8]│
│ │ mod:+10 │ mod:+5  │ mod:+15 │ mod:0   │ mod:+20 │ mod:+10 │ mod:+5  │+15││
│ └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴───┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ SECONDARY SKILLS                                                             │
│ ┌────────────────────────────────┐ ┌────────────────────────────────┐      │
│ │ Acrobacias    [__] → 120 🎲   │ │ Investigacion  [__] → 80  🎲   │      │
│ │ Actuacion     [__] → 45  🎲   │ │ Medicina       [__] → 60  🎲   │      │
│ │ Animas        [__] → 30  🎲   │ │ Naturaleza     [__] → 55  🎲   │      │
│ │ Arcana        [__] → 90  🎲   │ │ Percepcion     [__] → 100 🎲   │      │
│ │ Atletismo     [__] → 85  🎲   │ │ Perspicacia    [__] → 70  🎲   │      │
│ │ Engano        [__] → 40  🎲   │ │ Persuasion     [__] → 65  🎲   │      │
│ │ Historia      [__] → 75  🎲   │ │ Sigilo         [__] → 110 🎲   │      │
│ │ Ingenieria    [__] → 50  🎲   │ └────────────────────────────────┘      │
│ └────────────────────────────────┘                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ SPECIAL SKILLS                                                   [+ Add]    │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Custom Skill 1 │ [__] → 75 🎲 │ [Edit] [Delete]                       │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Reusable Component Design

### 4.1 Stat Block Component

```handlebars
{{!-- components/stat-block.hbs --}}
{{!--
  @param label: string - Display label
  @param value: number - Current value
  @param name: string - Form field name (optional, for editable)
  @param editable: boolean - Whether input is editable
  @param rollable: boolean - Whether clicking triggers a roll
  @param rollFormula: string - Roll formula (default: 1d100xa)
  @param size: "sm" | "md" | "lg" - Size variant
--}}
<div class="stat-block stat-block--{{size}} {{#if rollable}}stat-block--rollable{{/if}}">
  <span class="stat-block__label">{{label}}</span>
  {{#if editable}}
    <input type="number" name="{{name}}" value="{{value}}"
           class="stat-block__value"
           {{#if rollable}}
             data-roll="{{#if rollFormula}}{{rollFormula}}{{else}}1d100xa{{/if}}"
             data-rollvalue="{{value}}"
             data-label="{{label}}"
           {{/if}} />
  {{else}}
    <span class="stat-block__value {{#if rollable}}rollable{{/if}}"
          {{#if rollable}}
            data-roll="{{#if rollFormula}}{{rollFormula}}{{else}}1d100xa{{/if}}"
            data-rollvalue="{{value}}"
            data-label="{{label}}"
          {{/if}}>{{value}}</span>
  {{/if}}
</div>
```

### 4.2 Resource Bar Component

```handlebars
{{!-- components/resource-bar.hbs --}}
{{!--
  @param label: string - Resource name
  @param current: number - Current value
  @param max: number - Maximum value
  @param currentName: string - Form field for current
  @param maxName: string - Form field for max
  @param color: "health" | "fatigue" | "mana" | "ki" | "psychic"
  @param showBar: boolean - Show visual bar
  @param showSacrificed: boolean - Show sacrificed HP field
  @param sacrificed: number - Sacrificed amount
  @param sacrificedName: string - Form field for sacrificed
--}}
<div class="resource-bar resource-bar--{{color}}">
  <label class="resource-bar__label">{{label}}</label>

  {{#if showBar}}
  <div class="resource-bar__visual"
       style="--percent: {{math (math current "/" max) "*" 100}}%">
    <div class="resource-bar__fill"></div>
  </div>
  {{/if}}

  <div class="resource-bar__inputs">
    <input type="number" name="{{currentName}}" value="{{current}}"
           class="resource-bar__current" />
    <span class="resource-bar__separator">/</span>
    <input type="number" name="{{maxName}}" value="{{max}}"
           class="resource-bar__max" />
  </div>

  {{#if showSacrificed}}
  <div class="resource-bar__sacrificed">
    <label>{{localize "anima.ui.sacrificed"}}</label>
    <input type="number" name="{{sacrificedName}}" value="{{sacrificed}}" />
  </div>
  {{/if}}
</div>
```

### 4.3 Item Table Component

```handlebars
{{!-- components/data-table.hbs --}}
{{!--
  @param title: string - Section title
  @param items: array - Items to display
  @param columns: array - Column definitions [{key, label, width, type}]
  @param addButton: boolean - Show add button
  @param onAdd: string - Click handler for add
  @param itemPartial: string - Partial for rendering each row
  @param emptyMessage: string - Message when no items
  @param collapsible: boolean - Can collapse section
  @param collapsibleId: string - ID for collapse state
--}}
<div class="data-table {{#if collapsible}}data-table--collapsible{{/if}}"
     {{#if collapsibleId}}data-collapsible-id="{{collapsibleId}}"{{/if}}>

  <div class="data-table__header">
    <h3 class="data-table__title">{{title}}</h3>
    {{#if addButton}}
    <button type="button" class="data-table__add" data-action="{{onAdd}}">
      <i class="fas fa-plus"></i>
    </button>
    {{/if}}
    {{#if collapsible}}
    <button type="button" class="data-table__collapse">
      <i class="fas fa-chevron-down"></i>
    </button>
    {{/if}}
  </div>

  {{#if items.length}}
  <table class="data-table__table">
    <thead>
      <tr>
        {{#each columns}}
        <th style="width: {{this.width}}">{{this.label}}</th>
        {{/each}}
        <th class="data-table__actions-header"></th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      {{> (lookup ../itemPartial) item=this columns=../columns index=@index}}
      {{/each}}
    </tbody>
  </table>
  {{else}}
  <p class="data-table__empty">{{emptyMessage}}</p>
  {{/if}}
</div>
```

### 4.4 Card Layout Component

```handlebars
{{!-- layout/card.hbs --}}
{{!--
  @param title: string - Card header title
  @param icon: string - FontAwesome icon class
  @param class: string - Additional CSS classes
  @param collapsible: boolean
  @param collapsed: boolean - Initial state
--}}
<div class="card {{class}} {{#if collapsible}}card--collapsible{{/if}} {{#if collapsed}}card--collapsed{{/if}}">
  {{#if title}}
  <div class="card__header">
    {{#if icon}}<i class="{{icon}}"></i>{{/if}}
    <h3 class="card__title">{{title}}</h3>
    {{#if collapsible}}
    <button type="button" class="card__toggle">
      <i class="fas fa-chevron-down"></i>
    </button>
    {{/if}}
  </div>
  {{/if}}
  <div class="card__body">
    {{> @partial-block}}
  </div>
</div>
```

---

## 5. Attack/Defense Item System (Future)

### 5.1 Concept

Instead of only "weapons", create abstract "Attack" and "Defense" items that can derive from:
- Weapons (physical attacks/blocks)
- Spells (magic attacks/defenses)
- Ki Powers (domine attacks)
- Psychic Powers (mental attacks)
- Summons (creature attacks)

### 5.2 Proposed Data Structure

```json
{
  "Item": {
    "types": [..., "attack", "defense"],

    "attack": {
      "source": {
        "type": "weapon|spell|ki|psychic|custom",
        "itemId": ""  // Reference to source item if any
      },
      "attackValue": { "base": 0, "final": 0 },
      "damage": { "base": 0, "final": 0 },
      "initiative": { "base": 0, "final": 0 },
      "critic": { "primary": "-", "secondary": "-" },
      "range": { "value": 0, "type": "melee|ranged|area" },
      "special": { "value": "" },
      "notes": { "value": "" }
    },

    "defense": {
      "source": {
        "type": "weapon|dodge|spell|ki|psychic|custom",
        "itemId": ""
      },
      "defenseValue": { "base": 0, "final": 0 },
      "absorption": { "value": 0 },  // For blocks
      "counterBonus": { "value": 0 },
      "special": { "value": "" },
      "notes": { "value": "" }
    }
  }
}
```

### 5.3 Benefits

1. **Unified Interface**: All attack options in one place
2. **Flexibility**: Ki blasts, spells, and weapons look the same to the combat system
3. **Cleaner Combat Tab**: Single "Attacks" section instead of scattered sources
4. **Better Chat Combat Integration**: Attack items can be directly referenced

---

## 6. Quick Actions System

### 6.1 Header Quick Actions

```handlebars
{{!-- quick-actions.hbs --}}
<div class="quick-actions">
  <button type="button" class="quick-action" data-action="rest" title="{{localize 'anima.actions.rest'}}">
    <i class="fas fa-bed"></i>
    <span>{{localize "anima.actions.rest.short"}}</span>
  </button>

  <button type="button" class="quick-action" data-action="half-rest" title="{{localize 'anima.actions.halfRest'}}">
    <i class="fas fa-moon"></i>
    <span>{{localize "anima.actions.halfRest.short"}}</span>
  </button>

  <button type="button" class="quick-action quick-action--primary" data-action="attack"
          title="{{localize 'anima.actions.attack'}}">
    <i class="fas fa-sword"></i>
    <span>{{localize "anima.actions.attack.short"}}</span>
  </button>

  <button type="button" class="quick-action" data-action="defend" title="{{localize 'anima.actions.defend'}}">
    <i class="fas fa-shield-alt"></i>
    <span>{{localize "anima.actions.defend.short"}}</span>
  </button>
</div>
```

### 6.2 JavaScript Handler

```javascript
// In ABFActorSheetV2.js
_onQuickAction(event) {
  const action = event.currentTarget.dataset.action;

  switch (action) {
    case 'rest':
      this._handleRest();
      break;
    case 'half-rest':
      this._handleHalfRest();
      break;
    case 'attack':
      window.ChatCombat?.sendAttack();
      break;
    case 'defend':
      // Open defense selection dialog
      break;
  }
}

async _handleRest() {
  const hp = this.actor.system.characteristics.secondaries.lifePoints;
  const fatigue = this.actor.system.characteristics.secondaries.fatigue;
  const regen = this.actor.system.characteristics.secondaries.regeneration;

  // Full rest: recover fatigue + HP based on regeneration
  await this.actor.update({
    'system.characteristics.secondaries.fatigue.value': fatigue.max,
    'system.characteristics.secondaries.lifePoints.value': Math.min(
      hp.value + regen.resting.value,
      hp.max - (hp.sacrificed || 0)
    )
  });

  ui.notifications.info(game.i18n.localize('anima.notifications.rested'));
}

async _handleHalfRest() {
  const fatigue = this.actor.system.characteristics.secondaries.fatigue;

  // Half rest: recover half fatigue, no HP
  await this.actor.update({
    'system.characteristics.secondaries.fatigue.value': Math.min(
      fatigue.value + Math.ceil(fatigue.max / 2),
      fatigue.max
    )
  });

  ui.notifications.info(game.i18n.localize('anima.notifications.halfRested'));
}
```

---

## 7. Dynamic Resources Display

### 7.1 Conditional Resource Display

```handlebars
{{!-- dynamic-resources.hbs --}}
<div class="dynamic-resources">
  {{!-- Mystic Resources --}}
  {{#if system.ui.tabVisibility.mystic.value}}
  <div class="dynamic-resource dynamic-resource--mystic">
    {{> "actor-v2/components/resource-bar"
        label=(localize "anima.ui.mystic.zeon.title")
        current=system.mystic.zeon.value
        max=system.mystic.zeon.max
        currentName="system.mystic.zeon.value"
        maxName="system.mystic.zeon.max"
        color="mana"
        showBar=true
    }}
    <div class="dynamic-resource__extra">
      <span class="label">{{localize "anima.ui.mystic.accumulated"}}</span>
      <input type="number" name="system.mystic.zeonAccumulated.value"
             value="{{system.mystic.zeonAccumulated.value}}" />
    </div>
  </div>
  {{/if}}

  {{!-- Domine Resources --}}
  {{#if system.ui.tabVisibility.domine.value}}
  <div class="dynamic-resource dynamic-resource--domine">
    {{> "actor-v2/components/resource-bar"
        label=(localize "anima.ui.domine.ki.title")
        current=system.domine.kiAccumulation.generic.value
        max=system.domine.kiAccumulation.generic.max
        currentName="system.domine.kiAccumulation.generic.value"
        maxName="system.domine.kiAccumulation.generic.max"
        color="ki"
        showBar=true
    }}
    <div class="dynamic-resource__accumulation">
      {{!-- Show per-stat accumulation summary --}}
      <span title="{{localize 'anima.ui.domine.kiAccumulated'}}">
        Acc: {{kiAccumulationTotal}}
      </span>
    </div>
  </div>
  {{/if}}

  {{!-- Psychic Resources --}}
  {{#if system.ui.tabVisibility.psychic.value}}
  <div class="dynamic-resource dynamic-resource--psychic">
    {{> "actor-v2/components/resource-bar"
        label=(localize "anima.ui.psychic.psychicPoints.title")
        current=system.psychic.psychicPoints.value
        max=system.psychic.psychicPoints.max
        currentName="system.psychic.psychicPoints.value"
        maxName="system.psychic.psychicPoints.max"
        color="psychic"
        showBar=true
    }}
    <div class="dynamic-resource__extra">
      <span class="label">{{localize "anima.ui.psychic.inUse"}}</span>
      <input type="number" name="system.psychic.psychicPoints.inUse"
             value="{{system.psychic.psychicPoints.inUse}}" />
    </div>
  </div>
  {{/if}}
</div>
```

---

## 8. CSS Component Examples

### 8.1 Resource Bar Styles

```css
/* _components.css */
.resource-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.resource-bar__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--abf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.resource-bar__visual {
  height: 8px;
  background: var(--abf-background);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}

.resource-bar__fill {
  height: 100%;
  width: var(--percent, 100%);
  transition: width 0.3s ease;
  border-radius: var(--radius-sm);
}

.resource-bar--health .resource-bar__fill {
  background: linear-gradient(to right, #c62828, #ef5350);
}

.resource-bar--fatigue .resource-bar__fill {
  background: linear-gradient(to right, #f57c00, #ffb74d);
}

.resource-bar--mana .resource-bar__fill {
  background: linear-gradient(to right, #1565c0, #42a5f5);
}

.resource-bar--ki .resource-bar__fill {
  background: linear-gradient(to right, #2e7d32, #66bb6a);
}

.resource-bar--psychic .resource-bar__fill {
  background: linear-gradient(to right, #7b1fa2, #ba68c8);
}

.resource-bar__inputs {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.resource-bar__current,
.resource-bar__max {
  width: 50px;
  text-align: center;
  padding: var(--space-1);
  border: 1px solid var(--abf-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
}

.resource-bar__current {
  font-weight: 600;
}

.resource-bar__separator {
  color: var(--abf-text-muted);
}

.resource-bar__sacrificed {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--abf-danger);
}

.resource-bar__sacrificed input {
  width: 40px;
  text-align: center;
}
```

### 8.2 Data Table Styles

```css
.data-table {
  background: var(--abf-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.data-table__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--abf-primary);
  color: white;
}

.data-table__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
}

.data-table__add,
.data-table__collapse {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.data-table__add:hover,
.data-table__collapse:hover {
  background: rgba(255,255,255,0.2);
}

.data-table__table {
  width: 100%;
  border-collapse: collapse;
}

.data-table__table th {
  text-align: left;
  padding: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--abf-text-muted);
  border-bottom: 1px solid var(--abf-border);
}

.data-table__table td {
  padding: var(--space-2);
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

.data-table__table tr:hover {
  background: rgba(0,0,0,0.05);
}

.data-table__empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--abf-text-muted);
  font-style: italic;
}

/* Collapsible state */
.data-table--collapsible.collapsed .data-table__table,
.data-table--collapsible.collapsed .data-table__empty {
  display: none;
}

.data-table--collapsible.collapsed .data-table__collapse i {
  transform: rotate(-90deg);
}
```

---

## 9. Implementation Plan

### Phase 1: Foundation
1. Create new CSS file structure with variables
2. Create base layout components (grid, flex, card)
3. Create reusable input components (stat-block, resource-bar)
4. Set up basic ABFActorSheetV2.js with new template path

### Phase 2: Header
1. Implement new header layout
2. Add sacrificed HP field to schema
3. Create dynamic resources display
4. Implement quick actions

### Phase 3: Core Tabs
1. Combat tab with weapon/armor tables
2. Skills tab with primary characteristics moved here
3. Bio tab (simplified from current Main)
4. Inventory tab (extracted from Main)

### Phase 4: Conditional Tabs
1. Mystic tab refactor
2. Domine tab refactor
3. Psychic tab refactor
4. Settings tab with active effects

### Phase 5: Polish
1. Responsive design adjustments
2. Accessibility improvements
3. Animation/transition polish
4. Testing and bug fixes

### Future Phase: Attack/Defense System
1. Design attack/defense item types
2. Implement item sheets
3. Create migration for existing weapons
4. Update combat system integration

---

## 10. Migration Considerations

### 10.1 Backwards Compatibility

- V1 sheet remains available and unchanged
- V2 is opt-in via settings or sheet selection
- No data migration required initially (same schema)
- Future attack/defense items would be additive

### 10.2 Switching Between Sheets

```javascript
// In system init
Actors.registerSheet("animabf-guote", ABFActorSheet, {
  types: ["character"],
  makeDefault: true,
  label: "ABF Character Sheet (v1)"
});

Actors.registerSheet("animabf-guote", ABFActorSheetV2, {
  types: ["character"],
  makeDefault: false,
  label: "ABF Character Sheet (v2)"
});
```

Users can switch via the sheet configuration button in the title bar.

---

## Appendix A: Localization Keys to Add

```json
{
  "anima.ui.general.life.sacrificed": "Sacrificed",
  "anima.ui.sacrificed": "Sacrificed",
  "anima.actions.rest": "Full Rest",
  "anima.actions.rest.short": "Rest",
  "anima.actions.halfRest": "Half Rest",
  "anima.actions.halfRest.short": "Half",
  "anima.actions.attack": "Attack",
  "anima.actions.attack.short": "Atk",
  "anima.actions.defend": "Defend",
  "anima.actions.defend.short": "Def",
  "anima.notifications.rested": "Character has rested and recovered.",
  "anima.notifications.halfRested": "Character has half-rested.",
  "anima.ui.tabs.skills": "Skills",
  "anima.ui.tabs.bio": "Bio",
  "anima.ui.tabs.inventory": "Inventory",
  "anima.ui.mystic.accumulated": "Accumulated",
  "anima.ui.domine.kiAccumulated": "Ki Accumulated",
  "anima.ui.psychic.inUse": "In Use"
}
```
