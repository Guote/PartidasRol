import { cardStackSettings, deckBacksSettings, updateCardStackSettings, updateDeckBacksSettings } from "./tools.js";
import { GlobalConfiguration } from "./constants.js";
import { CustomCardGUIWrapper } from "./mainui/CustomCardGUIWrapper.js";
import { CARD_STACKS_DEFINITION } from "./StackDefinition.js";

const assertStackIsNotADiscardPile = ( customCardStack ) => {

    const discardPiles = Object.values(customCardStack.cardStacks.piles);
    if( discardPiles.find( p => p == customCardStack ) ) {
        throw 'Cards already in discard can\'t be discarded'; 
    }
}

const assertStackOwner = ( customCardStack, {forGMs=false, forPlayers=false, forNobody=false}={} ) => {

    const owner = customCardStack.stackOwner;
    if( !forGMs && owner.forGMs ) { 
        throw 'Card stacks forGMs can\'t do this action'; 
    }
    if( !forPlayers && owner.forPlayers )  { 
        throw 'Card stacks forPlayers can\'t do this action'; 
    }
    if( !forNobody && owner.forNobody )  { 
        throw 'Card stacks forNobody can\'t do this action'; 
    }
}

const assertStackType = ( customCardStack, {decks=false, hands=false, piles=false}={} ) => {

    if( !decks && customCardStack._stack.type == 'deck' ) { 
        throw 'Decks can\'t do this action'; 
    }
    if( !hands && customCardStack._stack.type == 'hand' ) { 
        throw 'Hands can\'t do this action'; 
    }
    if( !piles && customCardStack._stack.type == 'pile' ) { 
        throw 'Piles can\'t do this action'; 
    }
}

/**
 * Process the options for soon to be discarded cards
 * @param {CustomCardStack} discardStack Where the cards will go
 */
const optionsForDiscardedCards = ( discardStack ) => {
    const options = {
        chatNotification: false
    };
    const maxDiscardOrder = discardStack.sortedCardList.reduce( (_max, _card) => {
        const order = _card.getFlag('ready-to-use-cards', 'discardOrder') ?? 0;
        return Math.max(_max, order);
    }, 0);
    
    const discardFlags = {};
    discardFlags['flags.ready-to-use-cards.discardOrder'] = maxDiscardOrder + 1;
    discardFlags['flags.ready-to-use-cards.currentFace'] = 0;
    options.updateData = discardFlags;
    return options;
}

export class CustomCardStack {

    constructor(stack) {
        this._stack = stack;
        this.module = game.modules.get('ready-to-use-cards');

        // Some actions calls a reset. Also reset our flags
        const resetingFlags = {};
        resetingFlags['flags.ready-to-use-cards.currentFace'] = 0;
        resetingFlags['flags.ready-to-use-cards.discardOrder'] = 0;
        this._recallOptions = {
            chatNotification: false,
            updateData: resetingFlags    
        };
    }

    get stack() { return this._stack; }

    /**
     * @param {string} [alternativeCoreKey] Which coreStack key should be used. By default will use this.coreStackRef
     * @returns {string} Stack base name (without suffix for deck and discard)
     */
    retrieveStackBaseName(alternativeCoreKey=null) {
        const coreKey = alternativeCoreKey ?? this.coreStackRef;
        const coreStack = CARD_STACKS_DEFINITION.core[coreKey];
        return coreStack?.customName ?? game.i18n.localize(coreStack?.labelBaseKey + 'title');
    }

    /**
     * Present in Decks and Discard piles.
     * Gives the unique reference key to this stack definition
     * @returns {string} One of the CARD_STACKS_DEFINITION.core keys
     */
    get coreStackRef() {
        return this.stack.getFlag("ready-to-use-cards", "core");
    }

    /**
     * Prefix used by ActionService to differenciate actions
     */
     get prefixForActions() {
        const stackOwner = this.stackOwner;
        const type = this._stack.type;
        if( stackOwner.forNobody ) {
            return type == 'deck' ? "DE" :  "DI";
        } 
        
        if( stackOwner.forGMs ) {
            return type == 'hand' ? "GH" :  "GR";
        }

        return type == 'hand' ? "PH" :  "PR";
    }

    get backIcon() {
        return deckBacksSettings(this.coreStackRef).deckIcon;
    }

    get frontIcon() {
        return deckBacksSettings(this.coreStackRef).discardIcon;
    }

    get backDefaultImage() {
        return deckBacksSettings(this.coreStackRef).deckBg;
    }

    get frontDefaultImage() {
        return deckBacksSettings(this.coreStackRef).discardBg;
    }

    /**
     * Multiple parameters can induce the back to be a valid face
     * As long as one is checked, the back will be considered as a valid face
     */
    get backIsAValidFaceForCards() {

        // CoreParam 'revealedFaceDown' can need the back to be a valid face
        const putFaceDown = this.module.parameterService.areRevealedCardsPutFaceDown(this.coreStackRef);
        if(putFaceDown) {
            return true;
        }

        // Flip action can need the back to be a valid face
        const possibilities = this.module.actionService.getActionPossibilities(this.coreStackRef, ["flipCard"]);
        const actionDef = possibilities.find( a => a.action === "flip" );
        const paramValue = actionDef?.parameters.find(p => p.param = "includeBack").current;
        return paramValue && this.module.parameterService.parseBoolean(paramValue);
    }

    /**
     * Retrieve a translated label based on what was define as CARD_STACKS_DEFINITION.core.key.labelBaseKey
     * If not found, fallback to RTUCards.default.default.
     * @param {string} labelPath label suffix (will be completed for retrieve real label key)
     * @param {string} [alternativeCoreKey] Which coreStack key should be used. By default will use this.coreStackRef
     * @returns {string} A localized label
     */
    localizedLabel(labelPath, {alternativeCoreKey=null}={}) {
        const coreKey = alternativeCoreKey ?? this.coreStackRef;
        const coreStack = CARD_STACKS_DEFINITION.core[coreKey];
        const coreTitle = this.retrieveStackBaseName(alternativeCoreKey);

        let label;
        if(CARD_STACKS_DEFINITION.core.hasOwnProperty(coreKey) ) { 
            // Some stack have no coreKey stored. Such as player hands
            const fullPath = coreStack.labelBaseKey + labelPath;
            label = game.i18n.localize(fullPath);
            if( label === fullPath ) { label = null; }
        }

        if( !label ) { // Default translation
            const defaultPath = "RTUCards.default." + labelPath;
            label = game.i18n.localize(defaultPath);
            if( label === defaultPath ) { label = null; }
        }

        if( label == null ) { // No translation
            label = labelPath;
        }

        return label.replace('STACK', this.stack.name).replace('CORE', coreTitle);
    }
    
    /** @returns {CustomCardStackLoader} the loaded, which also reference all stacks */
    get cardStacks() {
		return game.modules.get('ready-to-use-cards').cardStacks;
    }

    get stackOwner() {
        const value = this.stack.getFlag("ready-to-use-cards", "owner");
        const forGMs = value == 'gm';
        const forNobody = (value == 'none' || ! value );
        const forPlayers = !forGMs && !forNobody;

        const result = {
            forGMs: forGMs,
            forNobody: forNobody,
            forPlayers: forPlayers
        };
        if( forPlayers ) {
            result.playerId = value;
        }

        return result;
    }

    get isMainDiscard() {
        return Object.values(this.cardStacks.piles).some( p => p._stack.id === this.stack.id );
    }


    /**
     * Available cards are sorted by types
     * Can be used for every type of stacks
     */
    get sortedCardList() {
        const isMainDiscard = this.isMainDiscard;
        const cards = this.stack.type == 'deck' ? this.stack.availableCards : Array.from(this.stack.cards.values());
        cards.sort( (a,b) => {
            // First comparison on card source deck
            const aCore = ( new CustomCardStack(a.source) ).coreStackRef ?? '';
            const bCore = ( new CustomCardStack(b.source) ).coreStackRef ?? '';
            let result = aCore.localeCompare(bCore);
            if( result != 0 ) { return result; }

            // Main discard have an additionnal sorting order
            if( isMainDiscard ) {
                const aSort = a.getFlag('ready-to-use-cards', 'discardOrder') ?? 0;
                const bSort = b.getFlag('ready-to-use-cards', 'discardOrder') ?? 0;
                if( aSort != bSort ) {
                    return bSort - aSort; // Last removed one on top
                }
            }

            // Default sort
            return a.sort - b.sort;
        });
        return cards;
    }

    /**
     * Loop through all available cards and retrieve related coreStackRef
     * @returns {CustomCardStack[]} Distinct core stack refs
     */
    get decksOfAvailableCards() {
        const decks = this.sortedCardList.reduce( (_decks, _card) => {
            const customDeck = new CustomCardStack(_card.source);
            const key = customDeck.coreStackRef;

            const alreadyAdded = _decks.some( d => d.coreStackRef === key );
            if( !alreadyAdded ) { _decks.push(customDeck); }
            return _decks;
        }, []);
        return decks;
    }

    get ownedByCurrentPlayer() {
        const owner = this.stack.getFlag('ready-to-use-cards','owner');

        if( game.user.isGM ) {
            return owner == 'gm';
        } else {
            return owner === game.user.id;
        }
    }

    /**
     * Convenience function
     * Sort cards from this stack and return multiple arrays. One for each face amount and core stacks
     * @param {CustomCardGUIWrapper[]} customCards Already wrapped cards list (may come from different stacks)
     * @returns Array of { nbFaces: int, deck: CustomCards, cards: Card[] }
     */
    sortCardsByFaceAmountAndSource(customCards) {

        const result = [];
        customCards.forEach( c => {
            const deck = c._custom;
            const nbFaces = c.allFaces.length;
            const existing = result.find( r => r.nbFaces == nbFaces && r.deck.coreStackRef === deck.coreStackRef );
            if( existing ) {
                existing.cards.push( c.card );
            } else {
                result.push({
                    nbFaces: nbFaces,
                    deck: deck,
                    cards: [c.card]
                });
            }
        });
        return result;
    }

    /**
     * Convenience function
     * After sorted cards by nbFaces and coreStack, check for each stack if it needs to put revealed cards face down
     * Those who doesn't need it are push in a simple card list .noNeed
     * The others are push in sub lists inside .need
     * @param {string[]} [cardIds] Id for cards which should be is this stack. Ids which weren't found are ignored
     * @param {Cards[]} [cards] Cards to wrap
     * @param {CustomCardGUIWrapper[]} [customCards] Already wrapped cards list (may come from different stacks)
     * @returns {noNeed: Card[], need: { nbFaces: int, cards: Card[] }[] }
     */
    splitBetweenThoseNeedingFaceDownAndTheOthers({cardIds=null, cards=null, customCards=null}={}) {

        // Parse parameters
        const allCards = [];
        if( cardIds ) { allCards.push(... this.sortedCardList.filter( c => cardIds.includes(c.id) ).map( c => new CustomCardGUIWrapper(c) ) ); }
        if( cards ) { allCards.push(... cards.map( c => new CustomCardGUIWrapper(c) ) ); }
        if( customCards ) { allCards.push(... customCards); }
        const sorted = this.sortCardsByFaceAmountAndSource(allCards);

        const noNeedFaceDown = []; // Card[]
        const needFaceDown = []; // { nbFaces: int, cards: Card[] }
        sorted.forEach( res => {
            const revealedFaceDown = this.module.parameterService.areRevealedCardsPutFaceDown(res.deck.coreStackRef);
            if( !revealedFaceDown ) {
                noNeedFaceDown.push(... res.cards);
            } else {
                const existing = needFaceDown.find( nfd => nfd.nbFaces === res.nbFaces );
                if( existing ) {
                    existing.cards.push(... res.cards);
                } else {
                    const newOne = { nbFaces: res.nbFaces, cards: [] };
                    newOne.cards.push(...res.cards);
                    needFaceDown.push(newOne);
                }
            }
        });
        return { noNeed: noNeedFaceDown, need: needFaceDown };
    }

    /* -------------------------------------------- 
      Manual Registering management
    /* -------------------------------------------- */

    /**
     * Does the stack have the right flags to be handled correctly?
     * @returns {boolean} TRUE if the flags are here
     */
    get handledByModule() {
        return this.stack.getFlag("ready-to-use-cards", "owner") ? true : false;
    }

    /**
     * Some custom stacks can be added manually.
     * This is how we distinct them from others
     * @returns {boolean} TRUE if it is a custom stack
     */
    get manuallyRegistered() {
        return this.stack.getFlag("ready-to-use-cards", "registered-as") ? true : false;
    }

    /**
     * Add a new deck to the list of coreStacks handled by the module
     * Deck will be modified so that it has the right name and flags.
     * Then the related discard will be created.
     */
     async registerAsHandledByModule() {

        // 0: Verifs
        assertStackType(this, {decks:true});
        if( this.handledByModule ) { throw this.stack.name + ' is already handled by module'; }

        // 1: Edit the deck
        const updateData = {};
        updateData['name'] = this.stack.name + game.i18n.localize('RTUCards.coreStacks.suffix.deck');
        updateData['permission'] = {
            default: CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER
        };

        const flags = {};
        const defaultParameters = this.stack.getFlag('ready-to-use-cards', 'default-parameters');
        if(defaultParameters) {
            flags['default-parameters'] = defaultParameters;
        }

        flags['registered-as'] = {
            name: this.stack.name,
            desc: this.stack.description
        };

        flags['core'] = this.stack.id;
        flags['owner'] = 'none';
        updateData['flags.ready-to-use-cards'] = flags;
        await this.stack.update(updateData);

        const chosenStacks = cardStackSettings();
        chosenStacks[this.stack.id] = this.module.actionService.createSettingsForNewStack(this.stack);
        await updateCardStackSettings(chosenStacks);

        // 3: Reload all stacks
        const cardStacks = this.module.cardStacks;
        await cardStacks.loadCardStacks();
    }

    /**
     * Remove a maunally registered deck stack from the coreStacks handled by the module
     */
     async unregisterAsHandledByModule() {

        // 0: Verifs
        assertStackType(this, {decks:true});
        if( !this.manuallyRegistered ) { throw this.stack.name + ' was not manually registered'; }

        // 1: Reset the deck
        const coreKey = this.coreStackRef;
        await this.resetDeck();

        // 2: Rename deck and remove flag
        const chosenStacks = cardStackSettings();
        const updateData = {};
        const suffix = game.i18n.localize('RTUCards.coreStacks.suffix.deck');
        updateData['name'] = this.stack.name.replace(suffix, '');
        updateData['permission'] = {
            default: CONST.DOCUMENT_PERMISSION_LEVELS.NONE
        };

        updateData['flags.ready-to-use-cards'] = {
            core: null,
            'registered-as' : null,
            'owner' : null,
            'default-parameters' : chosenStacks[this.stack.id].parameters
        };
        await this.stack.update(updateData);

        // 3: Unflag this coreStack as chosen in settings
        delete chosenStacks[this.stack.id];
        await updateCardStackSettings(chosenStacks);
        await updateDeckBacksSettings(coreKey, null);

        // 4: Delete the related discard
        const cardStacks = game.modules.get('ready-to-use-cards').cardStacks;
        await cardStacks.piles[coreKey].stack.delete()

        // 5: Reload links
        await cardStacks.loadCardStacks();
    }

    /* -------------------------------------------- 
        Custom cardStack actions
    /* -------------------------------------------- */

    /**
     * 
     * @param {string} stackType 'deck', 'hand', or 'pile'
     * @param {string} action action name
     * @param {int} amount Amount of cards (will be used to define suffix)
     * @param {string} [alternativeCoreKey] Which coreStack key should be used. By default will use this.coreStackRef
     * @returns {string} The message label
     */
    getCardMessageFlavor(stackType, action, amount, {alternativeCoreKey=null}={}) { 
        
        const coreKey = alternativeCoreKey ?? this.coreStackRef;
        const amountSuffix = amount == 1 ? 'one' : 'many';
        
        const key = 'message.' + action + '.' + stackType + '.' +  amountSuffix;
        const label = this.localizedLabel(key, {alternativeCoreKey: coreKey});
        return label.replace('NB', '' + amount);
    }

    /**
     * Convenience method to send a message when stacks are modified
     * @param {string} flavor message flavor
     * @param {Cards[]} stacks List of stacks which should be listed
     */
     async sendMessageForStacks(flavor, stacks) {

        const preparedData = {
            from: {
                icon: this.stack.img,
                message: flavor
            },
            stacks: stacks.map( s => {

                const owner = s.stackOwner;
                const data = { uuid: s.stack.uuid, id: s.stack.id, name: s.stack.name };

                if( owner.forGMs ) {
                    data.icon = game.settings.get("ready-to-use-cards", GlobalConfiguration.gmIcon);
                } else {
                    const user = game.users.get( s.stackOwner.playerId );
                    data.icon = user?.character?.img ?? 'icons/svg/mystery-man.svg';
                }
                return data;
            })
        };
        const template = 'modules/ready-to-use-cards/resources/sheet/card-dealing.hbs';
        const html = await renderTemplate(template, preparedData);

        // Send message
        const userName = game.user.character?.name ?? game.user.name;
        const alias = game.user.isGM ? game.settings.get("ready-to-use-cards", GlobalConfiguration.gmName) : userName;
        const msgData = {
            content: html,
            user: game.user.id,
            speaker: {
                alias: alias
            }
        }
        return ChatMessage.create(msgData);
    };

    /**
     * Convenience method to send a message when cards are gained or discarded
     * @param {string} flavor message flavor
     * @param {Card[]} cards List of cards which should be listed
     * @param {boolean} [addCardDescription] : If description should be added for each card
     * @param {boolean} [displayCardImage] : Card image should also be added to chat
     * @param {boolean} [hideToStrangers] : If message should be hidden to strangers
     * @param {string} [sentToDiscard] : Discard stack id. When message is displayed, it will check if the player has enough rights to see the discard. If not, the card will be hidden
     * @param {boolean} [letGMSpeak] : If true, message will be formated as if it came from gmHand manipulaition
     */
     async sendMessageForCards(flavor, cards, {addCardDescription=false, displayCardImage=false, hideToStrangers=false, sentToDiscard=null, letGMSpeak=false} = {}) {

        const from = letGMSpeak? this.cardStacks.gmHand : this;
        const data = { cards: [] };
        for( const card of cards ) {
            const wrapper = new CustomCardGUIWrapper(card);
            const line = wrapper.buildCardInfoForListing(from, addCardDescription, displayCardImage);
            data.cards.push( line );
        }

        return from.sendMessageWithPreparedCardData(flavor, data, {hideToStrangers, sentToDiscard});
    };

    /**
     * Called inside sendMessageForCards once data have been prepared.
     * This method has been split into two in order to allow custom message from specific actions
     * @param {string} flavor message flavor
     * @param {object} preparedData Should contains a .cards[]
     * @param {boolean} [hideToStrangers] : If message should be hidden to strangers
     * @param {string} [sentToDiscard] : Discard stack id. When message is displayed, it will check if the player has enough rights to see the discard. If not, the card will be hidden
     * @returns 
     */
    async sendMessageWithPreparedCardData(flavor, preparedData, {hideToStrangers=false, sentToDiscard=null} = {} ) {

        const template = 'modules/ready-to-use-cards/resources/sheet/card-listing.hbs';
        const html = await renderTemplate(template, preparedData);

        const msgData = {
            flavor: flavor,
            content: html
        };

        // Who will speak ?
        msgData.speaker = {}
        const stackOwner = this.stackOwner;
        if( stackOwner.forPlayers ) { 
            const user = game.users.find( u => u.id === stackOwner.playerId );
            if( user ) {
                const speakerActor = user.character;
                if( speakerActor ) {
                    msgData.speaker.id = speakerActor?.id;
                    msgData.speaker.alias = speakerActor?.name;
                } else {
                    msgData.speaker.alias = user.name;
                }
            }
            
        } else {
            msgData.speaker.alias = game.settings.get("ready-to-use-cards", GlobalConfiguration.gmName);
        }
        msgData.user = game.user.id;

        // Flags used when handling click on this message
        msgData["flags.ready-to-use-cards.handleCards"] = {
            hideToStrangers: hideToStrangers,
            sentToDiscard: sentToDiscard,
            forGMs: stackOwner.forGMs,
            forPlayers: stackOwner.forPlayers,
            playerId: stackOwner.playerId
        };

        return ChatMessage.create(msgData);
    }


    /**
     * Draw some cards.
     * @param {CustomCardStack} from The deck you will draw from
     * @param {int} amount Amount of drawn cards. By default: 1
     * @returns {Card[]} The discarded cards
     */
     async drawCards(from, amount = 1) {

        assertStackOwner(this, {forGMs: true, forPlayers: true});

        const cards = from.sortedCardList.filter( (card, index) => index < amount );

        const stackType = this.stack.type;
        const inHand = stackType == 'hand';
        const revealedFaceDown = !inHand && this.module.parameterService.areRevealedCardsPutFaceDown(from.coreStackRef);

        // Different behavior when revealed face down is set
        //----------------------------------------------------
        const options = {chatNotification: false};
        const drawnCards = [];
        if( inHand || !revealedFaceDown ) {
            const newCards = await from.stack.pass(this.stack, cards.map(c => c.id), options);
            drawnCards.push(... newCards);

        } else {
            options.updateData = {};
            const cardLists = this.splitBetweenThoseNeedingFaceDownAndTheOthers({cards: cards}).need; // revealedFaceDown has been checked before. Will only return .need 
            for( let need of cardLists ) {
                options.updateData['flags.ready-to-use-cards.currentFace'] = need.nbFaces - 1;
                const cardList =  await from.stack.pass(this.stack, need.cards.map(c => c.id), options);
                drawnCards.push(... cardList);
            }
        }

        const action = from.stack.type == 'pile' ? 'drawDiscard' : 'draw';
        const flavor = this.getCardMessageFlavor(stackType, action, drawnCards.length);
        await this.sendMessageForCards(flavor, drawnCards, {hideToStrangers: (inHand || revealedFaceDown)});

        return drawnCards;
    }

    /**
     * Give some cards to a player
     * Do not use it to discard cards
     * @param {CustomCardStack} to The player which will receive the card
     * @param {string[]} cardIds The cards which should be transfered
     * @returns {Card[]} The transfered cards
     */
     async giveCards(to, cardIds) {

        assertStackIsNotADiscardPile(this);

        const stackType = to.stack.type;
        const toHand = stackType == "hand";
        const givenCards = await this.stack.pass( to.stack, cardIds, {chatNotification: false} );

        const flavor = to.getCardMessageFlavor(stackType, 'give', givenCards.length);

        // For message, parameter will depend on card origin
        const byCoreKeys = {};
        for( let card of givenCards ) {
            const coreKey = new CustomCardStack(card.source).coreStackRef;
            if( ! (coreKey in byCoreKeys) ) {
                byCoreKeys[coreKey] = [];
            }
            byCoreKeys[coreKey].push(card);
        }

        const paramKey = game.user.isGM ? "notifyOnGMAction" : "notifyOnPlayerAction";
        for( const [coreKey, cards] of Object.entries(byCoreKeys) ) {
            const param = this.module.parameterService.getParam(coreKey, "moveCard", "give", paramKey);
            const notificationAllowed = this.module.parameterService.parseBoolean(param.current);
            await to.sendMessageForCards(flavor, cards, {hideToStrangers: (toHand || !notificationAllowed) });
        }

        return givenCards;
    }


    /**
     * Exchange some of your cards
     * @param {CustomCardStack} withStack Card stack which have the receivedCardsId
     * @param {string[]} myCardIds Cards you will be separated
     * @param {string[]} receivedCardsId Cards you will get
     * @param {string[]} receivedCardsId Cards you will get
     * @returns {Card[]} Received Cards
     */
     async exchangeCards(withStack, myCardIds, receivedCardsId) {

        assertStackOwner(this, {forGMs: true, forPlayers:true});
        assertStackType(this, {hands: true, piles:true});

        const stackType = this.stack.type;
        const inHand = stackType == 'hand';

        const target = withStack.stack;

        const targetIsDiscard = Object.values(this.cardStacks.piles).find( p => p._stack.id === target.id );
        const giveOptions = targetIsDiscard ? optionsForDiscardedCards(withStack) : {chatNotification: false};
        const givenCards = await this.stack.pass( target, myCardIds, giveOptions );

        const receivedCards = await target.pass( this.stack, receivedCardsId, {chatNotification: false} );

        const allCards = [];
        allCards.push(...givenCards);
        allCards.push(...receivedCards);

        let flavor = this.getCardMessageFlavor(stackType, 'exchange', givenCards.length);
        flavor = flavor.replace('FROM', target.name );

        await this.sendMessageForCards(flavor, allCards, {hideToStrangers: inHand});

        return givenCards;
    }

    /**
     * Discard some cards.
     * Message will be grouped for each card type
     * @param {string[]} cardsIds cards Ids
     * @returns {Card[]} The discarded cards
     */
     async discardCards(cardsIds) {

        assertStackIsNotADiscardPile(this);

        const stackType = this.stack.type;

        let discardCards = [];
        for( let [coreKey, pile] of Object.entries( this.cardStacks.piles ) ) {
            const ids = cardsIds.filter( id => {
                const card = this.stack.cards.get(id);
                if( card ) {
                    const custom = new CustomCardStack(card.source);
                    return custom.coreStackRef === coreKey;
                }
            });
            const options = optionsForDiscardedCards(pile);
            const cards = await this.stack.pass( pile.stack, ids, options);

            if( cards.length > 0 ) {
                const flavor =  this.getCardMessageFlavor(stackType, 'discard', cards.length, {alternativeCoreKey: coreKey});

                const paramKey = game.user.isGM ? "notifyOnGMAction" : "notifyOnPlayerAction";
                const param = this.module.parameterService.getParam(coreKey, "moveCard", "discardOne", paramKey);
                const notificationAllowed = this.module.parameterService.parseBoolean(param.current);
                
                await this.sendMessageForCards( flavor, cards, {sentToDiscard: pile.stack.id, hideToStrangers: !notificationAllowed} );
        
                discardCards = discardCards.concat(cards);
            }
        }

        return discardCards;
    }


    /** 
     * Try to discarded a card by giving its id.
     * The card should be owner by this player.
     * Log in chat which card it was by linking to the Compendium ae-cards
     */
     async backToDeck(cardId) {

        assertStackOwner(this, {forNobody: true});
        assertStackType(this, {piles: true});

        const currentCard = this.stack.cards.get(cardId);
        const original = await currentCard?.recall(this._recallOptions);

        const coreKey = this.coreStackRef;
        const deck = this.cardStacks.decks[coreKey]?.stack;
        if( deck.testUserPermission(game.user, "OWNER") ) {
            await deck.shuffle({chatNotification: false});
        } else {
            console.warn('RTUC-Actions | You didn\'t have enough permissions to shuffle the deck. Skipped.');
        }
        
        const flavor = this.getCardMessageFlavor('pile', 'backToDeck', 1);
        const param = this.module.parameterService.getParam(coreKey, "moveCard", "backDeck", "notifyOnGMAction");
        const notificationAllowed = this.module.parameterService.parseBoolean(param.current);

        await this.sendMessageForCards(flavor,  [original], {letGMSpeak:true, hideToStrangers: !notificationAllowed} );
    }

    /** 
     * Try to put some cards back in its hand.
     * Cards should currently be in revealed cards
     * @param {string[]} cardsIds cards Ids
     * @returns {Card[]} The returned cards
     */
     async backToHand(cardIds) {

        assertStackOwner(this, {forGMs: true, forPlayers: true});
        assertStackType(this, {piles: true});

        const owner = this.stackOwner;
        const hand = owner.forGMs ? this.cardStacks.gmHand
                                  : this.cardStacks.findPlayerHand( game.users.get(owner.playerId) );


        // Revealed face down management
        //-----------------------------
        const cards = [];
        const options = {chatNotification: false};
        const splitted = this.splitBetweenThoseNeedingFaceDownAndTheOthers({cardIds: cardIds});
        if( splitted.noNeed.length > 0 ) {
            const newCards = await this.stack.pass( hand.stack, splitted.noNeed.map(c => c.id) , options);
            cards.push(...newCards);

            const flavor = this.getCardMessageFlavor('pile', 'backToHand', newCards.length);
            await this.sendMessageForCards(flavor, cards);
        }

        if( splitted.need.length > 0 ) {
            options.updateData = {};
            options.updateData['flags.ready-to-use-cards.currentFace'] = 0;

            const idsToRetrieve = splitted.need.reduce( (_res, _curr) => {
                _res.push(... _curr.cards.map(c => c.id) );
                return _res;
            }, []);

            const newCards =  await this.stack.pass( hand.stack, idsToRetrieve, options);
            cards.push(... newCards);

            const flavor = this.getCardMessageFlavor('pile', 'backToHand', newCards.length);
            await this.sendMessageForCards(flavor, cards, {hideToStrangers: true} );
        }
        return cards;
    }


    /** 
     * All cards which were stored in the discard will be put back to their decks
     */
     async shuffleDiscardIntoDeck() {

        assertStackOwner(this, {forNobody: true});
        assertStackType(this, {piles: true});

        const amount = this.sortedCardList.length;
        await this.stack.recall(this._recallOptions);

        const coreKey = this.coreStackRef;
        const deck = this.cardStacks.decks[coreKey]?.stack;
        if( deck.testUserPermission(game.user, "OWNER") ) {
            await deck.shuffle({chatNotification: false});
        } else {
            console.warn('RTUC-Actions | You didn\'t have enough permissions to shuffle the deck. Skipped.');
        }
        

        const flavor = this.getCardMessageFlavor('pile', 'backToDeck', amount);
        await this.sendMessageForCards(flavor,  [], {letGMSpeak:true} );
    }

    /** 
     * Play some cards from your hand.
     * It will go to the discard pile.
     * @param {string[]} cardsIds cards Ids
     * @returns {Card[]} The played cards (now in discard pile)
     */
     async playCards(cardsIds, {displayedInChat=false}={}) {

        assertStackOwner(this, {forGMs: true, forPlayers: true});
        assertStackType(this, {hands: true, piles: true});

        const playedCards = [];
        for( let [coreKey, pile] of Object.entries( this.cardStacks.piles ) ) {
            const ids = cardsIds.filter( id => {
                const card = this.stack.cards.get(id);
                if( card ) {
                    const custom = new CustomCardStack(card.source);
                    return custom.coreStackRef === coreKey;
                }
            });
            const cards = await this.stack.pass( pile.stack, ids, {action: 'play', chatNotification: false});

            if( cards.length > 0 ) {
                const flavor =  this.getCardMessageFlavor('hand', 'play', cards.length, {alternativeCoreKey: coreKey});
                await this.sendMessageForCards(flavor, cards, {addCardDescription: true, displayCardImage: displayedInChat});
        
                playedCards.push( ...cards);
            }
        }

        return playedCards;
    }

    /** 
     * Put some card in front of you. Visible to everybody
     * Cards should currently be in hand
     * @param {string[]} cardsIds cards Ids
     * @returns {Card[]} The revealed cards
     */
     async revealCards(cardIds) {

        assertStackOwner(this, {forGMs: true, forPlayers: true});
        assertStackType(this, {hands: true});

        const owner = this.stackOwner;
        const pile = owner.forGMs ? this.cardStacks.gmRevealedCards
                                  : this.cardStacks.findRevealedCards( game.users.get(owner.playerId) );

        // Revealed face down management
        //-----------------------------
        const options = {chatNotification: false};
        const cards = [];
        const splitted = this.splitBetweenThoseNeedingFaceDownAndTheOthers({cardIds: cardIds});
        if( splitted.noNeed.length > 0 ) {
            const newCards = await this.stack.pass( pile.stack, splitted.noNeed.map(c => c.id) , options);
            cards.push(...newCards);

            const flavor = this.getCardMessageFlavor('hand', 'reveal', newCards.length);
            await this.sendMessageForCards(flavor, cards, {addCardDescription: true} );
        }

        if( splitted.need.length > 0 ) {
            options.updateData = {};

            const newCards = [];
            for( let need of splitted.need ) {
                options.updateData['flags.ready-to-use-cards.currentFace'] = need.nbFaces - 1;
                const cardList =  await this.stack.pass( pile.stack, need.cards.map(c => c.id) , options);
                newCards.push(... cardList);
            }
            cards.push(... newCards);

            const flavor = this.getCardMessageFlavor('hand', 'reveal', newCards.length);
            await this.sendMessageForCards(flavor, cards, {addCardDescription: true, hideToStrangers: true} );
        }

        return cards;
    }

    /**
     * Deal some cards to player hands or revealed cards
     * @param {CustomCardStack[]} to Stack destinations
     * @param {int} amount  amount of cards which should be dealt
     */
    async dealCards(to, amount) {

        assertStackOwner(this, {forNobody: true});
        assertStackType(this, {decks: true});

        // Different behavior when revealed face down is set
        //----------------------------------------------------
        const options = {chatNotification: false};
        const revealedFaceDown = this.module.parameterService.areRevealedCardsPutFaceDown(this.coreStackRef);
        if( !revealedFaceDown ) {
            await this.stack.deal( to.map( ccs => ccs.stack ), amount, options);

        } else {
            const reveleadStacks = [];
            const handStacks = [];
            to.forEach( ccs => {
                const list = ccs.stack.type == "hand" ? handStacks : reveleadStacks;
                list.push(ccs);
            });

            await this.stack.deal( handStacks.map( ccs => ccs.stack ), amount, options);
            
            // Deal for revealed stack are simulated
            options.action = "deal";
            options.updateData = {};

            for( let revealed of reveleadStacks ) {
                const cards = this.sortedCardList.filter( (card, index) => index < amount );
                const cardLists = this.splitBetweenThoseNeedingFaceDownAndTheOthers({cards: cards}).need; // revealedFaceDown has been checked before. Will only return .need 
                for( let need of cardLists ) {
                    options.updateData['flags.ready-to-use-cards.currentFace'] = need.nbFaces - 1;
                    await this.stack.pass(revealed.stack, need.cards.map(c => c.id), options);
                }
            }
        }

        const flavor = this.getCardMessageFlavor('deck', 'deal', amount);
        await this.sendMessageForStacks(flavor, to);
    }

    /** 
     * Shuffle a deck.
     */
     async shuffleDeck() {

        assertStackOwner(this, {forNobody: true});
        assertStackType(this, {decks: true});

        await this.stack.shuffle({chatNotification: false});

        const flavor = this.getCardMessageFlavor('deck', 'shuffle', 1);
        await this.sendMessageForStacks(flavor, []);
    }

    /** 
     * Shuffle the discard.
     * Actually only update flags on each cards
     */
     async shuffleDiscard() {

        assertStackOwner(this, {forNobody: true});
        assertStackType(this, {piles: true});

        // New sort for the cards
        const twist = new MersenneTwister(Date.now());
        const forSorting = this.sortedCardList.map(c => {
            return {newOrder: twist.random(), card: c};
        });
        forSorting.sort((a, b) => a.newOrder - b.newOrder);

        // All updated in one go
        const toUpdate = forSorting.map((cardSort, index) => {
            const updatedData = { _id: cardSort.card.id };
            updatedData['flags.ready-to-use-cards.discardOrder'] = index;
            return updatedData;
        });
        await this.stack.updateEmbeddedDocuments("Card", toUpdate);

        // Sending message
        const flavor = this.getCardMessageFlavor('discard', 'shuffle', 1);
        await this.sendMessageForStacks(flavor, []);
    }

    /** 
     * Reset a deck.
     */
     async resetDeck() {

        assertStackOwner(this, {forNobody: true});
        assertStackType(this, {decks: true});

        const resetingFlags = [];
        resetingFlags['flags.ready-to-user-cards.currentFace'] = 0;
        await this.stack.recall(this._recallOptions);
        await this.stack.shuffle({chatNotification: false});

        const flavor = this.getCardMessageFlavor('deck', 'reset', 1);
        await this.sendMessageForStacks(flavor, []);
    }

}
