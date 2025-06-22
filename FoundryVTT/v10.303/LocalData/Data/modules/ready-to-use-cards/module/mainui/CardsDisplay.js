import { CardActionParametersForCardSelection, CardActionParametersForPlayerSelection } from './CardActionParameters.js';
import { CustomCardGUIWrapper } from './CustomCardGUIWrapper.js';
import { CustomCardStack } from '../CustomCardStack.js';
import { GlobalConfiguration } from '../constants.js';
import { deckBacksSettings } from '../tools.js';
import { ConfigSheetForActions } from '../config/ConfigSheetForActions.js';
import { ConfigSheetForBacks } from '../config/ConfigSheetForBacks.js';

export class CustomCardsDisplay extends CardsConfig {

    constructor(cards, options) {
        super(cards, options);

        this._cards = cards;
        this._custom = new CustomCardStack(cards);
        this._currentSelection = null;
        this._listingOpened = true;
        this._forceRotate = false;
        this._peekOn = []; // List of deck keys on which the GM can peek on

        this._actionParameters = null;
        const resized = game.settings.get('ready-to-use-cards', GlobalConfiguration.smallDisplay);
        const configScale = resized ? 0.8 : 1;

        // Sheet options
        this.options.classes.push('rtucards');
        this.options.classes.push('cards');
        if( resized ) {
            this.options.classes.push('resized');
        }
        this.options.template = "modules/ready-to-use-cards/resources/sheet/card-display.hbs";
        this.options.scrollY = [".all-cards", ".parameters-stacks .stacks", ".parameters-cards .cards"];
        this.options.width = 1200 * configScale;
        this.options.height = 920 * configScale;
        this.position.width = 1200 * configScale;
        this.position.height = 920 * configScale;
    }

    /** @override */
    get title() {

        let result = this._cards.name;
        const cards = this._custom.sortedCardList;
        if( this.currentSelection && cards.length != 0 ) {
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

    get listingAllowed() {
        return !this._actionParameters;
    }

    get listingOpened() {
        return this._listingOpened;
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
            this._peekOn = this._peekOn.filter( k => k != coreStackRef );
        } else  {
            this._peekOn.push( coreStackRef );
        }
    }

    /* -------------------------------------------- */

    /**
     * This allow to register / unregister the stacks inside the module
     * Same method as the one triggered inside CustomCardsDirectory. 
     * But only available one for those who have unchecked the 'Invasive code' settings
     * @override 
     * */
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();

        // Only GM Actions
        if( game.user.isGM ) {

            // Access to action configuration
            if( this._custom.handledByModule && this._custom.stackOwner.forNobody ) {
                buttons.unshift({
                    label: "RTUCards.sidebar.context.configActions",
                    class: "configure-actions",
                    icon: "fas fa-cog",
                    onclick: async () => {
                        const coreKey = this._custom.coreStackRef;
                        // Prepare the sheet
                        const sheet = new ConfigSheetForActions();
                        sheet.object.stacks.forEach( s => {
                            s.gui.detailsDisplayed = ( s.key === coreKey );
                        });
                        // And render it
                        sheet.render(true);
                        this.close();
                    }
                });
            }

            // Allow unregistering of custom modules
            if( this._cards.type == 'deck' && this._custom.manuallyRegistered ) {
                buttons.unshift({
                    label: "RTUCards.sidebar.context.unregisterDeck",
                    class: "unregister-deck",
                    icon: "far fa-minus-square",
                    onclick: async () => {
                        await this._custom.unregisterAsHandledByModule();
                        this.close();
                    }
                });
            }
        }

        return buttons
    }

    /* -------------------------------------------- */

    /**
     * I wish for players with only limited right to be able to see the sheet 
     * Bypassing SidebarSheet implem.
     * @override 
     * */
    render(force=false, options={}) {
        this._render(force, options).catch(err => {
          this._state = Application.RENDER_STATES.ERROR;
          Hooks.onError("Application#render", err, {
            msg: `An error occurred while rendering ${this.constructor.name} ${this.appId}`,
            log: "error",
            ...options
          });
        });
        return this;
    }
    

    /* -------------------------------------------- */

    /** @override */
    getData(options) {
        const data = super.getData(options);
        this._refreshCurrentSelection();

        data.currentSelection = this._buildCardInfo(this.currentSelection);
        if( !data.currentSelection.contentDisplayed ) {
            const msg = this._custom.localizedLabel('sheet.contentHidden').replace('NB', '' + this._custom.sortedCardList.length);
            data.currentSelection.summary = msg;
        }

        data.listing = {
            allowed: this.listingAllowed,
            opened: this.listingOpened,
            editBack : {
                displayed : game.user.isGM && this._custom.stackOwner.forNobody
            }
        };
        data.listing.cards = this._custom.sortedCardList.map( c => {
            const cardInfo = this._buildCardInfo(c);
            if( cardInfo.id === this.currentSelection?.id ) {
                cardInfo.classes += ' selected';
            }
            return cardInfo;
        });

        const actions = this._loadAvailableActions();
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
    _refreshCurrentSelection() {
        if( !this._actionParameters ) {
            this.selectAvailableCard(this.currentSelection?.id);
        }
    }


    _buildCardInfo(card) {

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
            cardInfo.cardBg = wrapper.currentFace.img;

            const rotateAsked = this.forceRotate && card.id === this.currentSelection?.id;
            if( wrapper.shouldBeRotated( rotateAsked ) ) {
                cardInfo.classes += ' rotated'; // Also rotate the card if needed
            }

        } else {
            // Choosing background depending on the selected card. Or by default the one in xxx/background/back.webp
            let background = card?.back.img;
            const isStackIcon = wrapper?._custom.stack.img === background;
            if(!background || isStackIcon || background == 'icons/svg/card-joker.svg') {

                const type = this._cards.type;
                const coreRef = wrapper?._custom.coreStackRef ?? this._custom.coreStackRef;
                if( coreRef ) {
                    const backSettings = deckBacksSettings(coreRef);
                    background = type=='pile' ? backSettings.discardBg : backSettings.deckBg;

                } else { // Should not happen anymore
                    const owner = this._custom.stackOwner;
                    const def = game.modules.get('ready-to-use-cards').stacksDefinition;
                    const base = owner.forPlayers ? def.playerStacks : def.gmStacks;
                    const baseDir = base.resourceBaseDir;
                    background = baseDir + '/background/' + (type=='pile'? 'front.webp' : 'back.webp');
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
     _loadAvailableActions() {
		const cardStacks = game.modules.get('ready-to-use-cards').cardStacks;
        const mainDecks = Object.values( cardStacks.decks );
        const mainDiscards = Object.values( cardStacks.piles );

        // Main decks specificactions
        if( mainDecks.find( d => d.stack == this._custom.stack ) ) {
            return this._loadDeckActions();

        // Discard piles
        } else if( mainDiscards.find( d => d.stack == this._custom.stack ) ) { 
            return this._loadDiscardActions();

        // For player and GM hands
        } else if( this._cards.type == 'hand' ) { 
            return this._loadHandActions();

        // For player and GM revealed cards
        } else {
            return this._loadRevealedCardsActions();
        }
    }

    /**
     * Load available actions if the current stack is a deck
     * @returns {CardActionData[]}
     */
    _loadDeckActions() {
        const actions = [];
        this._loadDeckActionsForSelectedCard(actions);
        this._loadDeckActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in the deck
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
     _loadDeckActionsForSelectedCard(actions) {

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
     _loadDeckActionsByDefault(actions) {

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
    }

    /**
     * Load available actions if the current stack is a discard pile
     * @returns {CardActionData[]}
     */
     _loadDiscardActions() {
        const actions = [];
        this._loadDiscardActionsForSelectedCard(actions);
        this._loadDiscardActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in the discard
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
     _loadDiscardActionsForSelectedCard(actions) {
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
     _loadDiscardActionsByDefault(actions) {

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
     _loadHandActions()  {
        const actions = [];
        this._loadHandActionsForSelectedCard(actions);
        this._loadHandActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in someone hand
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
     _loadHandActionsForSelectedCard(actions) {

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
     _loadHandActionsByDefault(actions) {

        const prefix = this._custom.prefixForActions; // "GH" or "PH"
        const service = game.modules.get('ready-to-use-cards').actionService;

        const isOwned = this._custom.ownedByCurrentPlayer;

        if( isOwned ) {

            const allSeenDecks = Object.values(this._custom.cardStacks.decks).filter( deck => deck.stack.testUserPermission(game.user, "OBSERVER") );
            const allSeenDiscards = Object.values(this._custom.cardStacks.piles).filter( pile => pile.stack.testUserPermission(game.user, "OBSERVER") );

            // Drawing cards from each decks and discards
            allSeenDecks.filter( cs => {
                return cs.sortedCardList.length != 0;
            }).forEach( cs => {
                const name = cs.retrieveStackBaseName();

                const possibilities = service.getActionPossibilities(cs.coreStackRef, ["drawDeckCard"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: cs.coreStackRef}) );
                guiActions.forEach( a => a.label += ` (${name})` );
                actions.push(...guiActions);
            });

            allSeenDiscards.filter( cs => {
                return cs.sortedCardList.length != 0;
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
     _loadRevealedCardsActions()  {
        const actions = [];
        this._loadRevealedCardsActionsForSelectedCard(actions);
        this._loadRevealedCardsActionsByDefault(actions);

        return actions;
    }

    /**
     * Add actions on the right side corresponding to the selected card in someone revealed cards
     * @param {object[]} actions Action list currently in built
     * @returns {CardActionData[]}
     */
     _loadRevealedCardsActionsForSelectedCard(actions) {
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
     _loadRevealedCardsActionsByDefault(actions) {

        const prefix = this._custom.prefixForActions; // "GR" or "PR"
        const service = game.modules.get('ready-to-use-cards').actionService;

        const isOwned = this._custom.ownedByCurrentPlayer;

        if( isOwned ) {

            const allSeenDecks = Object.values(this._custom.cardStacks.decks).filter( deck => deck.stack.testUserPermission(game.user, "OBSERVER") );
            const allSeenDiscards = Object.values(this._custom.cardStacks.piles).filter( pile => pile.stack.testUserPermission(game.user, "OBSERVER") );

            // Drawing cards from each decks and discards
            allSeenDecks.filter( cs => {
                return cs.sortedCardList.length != 0;
            }).forEach( cs => {
                const name = cs.retrieveStackBaseName();

                const possibilities = service.getActionPossibilities(cs.coreStackRef, ["drawDeckCard"], {from: prefix});
                const guiActions = possibilities.map( p => service.asGUIAction(p, {action: cs.coreStackRef}) );
                guiActions.forEach( a => a.label += ` (${name})` );
                actions.push(...guiActions);
            });

            allSeenDiscards.filter( cs => {
                return cs.sortedCardList.length != 0;
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

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Before mapping listeners, add content inside each cardSlot
        this.addAdditionnalContentOnCards(html);

        // Mapping every actions
        //-------------------------
        html.find(".drawDeckCard-draw").click(event => this._onClickDrawCard(event) );
        html.find(".drawDiscardCard-draw").click(event => this._onClickDrawDiscardCard(event) );
        html.find(".moveCard-backDeck").click(event => this._onClickBackToDeck(event) );
        html.find(".moveCard-discardOne").click(event => this._onClickDiscardCard(event) );
        html.find(".moveCard-discardAll").click(event => this._onClickDiscardAll(event) );
        html.find(".moveCard-give").click(event => this._onClickGiveCard(event) );
        html.find(".transferCards-backHand").click(event => this._onClickBackToHand(event) );
        html.find(".transferCards-reveal").click(event => this._onClickRevealCard(event) );
        html.find(".exchangeCard-discard").click(event => this._onClickExchangeCardWithDiscard(event) );
        html.find(".exchangeCard-someone").click(event => this._onClickExchangeCardWithSomeone(event) );
        html.find(".swapCards-withRevealed").click(event => this._onClickSwapWithRevealedCard(event) );
        html.find(".swapCards-withHand").click(event => this._onClickSwapWithHandCard(event) );
        html.find(".playCard-play").click(event => this._onClickPlayCard(event) );
        html.find(".flipCard-flip").click(event => this._onClickLoopThroughCardFaces(event) );
        html.find(".rotateCard-rotate").click(event => this._onClickRotateCard(event) );
        html.find(".custom-action").click(event => this._onClickCustomAction(event) );

        html.find(".dealCard-deal").click(event => this._onClickDealCards(event) );
        html.find(".resetDeck-reset").click(event => this._onClickRecallAllCards(event) );
        html.find(".peekOnCards-peek").click(event => this._onClickPeekOnStack(event) );
        html.find(".shuffleDeck-shuffle").click(event => this._onClickShuffleDeck(event) );
        html.find(".shuffleDiscard-shuffle").click(event => this._onClickShuffleDiscard(event) );
        html.find(".resetDiscard-reset").click(event => this._onClickResetDiscard(event) );

        // Parameters clicks
        //-------------------------
        this._actionParameters?.addListeners(html);

        // Listing panel clicks
        //-------------------------
        html.find(".listing-panel .card-slot").click(event => this._onClickToggleSelection(event) );

        html.find(".main-card-slot .card-slot").dblclick(event => this._onClickDisplayListing(event) );
        html.find(".listing-panel .listing-icon.toggle").click(event => this._onClickDisplayListing(event) );
        html.find(".listing-panel .listing-icon.edit-backs").click(event => this._onClickDisplayBacksEdition(event) );
    }

    addAdditionnalContentOnCards(html) {
        // Loop on every card which should have its content displayed
        const cardSlots = html.find(".card-slot.display-content");
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

    async _onClickBackToDeck(event) {
        event.preventDefault();
        await this._custom.backToDeck(this.currentSelection?.id);
        this.selectAvailableCard(null);

        this.render();
    }

    async _onClickBackToHand(event) {
        event.preventDefault();
        await this._custom.backToHand([this.currentSelection?.id]);
        this.selectAvailableCard(null);

        this.render();
    }

    async _onClickDealCards(event) {
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

    async _onClickDisplayListing(event) {
        event.preventDefault();
        this._listingOpened = !this._listingOpened;
        this.render();
    }

    async _onClickDisplayBacksEdition(event) {
        const sheet = new ConfigSheetForBacks(this._custom.coreStackRef);
        sheet.render(true);
    }

    async _onClickDrawCard(event) {
        event.preventDefault();
        const coreKey = event.currentTarget.dataset.action;
        const deck = this._custom.cardStacks.decks[coreKey];
        await this._custom.drawCards(deck);
        this.render();
    }

    async _onClickDrawDiscardCard(event) {
        event.preventDefault();
        const coreKey = event.currentTarget.dataset.action;
        const pile = this._custom.cardStacks.piles[coreKey];
        await this._custom.drawCards(pile);
        this.render();
    }

    async _onClickDiscardCard(event) {
        event.preventDefault();
        await this._custom.discardCards([this.currentSelection.id]);

        this.render();
    }

    async _onClickDiscardAll(event) {
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

    async _onClickGiveCard(event) {
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
    async _onClickExchangeCardWithDiscard(event) {
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
     async _onClickExchangeCardWithSomeone(event) {
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
     async _onClickSwapWithRevealedCard(event) {
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
     async _onClickSwapWithHandCard(event) {
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

    async _onClickPeekOnStack(event) {
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

    async _onClickLoopThroughCardFaces(event) {
        event.preventDefault();

        try { 
            const wrapper = new CustomCardGUIWrapper(this.currentSelection);
            await wrapper.nextFace();
        } catch( e ) {
           console.error(e); // Should not happen : Card making this action available will be wrappable
        }
        this.render();
    }

    async _onClickPlayCard(event) {
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
            return ccs.coreStackRef == coreKey;
        }).length;
        const selectTitle = this._custom.localizedLabel('sheet.parameters.cards.playTitle');

        const displayedInChat = paramService.parseBoolean(
            action.parameters.find( p => p.param == "inChat" ).current
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
        const playMode = action.parameters.find( p => p.param == "playMode" ).current;
        if( playMode == "multipleCards") {

            const multipleParam = paramService.parseCardAttributeOrRangleValue(
                this.currentSelection,
                action.parameters.find( p => p.param == "multipleAmount" ).current
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

        } else if( playMode == "discardCardsAsCost") {

            const costParam = paramService.parseCardAttributeOrRangleValue(
                this.currentSelection,
                action.parameters.find( p => p.param == "discardAmount" ).current
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

    async _onClickRevealCard(event) {
        event.preventDefault();
        await this._custom.revealCards([this.currentSelection.id]);
        this.render();
    }

    async _onClickShuffleDeck(event) {
        event.preventDefault();
        this.selectAvailableCard(null);
        await this._custom.shuffleDeck();
    }

    async _onClickShuffleDiscard(event) {
        event.preventDefault();
        this.selectAvailableCard(null);
        await this._custom.shuffleDiscard();
    }

    async _onClickToggleSelection(event) {
        event.preventDefault();

        // On simple click : select the card. Also select it again if double click
        if (event.detail === 1 || !this._currentSelection) {
            const key = event.currentTarget.dataset.key;
        
            const unselect = key === this.currentSelection?.id;
            this.selectAvailableCard( unselect ? null : key);
        } 
        
        // On double click : hide the list
        if( event.detail === 2 ) {
            this._listingOpened = false;
        }
        this.render();
    }

    async _onClickCustomAction(event) {
        event.preventDefault();
        const action = event.currentTarget.dataset.action;
        const wrapper = new CustomCardGUIWrapper(this.currentSelection);
        await wrapper.onClickDoCustomAction(action);
    }

    async _onClickRecallAllCards(event) {
        event.preventDefault();
        this.selectAvailableCard(null);
        await this._custom.resetDeck();
    }

    async _onClickRotateCard(event) {
        event.preventDefault();
        this.forceRotate = !this.forceRotate;
        this.render();
    }

    async _onClickResetDiscard(event) {
        event.preventDefault();
        await this._custom.shuffleDiscardIntoDeck();
    }

}
