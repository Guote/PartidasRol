/* --------------------------------------------------------------------------------
         This class can be copied from ready-to-use-cards module
   It handle basic CustomCard behavior and can be extends for additional features
-----------------------------------------------------------------------------------*/

import { CustomCardStack } from "../CustomCardStack.js";
import { CARD_STACKS_DEFINITION } from "../StackDefinition.js";

export class CustomCardGUIWrapper {

    constructor(card) {
        this._card = card;
        this._custom = new CustomCardStack(card.source);
        this._currently = new CustomCardStack(card.parent);

        const coreKey = this._custom.coreStackRef;
        const cls = CARD_STACKS_DEFINITION.core[coreKey].cardClass;
        this._wrapped = new cls(card);

        const module = game.modules.get('ready-to-use-cards');
        this.actionService = module.actionService;
        this.paramService = module.parameterService;
    }

    get card() {
        return this._card;
    }

    get cardData() {
        return this._card.data;
    }

    get id() {
        return this._card._id;
    }

    get name() {
        // WARNING : this._card.name exists but change depending on the current card face.
        // Since we are not using the face system, directly take the base card name
        return this._card.name;
    }

    get img() {
        return this._card.img;
    }


    /**
     * Manage all faces with default values.
     * If settings says so, alos add the back as the last face
     */
    get allFaces() {

        if( !this._allFaces ) {
            this._allFaces = this._card.faces.map(f => {
                const data = {
                    name: f.name,
                    text: f.text,
                    img : f.img
                };
                if( !data.name || data.name == '' ) { data.name = this.name ?? ''; }
                if( !data.text || data.text == '' ) { data.text = this._card.description ?? ''; }
                if( !data.img  || data.img == '' ) { data.img = this._custom.frontDefaultImage; }
                return data;
            });
    
            // Multiple parameters can induce back to be a valid face
            if( this._custom.backIsAValidFaceForCards ) {
                const back = {
                    name: this._card.back?.name,
                    text: this._card.back?.text,
                    img : this._card.back?.img
                };
                if( !back.name || back.name == '' ) { back.name = this.name ?? ''; }
                if( !back.text || back.text == '' ) { back.text = this._card.description ?? ''; }
                if( !back.img  || back.img == '' || back.img == 'icons/svg/card-joker.svg' ) { back.img = this._custom.backDefaultImage; }
    
                this._allFaces.push(back);
            }
        }
        return this._allFaces;
    }

    /**
     * Return the current face for this card.
     * I chose to store face index in my flags instead of the data._source.face to keep usual card data without changes
     * Used flag : this._card.getFlag('ready-to-use-cards', 'currentFace')
     */
    get currentFace() {
        let faceIndex = this._card.getFlag('ready-to-use-cards', 'currentFace') ?? 0;
        const allFaces = this.allFaces;
        if( faceIndex >= allFaces.length ) { faceIndex = allFaces.length -1; }
        return allFaces[faceIndex];
    }

    /**
     * Loop through faces. When reaching the end, it goes back to the first one
     * @returns the current face after change
     */
    async nextFace() {
        let faceIndex = this._card.getFlag('ready-to-use-cards', 'currentFace') ?? 0;
        faceIndex++;

        const allFaces = this.allFaces;
        if( faceIndex >= allFaces.length ) { faceIndex = 0; }
        await this._card.setFlag('ready-to-use-cards', 'currentFace', faceIndex);
        return this.currentFace;
    }


    get ownedByCurrentPlayer() {
        return this._currently.ownedByCurrentPlayer;
    }

    get detailsCanBeDisplayed() {
        
        const cardType = this._currently.stack.type;
        const owner = this._currently.stackOwner;
        if( owner.forNobody ) {

            // Deck : Hidden to everybody
            if( cardType == 'deck' ) {
                return false;
            }
            
            // Discard : Visible only to those having enough rights
            if( cardType == 'pile' ) {
                return this._currently.stack.testUserPermission(game.user, "OBSERVER");
            }
        }

        // Hand and Revealed card of current player
        if( this.ownedByCurrentPlayer ) {
            return true;
        }

        // Card or Revealed cards of other players/GM
        return cardType == 'pile';
    }

    /**
     * May be overriden
     */
    shouldBeRotated( rotatingAsked ) {

        const deckKey = this._custom.coreStackRef;
        const prefix = this._currently.prefixForActions;
        const actions = this.actionService.getActionPossibilities(deckKey, ["rotateCard"], {from: prefix, target: prefix});

        const allowed = actions.length > 0;
        const result = allowed && rotatingAsked;

        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterShouldBeRotated ) {
            return this._wrapped.alterShouldBeRotated(result, rotatingAsked);
        }
        return result;
    }

    /**
     * Will fill the div with whatever the cards wants
     * @param {HTMLElement} htmlDiv 
     */
    fillCardContent(htmlDiv) {

        const guiClass = this._wrapped.guiClass ?? 'basecard';
        // By default, card content only have its background. You can add additional content by overriding this method
        htmlDiv.classList.replace('display-content', guiClass);

        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterFillCardContent ) {
            this._wrapped.alterFillCardContent(htmlDiv);
        }
    }

    /**
     * Used when lisiting cards inside chat message.
     * Those info will be added inside the listing-card template
     * @param {CustomCardStack} from : Where the card was previously
     * @param {boolean} [addCardDescription] : If description should be added for each card
     * @param {boolean} [displayCardImage] : Card image should also be added to chat
     * @returns {object} Card data wich will be added to the listing-card-template
     */
    buildCardInfoForListing(from, addCardDescription=false, displayCardImage=false) {

        const stackOwner = this._currently.stackOwner;
        const playerFlag = stackOwner.forPlayers ? stackOwner.playerId : 'gm';

        const face = this.currentFace;
        const result = {
            player: playerFlag,
            ref: face.name,
            icon: this._custom.frontIcon,
            name: this._custom.localizedLabel(face.name),
            type: this._custom.coreStackRef,
            rotated: 0,
            description: []
        };

        if( addCardDescription && face.text != "" ) {
            const desc = this._custom.localizedLabel(face.text);
            if( desc != "" ) {
                result.description.push(desc);
            }
        }

        if( displayCardImage ) {
            let template = document.createElement('template');
            template.innerHTML = "<div class=\"flexcol card-slot display-content\" " + 
                                      "style=\"background-image: url('" + this.currentFace.img +"');\"></div>";
            const htmlDiv = template.content.firstChild;
            this.fillCardContent(htmlDiv);
            result.image = {
                htmlDiv: htmlDiv.outerHTML
            };
        }

        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterBuildCardInfoForListing ) {
            this._wrapped.alterBuildCardInfoForListing(result, from, addCardDescription);
        }
        return result;
    }

    /**
     * Available actions when this card has been selected inside the main deck.
     * May be overriden
     * @param {boolean} detailsHaveBeenForced Normally, decks card are not visible. An action exist so that they become visible for gm.
     * @returns {CardActionData}  See constants.js
     */
    loadActionsWhileInDeck(detailsHaveBeenForced) {

        const actions = [];

        const isOwner = this.card.parent.testUserPermission(game.user, "OWNER");

        const deckKey = this._custom.coreStackRef;
        const prefix = this._currently.prefixForActions; // "DE"

        const possibilities = this.actionService.getActionPossibilities(deckKey, ["flipCard", "rotateCard", "moveCard"], {from: prefix});
        possibilities.forEach( p => {

            const guiAction = this.actionService.asGUIAction(p);
            switch( p.signature ) {

                case "flipCard-flip" : {
                    if( !detailsHaveBeenForced || !isOwner || this.allFaces.length <= 1 ) { return; }
                    break;
                }

                case "rotateCard-rotate" : {
                    if( !detailsHaveBeenForced ) { return; }
                    break;
                }

                case "moveCard-give" :
                case "moveCard-discardOne" : {
                    if( !isOwner ) { return; }
                }
            }
            actions.push(guiAction);
        });

        // Separate rotate and flip from real actions
        this.actionService.addCssAfterSomeGuiActions(actions, ["flipCard-", "rotateCard-"]);


        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterLoadActionsWhileInDeck ) {
            this._wrapped.alterLoadActionsWhileInDeck(actions, detailsHaveBeenForced);
        }

        return actions;
    }

    /**
     * Available actions when this card has been selected inside a player hand
     * May be overriden
     * @param {boolean} stackOwnedByUser if this is the current user hand
     * @param {boolean} detailsHaveBeenForced Normally, decks card are not visible. An action exist so that they become visible for gm.
     * @returns {CardActionData}  See constants.js
     */
    loadActionsWhileInHand(stackOwnedByUser, detailsHaveBeenForced) {

        const actions = [];

        const cardsAreVisible = detailsHaveBeenForced || stackOwnedByUser;

        const deckKey = this._custom.coreStackRef;
        const prefix = this._currently.prefixForActions; // "PH" or "GH"

        const possibilities = this.actionService.getActionPossibilities(deckKey, ["flipCard", "rotateCard", "playCard", "moveCard", "exchangeCard", "transferCards", "swapCards"], {from: prefix});
        possibilities.forEach( p => {

            const guiAction = this.actionService.asGUIAction(p);
            switch( p.signature ) {

                case "flipCard-flip" : {
                    if( !stackOwnedByUser || this.allFaces.length <= 1 ) { return; }
                    break;
                }

                case "rotateCard-rotate" : {
                    if( !cardsAreVisible ) { return; }
                    break;
                }

                default: { // All the others
                    if( !stackOwnedByUser ) { return; }
                    break;
                }
            }
            actions.push(guiAction);
        });

        // Separate rotate and flip from real actions
        this.actionService.addCssAfterSomeGuiActions(actions, ["flipCard-", "rotateCard-"]);
        this.actionService.addCssAfterSomeGuiActions(actions, ["playCard-", "moveCard-"]);

        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterLoadActionsWhileInHand ) {
            this._wrapped.alterLoadActionsWhileInHand(actions, stackOwnedByUser, detailsHaveBeenForced);
        }
        return actions;
    }

    /**
     * Available actions when this card has been selected inside a player revealed cards
     * May be overriden
     * @param {boolean} stackOwnedByUser if this is the current user revealed cards
     * @returns {CardActionData}  See constants.js
     */
    loadActionsWhileInRevealedCards(stackOwnedByUser) {
        
        const actions = [];

        const deckKey = this._custom.coreStackRef;
        const prefix = this._currently.prefixForActions; // "PR" or "GR"

        const possibilities = this.actionService.getActionPossibilities(deckKey, ["flipCard", "rotateCard", "playCard", "moveCard", "transferCards", "exchangeCard", "swapCards"], {from: prefix});
        possibilities.forEach( p => {

            const guiAction = this.actionService.asGUIAction(p);
            switch( p.signature ) {

                case "flipCard-flip" : {
                    if( !stackOwnedByUser || this.allFaces.length <= 1 ) { return; }
                    break;
                }

                case "rotateCard-rotate" : {
                    break; // Always here
                }

                default: { // All the others
                    if( !stackOwnedByUser ) { return; }
                    break;
                }
            }
            actions.push(guiAction);
        });

        // Separate rotate and flip from real actions
        this.actionService.addCssAfterSomeGuiActions(actions, ["flipCard-", "rotateCard-"]);
        this.actionService.addCssAfterSomeGuiActions(actions, ["playCard-", "moveCard-"]);

        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterLoadActionsWhileInRevealedCards ) {
            this._wrapped.alterLoadActionsWhileInRevealedCards(actions, stackOwnedByUser);
        }

        return actions;
    }

    /**
     * Available actions when this card has been selected inside the main discard.
     * May be overriden
     * @returns {CardActionData}  See constants.js
     */
     loadActionsWhileInDiscard() {

        const actions = [];

        const isOwner = this.card.parent.testUserPermission(game.user, "OWNER");
        const isObserver = this.card.parent.testUserPermission(game.user, "OBSERVER");

        const deckKey = this._custom.coreStackRef;
        const prefix = this._currently.prefixForActions; // "DI"

        const possibilities = this.actionService.getActionPossibilities(deckKey, ["flipCard", "rotateCard", "moveCard"], {from: prefix});
        possibilities.forEach( p => {

            const guiAction = this.actionService.asGUIAction(p);
            switch( p.signature ) {

                case "flipCard-flip" : {
                    if( !isOwner || this.allFaces.length <= 1 ) { return; }
                    break;
                }

                case "rotateCard-rotate" : {
                    if( !isObserver ) { return; }
                    break;
                }

                case "moveCard-backDeck" : {
                    if( !isOwner ) { return; }
                }
            }
            actions.push(guiAction);
        });

        // Separate rotate and flip from real actions
        this.actionService.addCssAfterSomeGuiActions(actions, ["flipCard-", "rotateCard-"]);

        // Call the potential implementation inside wrapped impl
        if( this._wrapped.alterLoadActionsWhileInDiscard ) {
            this._wrapped.alterLoadActionsWhileInDiscard(actions);
        }

        return actions;
    }

    /**
     * Triggered when .customAction is clicked
     * Shopuld be overriden. Do nothing in this implem
     * @param {string} action 
     */
    async onClickDoCustomAction(action) {
        if( this._wrapped.onClickDoCustomAction ) {
            return this._wrapped.onClickDoCustomAction(action);
        }
    }
}