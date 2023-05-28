# Change Log

## 1.0.1.1

- Fix: Bundled sounds were missing from release.

## 1.0.1

- Maintenance release. Relaxing compatible Foundry versions.

## 1.0.0

- New release mechanism for smaller download & install sizes.

## 0.4.0

- Internal: Rollup swapped for esbuild
- Internal: Less swapped for SCSS
- Foundry v10 compatibility

## 0.3.6

- Add handling for no sound file.

## 0.3.5

- Maintenance update
- Script bundling
- Changed: `${name}` is now `{name}`

## 0.3.4.1 Hotfix for the text glowing too much with some systems

## 0.3.4

- Changed: Notifications no longer show for combatants that have been defeated to avoid hyping them up.
- Removed: Foundry 0.7 support is no longer claimed.

## 0.3.3.2 Hotfix for audio files being corrupted by git

## 0.3.3.1 Hotfix for "format is not a function"

## 0.3.3

- New: Customizable next up and turn start messages with `${name}` for combatant's name and `\n` for line breaks.
- Fixed: Single notification per round even if controlling multiple combatants (#12).
- Changed: Jquery fades replaced with CSS transitions, which hopefully are smoother.

## 0.3.2.2 Hotfix for next up notification getting stuck

## 0.3.2.1

- Fixed: Fade in/out was not working consistently.

## 0.3.2

- Changed: Next up notification is omitted if there are less than 3 combatants.

## 0.3.1.1

- Fix: Avoid multiple sound & banner notifications when combatants are deleted or rolled into the initiative.
  This comes with the caveat that if you do have valid multiple initiatives on same round, you only get notified of the first.

## 0.3.1

- New: Client-side option to toggle the notification banner display.
- Change: Fade in and out timers are much faster.

## 0.3.0

- New: Sticky option. If disabled, next turn notification is removed entirely instead of being turned transparent (01f42d17).
- New: Fade timer option. Automatically remove notification after set time instead of requiring click (#3, b5949410).
- Changed: Notification is dismissed by clicking anywhere on the canvas (#2, 3f789998, b9c2b595)
- Fixed: Notification was sized slightly wrong, causing it to visibly overlap with the sidebar (f8c75b66).
- Fixed: Incompatibiltiy with Tidy UI (#4, ee97e3c1)

## 0.2.0

- New: Sound effect selection.
- New: Sound volume test button that cycles through the configured sounds for easier volume adjustment.
- Changed: Red Hook Studios sound effects were replaced due to suspected license issues.  
  New sounds and their licenses are detailed in [audio credits](./sounds/CREDITS.md)

## 0.1.0 Initial release
