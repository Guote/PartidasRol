import { GlobalConfiguration, defaultShortcutSettings, defaultUIDataForHand, defaultUIDataForRevealed } from "./constants.js";
import { ConfigSheetForShortcuts } from "./config/ConfigSheetForShortcuts.js";
import { CustomCardGUIWrapper } from "./mainui/CustomCardGUIWrapper.js";
import { BaseApplicationV2 } from "./BaseApplicationV2.js";

const HEIGHT_FOR_ONE_CARD = 800;
const WIDTH_FOR_ONE_CARD = 520;
const ADDITIONNAL_FRAME_WIDTH = 530;

/**
 * For hand and shortcut panels
 */
class ShortcutPanel extends BaseApplicationV2 {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        window: {
            frame: false,
            positioned: false
        }
    };

    /** @override */
    static PARTS = {
        main: {
            template: "modules/ready-to-use-cards/resources/sheet/shortcuts.hbs"
        }
    }

    #user;
    #currentSettings;
    #displayCardDetails;
    constructor(user, displayCardDetails, options = {}) {
        super(options);
		this.module = game.modules.get('ready-to-use-cards');
        this.#user = user;
        this.#displayCardDetails = displayCardDetails;
        this.#currentSettings = this.loadSettings();
        this._cardIndex = 0;
        this._exceedMaxPerLine = false;
        this._move = {
            moving: false,
            currentPos: { x: 0, y: 0 },
            listener: e => this._onMouseMove(e),
            wholeView : null
        };
    }

    get user() { return this.#user; }

    /**
     * UI data for this spectific user
     */
    get uiDataForUser() {
        let uiData = this.#currentSettings.byUsers[this.#user.id];
        if(!uiData) {
            uiData = this.defaultUIDataForUser;
            this.#currentSettings.byUsers[this.#user.id] = uiData;
        }
        return uiData;
    }

    /**
     * Should be overriden
     */
    get defaultUIDataForUser() {}


    /**
     * Getter for retrieving related stack
     * Should be overriden
     */
    get customStack() {
        return null;
    }

    /**
     * Used to set this.#currentSettings
     * Should be overriden
     * @returns {object}
     */
    loadSettings() {
        return {};
    }

    /**
     * Used to set update game settings when changes occurs inside the panel (like a movement)
     * @returns {object}
     */
    async updateSettings() {
        let wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings === '') {
            wholeSettings = defaultShortcutSettings(user);
        }
        this.updateWholeSettings(wholeSettings, this.uiDataForUser);
        await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, wholeSettings);
        this.reload();
    }
    /**
     * What to actually update on settings
     * @param wholeSettings what is stored inside game.settings
     * @param uiDataForUser what is retrieved through get uiDataForUsers() method
     */
    updateWholeSettings(wholeSettings, uiDataForUser) {}


    /**
     * Config has changed => See if there is a need to reload the sheet
     */
    someSettingsHaveChanged() {
        const newSettings = this.loadSettings();
        if( JSON.stringify(this.#currentSettings) !== JSON.stringify(newSettings) ) {
            this.#currentSettings = newSettings;
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
        let shouldBeDisplayed = this.#currentSettings.displayed;
        if(shouldBeDisplayed && this.#user.id !== game.user.id) {
            const byUser = this.#currentSettings.byUsers[this.#user.id];
            shouldBeDisplayed = byUser?.displayed && this.#currentSettings.displayOtherUsers;
        }
        if( !this.customStack || !shouldBeDisplayed ) {
            this.close();
        } else {
            this.render(true);
        }
    }

    /** @override */
    async _prepareContext(_options) {
        const customStack = this.customStack;
        const allCards = customStack.sortedCardList;
        const displayedCards = this.#chooseCardsToDisplay(allCards);

        const navigation = {
            displayed: this._exceedMaxPerLine && displayedCards.length > 0,
            left: this._cardIndex > 0,
            right: this._cardIndex < (allCards.length - displayedCards.length)
        };
        const summary = {
            displayed: displayedCards.length === 0,
            text: '' + allCards.length
        };
        const header = {
            displayed: this.#user.id !== game.user.id,
            label: this.#user.name
        };

        return {
            style: this.#computeFrameStyle(displayedCards, navigation.displayed, summary.displayed),
            lineStyle: this.#computeLineStyle(displayedCards, navigation.displayed, summary.displayed), 
            cards: displayedCards,
            icon: this.#currentSettings.icon,
            navigation: navigation,
            summary: summary,
            header: header,
            contentDisplayed: !this._move.moving
        };
    }

    /**
     * Filter amoung the stack cards, and chose at most #currentSettings.maxPerLine cards to display
     * _exceedMaxPerLine and _cardIndex are updated inside this function
     * @param {Card[]} allCards All this stack cards (ordered)
     * @returns {object[]} Cards data to used in getData
     */
    #chooseCardsToDisplay(allCards) {

        const cardPool = allCards
            .map( card => {
                const wrapper = new CustomCardGUIWrapper(card);
                return  {
                    id: card.id, 
                    cardBg: wrapper.currentFace.img,
                    classes: 'display-content ' + (wrapper.shouldBeRotated( false ) ? 'rotated' : '')
                };
            });


        let amount = this.#displayCardDetails ? cardPool.length : 0;
        this._exceedMaxPerLine = amount > this.#currentSettings.maxPerLine;
        if( this._exceedMaxPerLine ) {
            amount = this.#currentSettings.maxPerLine;
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

    #computeFrameStyle(cards, navigationColumn, summaryColumn) {

        let height = HEIGHT_FOR_ONE_CARD;
        let width = ADDITIONNAL_FRAME_WIDTH + WIDTH_FOR_ONE_CARD * cards.length;
        if( navigationColumn ) { width += 120; }
        if( summaryColumn ) { width += 190; }

        height = Math.ceil( this.#currentSettings.scale * height ) + 14; // 14 : border and padding
        width = Math.ceil( this.#currentSettings.scale * width ) + 14;

        const uiData = this.uiDataForUser;
        let style = "left:" + uiData.left + "px; bottom:" + uiData.bottom + "px;";
        style += "height:" + height + "px; width:" + width + "px;";
        return style;
    }

    #computeLineStyle(cards, navigationColumn, summaryColumn) {
        let width = ADDITIONNAL_FRAME_WIDTH + WIDTH_FOR_ONE_CARD * cards.length;
        if( navigationColumn ) { width += 120; }
        if( summaryColumn ) { width += 190; }

        let style = "transform: scale(" + this.#currentSettings.scale + ");";
        style += "min-width: " + width + "px;";
        style += "max-width: " + width + "px;";
        return style;
    }

    /* -------------------------------------------- */

    /** @override */
    _onRender(_context, _options) {
        // Before mapping listeners, add content inside each cardSlot
        this.#addAdditionalContentOnCards();
        this.bindEvent('.card-slot', this.#onClickDisplayCard);
        this.bindEvent('.action-panel .index-change', this.#onClickChangeCardIndex);
        this.bindEvent('.action-panel .show', this.#onClickShowStack);
        this.bindEvent('.shortcut-icon', this.#onRightClickShowConfig, {event: "contextmenu"});

        this.#manageDrapAndDrop();
    }

    //--------------------------------

    #addAdditionalContentOnCards() {
        // Loop on every card which should have its content displayed
        const customStack = this.customStack;
        for( const htmlDiv of this.element.querySelectorAll(".card-slot") ) {
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

    async #onClickDisplayCard(event) {
        event.preventDefault();
        const cardId = event.currentTarget.dataset.key;
        const sheet = this.customStack.stack.sheet;
        if( sheet.selectAvailableCard ) { // When invasive code unchecked, sheet my not be CardsDisplay at some time.
            sheet.selectAvailableCard(cardId);
        }
        sheet.render(true);
    }

    async #onClickChangeCardIndex(event) {
        event.preventDefault();
        const minus = event.currentTarget.dataset.action === 'minus';
        if( minus ) {
            this._cardIndex = Math.max(0, this._cardIndex-1);
        } else {
            this._cardIndex++;
        }
        this.render();
    }

    async #onClickShowStack(event) {
        event.preventDefault();
        this.customStack.stack.sheet.render(true);
    }

    async #onRightClickShowConfig(event) {
        event.preventDefault();
        const sheet = new ConfigSheetForShortcuts();
        sheet.render(true);
    }

    /* -------------------------------------------- */

    async _onMouseMove(event) {

        if( !this._move.moving ) { return; }

        event.preventDefault();
        const movement = {
            x: event.clientX - this._move.currentPos.x,
            y: event.clientY - this._move.currentPos.y
        };
        this._move.currentPos.x = event.clientX;
        this._move.currentPos.y = event.clientY;

        const settings = this.uiDataForUser;
        settings.left += movement.x;
        settings.bottom -= movement.y;
        this.render()
    }

    moveHasEnded(event) {
        event.preventDefault();

        this._move.moving = false;
        this._move.wholeView.removeEventListener("mousemove", this._move.listener);
        this.updateSettings();
    }

    //--------------------------------

    #manageDrapAndDrop() {
        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".shortcut-icon",
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(this.element);
    }

    _canDragStart(_selector) {return true;}
    _canDragDrop(_selector) {return true;}
    _onDragOver(_event) {}
    _onDrop(_event) {
        this._onDragStart(_event);
    }

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
}

/**
 * Shortcut for the player hand
 */
export class ShortcutForHand extends ShortcutPanel {

    constructor(user, options={}) {
        super(user, user.id === game.user.id,
            foundry.utils.mergeObject(options, {id: "rtucards-shortcut-hand-" + user.id})
        );
    }

    /** @override */
    get defaultUIDataForUser() {
        return defaultUIDataForHand();
    }

    /** @override */
    get customStack() {
        if( this.user.isGM ) {
            return this.module.cardStacks.gmHand;
        } else {
            return this.module.cardStacks.findPlayerHand(this.user);
        }
    }

    /** @override */
    loadSettings() {
        let wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings === '') {
            return defaultShortcutSettings(this.user).hands;
        }
        return wholeSettings.hands;
    }

    /** @override */
    updateWholeSettings(wholeSettings, uiData) {
        wholeSettings.hands.byUsers[this.user.id] = uiData;
    }
}

/**
 * Shortcut for the player revealed cards
 */
 export class ShortcutForRevealedCards extends ShortcutPanel {

    constructor(user, options={}) {
        super(user, true,
            foundry.utils.mergeObject(options, {id: "rtucards-shortcut-revealed-" + user.id})
        );
    }

    /** @override */
    get defaultUIDataForUser() {
        return defaultUIDataForRevealed();
    }

    /** @override */
    get customStack() {
        if( this.user.isGM ) {
            return this.module.cardStacks.gmRevealedCards;
        } else {
            return this.module.cardStacks.findRevealedCards(this.user);
        }
    }

    /** @override */
    loadSettings() {
        const wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
        if( !wholeSettings || wholeSettings === '') {
            return defaultShortcutSettings(this.user).revealed;
        } else {
            return wholeSettings.revealed;
        }
    }

    /** @override */
    updateWholeSettings(wholeSettings, uiData) {
        wholeSettings.revealed.byUsers[this.user.id] = uiData;
    }
}

