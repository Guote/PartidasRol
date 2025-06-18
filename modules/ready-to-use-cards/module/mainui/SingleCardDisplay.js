import { CustomCardsDisplay } from './CardsDisplay.js';


export class SingleCardDisplay extends CustomCardsDisplay {
    constructor(card, options) {
        super(card.parent, options);
        this._currentSelection = card;

        // See if the listing is allowed :
        const owner = this._cards.getFlag('ready-to-use-cards', 'owner');
        if( game.user.isGM ) { 
            this._listingAllowed = (owner == 'gm') || card.parent.type == 'pile';
        } else { 
            this._listingAllowed = owner === game.user.id; 
        }
    }

    /** @override */
    get listingAllowed() {
        return this._listingAllowed;
    }

    /** @override */
    currentlyPeekingOnCardType(coreStackRef) {
        return true;
    }

    /**
     * No default actions 
     * @override 
     * */
    _loadDeckActionsByDefault(actions) {}

    /**
     * No default actions 
     * @override 
     * */
     _loadDiscardActionsByDefault(actions) {}
    
    /**
     * No default actions 
     * @override 
     * */
     _loadHandActionsByDefault(actions) {}
    
    /**
     * No default actions 
     * @override 
     * */
     _loadRevealedCardsActionsByDefault(actions) {}
}
