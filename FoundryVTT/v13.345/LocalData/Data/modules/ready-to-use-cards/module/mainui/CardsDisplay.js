import { CardActionParametersForCardSelection, CardActionParametersForPlayerSelection } from './CardActionParameters.js';
import { CustomCardGUIWrapper } from './CustomCardGUIWrapper.js';
import { CustomCardStack, STACK_SORT_CHOICES } from '../CustomCardStack.js';
import { GlobalConfiguration } from '../constants.js';
import { deckBacksSettings} from '../tools.js';
import { ConfigSheetForActions } from '../config/ConfigSheetForActions.js';
import { ConfigSheetForBacks } from '../config/ConfigSheetForBacks.js';

export class CustomCardsDisplay extends foundry.applications.sheets.CardDeckConfig {

    #listingOpened = true;
    get listingOpened() {
        return this.#listingOpened;
    }

    /* -------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["rtucards", "cards"],
        position: {
            width: 1200,
            height: 920,
        },
        actions: {
            configureActions: CustomCardsDisplay.configureActions,
            unregisterDeck: CustomCardsDisplay.unregisterDeck
        },
        window: {
            icon: "fas fa-cards"
        }
    }
    /** @override */
    static PARTS = {
        main: {
            template: "modules/ready-to-use-cards/resources/sheet/card-display.hbs"
        }
    }

    constructor(options) {
        super(options);

        this._cards = options.document;
        this._custom = new CustomCardStack(this._cards);
        this._currentSelection = null;
        this._forceRotate = false;
        this._peekOn = []; // List of deck keys on which the GM can peek on

        this._actionParameters = null;
        const resized = game.settings.get('ready-to-use-cards', GlobalConfiguration.smallDisplay);
        const configScale = resized ? 0.8 : 1;

        // Sheet options
        if( resized ) {
            this.options.classes.push('resized');
        }
        this.position.width = 1200 * configScale;
        this.position.height = 920 * configScale;
    }

    /** @override */
    get title() {
        let result = this._cards.name;
        const cards = this._custom.sortedCardList;
        if( this.currentSelection && cards.length !== 0 ) {
            const readableIndex = cards.findIndex( c => c.id === this.currentSelection.id ) + 1;
            result += ' ' + readableIndex + ' / ' + cards.length;
        }
        return result;
    }

    get currentSelection() {
        return this._currentSelection;
    }

    /**
     * Select a card among the available ones
     * If the card has been passed to another crd stack, it won't be selected
     * @param {string} cardId The card Id
     */
    selectAvailableCard( cardId ){
        this._currentSelection =  this._custom.sortedCardList.find( c => c.id === cardId );
    }

    selectFirstCard() {
        this._currentSelection = this._custom.sortedCardList[0];
    }

    get listingAllowed() {
        return !this._actionParameters;
    }

    get forceRotate() {
        return this._forceRotate;
    }

    set forceRotate(value) {
        this._forceRotate = value;
    }

    currentlyPeekingOnCard( card ) {
        const customDeck = new CustomCardStack(card.source);
        return this.currentlyPeekingOnCardType(customDeck.coreStackRef);        
    }

    currentlyPeekingOnCardType( coreStackRef ) {
        return this._peekOn.includes( coreStackRef );
    }

    togglePeekingOnCardType( coreStackRef ) {
        if( this.currentlyPeekingOnCardType(coreStackRef) ) {
            this._peekOn = this._peekOn.filter( k => k !== coreStackRef );
        } else  {
            this._peekOn.push( coreStackRef );
        }
    }

    /* -------------------------------------------- */

    /**
     * This allows to register / unregister the stacks inside the module
     * Same method as the one triggered inside CustomCardsDirectory. 
     * But only available one for those who have unchecked the 'Invasive code' settings
     * @override 
     * */
    _getHeaderControls() {
        const buttons = super._getHeaderControls().filter( b => b.action !== "configureSheet");

        // Only GM Actions
        if( game.user.isGM ) {

            // Access to action configuration
            if( this._custom.handledByModule && this._custom.stackOwner.forNobody ) {
                buttons.unshift({
                    label: "RTUCards.sidebar.context.configActions",
                    class: "configure-actions",
                    icon: "fas fa-cog",
                    action: "configureActions"
                });
            }

            // Allow unregistering of custom modules
            if( this._cards.type === 'deck' && this._custom.manuallyRegistered ) {
                buttons.unshift({
                    label: "RTUCards.sidebar.context.unregisterDeck",
                    class: "unregister-deck",
                    icon: "far fa-minus-square",
                    action: "unregisterDeck"
                });
            }
        }

        return buttons;
    }

    /** @this CustomCardsDisplay */
    static async configureActions(event, target) {
        const coreKey = this._custom.coreStackRef;
        // Prepare the sheet
        const sheet = new ConfigSheetForActions();
        sheet.stacks.forEach( s => {
            s.gui.detailsDisplayed = ( s.key === coreKey );
        });
        // And render it
        sheet.render(true);
        this.close();
    }

    /** @this CustomCardsDisplay */
    static async unregisterDeck(event, target) {
        await this._custom.unregisterAsHandledByModule();
        this.close();
    }


    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        this.#refreshCurrentSelection();

        data.currentSelection = this.buildCardInfo(this.currentSelection);
        if( !data.currentSelection.contentDisplayed ) {
            data.currentSelection.summary =
                this._custom.localizedLabel('sheet.contentHidden').replace('NB', '' + this._custom.sortedCardList.length);
        }

        const currentSort = this._custom.currentSortChoice;
        data.listing = {
            allowed: this.listingAllowed,
            opened: this.listingOpened,
            sort: {
                canBeChosen: this.listingOpened && !this._custom.isDeckStack && !this._custom.isMainDiscard,
                noSort: currentSort === STACK_SORT_CHOICES.DECK_ORDER,
                asc: currentSort === STACK_SORT_CHOICES.LOWEST_TO_HIGHEST,
                desc: currentSort === STACK_SORT_CHOICES.HIGHEST_TO_LOWEST
            },
            editBack : {
                displayed : game.user.isGM && this._custom.stackOwner.forNobody
            }
        };
        data.listing.cards = this._custom.sortedCardList.map( c => {
            const cardInfo = this.buildCardInfo(c);
            if( cardInfo.id === this.currentSelection?.id ) {
                cardInfo.classes += ' selected';
            }
            return cardInfo;
        });

        const actions = this.#loadAvailableActions();
        data.onLeft = {
            header: this._custom.localizedLabel('sheet.headers.defaultActions'),
            actions: actions.filter(a => a.onLeft)
        }
        data.onRight = {
            header: this._custom.localizedLabel('sheet.headers.selectedCardActions'),
            actions: actions.filter(a => !a.onLeft)
        }
        data.parameters = this._actionParameters?.loadParameters() ?? {none: true};

        return data;
    }

    /**
     * Make sure the card is still present on this card stack
     * This check is only done if there is no actionParameters currently in place
     */
    #refreshCurrentSelection() {
        if( !this._actionParameters ) {
            this.selectAvailableCard(this.currentSelection?.id);
        }
    }

    buildCardInfo(card) {
        const cardInfo = {};
        let wrapper;
        try { 
            wrapper = new CustomCardGUIWrapper(card);
        } catch( e ) {
            // Either : No cards, or an unregistered card stack
            wrapper = null;
        }

        // Check if the content should be displayed or hidden
        if( card ) {
            cardInfo.id = card.id;
            cardInfo.displayed = this.currentlyPeekingOnCard(card) || wrapper?.detailsCanBeDisplayed;

        } else {
            cardInfo.displayed = false;
        }

        // Add custom data for display
        if( cardInfo.displayed ) {

            cardInfo.classes = 'display-content';
            cardInfo.cardBg = wrapper?.currentFace.img;

            const rotateAsked = this.forceRotate && card.id === this.currentSelection?.id;
            if( wrapper?.shouldBeRotated( rotateAsked ) ) {
                cardInfo.classes += ' rotated'; // Also rotate the card if needed
            }

        } else {
            // Choosing background depending on the selected card. Or by default the one in xxx/background/back.webp
            let background = card?.back.img;
            const isStackIcon = wrapper?._custom.stack.img === background;
            if(!background || isStackIcon || background === 'icons/svg/card-joker.svg') {

                const type = this._cards.type;
                const coreRef = wrapper?._custom.coreStackRef ?? this._custom.coreStackRef;
                if( coreRef ) {
                    const backSettings = deckBacksSettings(coreRef);
                    background = type==='pile' ? backSettings.discardBg : backSettings.deckBg;

                } else { // Should not happen anymore
                    const owner = this._custom.stackOwner;
                    const def = game.modules.get('ready-to-use-cards').stacksDefinition;
                    const base = owner.forPlayers ? def.playerStacks : def.gmStacks;
                    const baseDir = base.resourceBaseDir;
                    background = baseDir + '/background/' + (type==='pile'? 'front.webp' : 'back.webp');
                }
            }

            cardInfo.classes = 'cardback';
            cardInfo.cardBg = background;
        }

        return cardInfo;
    }

    /* -------------------------------------------- */

    /**
     * Load available actions wich will be displayed inside GUI.
     * Those will differ with the stack type and the current selection.
     * @returns {CardActionData[]}
     */
    #loadAvailableActions() {
		const cardStacks = game.modules.get('ready-to-use-cards').cardStacks;
        const mainDecks = Object.values( cardStacks.decks );
        const mainDiscards = Object.values( cardStacks.piles );

        // Main decks specificactions
        if( mainDecks.find( d => d.stack === this._custom.stack ) ) {
            return this.#loadDeckActions();

        // Discard piles
        } else if( mainDiscards.find( d => d.stack === this._custom.stack ) ) {
            return this.#loadDiscardActions();

        // For player and GM hands
        } else if( this._cards.type === 'hand' ) {
            return this.#loadHandActions();

        // For player and GM revealed cards
        } else {
            return this.#loadRevealedCardsActions();
        }
    }

    /**
     * Load available actions if the current stack is a deck
     * @returns {CardActionData[]}
     */
    #loadDeckActions() {
        const actions = [];
        this.#loadDeckActionsForSelectedCard(actions);
        this.#loadDeckActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in the deck
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadDeckActionsForSelectedCard(actions) {

        if( this.currentSelection ) {
            const peeking = this.currentlyPeekingOnCard(this.currentSelection);

            const wrapper = new CustomCardGUIWrapper(this.currentSelection);
            const selectionActions = wrapper.loadActionsWhileInDeck(peeking);
            if( selectionActions.length > 0 ) { actions.push( ...selectionActions ); }
        }
    }

    /**
     * Default actions when handling decks
     * Overriden by SingleCardDisplay so that deck actions are not available when simply seeing a card
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadDeckActionsByDefault(actions) {

        const deckKey = this._custom.coreStackRef;
        const prefix = this._custom.prefixForActions; // "DE"
        const service = game.modules.get('ready-to-use-cards').actionService;

        const possibilities = [];
        possibilities.push( ...service.getActionPossibilities(deckKey, ["peekOnCards"], {from: prefix}) );
        possibilities.push( ...service.getActionPossibilities(deckKey, ["dealCard", "shuffleDeck", "resetDeck"]) );

        const isOwner = this._cards.testUserPermission(game.user, "OWNER");
        const cardsLeft = this._custom.sortedCardList.length > 0;

        possibilities.forEach( p => {

            const guiAction = service.asGUIAction(p);
            switch( p.signature ) {

                case "peekOnCards-peek" : {
                    if( !isOwner || !cardsLeft ) { return; }
                    guiAction.action = deckKey;
                    guiAction.classes += " red separator";
                    break;
                }

                case "dealCard-deal" :
                case "shuffleDeck-shuffle" : 
                case "resetDeck-reset" : {
                    if( !isOwner || !cardsLeft ) { return; }
                    break;
                }
            }
            actions.push(guiAction);
        });

        const [firstCard] = this._cards.cards.values();
        const wrapper = new CustomCardGUIWrapper(firstCard);
        wrapper.loadBasicActionsForDeck(actions);
    }

    /**
     * Load available actions if the current stack is a discard pile
     * @returns {CardActionData[]}
     */
    #loadDiscardActions() {
        const actions = [];
        this.#loadDiscardActionsForSelectedCard(actions);
        this.#loadDiscardActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in the discard
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadDiscardActionsForSelectedCard(actions) {
        if( this.currentSelection ) {
            const wrapper = new CustomCardGUIWrapper(this.currentSelection);
            const selectionActions = wrapper.loadActionsWhileInDiscard();
            if( selectionActions.length > 0 ) { actions.push( ...selectionActions ); }
        }
    }

    /**
     * Default actions when handling discards
     * Overriden by SingleCardDisplay so that deck actions are not available when simply seeing a card
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadDiscardActionsByDefault(actions) {

        const deckKey = this._custom.coreStackRef;
        const service = game.modules.get('ready-to-use-cards').actionService;

        const possibilities = service.getActionPossibilities(deckKey, ["shuffleDiscard", "resetDiscard"]);

        const isOwner = this._cards.testUserPermission(game.user, "OWNER");
        const cardsLeft = this._custom.sortedCardList.length > 0;

        possibilities.forEach( p => {

            const guiAction = service.asGUIAction(p);
            switch( p.signature ) {

                case "shuffleDiscard-shuffle" :
                case "resetDiscard-reset" : {
                    if( !isOwner || !cardsLeft ) { return; }
                    break;
                }
            }
            actions.push(guiAction);
        });
    }

    /**
     * Load available actions if the current stack is a player/gm hand
     * @returns {CardActionData[]}
     */
    #loadHandActions()  {
        const actions = [];
        this.#loadHandActionsForSelectedCard(actions);
        this.#loadHandActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in someone hand
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadHandActionsForSelectedCard(actions) {

        const owned = this._custom.ownedByCurrentPlayer;
        if( this.currentSelection ) {
            const peeking = this.currentlyPeekingOnCard(this.currentSelection);
            const wrapper = new CustomCardGUIWrapper(this.currentSelection);
            const selectionActions = wrapper.loadActionsWhileInHand(owned, peeking);
            if( selectionActions.length > 0 ) { actions.push( ...selectionActions ); }
        }
    }

    /**
     * Default actions when handling player hands
     * Overriden by SingleCardDisplay so that deck actions are not available when simply seeing a card
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadHandActionsByDefault(actions) {

        const prefix = this._custom.prefixForActions; // "GH" or "PH"
        const service = game.modules.get('ready-to-use-cards').actionService;

        const isOwned = this._custom.ownedByCurrentPlayer;

        if( isOwned ) {

            const allSeenDecks = Object.values(this._custom.cardStacks.decks).filter( deck => deck.stack.testUserPermission(game.user, "OBSERVER") );
            const allSeenDiscards = Object.values(this._custom.cardStacks.piles).filter( pile => pile.stack.testUserPermission(game.user, "OBSERVER") );

            // Drawing cards from each decks and discards
            allSeenDecks.filter( cs => {
                return cs.sortedCardList.length !== 0;
            }).forEach( cs => {
                const name = cs.retrieveStackBaseName();

                const possibilities = service.getActionPossibilities(cs.coreStackRef, ["drawDeckCard"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: cs.coreStackRef}) );
                guiActions.forEach( a => a.label += ` (${name})` );
                actions.push(...guiActions);
            });

            allSeenDiscards.filter( cs => {
                return cs.sortedCardList.length !== 0;
            }).forEach( cs => {
                const name = cs.retrieveStackBaseName();

                const possibilities = service.getActionPossibilities(cs.coreStackRef, ["drawDiscardCard"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: cs.coreStackRef}) );
                guiActions.forEach( a => a.label += ` (${name})` );
                actions.push(...guiActions);
            });

            // For the current cards, allow full discard if discard is allowed on each card
            this._custom.decksOfAvailableCards.forEach( deck => {
                const deckKey = deck.coreStackRef;
                const possibilities = service.getDiscardAllPossibilities(deckKey, {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: deckKey}) );
                guiActions.forEach( a => a.label += " (" + deck.retrieveStackBaseName() + ")");
                actions.push(...guiActions);
            });

            service.addCssAfterSomeGuiActions(actions, ["drawDeckCard-"]);
            service.addCssAfterSomeGuiActions(actions, ["drawDiscardCard-"]);

        } else if( game.user.isGM ) {
            
            // Allow to peek on cards will be available if at least one of the cart types allow this action
            this._custom.decksOfAvailableCards.forEach( deck => {
                const deckKey = deck.coreStackRef;
                const possibilities = service.getActionPossibilities(deckKey, ["peekOnCards"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: deckKey}) );
                guiActions.forEach( a => a.label += " (" + deck.retrieveStackBaseName() + ")");
                actions.push(...guiActions);
            });
        }
    }


    /**
     * Load available actions if the current stack is a player/gm reveal cards stack
     * @returns {CardActionData[]}
     */
    #loadRevealedCardsActions()  {
        const actions = [];
        this.#loadRevealedCardsActionsForSelectedCard(actions);
        this.#loadRevealedCardsActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in someone revealed cards
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadRevealedCardsActionsForSelectedCard(actions) {
        const owned = this._custom.ownedByCurrentPlayer;
        if( this.currentSelection ) {
            const wrapper = new CustomCardGUIWrapper(this.currentSelection);
            const selectionActions = wrapper.loadActionsWhileInRevealedCards(owned);
            if( selectionActions.length > 0 ) { actions.push( ...selectionActions ); }
        }
    }

    /**
     * Default actions when handling player revealed cards
     * Overriden by SingleCardDisplay so that deck actions are not available when simply seeing a card
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
    #loadRevealedCardsActionsByDefault(actions) {

        const prefix = this._custom.prefixForActions; // "GR" or "PR"
        const service = game.modules.get('ready-to-use-cards').actionService;

        const isOwned = this._custom.ownedByCurrentPlayer;

        if( isOwned ) {

            const allSeenDecks = Object.values(this._custom.cardStacks.decks).filter( deck => deck.stack.testUserPermission(game.user, "OBSERVER") );
            const allSeenDiscards = Object.values(this._custom.cardStacks.piles).filter( pile => pile.stack.testUserPermission(game.user, "OBSERVER") );

            // Drawing cards from each decks and discards
            allSeenDecks.filter( cs => {
                return cs.sortedCardList.length !== 0;
            }).forEach( cs => {
                const name = cs.retrieveStackBaseName();

                const possibilities = service.getActionPossibilities(cs.coreStackRef, ["drawDeckCard"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: cs.coreStackRef}) );
                guiActions.forEach( a => a.label += ` (${name})` );
                actions.push(...guiActions);
            });

            allSeenDiscards.filter( cs => {
                return cs.sortedCardList.length !== 0;
            }).forEach( cs => {
                const name = cs.retrieveStackBaseName();

                const possibilities = service.getActionPossibilities(cs.coreStackRef, ["drawDiscardCard"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: cs.coreStackRef}) );
                guiActions.forEach( a => a.label += ` (${name})` );
                actions.push(...guiActions);
            });

            // For the current cards, allow full discard if discard is allowed on each card
            this._custom.decksOfAvailableCards.forEach( deck => {
                const deckKey = deck.coreStackRef;
                const possibilities = service.getDiscardAllPossibilities(deckKey, {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: deckKey}) );
                guiActions.forEach( a => a.label += " (" + deck.retrieveStackBaseName() + ")");
                actions.push(...guiActions);
            });

            service.addCssAfterSomeGuiActions(actions, ["drawDeckCard-"]);
            service.addCssAfterSomeGuiActions(actions, ["drawDiscardCard-"]);
        }
    }

    
    /* -------------------------------------------- */
    bindEvent(selector, callback, {event="click"}={}) {
        const els = this.element.querySelectorAll(selector);
        els.forEach(el => el.addEventListener(event, callback.bind(this)) );
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        // Before mapping listeners, add content inside each cardSlot
        this.#addAdditionalContentOnCards();

        // Mapping every actions
        //-------------------------
        this.bindEvent(".drawDeckCard-draw", this.#onClickDrawCard);
        this.bindEvent(".drawDiscardCard-draw", this.#onClickDrawDiscardCard);
        this.bindEvent(".moveCard-backDeck", this.#onClickBackToDeck);
        this.bindEvent(".moveCard-discardOne", this.#onClickDiscardCard);
        this.bindEvent(".moveCard-discardAll", this.#onClickDiscardAll);
        this.bindEvent(".moveCard-give", this.#onClickGiveCard);
        this.bindEvent(".transferCards-backHand", this.#onClickBackToHand);
        this.bindEvent(".transferCards-reveal", this.#onClickRevealCard);
        this.bindEvent(".exchangeCard-discard", this.#onClickExchangeCardWithDiscard);
        this.bindEvent(".exchangeCard-someone", this.#onClickExchangeCardWithSomeone);
        this.bindEvent(".swapCards-withRevealed", this.#onClickSwapWithRevealedCard);
        this.bindEvent(".swapCards-withHand", this.#onClickSwapWithHandCard);
        this.bindEvent(".playCard-play", this.#onClickPlayCard);
        this.bindEvent(".flipCard-flip", this.#onClickLoopThroughCardFaces);
        this.bindEvent(".rotateCard-rotate", this.#onClickRotateCard);
        this.bindEvent(".custom-action", this.#onClickCustomAction);

        this.bindEvent(".dealCard-deal", this.#onClickDealCards);
        this.bindEvent(".resetDeck-reset", this.#onClickRecallAllCards);
        this.bindEvent(".peekOnCards-peek", this.#onClickPeekOnStack);
        this.bindEvent(".shuffleDeck-shuffle", this.#onClickShuffleDeck);
        this.bindEvent(".shuffleDiscard-shuffle", this.#onClickShuffleDiscard);
        this.bindEvent(".resetDiscard-reset", this.#onClickResetDiscard);

        // Parameters clicks
        //-------------------------
        if(this._actionParameters) {
            this._actionParameters.addListeners();
        }

        // Listing panel clicks
        //-------------------------
        this.bindEvent(".listing-panel .card-slot", this.#onClickToggleSelection);

        this.bindEvent(".listing-panel .listing-icon.toggle", this.#onClickDisplayListing);
        this.bindEvent(".listing-panel .listing-icon.edit-backs", this.#onClickDisplayBacksEdition);
        this.bindEvent(".listing-panel .listing-icon.change-sort", this.#onClickChangeSortOnListing);
    }

    #addAdditionalContentOnCards() {
        // Loop on every card which should have its content displayed
        const cardSlots = this.element.querySelectorAll(".card-slot.display-content");
        for( let index = 0; index < cardSlots.length; index++ ) {
            const htmlDiv = cardSlots[index];
            const cardId = htmlDiv.dataset.key;
            if(cardId) { 
                const card = this._cards.cards.get(cardId);
                if( card ) {
                    const wrapper = new CustomCardGUIWrapper(card);
                    wrapper.fillCardContent(htmlDiv);
                }
            }
        }
    }

    async #onClickBackToDeck(event) {
        event.preventDefault();
        await this._custom.backToDeck(this.currentSelection?.id);
        this.selectAvailableCard(null);

        this.render();
    }

    async #onClickBackToHand(event) {
        event.preventDefault();
        await this._custom.backToHand([this.currentSelection?.id]);
        this.selectAvailableCard(null);

        this.render();
    }

    async #onClickDealCards(event) {
        const options = {
            specifyAmount: true,
            buttonLabel: this._custom.localizedLabel('sheet.actions.dealCards')
        };

        const selectTitle = this._custom.localizedLabel('sheet.parameters.players.dealTitle');

        // Prepare available stacks for selection
        //----------------------------------------
        const service = game.modules.get('ready-to-use-cards').actionService;
        const dealAction = service.getActionPossibilities(this._custom.coreStackRef, ["dealCard"]).filter( a => {
            return a.action === "deal"; // All dealing comes from deck, no need to filter more
        })[0];
        options.availableTargets = dealAction?.possibilities.reduce( (_targets, _current) => {
            _targets.push(_current.from); // from instead of target. was for easy display in grid
            return _targets;
        }, []) ?? [];

        // Callback is the default one
        //-------------------------

        this._actionParameters = new CardActionParametersForPlayerSelection(this, selectTitle, options );
        this.render(true);
    }

    async #onClickDisplayListing(event) {
        event.preventDefault();
        this.#listingOpened = !this.#listingOpened;
        this.render();
    }

    async #onClickDisplayBacksEdition(event) {
        const sheet = new ConfigSheetForBacks(this._custom.coreStackRef);
        sheet.render(true);
    }

    async #onClickChangeSortOnListing(event) {
        const currentSort = this._custom.currentSortChoice;
        let newSort;
        if( currentSort === STACK_SORT_CHOICES.DECK_ORDER ) {
            newSort = STACK_SORT_CHOICES.LOWEST_TO_HIGHEST;
        } else if( currentSort === STACK_SORT_CHOICES.LOWEST_TO_HIGHEST ) {
            newSort = STACK_SORT_CHOICES.HIGHEST_TO_LOWEST;
        } else {
            newSort = STACK_SORT_CHOICES.DECK_ORDER;
        }
        await this._custom.changeSortChoice(newSort);
        this.render();
    }

    async #onClickDrawCard(event) {
        event.preventDefault();
        const coreKey = event.currentTarget.dataset.action;
        const deck = this._custom.cardStacks.decks[coreKey];
        await this._custom.drawCards(deck);
        this.render();
    }

    async #onClickDrawDiscardCard(event) {
        event.preventDefault();
        const coreKey = event.currentTarget.dataset.action;
        const pile = this._custom.cardStacks.piles[coreKey];
        await this._custom.drawCards(pile);
        this.render();
    }

    async #onClickDiscardCard(event) {
        event.preventDefault();
        await this._custom.discardCards([this.currentSelection.id]);

        this.render();
    }

    async #onClickDiscardAll(event) {
        event.preventDefault();
        const coreKey = event.currentTarget.dataset.action;

        const cardIds = this._custom.sortedCardList.filter( c => {
            const custom = new CustomCardStack(c.source);
            return custom.coreStackRef === coreKey;
        }).map( c => {
            return c.id;
        })
        await this._custom.discardCards(cardIds);
        this.render();
    }

    async #onClickGiveCard(event) {
        const deck = new CustomCardStack(this.currentSelection.source);
        const coreKey = deck.coreStackRef;

        const options = {
            onlyOne: true,
            buttonLabel: this._custom.localizedLabel('sheet.actions.giveCard') 
        };

        const selectTitle = this._custom.localizedLabel('sheet.parameters.players.giveTitle');

        // Prepare available stacks for selection
        //----------------------------------------
        const service = game.modules.get('ready-to-use-cards').actionService;
        const action = service.getActionPossibilities(coreKey, ["moveCard"], {from: this._custom.prefixForActions}).filter( a => {
            return a.action === "give";
        })[0];
        options.availableTargets = action?.possibilities.reduce( (_targets, _current) => {
            _targets.push(_current.target);
            return _targets;
        }, []) ?? [];
        options.includeSelf = false;

        // Prepare callback method
        //--------------------------
        options.callBack = async (selection, selectedStacks, amount) => { 
            const from = this._custom;
            const receiver = selectedStacks[0];
            await from.giveCards(receiver, [selection.id] );
        };

        this._actionParameters = new CardActionParametersForPlayerSelection(this, selectTitle, options );

        this.render();
    }

    /**
     * Exchange a card with the discard
     */
    async #onClickExchangeCardWithDiscard(event) {
        event.preventDefault();

        const cardStacks = game.modules.get('ready-to-use-cards').cardStacks;
        const custom = new CustomCardStack(this.currentSelection.source);
        const coreKey = custom.coreStackRef;
        const discard = cardStacks.piles[coreKey];

        const options = {
            fromStacks: [discard], 
            buttonLabel: this._custom.localizedLabel('sheet.actions.exchangeCard') 
        };

        options.criteria = (card) => { 
            const custom = new CustomCardStack(card.source);
            return custom.coreStackRef === coreKey; 
        };
        options.callBack = async (selection, from, additionalCards) => { 
            const stack = this._custom;
            await stack.exchangeCards(from, [selection.id], additionalCards.map( c => c.id ) );
        };

        const selectTitle = this._custom.localizedLabel('sheet.parameters.cards.exchangeTitle');
        this._actionParameters = new CardActionParametersForCardSelection(this, selectTitle, options );

        this.render();
    }

    /**
     * Exchange a card with another player or Gm
     */
    async #onClickExchangeCardWithSomeone(event) {
        const deck = new CustomCardStack(this.currentSelection.source);
        const coreKey = deck.coreStackRef;

        const options = {
            buttonLabel: this._custom.localizedLabel('sheet.actions.exchangePlayer') 
        };

        // Prepare available stacks for selection
        //----------------------------------------
        const service = game.modules.get('ready-to-use-cards').actionService;
        const action = service.getActionPossibilities(coreKey, ["exchangeCard"], {from: this._custom.prefixForActions}).filter( a => {
            return a.action === "someone";
        })[0];
        options.availableTargets = action?.possibilities.reduce( (_targets, _current) => {
            _targets.push(_current.target);
            return _targets;
        }, []) ?? [];
        options.includeSelf = false;

        // For selected card (criteria and callback)
        //------------------------------------------
        options.criteria = (card) => { 
            const custom = new CustomCardStack(card.source);
            return custom.coreStackRef === coreKey; 
        };
        options.callBack = async (selection, from, additionalCards ) => { 
            const stack = this._custom;
            await stack.exchangeCards(from, [selection.id], additionalCards.map( c => c.id ) );
        };

        const selectTitle = this._custom.localizedLabel('sheet.parameters.cards.exchangeTitle');
        this._actionParameters = new CardActionParametersForCardSelection(this, selectTitle, options );

        this.render();
    }

    /**
     * Exchange a card with your revealed cards
     */
    async #onClickSwapWithRevealedCard(event) {
        const deck = new CustomCardStack(this.currentSelection.source);
        const coreKey = deck.coreStackRef;

        const options = {
            buttonLabel: this._custom.localizedLabel('sheet.actions.swapWithRevealed') 
        };

        // Prepare available stacks for selection
        //----------------------------------------
        const stacks = this._custom.cardStacks;
        const revealedCards = game.user.isGM ? stacks.gmRevealedCards : stacks.findRevealedCards(game.user);
        options.fromStacks = [revealedCards];

        // For selected card (criteria and callback)
        //------------------------------------------
        options.criteria = (card) => { 
            const custom = new CustomCardStack(card.source);
            return custom.coreStackRef === coreKey; 
        };
        options.callBack = async (selection, from, additionalCards ) => { 
            const stack = this._custom;
            await stack.exchangeCards(from, [selection.id], additionalCards.map( c => c.id ) );
        };

        const selectTitle = this._custom.localizedLabel('sheet.parameters.cards.exchangeTitle');
        this._actionParameters = new CardActionParametersForCardSelection(this, selectTitle, options );

        this.render();
    }

    /**
     * Exchange a card with your hand
     */
    async #onClickSwapWithHandCard(event) {
        const deck = new CustomCardStack(this.currentSelection.source);
        const coreKey = deck.coreStackRef;

        const options = {
            buttonLabel: this._custom.localizedLabel('sheet.actions.swapWithHand') 
        };

        // Prepare available stacks for selection
        //----------------------------------------
        const stacks = this._custom.cardStacks;
        const hand = game.user.isGM ? stacks.gmHand : stacks.findPlayerHand(game.user);
        options.fromStacks = [hand];

        // For selected card (criteria and callback)
        //------------------------------------------
        options.criteria = (card) => { 
            const custom = new CustomCardStack(card.source);
            return custom.coreStackRef === coreKey; 
        };
        options.callBack = async (selection, from, additionalCards ) => { 
            const stack = this._custom;
            await stack.exchangeCards(from, [selection.id], additionalCards.map( c => c.id ) );
        };

        const selectTitle = this._custom.localizedLabel('sheet.parameters.cards.exchangeTitle');
        this._actionParameters = new CardActionParametersForCardSelection(this, selectTitle, options );

        this.render();
    }

    async #onClickPeekOnStack(event) {
        event.preventDefault();
        const coreKey = event.currentTarget.dataset.action;

        const wasPeeking = this.currentlyPeekingOnCardType(coreKey);

        const labelKey = wasPeeking ? 'sheet.actions.peekStopWarning' : 'sheet.actions.peekOnWarning';

        let flavor = this._custom.localizedLabel(labelKey);
        flavor = flavor.replace('CARD_TYPE', this._custom.retrieveStackBaseName(coreKey)); // Add precisition on which card type
        await this._custom.sendMessageForStacks(flavor, []);

        this.togglePeekingOnCardType(coreKey);
        this.render();
    }

    async #onClickLoopThroughCardFaces(event) {
        event.preventDefault();

        try { 
            const wrapper = new CustomCardGUIWrapper(this.currentSelection);
            await wrapper.nextFace();
        } catch( e ) {
           console.error(e); // Should not happen : Card making this action available will be wrappable
        }
        this.render();
    }

    async #onClickPlayCard(event) {
        event.preventDefault();

        const deck = new CustomCardStack(this.currentSelection.source);
        const coreKey = deck.coreStackRef;
        const actionService = game.modules.get('ready-to-use-cards').actionService;
        const paramService = game.modules.get('ready-to-use-cards').parameterService;
        const action = actionService.getActionPossibilities(coreKey, ["playCard"], {from: this._custom.prefixForActions}).filter( a => {
            return a.action === "play";
        })[0];

        // Init options
        //----------------------
        const maxCards = this._custom.sortedCardList.filter(c => {
            const ccs = new CustomCardStack(c.source);
            return ccs.coreStackRef === coreKey;
        }).length;
        const selectTitle = this._custom.localizedLabel('sheet.parameters.cards.playTitle');

        const displayedInChat = paramService.parseBoolean(
            action.parameters.find( p => p.param === "inChat" ).current
        );

        const options = {
            minAmount: 0,
            maxAmount: Math.max(1, maxCards-1),
            fromStacks: [this._custom]
        };
        options.criteria = (card) => { 
            const ccs = new CustomCardStack(card.source);
            return ccs.coreStackRef === coreKey; 
        };


        // The action will differ depending on which mode has been chosen
        //------------------------------------------------
        const playMode = action.parameters.find( p => p.param === "playMode" ).current;
        if( playMode === "multipleCards") {

            const multipleParam = paramService.parseCardAttributeOrRangleValue(
                this.currentSelection,
                action.parameters.find( p => p.param === "multipleAmount" ).current
            );
            options.minAmount = multipleParam.min;
            options.maxAmount = multipleParam.max;

            options.buttonLabel = this._custom.localizedLabel('sheet.actions.playMultiple');
            options.callBack = async (selection, from, additionalCards) => { 
                const cardIds = [selection.id];
                cardIds.push(...additionalCards.map(c => c.id));
                await this._custom.playCards(cardIds, {displayedInChat});
            };
            this._actionParameters = new CardActionParametersForCardSelection(this, selectTitle, options );

        } else if( playMode === "discardCardsAsCost") {

            const costParam = paramService.parseCardAttributeOrRangleValue(
                this.currentSelection,
                action.parameters.find( p => p.param === "discardAmount" ).current
            );
            options.minAmount = costParam.min;
            options.maxAmount = costParam.max;

            options.buttonLabel = this._custom.localizedLabel('sheet.actions.playWithDiscard');
            options.callBack = async (selection, from, additionalCards) => { 
                await this._custom.discardCards(additionalCards.map(c => c.id));
                await this._custom.playCards([selection.id], {displayedInChat});
            };
            this._actionParameters = new CardActionParametersForCardSelection(this, selectTitle, options );

        // FIXME } else if( playMode == "otherCost") {
        //    
        } else { // default "singleCard"
            await this._custom.playCards([this.currentSelection.id], {displayedInChat});
        } 

        this.render();
    }

    async #onClickRevealCard(event) {
        event.preventDefault();
        await this._custom.revealCards([this.currentSelection.id]);
        this.render();
    }

    async #onClickShuffleDeck(event) {
        event.preventDefault();
        this.selectAvailableCard(null);
        await this._custom.shuffleDeck();
    }

    async #onClickShuffleDiscard(event) {
        event.preventDefault();
        this.selectAvailableCard(null);
        await this._custom.shuffleDiscard();
    }

    async #onClickToggleSelection(event) {
        event.preventDefault();

        // On simple click : select the card. Also select it again if double click
        if (event.detail === 1 || !this._currentSelection) {
            const key = event.currentTarget.dataset.key;
        
            const unselect = key === this.currentSelection?.id;
            this.selectAvailableCard( unselect ? null : key);
        } 
        
        // On double click : hide the list
        if( event.detail === 2 ) {
            this.#listingOpened = false;
        }
        this.render();
    }

    async #onClickCustomAction(event) {
        event.preventDefault();
        const action = event.currentTarget.dataset.action;
        let card = this.currentSelection;
        if( !card ) {
            const [firstCard] = this._cards.cards.values();
            card = firstCard;
        }
        if( card ) {
            const wrapper = new CustomCardGUIWrapper(card);
            await wrapper.onClickDoCustomAction(action);
        }
    }

    async #onClickRecallAllCards(event) {
        event.preventDefault();
        this.selectAvailableCard(null);
        await this._custom.resetDeck();
    }

    async #onClickRotateCard(event) {
        event.preventDefault();
        this.forceRotate = !this.forceRotate;
        this.render();
    }

    async #onClickResetDiscard(event) {
        event.preventDefault();
        await this._custom.shuffleDiscardIntoDeck();
    }
}
