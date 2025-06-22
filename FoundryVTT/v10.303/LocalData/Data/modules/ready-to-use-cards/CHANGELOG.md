# CHANGELOG

## Release 1.12.1

### Features
- New option when moving cards through stacks : Until now, each time a card moved from a stack to another, everyone was notified by a message listing all card which were moved. The new options let GM choose who will see the detailed list (notification will still be send to everyone)

![Additional options](docs/README_choosing_move_params.webp?raw=true)

## Release 1.12.0

### Features
- Inside deck configuration : Now properly using checkboxes for parameters when manipulating booleans
- Since last versions, card background were not correctly detected and were replaced by icons : Fixed
- New parameter for stacks : Revealed cards can be put face down.

### Translation
- Added labels : `RTUCards.settings.config-actions.additionalData.revealedFaceDown`

## Release 1.11.0

### Compliance
- Ready to use cards is now v10 compliant

## Release 1.10.2

### Issues
- Bug : Module is Hiding Pause
- Bug : Dealing cards were accessible to everyone

### Features
- Double clicks now allow a better card listing management inside main UI

## Release 1.10.1

### Issues
- Regression : A F5 was needed after updating action configuration

## Release 1.10.0

### Features
- Big changes on Action config panel. Check Readme for more details
- Allowing card image to be displayed in chat when the card is played.

### Translation
- Removed labels : `RTUCards.settings.sheet.labels.from*`
- Modified labels : `RTUCards.settings.config-actions.*`
- Added labels : `RTUCards.action.*`, `RTUCards.migration.fromV1.*`

### Issues
- Error when clicking to open card from chat - "Cannot read properties of null (reading 'stack')"


## Release 1.9.0

### Features
- Allow changes of deck/discard icons as well as cards default back image.

![Config icons](docs/README_config_icons.webp?raw=true)

### Translation
- Labels for the new window : `RTUCards.settings.config-backs.*`

## Release 1.8.0

### Features
- Filtering action in settings is now persistent and will apply to new decks you add
- Looping through card faces is now available.
  - Can be done inside deck, hand, revealed card, and discard as long as the card is visible.
  - You need to own the card to do that.
  - Current face name is now used when card is dealt, played, or discarded.
  - Current face is reset when card returns in the deck.
- The card back is considered as a card face by default.
  - You can remove it from the card faces inside the action settings panel.

### Translation
- New action inside filter : 
  - `RTUCards.settings.config-actions.filter.rebuild`
  - *Will only be seen by the GM*
- New action inside deck parameters : 
  - `RTUCards.settings.config-actions.additionalData.removeBackFace`
  - *Will only be seen by the GM*
- New action for your decks : 
  - `RTUCards.default.sheet.actions.loopFaces`
  - `RTUCards.settings.sheet.labels.fromDeckLoopThroughFaces`
  - `RTUCards.settings.sheet.labels.fromHandLoopThroughFaces`
  - `RTUCards.settings.sheet.labels.fromRevealedLoopThroughFaces`
  - `RTUCards.settings.sheet.labels.fromDiscardLoopThroughFaces`
  - *Will only be seen by your players as long as the action is available*
  - *The four last ones have the same default value. Four keys to make it possible to have different action name depending on where the card is.*

  > I know this makes the translation file really big and difficult to maintain. Sorry for that. I'm thinking of a way to make it thinner but for now, didn't find a good solution

## Release 1.7.0

### Features
- Deck and Discards permissions are now taken into account:
 - Players with OWNER rights on those cards have almost the same available actions the GM have (except ***recall all cards***)
 - LIMITED rights on decks disable the draw action for those players
 - LIMITED rights on discards hide the cards contents (In GUI and in chat messages)

You can have more details about this feature inside the readme file.

### Issues
- When a **Exchange between players** was init by a player. He didn't have enough rights on the target stack to make the exchange successful.
- When registering a deck from a custom preset, discard pile had the same icon as the deck.
- Since 1.5.0, there were cases where card GUI wasn't refreshed after some actions.
- When giving a card to a player who had no main character, message was saying that the game master was retrieving the card.

### Images
- Core stacks now have reworked discard piles icons and background

## Release 1.6.1

### Translations
- A kind soul helped me fix my `en.json` file :)

### Issues
- When playing a card, the card description was only retrieved from the face text. (and not the card desc)

## Release 1.6.0

### Cleanup
- In README : Now separated in two files. The second is for the developers
- In presets : Remove unused fields. Now cards labels have been substitued by a translation key. That way, people will be able to add their own translation files.

> Warning : For the DivineTarot preset, I changed the card image names to be conform with the other decks. If you were using it, you will need to recreate it. (Otherwise, card images won't be displayed)

### Internationalization
- The README_DEVELOPERS explains how you can now add custom translation files

### Fixes :
- There were cases where `SingleCardDisplay` were badly used.

## Release 1.5.1

### Typos
- Some typos in deck labels

### GUI improvment
- Scrollbar are now correctly visible on main display

## Release 1.5.0

### No more invasive code
- Everything that was done via overrides are now done via hooks. Setting `invasive code` has been removed.

### Some new decks
- Added new visuals for 52 card decks : pixel fantasy and french style
- Added 32 cards decks with same visuals

Decks are now available via preset if you want to do some slight changes to them before including them to the module.

## Release 1.4.1

### Fix for Swade system
- `CONFIG.Cards.presets.pokerDark` and `CONFIG.Cards.presets.pokerDark` can be removed by the game system, making the module crash. Those constants are not used anymore. (presets have been retrieved inside module)

## Release 1.4.0

### New actions
- Ability to exchange a card with another player

More details in the `README`, section `Action example : Exchanging card with another player`

> This action may evolve in future patchs de pending on people returns. Don't hesitate to leave a message in the issue section if this or another action doesn't match you needs.

### Conf panel : 
- It's now possible to modify card back via the config panel. You can also modify labels for actions and messages

![Additional parameters](docs/README_choosing_action_parameters.webp?raw=true)

More details in the `README`, section `Other available parameters for the deck`

### Warning : API Change
> Signature of CardActionParametersForCardSelection class has changed. 

Now it takes a `CustomCardStack[] fromStacks` instead of a `CustomCardStack from` in its constructor. 

In addition, callback now has a `CustomCardStack from` additional argument.

This change was motivated by the need of selecting a card stack before choosing the card.

## Release 1.3.4

### Issue: 
- Critical bug where custom card stack enrollment were not working on new worlds

## Release 1.3.3

### Issue: 
- With smaller GUI, scale transformation on card display didn't work well for custom implem. (Only the background was correctly resized)
- Shortcuts panels are now moving in a better way and their configuration sliders are more easily useable.

## Release 1.3.2

### Issue: 
- Laptop form error:  https://gitlab.com/adrien.schiehle/ready-to-use-cards/-/issues/1

## Release 1.3.1

### Bugfix: 
- Player could not move their shortcuts

## Release 1.3.0

### GUI changes: 
- Now, the GUI remembers where you were inside scolls
- There was a problem while displaying a single card from the deck: Default deck actions were available.

### Shortcuts on canvas
This version comes with some new GUI for quick access of you hand card and your revealed cards.

![Shortcut display](docs/README_shortcut_display.webp?raw=true)

More details in the `README`, section `Using the shortcuts`


## Release 1.2.0

### GUI changes
Splitting action on card stack and on selected card:
- On the left side : Actions on card stack
- On the right side : Actions on selected card

### Actions modifications
- Rotating card action now only turn the selected card.
- Peeking action can now be stopped without having to press F5

### New actions
- Draw cards can now be done by player via their hand and revealed cards stack


## Release 1.1.0

Initially this module was part of my own system and I chose to split it to let other benefit from it.

During the split, I failed to see that class overrides will obviously be badly seen by most. Error fixed!

> No more overrides on the Card class. And the two other ones can be removed with new settings.

You won't loose much from the functionnalities if you choose to remove the overrides.

More details in the `README`, section `Invasive code - or not`

For those who started to implement custom actions : `impl.alterBuildCardInfoForListing` changed its signature. (it now pass a CustomCardStack in the `from` argument)
