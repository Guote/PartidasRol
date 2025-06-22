import { SingleCardDisplay } from "./mainui/SingleCardDisplay.js";

export const isACardMessage = (message) => {
    const flags = message.flags;
    return flags['ready-to-use-cards']?.handleCards ? true : false;
}

export const alterCardMessage = (message, html) => {
    
    const needToHideContent = (flag) => {

        const gmMessage = flag.forGMs && game.user.isGM;
        const correctPlayerMessage = flag.forPlayers && flag.playerId === game.user.id;

        if( flag.hideToStrangers ) { 
            // Only displayed to the one having sent the message
            if( gmMessage || correctPlayerMessage ) { return false; }
            return true;
        }

        const discardId = flag.sentToDiscard
        if( discardId ) {
            const discard = game.cards.get(discardId);
            const enoughRights = discard?.testUserPermission(game.user, "OBSERVER") ?? false;

            // Only displayed if you're the one discarding the card
            if(!enoughRights) { return !correctPlayerMessage; }
            return false;
        }

        return false;
    }

    const onClickShowCard = async (event) => {
        event.preventDefault();
        const a = event.currentTarget;
        const playerId = a.dataset.player;
        const cardName = a.dataset.ref;

        const cardStacks = game.modules.get('ready-to-use-cards').cardStacks;
        const rotated = parseInt(a.dataset.rotated) == 1;
        const cardType = a.dataset.type;

        const player = game.users.find( u => u.id === playerId);
        const isGMCard = playerId == 'gm';

        // First :Try to look inside player hand and revealed cards
        const customPool = isGMCard ? [cardStacks.gmHand, cardStacks.gmRevealedCards]
                                    : [cardStacks.findPlayerHand(player), cardStacks.findRevealedCards(player) ];

        let custom = null;
        let card = null;
        for( const current of customPool ) {
            if(card) { continue; }
            custom = current;
            card = current?.stack.cards.find(c => c.name === cardName);
        }

        // Second : Card wasn't found on stack. Maybe it has already been played?
        // => Check the discard pile
        if(!card) {
            custom = cardStacks.piles[cardType];
            card = custom?.stack.cards.find(c => c.name === cardName);
        }


        // Lastly : Fallback on card definition (stack won't be navigated)
        if(!card) {
            custom = cardStacks.decks[cardType];
            card = custom?.stack.cards.find(c => c.name === cardName);
        }

        // If found, display the stack GUI and select current card
        if( card ) {

            // Action will differ if the card can't be visible in its current stack
            let wholeStackCanBeSeen = true;
            if( custom.stack.type === 'deck' ) { 
                wholeStackCanBeSeen = false; 
            } else if( custom.stack.type === 'hand' ) {
                const owner = custom.stackOwner;
                if( owner.forGMs ) {
                    wholeStackCanBeSeen = game.user.isGM;
                } else {
                    wholeStackCanBeSeen = custom.stackOwner.playerId === game.user.id;
                }
            }

            // Classic stack display or single card display
            const sheet = wholeStackCanBeSeen ? card.parent.sheet :  new SingleCardDisplay(card, {editable: card.isOwner});
            sheet._currentSelection = card;
            sheet.forceRotate = rotated;
            sheet.render(true);
        }
    };

    const hideContent = needToHideContent(message.flags['ready-to-use-cards']?.handleCards);
    if( hideContent ) {
        html.find('.rtucards-message')[0].outerHTML= '';
    } else {
        html.find('.rtucards-message .card-link').click(event => onClickShowCard(event));
    }
}

