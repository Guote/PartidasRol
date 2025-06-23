# Simple Worldbuilding Plus

![Foundry v11.315](https://img.shields.io/badge/Foundry-v11.315-green) ![Foundry v12](https://img.shields.io/badge/Foundry-v12-yellow)

This is a small module that adds a few quality of life enhancements to make it easier to build custom character sheets in the Simple Worldbuilding system.

- Adds support for inline rolls in the description tab of the character sheet that can reference your actor and item roll attributes.
- Adds support for defining derived attributes in a module setting so that you can define them in one place rather than across multiple actors.

## Installation

Install via Foundry's package manager or the following manifest URL: [https://gitlab.com/asacolips-projects/foundry-mods/simple-worldbuilding-plus/raw/master/module.json](https://gitlab.com/asacolips-projects/foundry-mods/simple-worldbuilding-plus/raw/master/module.json)

## Inline stat syntax

There's currently an issue in Simple Worldbuilding that prevents inline rolls such as `[[@str]]` from outputting correctly if they're included in a character sheet due to the actor not being passed to the sheet. This resolves that by overriding the sheet and passing that data in. Additionally, if a roll is just for display and isnt' a button, the d20 icon on the result will be hidden in the sheet.

### Legacy Inline Rolls

In older versions of this module, inline rolls were added to the sheet with curly braces, such as `{{@str}}`. The module now uses the normal `[[@str]]` syntax, but there is a compatibility layer in place to convert to the new syntax on the fly. You should use `[[@attrName]]` going forward, but if/when the module eventually removes support for the previous format, a migration will be included to convert rolls for you.

## Derived Values

**Note: In the 1.1.0 version of this module, this is now tracked in a module setting under the settings configuration dialog rather than a journal entry. The syntax is still the same however.**

This module checks for a special journal entry called `SWP_DERIVED`. If this template exists, it will be parsed for derived attribute formulas, and those will be made available to your actors for both the `{{@attr}}` syntax and for both regular and inline rolls.

Each derived attribute must be on a new line and uses the following format:

`||key|formula||`

Derived attributes will be placed in a special `d` attribute on your actor. For example, this journal entry example would derive d20 modifiers for the 6 ability scores:

```
||str.mod|floor((@str - 10) / 2)||
||dex.mod|floor((@dex - 10) / 2)||
||con.mod|floor((@con - 10) / 2)||
||int.mod|floor((@int - 10) / 2)||
||wis.mod|floor((@wis - 10) / 2)||
||cha.mod|floor((@cha - 10) / 2)||
```

Those would all be placed in `actor.data.data.d`, so that you could reference them in rolls using text such as `{{@d.str.mod}}` or `{{@d.dex.mod}}`. The d prefix is necessary because if you're using the short syntax, the attributes are string/number/bool values and not objects, so it's impossible to have both `@str` and `@str.mod` in that scenario.
