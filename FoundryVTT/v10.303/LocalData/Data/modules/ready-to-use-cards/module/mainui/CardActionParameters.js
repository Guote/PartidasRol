import { CustomCardStack } from "../CustomCardStack.js";
import { GlobalConfiguration } from "../constants.js";

const loadStackDataInfos = ( customStack, selectedStackIds ) => { 

    const result = {
        id: customStack.stack.id,
        classes: ''
    };

    let isHere;
    const owner = customStack.stackOwner;
    if( owner.forGMs ) {
        isHere = game.users.some( u => u.isGM && u.active );
        result.name = game.settings.get("ready-to-use-cards", GlobalConfiguration.gmName);
        result.icon = game.settings.get("ready-to-use-cards", GlobalConfiguration.gmIcon);

    } else if( owner.forPlayers ) {
        const user = game.users.get(customStack.stackOwner.playerId);
        isHere = user.active ?? false;
        result.name = user.name;
        result.icon = user.character?.img ?? 'icons/svg/mystery-man.svg';

    } else {
        isHere = true;
        result.name = customStack.stack.name;
        result.icon = customStack.stack.img;
    }

    if( !isHere ) { 
        result.classes += ' not-here';
    }

    const selected = selectedStackIds.includes(customStack.stack.id);
    if( selected ) { 
        result.classes += ' selected';
    }

    return result;
}


/**
 * Deduce selectable stacks from a list of StackTargetPossibilities
 * @param {string[]} availableTargets List of StackTargetPossibilities
 * @param {boolean} includeSelf if you can target your own stacks
 * @returns {CustomCardStack[]} Selectable stacks
 */
const deduceStacksFromAvailableTargets = ( availableTargets, includeSelf) => {

    const stacks = game.cards.map( stack => {
        return new CustomCardStack(stack);
    }).filter( (customCardStack) => {
        const stackOwner = customCardStack.stackOwner;
        if( stackOwner.forGMs ) {
            if( customCardStack.stack.type === "hand" ) {
                return availableTargets.includes("GH");
            } else {
                return availableTargets.includes("GR");
            }

        } else if( stackOwner.forPlayers ) {
            if( !includeSelf && stackOwner.playedId === game.user.id) {
                return false;
            }

            if( customCardStack.stack.type === "hand" ) {
                return availableTargets.includes("PH");
            } else {
                return availableTargets.includes("PR");
            }

        } else if( stackOwner.forNobody ) {
            if( customCardStack.stack.type === "deck" ) {
                return availableTargets.includes("DE");
            } else {
                return availableTargets.includes("DI");
            }
        }

        return false;
    });
    return stacks;
}


export class CardActionParametersBase {
    
    constructor( sheet, actionTitle ) {
        this.sheet = sheet;
        this.actionTitle = actionTitle;
    }
    /**
     * What will actually be loaded will depend on this._actionParameters.type
     * @returns {object} will be stored inside data.parameters
     */
    loadParameters() { 
        return {
            title: this.actionTitle
        }; 
    }

    addListeners(html) {
        html.find(".parameters-panel .cancel").click(event => this.resumeAction() );

    }

    resumeAction() {
        this.sheet._actionParameters = null;
        this.sheet.render();
    }
}

export class CardActionParametersForCardSelection extends CardActionParametersBase {

    /**
     * Used to inform the GUI that the user needs to select some additional cards
     * @param {CustomCardsDisplay} sheet The sheet where those paramters will be chosen
     * @param {string} actionTitle What will be displayed on top of the selection
     * @param {CustomCardStack[]} [fromStacks] Available target stacks. (Pick this or [availableTargets])
     * @param {string[]} [availableTargets] For building fromStacks criteria. Should contains some StackTargetPossibilities (Pick this or [fromStacks])
     * @param {boolean} [includeSelf] Used with [availableTargets]. Allow to target his own stacks
     * @param {int} [minAmount] min amount of cards which needs to be selected before the 'OK' button becomes available
     * @param {int} [maxAmount] max amount
     * @param {string} [buttonLabel] What the say inside the ok button.
     * @param {*} [criteria] Applied to sortedCardList for filter. If null, all cards will be available
     * @param {*} [callBack] What to call once cards have been selected. If null, it will call playCards with all ids.
     */
    constructor( sheet, actionTitle, {fromStacks=null, availableTargets=[], includeSelf=false, minAmount=1, maxAmount=1, buttonLabel = 'ok', criteria = null, callBack = null}={} ) {
        super(sheet, actionTitle);

        const defaultCriteria = (c) => { return true; };
        const defaultCallback = async (selection, from, additionalCards) => { 
            const cardIds = [selection.id];
            additionalCards.forEach( c => cardIds.push(c.id) );
            return this.sheet.cards.playCards(cardIds);
        };

        // If more than one choice, let the user decide
        this.availableStacks = fromStacks ?? deduceStacksFromAvailableTargets(availableTargets, includeSelf);
        this.from = this.availableStacks.length > 1 ? null : this.availableStacks[0];

        this.minAmount = minAmount;
        this.maxAmount = maxAmount;
        this.buttonLabel = buttonLabel;
        this.selectedCardIds = [];
        this.criteria = criteria ?? defaultCriteria;
        this.callBack = callBack ?? defaultCallback;
    }

    get filteredCards() {
        return this.from.sortedCardList.filter( c => {
            return c.id != this.sheet.currentSelection?.id;
        }).filter( c => {
            return this.criteria(c);
        });
    }

    /**
     * Prepare data to display other available cards for selection
     * @override
     */
    loadParameters() { 
        const parameters = super.loadParameters();
        parameters.needCards = true;
        parameters.buttonLabel = this.buttonLabel;

        if( !this.from ) {
            this._loadParametersWhileSelectingStack(parameters);
        } else {
            this._loadParametersWhileChoosingCards(parameters);
        }
        return parameters;
    }

    _loadParametersWhileSelectingStack(parameters) {

        // Stack selection
        const availableStacksInfo = this.availableStacks.map( ccs => loadStackDataInfos(ccs, []) );
        parameters.availableStacks = availableStacksInfo;
        parameters.displayStacks = true;

        // Title 
        parameters.title = this.sheet._custom.localizedLabel('sheet.parameters.cards.firstStep')
    }

    _loadParametersWhileChoosingCards(parameters) {

        // Card listing
        let selectedAmount = 0;
        const availableCardsInfo = this.filteredCards.map(c => {
            const cardInfo = this.sheet._buildCardInfo(c);
            if( this.selectedCardIds.includes(c.id) ) {
                cardInfo.classes += ' selected';
                selectedAmount++;
            }
            return cardInfo;
        });
        parameters.sortedCardList = availableCardsInfo;

        // Title and ok button
        const suffix = ' (' + selectedAmount + '/' + this.maxAmount + ')';
        parameters.title = parameters.title + suffix;

        parameters.changeStack = {
            displayed: this.from && this.availableStacks.length > 1,
            label: this.sheet._custom.localizedLabel('sheet.parameters.cards.changeStack')
        };
        parameters.isReady =   selectedAmount >= this.minAmount 
                            && selectedAmount <= this.maxAmount;
        
    }

    /**
     * @override
     */
    addListeners(html) {
        super.addListeners(html);
        html.find(".parameters-panel .stacks .stack").click(event => this.onClickChooseStack(event) );
        html.find(".parameters-panel .cards .card-slot").click(event => this.onClickToggleSelection(event) );
        html.find(".parameters-panel .change-stack").click(event => this.onClickChangeStack(event) );
        html.find(".parameters-panel .selection-ok").click(event => this.onClickPerformAction(event) );
    }

    async onClickChooseStack(event) {
        event.preventDefault();
        const key = event.currentTarget.dataset.key;
        this.from = this.availableStacks.find( s => s.stack.id === key );

        this.sheet.render();
    }

    async onClickToggleSelection(event) {
        event.preventDefault();
        const key = event.currentTarget.dataset.key;
        
        const unselect = this.selectedCardIds.includes(key);
        if( unselect ) {
            this.selectedCardIds = this.selectedCardIds.filter( id => id != key );
        } else {
            this.selectedCardIds.push( key );
        }

        this.sheet.render();
    }

    async onClickChangeStack(event) {
        event.preventDefault();
        this.from = null;

        this.sheet.render();
    }

    async onClickPerformAction(event) {
        event.preventDefault();
        const selectedCards = this.filteredCards.filter( c => this.selectedCardIds.includes(c.id) );
        await this.callBack(this.sheet.currentSelection, this.from, selectedCards);
        this.resumeAction();
    }
}

export class CardActionParametersForPlayerSelection extends CardActionParametersBase {

    /**
     * Used to inform the GUI that the user needs to select players
     * Commonly used while dealing or giving cards
     * @param {CustomCardsDisplay} sheet The sheet where those paramters will be chosen
     * @param {string} actionTitle What will be displayed on top of the selection
     * @param {boolean} [specifyAmount] If the user should specifiy an mount on top of selecting users
     * @param {boolean} [onlyOne] If only one stack can be selected. In that case, selection will remove previous one
     * @param {string} [buttonLabel] What the say inside the ok button.
     * @param {CustomCardStack[]} [fromStacks] Available target stacks. (Pick this or [availableTargets])
     * @param {string[]} [availableTargets] For building fromStacks criteria. Should contains some StackTargetPossibilities (Pick this or [fromStacks])
     * @param {boolean} [includeSelf] Used with [availableTargets]. Allow to target his own stacks
     * @param {*} [callBack] What to call once cards have been selected. If null, it will call dealCards to all selected players
     */
    constructor( sheet, actionTitle, {specifyAmount = false, onlyOne = false, fromStacks = null, availableTargets = [], includeSelf=false, buttonLabel = 'ok', callBack = null}={} ) {
        super(sheet, actionTitle);

        const deck = new CustomCardStack( this.sheet._cards );
        const defaultCallback = async (selection, selectedStacks, amount) => { 
            await deck.dealCards(selectedStacks, amount);
        };

        this.buttonLabel = buttonLabel;
        
        this.specifyAmount = specifyAmount;
        this.onlyOne = onlyOne;
        this.amount = 1;

        this.selectedStackIds = [];
        this.gmSelected = false;

        this.fromStacks = fromStacks ?? deduceStacksFromAvailableTargets(availableTargets, includeSelf);
        this.callBack = callBack ?? defaultCallback;
    }

    /**
     * Prepare data to display other available cards for selection
     * @override
     */
    loadParameters() { 
        const parameters = super.loadParameters();
        parameters.needStacks = true;
        parameters.specifyAmount = this.specifyAmount;
        parameters.amount = this.amount;
        
        const custom = new CustomCardStack(this.sheet._cards);
        parameters.labels = {
            headerHands: custom.localizedLabel('sheet.parameters.stacks.hands'),
            headerRevealed: custom.localizedLabel('sheet.parameters.stacks.revealed'),
            headerAmount: custom.localizedLabel('sheet.parameters.stacks.amount'),
            button: this.buttonLabel
        };

        const handsInfo = this.fromStacks.filter( ccs => ccs.stack.type == 'hand' ).map( ccs => loadStackDataInfos(ccs, this.selectedStackIds) );
        handsInfo.sort( (a,b) => a.name.localeCompare(b.name) );
        parameters.hands = handsInfo;
        parameters.handsDisplayed = handsInfo.length > 0;

        const revealedCardsInfo = this.fromStacks.filter( ccs => ccs.stack.type == 'pile' ).map( ccs => loadStackDataInfos(ccs, this.selectedStackIds) );
        revealedCardsInfo.sort( (a,b) => a.name.localeCompare(b.name) );
        parameters.revealedCards = revealedCardsInfo;
        parameters.revealedCardsDisplayed = revealedCardsInfo.length > 0;

        parameters.isReady = this.selectedStackIds.length > 0;
        return parameters;
    }

    /**
     * @override
     */
    addListeners(html) {
        super.addListeners(html);
        html.find(".parameters-stacks .stacks .stack").click(event => this.onClickToggleSelection(event) );
        html.find(".parameters-stacks .amount-edit").click(event => this.onClickModifyAmount(event) );
        html.find(".parameters-stacks .selection-ok").click(event => this.onClickPerformAction(event) );
    }

    async onClickToggleSelection(event) {
        event.preventDefault();
        const key = event.currentTarget.dataset.key;
        
        const unselect = this.selectedStackIds.includes(key);
        if( unselect ) {
            this.selectedStackIds = this.selectedStackIds.filter( id => id != key );
        } else if( this.onlyOne ) {
            this.selectedStackIds = [key];
        } else {
            this.selectedStackIds.push( key );
        }

        this.sheet.render();
    }

    async onClickModifyAmount(event) {
        event.preventDefault();
        const action = event.currentTarget.dataset.action;

        if( action == 'minus' ) {
            this.amount = Math.max(1, this.amount-1);
        } else {
            this.amount++;
        }
        this.sheet.render();
    }

    async onClickPerformAction(event) {
        event.preventDefault();
        const selectedStacks = this.fromStacks.filter( c => this.selectedStackIds.includes(c.stack.id) );
        await this.callBack(this.sheet.currentSelection, selectedStacks, this.amount);
        this.resumeAction();
    }
}
