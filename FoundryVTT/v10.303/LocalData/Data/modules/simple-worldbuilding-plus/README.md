# Simple Worldbuilding Plus

This is a small module that adds a few quality of life enhancements to make it easier to build custom character sheets in the Simple Worldbuilding system. There are primarily three features, the third of which is exclusive to Simple Worldbuilding. The inline stat syntax and journal templates are technically system agnostic and could be used in any system.

## Installation

Install via Foundry's package manager or the following manifest URL: [https://gitlab.com/asacolips-projects/foundry-mods/simple-worldbuilding-plus/raw/master/module.json](https://gitlab.com/asacolips-projects/foundry-mods/simple-worldbuilding-plus/raw/master/module.json)

## Inline stat syntax

There's currently an issue in Foundry and/or Simple Worldbuilding that prevents inline rolls such as `[[@str]]` from outputting correctly if they're included in a character sheet, due to them being unable to locate the actor object from the context they're in. Until that issue is resolved, this module adds an additional syntax that lets you use the following to output stats:

`{{@str}}`

This works using the same general logic as inline rolls, so you could do formulas such as `{{floor((@str - 10) / 2)}}` to calculate more complicated values.

This syntax technically works with die results, but it is intended for displaying stats only. It does not inlcude a d20 icon like inline rolls do, in order to conserve space.

## Journal Templates

**Note: The journal templates feature is no longer available as of version 1.1.0 of this module due to them not being supported by the Prose Mirror editor used by character sheets.**

This module checks for journal entries using the prefix `SWP_TPL_`, such as `SWP_TPL_Character` or `SWP_TPL_Quest Template`. The contents of those entries will be made available in TinyMCE text editors as a template with the name starting after the `SWP_TPL_` prefix. You can use this to build character sheet templates with prefilled stat attributes or for other general utility purposes like creating a standard quest format for your journal entries that can be re-used. The templates will become available in all of your TinyMCE editors wherever they appear, so the sky is the limit!

## Derived Values (Simple Worldbuilding only)

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

## Screenshots

![Screenshot of the template widget](https://mattsmithin.nyc3.digitaloceanspaces.com/assets/swp-templates.png)

![Screenshot of the template widget](https://mattsmithin.nyc3.digitaloceanspaces.com/assets/swp-templates-button.png)

![Screenshot of the template widget](https://mattsmithin.nyc3.digitaloceanspaces.com/assets/swp-template-widget.png)