export class CustomCardSimple {

    constructor(card) {
        this._card = card;
    }

    get card() {
        return this._card;
    }

    /* --------------------------------------------------------------------------------
        This class is actually empty
        All the listed functions bellow can be added to your custom impl to change default behavior
        (They will be called inside CustomCardGUIWrapper)
        If the impl class is not implementing one of these function, the wrapper will simply ignore the called to the wrapped class for this one
    -----------------------------------------------------------------------------------*/

    /**
     * When filling .card-slot, a css class will be added to the HtmlElement.
     * If this getter is not present in your impl, 'basecard' will be the used cssClass
     * @returns {string} the wanted cssClass
     */
    get guiClass() {}

    /**
     * You can alter your card behavior when a rotation is asked in the GUI.
     * @param {boolean} result Result computed by the wrapper (default result base on stack settings)
     * @param {boolean} rotatingAsked If a rotation has been asked by the GUI
     * @returns {boolean} The new result
     */
    alterShouldBeRotated(result, rotatingAsked) {
        return result;
    }

    /**
     * You can alter the .card-slot content when this card is selected and visible.
     * Wrapper has already added this.guiClass as a css class of the element
     * @param {HTMLElement} htmlDiv .card-slot htmlElement
     */
    alterFillCardContent(htmlDiv) {}

    /**
     * You can modify the content which will be displayed on chat when manipulating this card.
     * Will be used on several actions, like play, discard or reveal.
     * You should directly alter the result param if you want to add changes. (returns nothing)
     * @param {object} result What will be used if you change nothing.
     * @param {CustomCardStack} from Where the card was previously
     * @param {boolean} addCardDescription : If description should be added for each card
     */
    alterBuildCardInfoForListing(result, from, addCardDescription) {}

    /**
     * You can modify the common available actions for deck. Those actions are available even if no cards are selected
     * You should directly alter the result actions if you want to add changes. (returns nothing)
     * @param {object[]} actions Action computed by the wrapper. (default result base on stack settings)
     */
    alterLoadBasicActionsForDeck(actions) {}

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
     * You can add custom behavior when an action is clicked.
     * The wrapper will simply relay the information to the impl class
     */
    async onClickDoCustomAction(action) {}

}