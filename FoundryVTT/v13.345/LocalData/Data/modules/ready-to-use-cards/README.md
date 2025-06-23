# Ready To Use Cards Module

## Introduction

### The mindset
This module has been developped with the following mindset : 

- You don't need to edit your card deck during the game. Once set, you only need to have easy acces to your cards, related decks and discard piles.
- Each player should be able to have cards in his hands (Only visible by him. Even GMs can't see them) and cards in front of him, visible by everyone. When adding this module, those two card stacks will be created for each player. (It's still possible to remove the Hand or Revealed cards stack inside settings)
- GMs share only one Hand and Revealed cards stack
- Multiple decks can be used. Each one comes with its related discard pile.
- What is important is : For each card type, which action is available when handling decks, hands, revealed cards and discard piles. All this is customizable via settings.

### Supported languages

This module is currently available in French and in English.


## Choose the decks you want

### Comes with Ready to use decks

Inside the settings, you will be able to toggle those decks : 
- Poker deck, with golden cards (Thanks to Foundry beautiful card images)
- Poker deck, with red and grey cards (idem)
- Tarot deck, classic game (Spades, Hearts, Diamonds and Clubs. With Thrumps)
- Tarot deck, divinatory version (Swords, Cups, Money and Clubs. With major arcanas)
- Zodiac sign deck, a card for each zodiac sign. (Because I found beautiful free cards for it)

For those decks, on click in the settings and all is ready to use !
![Setting panel](docs/README_choosing_decks_button.webp?raw=true)

Alternative: 

![Regiter deck alternative](docs/README_choosing_action_alternative.webp?raw=true)

And then uncheck actions you don't want to have :

![Choosing decks](docs/README_choosing_decks.webp?raw=true)

### Add custom decks

> The GUI won't change as long as the stack is not registered inside this module decks.

You can still create other decks. The same way you did it before. 

Once you're done, you can add the deck to the registered ones :

![Regiter deck](docs/README_register_deck.webp?raw=true)

By doing so, a second stack for the discard will automatically be created. And now you will have access to this module GUI !

![Regiter deck result](docs/README_register_deck_result.webp?raw=true)

If you want to make slight changes (like adding Jokers) from preconfigured decks, presets are available :

![Available presets](docs/README_register_deck_presets.webp?raw=true)


## Choosing which actions you want for your cards

### The config panel

The conf panel for choosing them is available by two methods :
- Directly inside the Configure Settings window
- By a Right-click on a registered card stack

![Choosing actions access](docs/README_choosing_action_access.webp?raw=true)

If you choose the second method, config panel will directly be set on the click stack.

![Choosing actions result](docs/README_choosing_action_result.webp?raw=true)

Each checkbox is linked to a possible action in the main GUI.

### Additional data for a deck

Appear when a deck is unfolded. This first paragraph gives you additional information on this deck, and let you decide some general parameters :

![Additional parameters](docs/README_choosing_action_core_parameters.webp?raw=true)

> Those parameters are for an advanced usage of this module. If you just want to know how to select the available actions for your deck, you can skip those details 

**Used prefix for labels**

Most of the decks only have this parameter.

It indicates RTUC where to search for labels when cards of this deck are played. Labels for deck name, actions or chat messages are constructed with a prefix depending from the deck. (It will try with the given prefix, and fallback to `RTUCards.default.` if not found ).

You will have more details on how this works inside [README LABELS](./README_DEVELOPERS.md)

**Revealed cards put face down**

By default, revealed cards are handled the same way the some way has the hand stacks. This options can allow players to reveal cards face down.

When this option is chosen, the revealed cards are directly put face down and the other players don't see anything in chat. (Same behavior as when players draw cards in their hand)

**The deck configuration is locked**

This parameter only appear when a deck has been registred inside RTUC via hooks. By unlocking it, you will be able to modify what has been defined in the hook.

If you lock it back, it will fallback to the default settings defined in the hook.

> With version 1.10.0, the hook signature has slightly changed, and available actions for the deck have to be defined differently.  When migrating from a previous version, this parameters will be set to `unlocked` so that you won't loose your previously defined actions.

> Once you're sure the module/system calling the hook has also been updated, you can lock it back. It will then retrieve the defaultSettings from the hook.

When a deck configuration is locked, you can dwelve into action categories to see which actions have been chosen, but you won't be able to change them.

### Actions are grouped by categories

You will first see actions for deck and discard cards. Those actions are for GMs. (Some of them are also accessible to players if you give them ownership on those stacks.)

For each of these action groups, will you be able to define where this action can be done, and by who :

![Choosing actions grid](docs/README_choosing_action_grid.webp?raw=true)

And depending on which options you took, you will be able to define additionnal properties :

![Choosing actions params](docs/README_choosing_action_params.webp?raw=true)

All those properties have default values. Apart from the button text, a next chapter will describe the utility of each one.

When an action group is folded, the square icon will help you see if you took :
- All related actions : the box is checked
- Some of the related actions : the box has a minus sign inside it
- No related actions have been chosen : the box is empty

Some actions groups have no grid : It just means that there is only on action related to this group.

### Some rules for the card stacks

**Player card stacks rules :**
- Hand is visible only by owner. Revealed cards are visible by everybody. It's the same for the GM card stacks.

**Decks and Discard piles rules :**
- Only the GM can do actions on them.


### Action group : Peeks on cards

By default, GM can't see a player hand, but there are some cases where it can be useful. Mainly for assisting a player who hasn't understood one of its cards.

With this action, the GM may see other player cards, or even the deck cards.

**If the GM choose to do so, players will be warned**

![Peeking on warning](docs/README_peek_on_hand_warning.webp?raw=true)

This is what he will see by default :

![Before peeking on](docs/README_peek_on_hand_default.webp?raw=true)

And once he clicks on the `Peek on content` button :

![After peeking on](docs/README_peek_on_hand_after.webp?raw=true)


### Action group : Moving a card through stacks

It regroups multiple actions, each one making a card go from a stack to another :
- Discard card
- Give card
- Put a card back inside the deck

Its grid is the most complex one. When you put the mouse cursor on top of one of the grid boxes, it will let you see which action is concerned.

![Move through stacks](docs/README_choosing_move_grid.webp?raw=true)


**All discard in batch & Detailed messages**

![Batch discard](docs/README_choosing_move_params.webp?raw=true)

This will add a button on left side to discard all card of this type. If not set, the discard will need to be done by selecting each card one by one.

### Action group : Play cards

This one has mulitple parameters, allowing different play modes :

![Play cards params](docs/README_choosing_play_params.webp?raw=true)

**Playing card mode**

- Single card : Card play is free. Card are played one by one.
- Multiple cards : Card play is stil free. You can play multiple cards in one action. See `Multiple cards paly range` for more information.
- Card cost : For playing a card, you will need to discard some others. See `Amount of discarded cards` for more information

**Show played cards in chat**

By default, only the card name and description is shown in chat. 

![Basic play message](docs/README_play_card.webp?raw=true)

By setting it to `1`, the card image will also be put in the message.

![Card shown when played](docs/README_choosing_play_message.webp?raw=true)

**Multiple cards play range**

Only used if the `Playing card mode` is set to Multiple cards.

When click on the button for playing a card, you will have access to a second panel, allowing you to select additional cards.

![Multiple card selection](docs/README_play_multiple.webp?raw=true)

This parameter allows you to define the min and max amount of cards that have to be added.

You have to use one of the following syntaxes :
- a range. Example `0-2`. 
- a simple number. Example : `1`. ***In this case, min and max will have this number value.***
- a card attribute. Example : `$value`. ***In this case, it will try to retrieve this attribute on the card data. This attribute value should be a number or a range***

**Amount of discarded cards**

Only used if the `Playing card mode` is set to Card cost.

Works like the `Multiple cards plays range` attribute, except that the card will be labelled as discard instead of played. 

If the `Show played cards in chat` has been set to `1`, those card image won't be displayed in chat. Only the first selected card image will be displayed.

### Action group : Exchanging card with another player

For this action, you need to choose two things :
- With who you want to exchange cards
- Selecting the card to exchange with inside his hand or revealed cards

![Exchanging cards](docs/README_exchange_cards.webp?raw=true)

### Action group : Looping through card faces

This action can be done as long as the card is visible for you and you own the stack.

You also need to have multiple faces for your card or this action won't be displayed.

![Flipping cards](docs/README_choosing_flip_params.webp?raw=true)

**Card back is included**

By default, the card back is considered as a valid card face, making all cards having at least two faces. You can choose to remove this face from the available faces by setting this parameter to `0`


### Action group : Rotating selected card

This one is slightly different from the others : It actually doesn't add any changes to the card. Only the GUI is altered. The card is put upside down.

Mainly useful for cards who can be read from the two ways.



## Changing icons and card default background

This functionnality is available for decks and discard piles. Only the GMs are allowed to do it.

It can be accessed via the main display :

![Config icons](docs/README_config_icons.webp?raw=true)

**Why two images?**

Be it Actors, Items, or Card stacks, their are represented inside Chat or Right panel via a square. That's not the ideal format for cards. So I'm using two different images: 

![Additional parameters](docs/README_icons_and_back.webp?raw=true)



## Using Hand and Revealed cards summary

When you add the module, two panels will be displayed on your canvas :

![Shortcut display](docs/README_shortcut_display.webp?raw=true)

### Configuring your panels

This configuration is available for each player.

The configure panel can be opened via the module settings panels, or directly via a right click on the left icon of one of the two panels.

![Shortcut config](docs/README_shortcut_configuration.webp?raw=true)

In it, you can:
- Hide unwanted panel
- Change their left icon
- Change the amount of displayed cards
- Make the panels really small, or really big
- Toggle Hands and Revealed cards of other players

If you choose to display 0 cards, the panel will instead display the summary of the stack :

![Shortcut zero cards](docs/README_shortcut_zero_cards.webp?raw=true)

> There is also a keyboard binding `Shift + H` that allows the toggling of those two panels. This binding comes on top of thse configurations.

### Moving your panels

The left icon of each shortcut is draggable. Use them to move your shortcuts where you want.

### Available actions on panels

- Clicking on a card will make the stack display pop out, with the given card selected
- Left and right brackets can help you see what you have (Loop through cards)
- The eye icon in the summary simply open the stack display


## Hide/Display card listing inside main UI

![Manage card listing](docs/README_config_listing.webp?raw=true)

### By clicking on the eye icon 

It will simply toggle the listing display.

### By using double clicks

- On selected card : Will also toggle the listing display
- On one of the cards of the list : Will select the card and hide listing


## Following the actions on the chat message

Each action comes with a message sent to the chat log.

Some messages such has the drawing card part are not displayed the same way depending on if you own the stack or not.

What the other player will see : 

![Draw seen by other](docs/README_draw_card_otherView.webp?raw=true)

What the player will see :

![Draw seen by player](docs/README_draw_card_playerView.webp?raw=true)

And when they clicks on the link : 
![Draw details](docs/README_draw_card_clicked.webp?raw=true)

## Playing with card stack permissions

Once registered, decks and discard piles are set with default permissions to OBSERVER.

You can alter those permissions for each players if you want to change the default behavior :

![Playing with permissions](docs/README_permissions.webp?raw=true)

> You don't have access to this panel for player hands and revealed cards. What can be done for there are directly managed by code and you should not alter the default permissions put on these.

### Changing decks permissions

By default, permissions are set to OBSERVER to everyone.

If you change it to :
- OWNER : 
  - Players with this permission will have access to almost all available GM actions on the deck.
  - The only missing action is ***Recall all cards***, since it needs to own every stacks to be performed.
- LIMITED :
  - Players with this permission won't be able to draw cards from this deck, even if the ***Draw card*** action is allowed in settings.
  - The deck can still be viewed by players with this permission. Allowing them to know how many cards are left in the drawing pile.
- NONE :
  - Same restrictions as above.
  - Players can't see the deck anymore and won't be able to know hom many cards are left.

### Changing discards permissions

By default, permissions are set to OBSERVER to everyone.

If you change it to :
- OWNER : 
  - Players with this permission will have access to all available GM actions on the discard pile.
- LIMITED :
  - Players with this permission won't see the card details when other players use the ***Discard card*** action.
  - The discard can still be viewed by players with this permission. But they can only see how many cards have been discarded. Cards contents are hidden.
- NONE :
  - Same restrictions as above.
  - Players can't see the discard anymore and won't be able to know hom many cards are left.

> Warning : If you choose to give OWNER rights to players, they will have access to the actions ***Put it back in the deck*** and ***Shuffle all discard inside deck***. Those actions usually shuffle the deck after putting the cards inside it. If the player doing it doesn't have the OWNER rights on the deck, the shuffle step will be ignored and the cards will be put on the top of the deck. (`card.sort` remained unchanged)

## Additional configuration settings

![Configuration settings](docs/README_additional_configuration.webp?raw=true)

The first two ones are for the chatlog when GM is doing actions

`Smaller window` : Each player can choose if he wants the classic card stack display or if he prefers a smaller one. Smaller one may be mandatory if you use a laptop screen which is most of the time smaller.

`Cards in hands` and `Revealed cards` can be toggled to delete players hands or revealed cards. That way, Players will only have one stack to manage. But the related actions won't be available anymore.

`Peek on player's hand` : Uncheck it if you don't want to be tempted !

## For advanced users

There are some more stuff that can be done. Since it can be a little complicated, I've stored those feature description in a separated file : [README DEVELOPERS](./README_DEVELOPERS.md)

Here is a summaray of what can be done : 
- Adding other language support.
- Changing labels for action names and messages when actions are done.
- Making more complex card display (not just an image) which can change after some actions
- Making your custom actions when cards are on the deck / inside your hands or revealed cards / inside discard.

## Credits for card images used in the preconfigured decks : 

- Zodiac signs : Designed by rawpixel.com. Downloaded from fr.freepik.com
- Divine Tarot : Source : Tarot de Marseille
Edition Grimaud, Downloaded from https://insightfulvision.fr/gallery-arcanes1.php
- Classic Poker : LGPL, Downloaded from https://fr.wikipedia.org/wiki/Jeu_de_cartes_fran%C3%A7ais
- Classic Tarot : Designed by Edition Grimaud, Downloaded from https://commons.wikimedia.org/wiki/Category:Tarot_nouveau_-_Grimaud_-_1898
- Pixel Fantasy : Designed by Caz (https://cazwolf.itch.io/), Downloaded from https://cazwolf.itch.io/pixel-fantasy-cards?download 
- Shortcut icon for player hand : https://icon-library.com/icon/playing-cards-icon-0.html
- Shortcut icon for player revealed cards : https://icon-library.com/icon/playing-cards-icon-18.html
