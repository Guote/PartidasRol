# Change Log

## 1.5.1.1

- Fix: Errors when accessing documents or users that no longer exist, or combatants with no actor.

## 1.5.1

- New: Turn and Round messages can be customized.
- Fix: `.OBSERVER` error in v10 due to use of obsolete `CONST.ENTITY_PERMISSIONS`
- Fix: Lingering v10 warnings

## 1.5.0

- Fix: Permission fetching did not work correctly (or at all).
- New release mechanism for slimmer releases.

## 1.4.0.1

- Fix: Lingering v10 compatibility warnings.

## 1.4.0

- Fix: Round cycling message styling for some systems.
- Fix: Turn announce messages were not compressed (also made compression optional).
- Foundry v10 compatibility

## 1.3.2

- Internal: Bundling via esbuild.
- Internal: Less swapped for SCSS.

## 1.3.1.1

- Fix: Obfuscated turn announcements used selected token's name as speaker.

## 1.3.1

- Fix: Errors with no scene.
- Fix: Prototype token image is used if token image is missing (e.g. combatant not on scene).

## 1.3.0.2

- Fix: Hide turn announcements for hidden combatants, not for hidden tokens.
- Fix: Show turn announcements for all combats, not just the active one.

## 1.3.0

- Fix: Combatants with no actor or token.
- Foundry 0.8 support removed.

## 1.2.0.1

- Fix: Issues with players entering turn processing code.

## 1.2.0

- New: Round cycling message. Can be disabled in module settings.
- Changed: Turn messages no longer merge together when they're shown subsequently.
- Internal: JQuery usage removed.
- Internal: Simplified GM selection.

## 1.1.2

- Fix: Layout with Foundry v9

## 1.1.1.1

- Fix: Hide speaker for non-GM, and process the chat messages correctly for them otherwise.
- Fix: Obfuscate speaker also when name obfuscation is enabled.

## 1.1.1

- New: Options to obfuscate turn names. Default disabled.

## 1.1

- Foundry 0.7 support dropped for good.
- Fix: Message data was not set correctly. This had no impact on the module funtionality.
- New: Option to hide token portrait on chat messages. Disabled by default. This is destructive.  
  CSS alternative that does not permanently affect the chat messages:  
  `#chat-log .chat-message .turn-announcer .portrait { display: none; }`
- Changed: Whisper targets for hidden token turn announcements are scrubbed away to reduce the chat message size.
- Changed: GM is labeled by their actual user name instead of "GM".
- Changed: Missed turn messages have faded color when private.
- Changed: Missed turn behaviour has been tweaked and should be better.

## 1.0.1

- Experimental missed turn feature restored. This is disabled by default due to so far unresolved issues with it.
- Translation support improved somewhat.
- Korean translation contributed by @drdwing

## 1.0.0.1

- Fix: Cannot read property 'data' of undefined
  Caused by combatant being undefined. Underlying cause unknown.

## 1.0.0 Rebranding

## 0.1.5.1 Foundry 0.7.x cross-compatibility

## 0.1.5

### New

- Potential missed turns are announced. This can be disabled.

### Changes

- Turn announcement is for people with observer instead of owner permission.
- Defeated combatants are no longer announced.
- Foundry VTT 0.8.x compatibility.

## 0.1.4

### Fixes

- Fix announcer cards being hideous if module is disabled.  
  Incorporates parts of the styling directly in the chat cards to make them format somewhat better if the module is disabled (happens due to .css no longer being present).  
  This does not fix old cards generated prior to this version.

## 0.1.3

### Fixes

- Hidden tokens are now correctly whispered to GM instead of being public
- Same token somehow happening again in combat no longer reprints their announcement (some combat updates caused this).
- Combatants with no tokens are skipped. Unknown why they have no tokens, but it's a thing, apparently.

## 0.1.2 Fix visible of undefined and multiplied announcements

## 0.1.1 Fix for not visible tokens

## 0.1.0 Initial
