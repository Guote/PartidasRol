import { DEFAULT_SHORTCUT_SETTINGS, GlobalConfiguration } from "./constants.js";
import { ConfigSheetForShortcuts } from "./config/ConfigSheetForShortcuts.js";
import { CustomCardGUIWrapper } from "./mainui/CustomCardGUIWrapper.js";

const HEIGHT_FOR_ONE_CARD = 800;
const WIDTH_FOR_ONE_CARD = 520;
const ADDITIONNAL_FRAME_WIDTH = 530;

/**
 * For hand and shortcut panels
 */
class ShortcutPanel extends Application {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'modules/ready-to-use-cards/resources/sheet/shortcuts.hbs',
            popOut: false,
            scrollY: [".card-list"],
            dragDrop: [{ dragSelector: ".shortcut-icon"}]
        });
    }

    constructor(options = {}) {
        super(options);
		this.module = game.modules.get('ready-to-use-cards');
        this._currentSettings = this.loadSettings();
        this._cardIndex = 0;
        this._exceedMaxPerLine = false;
        this._move = {
            moving: false,
            currentPos: { x: 0, y: 0 },
            listener: e => this._onMouseMove(e),
            wholeView : null
        };
    }

    /**
     * Getter for retrieving related stack
     * Should be overriden
     */
    get customStack() {
        return null;
    }

    /**
     * Used to set this._currentSettings
     * Should be overriden
     * @returns {object}
     */
    loadSettings() {
        return {};
    }

    /**
     * Used to set update game settings when changes occurs inside the panel (like a movement)
     * Should be overriden
     * @returns {object}
     */
     async updateSettings() { }

    /**
     * Config has changed => See if there is a need to reload the sheet
     */
    someSettingsHaveChanged() {
        const newSettings = this.loadSettings();
        if( JSON.stringify(this._currentSettings) != JSON.stringify(newSettings) ) {
            this._currentSettings = newSettings;
            this.reload();
        }
    }


    /**
     * Called each time a Cards stack changed
     * @param {Cards} changedCardStack 
     */
    someStacksHaveChanged(changedCardStack) {

        const myCustomStack = this.customStack;
        if( myCustomStack && myCustomStack.stack.id === changedCardStack.id ) {
            this.reload();
        }
    }

    /**
     * Reload the GUI.
     * Will close it if option unchecked
     */
    reload() {
        if( !this.customStack || !this._currentSettings.displayed ) {
            this.close();
        } else {
            this.render(true);
        }
    }

    /** @override */
    async getData() {

        const customStack = this.customStack;
        const allCards = customStack.sortedCardList;
        const displayedCards = this._chooseCardsToDisplay(allCards);

        const navigation = {
            displayed: this._exceedMaxPerLine && displayedCards.length > 0,
            left: this._cardIndex > 0,
            right: this._cardIndex < (allCards.length - displayedCards.length)
        };

        const summary = {
            displayed: displayedCards.length == 0,
            text: '' + allCards.length
        };

        const data = {
            style: this._computeFrameStyle(displayedCards, navigation.displayed, summary.displayed),
            lineStyle: this._computeLineStyle(displayedCards, navigation.displayed, summary.displayed), 
            cards: displayedCards,
            icon: this._currentSettings.icon,
            navigation: navigation,
            summary: summary,
            contentDisplayed: !this._move.moving
        };

        return data;
    }

    /**
     * Filter amoung the stack cards, and chose at most _currentSettings.maxPerLine cards to display
     * _exceedMaxPerLine and _cardIndex are updated inside this function
     * @param {Card[]} allCards All this stack cards (ordered)
     * @returns {object[]} Cards data to used in getData
     */
    _chooseCardsToDisplay(allCards) {

        const cardPool = allCards.map( card => {
            const wrapper = new CustomCardGUIWrapper(card);
            return  {
                id: card.id, 
                cardBg: wrapper.currentFace.img,
                classes: 'display-content ' + (wrapper.shouldBeRotated( false ) ? 'rotated' : '')
             };
        });


        let amount = cardPool.length;
        this._exceedMaxPerLine = amount > this._currentSettings.maxPerLine;
        if( this._exceedMaxPerLine ) {
            amount = this._currentSettings.maxPerLine;
        }

        // Stack size can change => update _cardIndex so that it always display the maximum number of cards
        if( this._cardIndex + amount > cardPool.length ) {
            this._cardIndex = Math.max(0, cardPool.length - amount);
        }

        // Just retrieve cards we want to display
        return cardPool.filter( (card, index) => {
            return index >= this._cardIndex && index < this._cardIndex + amount;
        });
    }

    _computeFrameStyle(cards, navigationColumn, summaryColumn) {

        let height = HEIGHT_FOR_ONE_CARD;
        let width = ADDITIONNAL_FRAME_WIDTH + WIDTH_FOR_ONE_CARD * cards.length;
        if( navigationColumn ) { width += 120; }
        if( summaryColumn ) { width += 190; }

        height = Math.ceil( this._currentSettings.scale * height ) + 14; // 14 : border and padding
        width = Math.ceil( this._currentSettings.scale * width ) + 14;

        let style = "left:" + this._currentSettings.left + "px; bottom:" + this._currentSettings.bottom + "px;";
        style += "height:" + height + "px; width:" + width + "px;";
        return style;
    }

    _computeLineStyle(cards, navigationColumn, summaryColumn) {
        let width = ADDITIONNAL_FRAME_WIDTH + WIDTH_FOR_ONE_CARD * cards.length;
        if( navigationColumn ) { width += 120; }
        if( summaryColumn ) { width += 190; }

        let style = "transform: scale(" + this._currentSettings.scale + ");";
        style += "min-width: " + width + "px;";
        style += "max-width: " + width + "px;";
        return style;
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Before mapping listeners, add content inside each cardSlot
        this.addAdditionnalContentOnCards(html);

        html.find('.card-slot').click(event => this._onClickDisplayCard(event) );
        html.find('.action-panel .index-change').click(event => this._onClickChangeCardIndex(event) );
        html.find('.action-panel .show').click(event => this._onClickShowStack(event) );
        html.find('.shortcut-icon').contextmenu(event => this._onRightClickShowConfig(event) );
    }

    addAdditionnalContentOnCards(html) {
        const customStack = this.customStack;

        // Loop on every card which should have its content displayed
        const cardSlots = html.find(".card-slot");
        for( let index = 0; index < cardSlots.length; index++ ) {
            const htmlDiv = cardSlots[index];
            const cardId = htmlDiv.dataset.key;
            if(cardId) { 
                const card = customStack.stack.cards.get(cardId);
                if( card ) {
                    const wrapper = new CustomCardGUIWrapper(card);
                    wrapper.fillCardContent(htmlDiv);
                }
                
            }
        }
    }

    async _onClickDisplayCard(event) {
        event.preventDefault();
        const cardId = event.currentTarget.dataset.key;
        const sheet = this.customStack.stack.sheet;
        if( sheet.selectAvailableCard ) { // When invasive code unchecked, sheet my not be CardsDisplay at some time.
            sheet.selectAvailableCard(cardId);
        }
        sheet.render(true);
    }

    async _onClickChangeCardIndex(event) {
        event.preventDefault();
        const minus = event.currentTarget.dataset.action == 'minus';
        if( minus ) {
            this._cardIndex = Math.max(0, this._cardIndex-1);
        } else {
            this._cardIndex++;
        }
        this.render();
    }

    async _onClickShowStack(event) {
        event.preventDefault();
        this.customStack.stack.sheet.render(true);
    }

    async _onRightClickShowConfig(event) {
        event.preventDefault();
        const sheet = new ConfigSheetForShortcuts();
        sheet.render(true);
    }

    /* -------------------------------------------- */

    /** @override */
    _onDragStart(event) {
        event.preventDefault();
        this._move.currentPos.x = event.clientX;
        this._move.currentPos.y = event.clientY;
        this._move.moving = true;
        this._move.wholeView = event.currentTarget.parentElement.parentElement.parentElement;

        this._move.wholeView.addEventListener("mousemove", this._move.listener );
        this._move.wholeView.addEventListener("mouseup", e => this.moveHasEnded(e), {once: true});

        this.render();
    }

    /** @override */
    _canDragStart(selector) {
        return true;
    }

    async _onMouseMove(event) {

        if( !this._move.moving ) { return; }

        event.preventDefault();
        const movement = {
            x: event.clientX - this._move.currentPos.x,
            y: event.clientY - this._move.currentPos.y
        };
        this._move.currentPos.x = event.clientX;
        this._move.currentPos.y = event.clientY;


        this._currentSettings.left += movement.x;
        this._currentSettings.bottom -= movement.y;
        this.render()
    }

    moveHasEnded(event) {
        event.preventDefault();

        this._move.moving = false;
        this._move.wholeView.removeEventListener("mousemove", this._move.listener);
        this.updateSettings();
    }
}

/**
 * Shortcut for the player hand
 */
export class ShortcutForHand extends ShortcutPanel {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "rtucards-shortcut-hand"
        });
    }

    /** @override */
    get customStack() {
        if( game.user.isGM ) {
            return this.module.cardStacks.gmHand;
        } else {
            return this.module.cardStacks.findPlayerHand(game.user);
        }
    }

    /** @override */
    loadSettings() {
        const wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings == '') {
            return DEFAULT_SHORTCUT_SETTINGS.hands;
        } else {
            return wholeSettings.hands;
        }
    }

    /** @override */
    async updateSettings() {
        let wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings == '') {
            wholeSettings = duplicate(DEFAULT_SHORTCUT_SETTINGS);
        }

        wholeSettings.hands = this._currentSettings;
        await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, wholeSettings);
        this.reload();
    }
}

/**
 * Shortcut for the player revealed cards
 */
 export class ShortcutForRevealedCards extends ShortcutPanel {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "rtucards-shortcut-revealed"
        });
    }

    /** @override */
    get customStack() {
        if( game.user.isGM ) {
            return this.module.cardStacks.gmRevealedCards;
        } else {
            return this.module.cardStacks.findRevealedCards(game.user);
        }
    }

    /** @override */
    loadSettings() {
        const wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings == '') {
            return DEFAULT_SHORTCUT_SETTINGS.revealed;
        } else {
            return wholeSettings.revealed;
        }
    }

    /** @override */
    async updateSettings() {
        let wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings == '') {
            wholeSettings = duplicate(DEFAULT_SHORTCUT_SETTINGS);
        }

        wholeSettings.revealed = this._currentSettings;
        await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, wholeSettings);
        this.reload();
    }
}

