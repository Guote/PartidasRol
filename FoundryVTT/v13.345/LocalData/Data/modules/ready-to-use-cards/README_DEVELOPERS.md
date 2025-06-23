# Ready To Use Cards Module - Developers part

## Introduction

Most of those actions will need you to create a module to add addtional code / resources.

If you're not familiar on how to do this, you can either follow the available tutorial : [Tutorial] (https://foundryvtt.com/article/module-development/), or simply use this module 'as it is'. You can still do many things with what is described in the [README](./README.md)

> If you think a basic action is missing inside what I deliver, I strongly suggest you open an issue inside the gitlab project. I will gladly try to add it in a future release.

## Other language support

In RTUC, every labels comes from the [lang files](./lang/en.json). Be it an action name, a chat message, or **even the cards names**.

it's structured as follow :

~~~json
{
"RTUCards.settings.xxxxx": "Label used inside the different configuration panels",
"RTUCards.sidebar.xxxxx": "For context menu inside sidebar",
"RTUCards.coreStacks.suffix.xxxxx": "Used for altering card stack names when registering new decks",
"RTUCards.user.xxxxx": "Labels related to each player hands and revealed cards",
"RTUCards.gm.suffix.xxxxx": "Same, but for GMs stacks",

"RTUCards.default.cards.xxxxx": "Every card name are stored here.",
"RTUCards.default.messages.xxxxx": "It stores chat message for each action. Message may not be the same if the action is done from a deck, a hand or a pile.",
"RTUCards.default.sheet.actions.xxxxx": "Classic action labels",
"RTUCards.default.sheet.parameters.xxxxx": "Used by complex actions needing additional choices. Like the exchange card action",
}
~~~

You just need to add an additional lang file inside your module to translate everything. (No need to use Babel for translating Compendium names, since no names are directly stored in the cards.)


## Changing labels for specific decks

You may want to use the classic cards or actions, but want some fancy labels which are a better match for your world.

For example, if you're playing in a world of magic and your cards represent spells, you may want to replace :
- the card ***"Queen of heart"*** by ***"Love spell"***
- the action ***"Play card"*** by ***"Cast a spell"***
- the message ***"A card has been drawn"*** by ***"is incanting a spell"***

This is how it should be done :
- Create a lang file in your module
- Add those lines inside it
~~~json
{
    "myModulePrefix.cards.heartsQueen.label": "Love spell",
    "myModulePrefix.sheet.actions.playCard": "Cast a spell",
    "myModulePrefix.message.play.hand.one": "is incanting a spell",
}
~~~
- Edit your deck settings and link to this prefix :

![Choosing prefix](docs/README_choosing_prefix.webp?raw=true)

By doing so, every labels present in your translation files will be used for this deck. The others will fall back to the `RTUCards.default.xxxx` labels.


## Dynamically create custom decks when the world inits

If you're creating your own game system, you may want the decks to be directly available when the world starts.

The decks will be created with their related discard and you will have access to some advanded configuration for them.

### The Hook named 'loadCardStacksDefinition'

This is where you will need to add code :

~~~js
Hooks.on("loadCardStacksDefinition", (cardStacksDefinition) => {
	// Alter cardStacksDefinition here
});
~~~

### Editing the card stack definition

The stack definition structure is defined [here](./module/StackDefinition.js).

It has some part that can be altered, and some others wich contains some convenience methods or enums : 
~~~json
{
"cardStacksDefinition.playerStacks": "Used data for creating player hands and revelead cards stack. If you change those values, it will be taken into account when creating those stack.",

"cardStacksDefinition.gmStacks": "Same data, but for the GMs stacks",

"cardStacksDefinition.shared": "Enums and tools you can used in your code",

"cardStacksDefinition.core.xxxx": "Each child represent a stack definition. If you add new ones, they will be automatically created on world start",
}
~~~

Here is an implementation example of what can be done : 

~~~js
cardStacksDefinition.playerStacks.resourceBaseDir = 'systems/acariaempire/resources/cards/event';
cardStacksDefinition.gmStacks.resourceBaseDir = 'systems/acariaempire/resources/cards/event';

cardStacksDefinition.core.event = {
    cardClass: AEEventCard,
    labelBaseKey : 'AESYSTEM.cards.event.',
    resourceBaseDir : 'systems/acariaempire/resources/cards/event',
    presetLoader: loadEventCards,
    defaultSettings: { // Will be the actions used by default, if the deck config is not unlocked
        actions: {
            'dealCard-GHDE': true,
            'dealCard-GRDE': true,
            'dealCard-PHDE': true,
            'dealCard-PRDE': true,
        },
        labels: {
            'dealCard-deal': 'Event dealing'
        },
        parameters: {
            'moveCard-discardOne-discardAll': '1'
        }
    }
};
~~~

If `cardClass`, `labelBaseKey`, or `resourceBaseDir` are missing, they will be replaced by their default values : 
~~~js
// Load default values
Object.values(def.core).forEach( coreStrackDefinition => {
    const c = coreStrackDefinition;
    if( !c.cardClass ) { c.cardClass = CustomCardSimple; }
    if( !c.labelBaseKey ) { c.labelBaseKey = 'RTUCards.default.'; }
    if( !c.resourceBaseDir ) { c.resourceBaseDir = 'modules/ready-to-use-cards/resources/default'; }
});
~~~
> The cardClass named `AEEventCard` will be explained later.

### Loading the cards

You can either use `preset` or `presetLoader`. But you will need one of those two : 
~~~js
cardStacksDefinition.core.xxx.preset: 'systems/xxxxx/cards.json',
cardStacksDefinition.core.xxx.presetLoader: async () => return CardData[]
~~~

### Choosing the available actions

The `defaultSettings.actions` part will allow you to directly choose which actions will be available on this deck.

Missing actions keys will be considered as not chosen for this deck.

Check the `StackConfigurationGroup` inside `constants.js` for the diffirent action groups and actions :

## Before going further : Understanding the `cardClass`

~~~js
cardStacksDefinition.core.xxxx = {
    cardClass: AEEventCard,
    //....
};
~~~

The `cardClass` is used for many things and store the custom behavior of your cards. 

> It doesn't have to be your `CONFIG.Card.documentClass`. The class will be dynamically instancied when needed.

[CustomCardSimple](./module/CustomCardSimple.js) is used for all the pre-registered card stacks. It does nothing specific but you will be able to see here which methods you can implement

This is what you can do :
- Changing the available actions when the card is inside the deck / a player card stack / or inside the discard pile
- Creating new custom actions
- Modifying The card display by directly editing the `<div>` html element
- Altering how the card will be listed when played

Each following chapters will focus on describing one of this options by explaining the available methods present in `CustomCardSimple`

You have a full example of what can be done [here](https://gitlab.com/adrien.schiehle/acariaempire/-/tree/release-1.0.1/src/card)

## Changing the available actions for the cards

~~~js
    /**
     * You can modify the available actions when this selected card is inside the deck stack
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     * @param {boolean} detailsHaveBeenForced Normally, decks card are not visible. An action exist so that they become visible for gm.
     */
    alterLoadActionsWhileInDeck(actions, detailsHaveBeenForced) {}

    /**
     * You can modify the available actions when this selected card is inside the your hand
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     * @param {boolean} stackOwnedByUser if this is the current user hand
     * @param {boolean} detailsHaveBeenForced Normally, decks card are not visible. An action exist so that they become visible for gm.
     */
     alterLoadActionsWhileInHand(actions, stackOwnedByUser, detailsHaveBeenForced) {}

    /**
     * You can modify the available actions when this selected card is inside your revealed cards
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     * @param {boolean} stackOwnedByUser if this is the current user hand
     */
     alterLoadActionsWhileInRevealedCards(actions, stackOwnedByUser) {}

    /**
     * You can modify the available actions when this selected card is inside the discard pile
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     */
     alterLoadActionsWhileInDiscard(actions) {}

    /**
     * You can modify the common available actions for deck. Those actions are available even if no cards are selected
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     */
    alterLoadBasicActionsForDeck(actions) {}
~~~

When selecting a card inside the GUI, one of this method will be called.

The `actions` array will already be filled with the classic actions you will have allowed through configuration. Via  those methods you can alter the action list :

~~~js
    /**
     * You can modify the available actions when this selected card is inside your revealed cards
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     * @param {boolean} stackOwnedByUser if this is the current user hand
     */
     alterLoadActionsWhileInRevealedCards(actions, stackOwnedByUser) {
        
        const stacksDef = game.modules.get('ready-to-use-cards').stacksDefinition;

        const cls = stacksDef.shared.cardClasses.customCardStack;
        const sourceStack = new cls(this.card.source);
        const deckConfig = sourceStack.stackConfig;
        
        const css = stacksDef.shared.actionCss;
        const tools = stacksDef.shared.actionTools;

        // Add actions related to trouble status change
        if( game.user.isGM || stackOwnedByUser ) {
            tools.addCssOnLastAction(actions, css.separator);
            tools.addAvailableAction(statusActionTab, deckConfig,  sourceStack, css.revealCard, 'sheet.actions.revealCard');
        }
    }
~~~

You can also empty the list if you don't want the classic actions : 
~~~js
    /**
     * You can modify the available actions when this selected card is inside your revealed cards
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     * @param {boolean} stackOwnedByUser if this is the current user hand
     */
     alterLoadActionsWhileInRevealedCards(actions, stackOwnedByUser) {
        actions.length = 0; // Clearing the action list
    }
~~~

Here is an example on how to add some basic actions for deck (basic : actions which doesn't need a card to be selected)
~~~js
    /**
     * You can modify the common available actions for deck. Those actions are available even if no cards are selected
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     */
    alterLoadBasicActionsForDeck(actions) {

        if( actions.length ) {
            actions[actions.length - 1].classes += " separator";
        }

        // Adding 4 custom actions, for each situation where the guardian spirit is changing mood
        Object.values(DECK_ACTIONS).forEach( actionKey => {
            const action = this.actionService.customGUIAction(
                game.i18n.localize('AESYSTEM.cards.trouble.sheet.actions.' + actionKey + '.actionButton'), 
                actionKey,
                true
            );
            actions.push(action);
        });
    }
~~~

## Creating new custom actions

One of the css class you can use for your action is `customAction`. When using it, you need to add an additionnal parameter to the `tools.addAvailableAction(...)` method. It will be stored inside html as `data-action="..."`

When clicked, it will call the `onClickDoCustomAction()` of your card class. You will then be able to choose what to do.

Example (Only one custom available displayed): 
~~~js
    /**
     * You can modify the available actions when this selected card is inside your revealed cards
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     * @param {boolean} stackOwnedByUser if this is the current user hand
     */
     alterLoadActionsWhileInRevealedCards(actions, stackOwnedByUser) {
        actions.length = 0; // Clearing the action list
        //....
        tools.addAvailableAction(statusActionTab, deckConfig,  sourceStack, css.customAction, 'sheet.actions.updateTrouble.actionButton', {action: 'trouble'} );
    }

    /**
     * You can add custom behavior when an action is clicked.
     * The wrapper will simply relay the information to the impl class
     */
     async onClickDoCustomAction(action) {

        if( action == 'trouble' ) {
            ChatMessage.create(...);
        }
    }
~~~

You can access to all methods of `CustomCardStack` inside those methods : 

~~~js
     async onClickDoCustomAction(action) {

        const stacksDef = game.modules.get('ready-to-use-cards').stacksDefinition;

        const cls = stacksDef.shared.cardClasses.customCardStack;
        const currentStack = new cls(this.card.parent); // This is the instance for the current stack the card is in
        const sourceStack = new cls(this.card.source); // This is the instance for the deck defining this card
    }
~~~

## Alter the card display

By default, the card will be displayed as a simple image (the one given in preset).

But you can choose to fill the html with more data :

~~~js
    /**
     * You can alter the .card-slot content when this card is selected and visible.
     * Wrapper has already added this.guiClass as a css class of the element
     * @param {HTMLElement} htmlDiv .card-slot htmlElement
     */
    alterFillCardContent(htmlDiv) {}
~~~

Here is an example of what can be done :

~~~js
    /**
     * You can alter the .card-slot content when this card is selected and visible.
     * Wrapper has already added this.guiClass as a css class of the element
     * @param {HTMLElement} htmlDiv .card-slot htmlElement
     */
     alterFillCardContent(htmlDiv) {

        const data = { impl: this, gui: {} };
        data.gui.defaultEvent = eventTypeList().find( e => e.key === 'default' ).description[0];

        const spiritDef = this.spiritDefinition;
        data.gui.elementImg = spiritDef.element.icon;
        data.gui.effectImg = spiritDef.effect.icon;
        data.gui.effectDesc = spiritDef.effect.description.reduce( (result, current) => result += ' ' + current );
        data.gui.bonusImg = spiritDef.bonus.icon;
        data.gui.bonusDesc = spiritDef.bonus.description.reduce( (result, current) => result += ' ' + current );
        
        // Substituting data from card-content.hbs
        const content = templates.cardContent(data, {
            allowProtoMethodsByDefault: true,
            allowProtoPropertiesByDefault: true
        });
        htmlDiv.innerHTML = content;
    }
~~~
![Custom Event card display](docs/README_fill_html.webp?raw=true)


## Alter how the card will be displayed when played

By default, the card will be listed like this :

![Classic card listing](docs/README_draw_card_playerView.webp?raw=true)

When playing a card, you may have an added description :

![Classic card listing](docs/README_play_card.webp?raw=true)

You can change what is displayed through this method : 

~~~js
    /**
     * You can modify the content which will be displayed on chat when manipulating this card.
     * Will be used on several actions, like play, discard or reveal.
     * You should directly alter the result param if you want to add changes. (returns nothing)
     * @param {object} result What will be used if you change nothing.
     * @param {CustomCardStack} from Where the card was previously
     * @param {boolean} addCardDescription : If description should be added for each card
     */
    alterBuildCardInfoForListing(result, from, addCardDescription) {}
~~~

`result` as some data in it. The follow ones can be overriden : 

~~~js
const result = {
            icon: '', // Left icon
            name: '', // Label to display
            rotated: 0, // When click inside chat, should the card be flipped?
            description: [] // string[]
        };
~~~

Example : 

~~~js
    /**
     * You can modify the content which will be displayed on chat when manipulating this card.
     * Will be used on several actions, like play, discard or reveal.
     * You should directly alter the result param if you want to add changes. (returns nothing)
     * @param {object} result What will be used if you change nothing.
     * @param {CustomCardStack} from Where the card was previously
     * @param {boolean} addCardDescription : If description should be added for each card
     */
     alterBuildCardInfoForListing(result, from, addCardDescription) {

        if( addCardDescription ) {
            result.description = [this.quantity.name];
        }
    }
~~~
