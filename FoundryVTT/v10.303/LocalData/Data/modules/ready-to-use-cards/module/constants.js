/* -------------------------------------------- */
/*   Type Definitions                           */
/* -------------------------------------------- */

/**
 * @typedef {Object} CardActionData Necessary data to create an action inside the rendered template
 * @property {string} classes         Will be added as css class. In the form of <actionGroup>-<action>. See CardDisplay.activateListeners for all available ones
 * @property {string} label           The action label.
 * @property {number} action          Optional. Will be added inside action div as data-action. Can then be retrieved when performing the action
 * 
 * The action mapping will be done via the classes and not the action parameter.
 * A custom class is mapped named 'custom-action'.
 * When called, it will trigger this.currentSelection.onClickDoCustomAction(action)
 */

/**
 * All target possibilities.
 * Values are also used inside a css grid (Source x Target)
 */
export const StackTargetPossibilities = {
    DE: 'DE', // DEck
    DI: 'DI', // DIscard
    GH: 'GH', // Gm Hand
    GR: 'GR', // Gm Revelead cards
    PH: 'PH', // Player Hand
    PR: 'PR' // Player Revelead cards
}

/**
 * All target possibilities.
 * Values are also used inside a css grid (Source x Target)
 */
 export const StackActionTypes = {
    deckUsage: {
        labelKey: 'Actions on deck piles'
    },
    discardUsage: {
        labelKey: 'Actions on discard piles'
    },
    selectedCard: {
        labelKey: 'Actions after selecting a card'
    },
    other: {
        labelKey: 'Other actions'
    }
}


export const StackConfigurationGroup = {
    peekOnCards: {
        labelKey: 'RTUCards.action.peekOnCards.label',
        descKey: 'RTUCards.action.peekOnCards.desc',
        actionType: 'other',
        grid : {
            css: 'no-target',
            targets: ['DE', 'DI', 'GH', 'GR', 'PH', 'PR'],
            fromLabel: 'RTUCards.action.peekOnCards.fromLabel',
            targetLabel: 'RTUCards.action.peekOnCards.targetLabel'
        },
        available: [
            { from: 'DE', target: 'DE', action: 'peek' },
            { from: 'PH', target: 'PH', action: 'peek' }
        ],
        labels: [
            {action: 'peek', default: 'RTUCards.action.peekOnCards.peek.label'}
        ]
    },
    dealCard: {
        labelKey: 'RTUCards.action.dealCard.label',
        descKey: 'RTUCards.action.dealCard.desc',
        actionType: 'deckUsage',
        grid : {
            css: 'deck-only',
            targets: ['DE'],
            fromLabel: 'RTUCards.action.dealCard.fromLabel',
            targetLabel: 'RTUCards.action.dealCard.targetLabel'
        },
        available: [
            { from: 'GH', target: 'DE', action: 'deal' },
            { from: 'GR', target: 'DE', action: 'deal' },
            { from: 'PH', target: 'DE', action: 'deal' },
            { from: 'PR', target: 'DE', action: 'deal' }
        ],
        labels: [
            {action: 'deal', default: 'RTUCards.action.dealCard.deal.label'}
        ]
    },
    drawDeckCard: {
        labelKey: 'RTUCards.action.drawDeckCard.label',
        descKey: 'RTUCards.action.drawDeckCard.desc',
        actionType: 'deckUsage',
        grid : {
            css: 'deck-only',
            targets: ['DE'],
            fromLabel: 'RTUCards.action.drawDeckCard.fromLabel',
            targetLabel: 'RTUCards.action.drawDeckCard.targetLabel'
        },
        available: [
            { from: 'GH', target: 'DE', action: 'draw' },
            { from: 'GR', target: 'DE', action: 'draw' },
            { from: 'PH', target: 'DE', action: 'draw' },
            { from: 'PR', target: 'DE', action: 'draw' }
        ],
        labels: [
            {action: 'draw', default: 'RTUCards.action.drawDeckCard.draw.label'}
        ]
    },
    shuffleDeck: {
        labelKey: 'RTUCards.action.shuffleDeck.label',
        descKey: 'RTUCards.action.shuffleDeck.desc',
        actionType: 'deckUsage',
        grid : {
            css: 'alone',
            targets: ['DE']
        },
        available: [
            { from: 'DE', target: 'DE', action: 'shuffle' }
        ],
        labels: [
            {action: 'shuffle', default: 'RTUCards.action.shuffleDeck.shuffle.label'}
        ]
    },
    resetDeck: {
        labelKey: 'RTUCards.action.resetDeck.label',
        descKey: 'RTUCards.action.resetDeck.desc',
        actionType: 'deckUsage',
        grid : {
            css: 'alone',
            targets: ['DE']
        },
        available: [
            { from: 'DE', target: 'DE', action: 'reset' }
        ],
        labels: [
            {action: 'reset', default: 'RTUCards.action.resetDeck.reset.label'}
        ]
    },
    drawDiscardCard: {
        labelKey: 'RTUCards.action.drawDiscardCard.label',
        descKey: 'RTUCards.action.drawDiscardCard.desc',
        actionType: 'discardUsage',
        grid : {
            css: 'discard-only',
            targets: ['DI'],
            fromLabel: 'RTUCards.action.drawDiscardCard.fromLabel',
            targetLabel: 'RTUCards.action.drawDiscardCard.targetLabel'
        },
        available: [
            { from: 'GH', target: 'DI', action: 'draw' },
            { from: 'GR', target: 'DI', action: 'draw' },
            { from: 'PH', target: 'DI', action: 'draw' },
            { from: 'PR', target: 'DI', action: 'draw' }
        ],
        labels: [
            {action: 'draw', default: 'RTUCards.action.drawDiscardCard.draw.label'}
        ]
    },
    shuffleDiscard: {
        labelKey: 'RTUCards.action.shuffleDiscard.label',
        descKey: 'RTUCards.action.shuffleDiscard.desc',
        actionType: 'discardUsage',
        grid : {
            css: 'alone',
            targets: ['DI']
        },
        available: [
            { from: 'DI', target: 'DI', action: 'shuffle' }
        ],
        labels: [
            {action: 'shuffle', default: 'RTUCards.action.shuffleDiscard.shuffle.label'}
        ]
    },
    resetDiscard: {
        labelKey: 'RTUCards.action.resetDiscard.label',
        descKey: 'RTUCards.action.resetDiscard.desc',
        actionType: 'discardUsage',
        grid : {
            css: 'alone',
            targets: ['DI']
        },
        available: [
            { from: 'DI', target: 'DI', action: 'reset' }
        ],
        labels: [
            {action: 'reset', default: 'RTUCards.action.resetDiscard.reset.label'}
        ]
    },
    playCard: {
        labelKey: 'RTUCards.action.playCard.label',
        descKey: 'RTUCards.action.playCard.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'discard-only',
            targets: ['DI']
        },
        available: [
            { from: 'GH', target: 'DI', action: 'play' },
            { from: 'GR', target: 'DI', action: 'play' },
            { from: 'PH', target: 'DI', action: 'play' },
            { from: 'PR', target: 'DI', action: 'play' }
        ],
        labels: [
            {action: 'play', default: 'RTUCards.action.playCard.play.label'}
        ],
        parameters: [
            {action: 'play', param: 'playMode', label: 'RTUCards.action.playCard.play.playMode', default: 'singleCard', validation: 'playMode'},
            {action: 'play', param: 'inChat', label: 'RTUCards.action.playCard.play.inChat', default: '0', validation: 'boolean'},
            {action: 'play', param: 'multipleAmount', label: 'RTUCards.action.playCard.play.multipleAmount', default: '0-10', validation: 'cardAtrribute'},
            {action: 'play', param: 'discardAmount', label: 'RTUCards.action.playCard.play.discardAmount', default: '$value', validation: 'cardAtrribute'},
        ]
    },
    moveCard: {
        labelKey: 'RTUCards.action.moveCard.label',
        descKey: 'RTUCards.action.moveCard.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'all-targets',
            targets: ['DE', 'DI', 'GH', 'GR', 'PH', 'PR']
        },
        available: [
            { from: 'DE', target: 'GH', action: 'give' },
            { from: 'DE', target: 'GR', action: 'give' },
            { from: 'DE', target: 'PH', action: 'give' },
            { from: 'DE', target: 'PR', action: 'give' },
            { from: 'DE', target: 'DI', action: 'discardOne' },
            
            { from: 'GH', target: 'PH', action: 'give' },
            { from: 'GH', target: 'PR', action: 'give' },
            { from: 'GH', target: 'DI', action: 'discardOne' },

            { from: 'GR', target: 'PH', action: 'give' },
            { from: 'GR', target: 'PR', action: 'give' },
            { from: 'GR', target: 'DI', action: 'discardOne' },
            
            { from: 'PH', target: 'GH', action: 'give' },
            { from: 'PH', target: 'GR', action: 'give' },
            { from: 'PH', target: 'DI', action: 'discardOne' },
            { from: 'PH', target: 'PH', action: 'give' },
            { from: 'PH', target: 'PR', action: 'give' },

            { from: 'PR', target: 'GH', action: 'give' },
            { from: 'PR', target: 'GR', action: 'give' },
            { from: 'PR', target: 'DI', action: 'discardOne' },
            { from: 'PR', target: 'PH', action: 'give' },
            { from: 'PR', target: 'PR', action: 'give' },

            { from: 'DI', target: 'DE', action: 'backDeck' }
        ],
        labels: [
            {action: 'backDeck', default: 'RTUCards.action.moveCard.backDeck.label'},
            {action: 'give', default: 'RTUCards.action.moveCard.give.label'},
            {action: 'discardOne', default: 'RTUCards.action.moveCard.discardOne.label'},
            {action: 'discardAll', default: 'RTUCards.action.moveCard.discardAll.label'},
        ],
        parameters: [
            {action: 'backDeck', param: 'notifyOnGMAction', label: 'RTUCards.action.moveCard.backDeck.notifyOnGMAction', default: '1', validation: 'boolean'},
            {action: 'discardOne', param: 'discardAll', label: 'RTUCards.action.moveCard.discardOne.discardAll', default: '1', validation: 'boolean'},
            {action: 'discardOne', param: 'notifyOnGMAction', label: 'RTUCards.action.moveCard.discardOne.notifyOnGMAction', default: '1', validation: 'boolean'},
            {action: 'discardOne', param: 'notifyOnPlayerAction', label: 'RTUCards.action.moveCard.discardOne.notifyOnPlayerAction', default: '1', validation: 'boolean'},
            {action: 'give', param: 'notifyOnGMAction', label: 'RTUCards.action.moveCard.give.notifyOnGMAction', default: '1', validation: 'boolean'},
            {action: 'give', param: 'notifyOnPlayerAction', label: 'RTUCards.action.moveCard.give.notifyOnPlayerAction', default: '1', validation: 'boolean'},
        ]
    },
    exchangeCard: {
        labelKey: 'RTUCards.action.exchangeCard.label',
        descKey: 'RTUCards.action.exchangeCard.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'no-deck',
            targets: ['DI', 'GH', 'GR', 'PH', 'PR']
        },
        available: [
            { from: 'GH', target: 'PH', action: 'someone' },
            { from: 'GH', target: 'PR', action: 'someone' },
            { from: 'GH', target: 'DI', action: 'discard' },

            { from: 'GR', target: 'PH', action: 'someone' },
            { from: 'GR', target: 'PR', action: 'someone' },
            { from: 'GR', target: 'DI', action: 'discard' },

            { from: 'PH', target: 'GH', action: 'someone' },
            { from: 'PH', target: 'GR', action: 'someone' },
            { from: 'PH', target: 'DI', action: 'discard' },
            { from: 'PH', target: 'PH', action: 'someone' },
            { from: 'PH', target: 'PR', action: 'someone' },

            { from: 'PR', target: 'GH', action: 'someone' },
            { from: 'PR', target: 'GR', action: 'someone' },
            { from: 'PR', target: 'DI', action: 'discard' },
            { from: 'PR', target: 'PH', action: 'someone' },
            { from: 'PR', target: 'PR', action: 'someone' },
        ],
        labels: [
            {action: 'someone', default: 'RTUCards.action.exchangeCard.someone.label'},
            {action: 'discard', default: 'RTUCards.action.exchangeCard.discard.label'},
        ]
    },
    transferCards: {
        labelKey: 'RTUCards.action.transferCards.label',
        descKey: 'RTUCards.action.transferCards.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'user-only',
            targets: ['GH', 'GR', 'PH', 'PR']
        },
        available: [
            { from: 'GH', target: 'GR', action: 'reveal' },
            { from: 'GR', target: 'GH', action: 'backHand' },

            { from: 'PH', target: 'PR', action: 'reveal' },
            { from: 'PR', target: 'PH', action: 'backHand' },
        ],
        labels: [
            {action: 'backHand', default: 'RTUCards.action.transferCards.backHand.label'},
            {action: 'reveal', default: 'RTUCards.action.transferCards.reveal.label'},
        ]
    },
    swapCards: {
        labelKey: 'RTUCards.action.swapCards.label',
        descKey: 'RTUCards.action.swapCards.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'user-only',
            targets: ['GH', 'GR', 'PH', 'PR']
        },
        available: [
            { from: 'GH', target: 'GR', action: 'withRevealed' },
            { from: 'GR', target: 'GH', action: 'withHand' },

            { from: 'PH', target: 'PR', action: 'withRevealed' },
            { from: 'PR', target: 'PH', action: 'withHand' },
        ],
        labels: [
            {action: 'withHand', default: 'RTUCards.action.swapCards.withHand.label'},
            {action: 'withRevealed', default: 'RTUCards.action.swapCards.withRevealed.label'}
        ]
    },
    flipCard: {
        labelKey: 'RTUCards.action.flipCard.label',
        descKey: 'RTUCards.action.flipCard.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'no-target',
            targets: ['DE', 'DI', 'GH', 'GR', 'PH', 'PR']
        },
        available: [
            { from: 'DE', target: 'DE', action: 'flip' },
            { from: 'DI', target: 'DI', action: 'flip' },
            { from: 'GH', target: 'GH', action: 'flip' },
            { from: 'GR', target: 'GR', action: 'flip' },
            { from: 'PH', target: 'PH', action: 'flip' },
            { from: 'PR', target: 'PR', action: 'flip' }
        ],
        labels: [
            {action: 'flip', default: 'RTUCards.action.flipCard.flip.label'}
        ],
        parameters: [
            {action: 'flip', param: 'includeBack', label: 'RTUCards.action.flipCard.flip.includeBack', default: '1', validation: 'boolean'}
        ]
    },
    rotateCard: {
        labelKey: 'RTUCards.action.rotateCard.label',
        descKey: 'RTUCards.action.rotateCard.desc',
        actionType: 'selectedCard',
        grid : {
            css: 'no-target',
            targets: ['DE', 'DI', 'GH', 'GR', 'PH', 'PR']
        },
        available: [
            { from: 'DE', target: 'DE', action: 'rotate' },
            { from: 'DI', target: 'DI', action: 'rotate' },
            { from: 'GH', target: 'GH', action: 'rotate' },
            { from: 'GR', target: 'GR', action: 'rotate' },
            { from: 'PH', target: 'PH', action: 'rotate' },
            { from: 'PR', target: 'PR', action: 'rotate' }
        ],
        labels: [
            {action: 'rotate', default: 'RTUCards.action.rotateCard.rotate.label'}
        ]
    },

}

/**
 * Other parameters for each deck, outside available action configuration
 */
export const DeckParameters = {
	overrideConf : 'overrideConf',
	labelBaseKey: 'labelBaseKey',
	resourceBaseDir: 'resourceBaseDir',
    revealedFaceDown: 'revealedFaceDown'
}

/**
 * Configuration which is not link to a specific core stack
 */
export const GlobalConfiguration = {
    gmName: 'gmName',
    gmIcon: 'gmIcon',
    shortcuts: 'shortcuts',
    smallDisplay: 'smallDisplay',
    stacks: 'stacksV2',
    backs: 'backs',
    stackForPlayerHand: 'stackForPlayerHand',
    stackForPlayerRevealedCards: 'stackForPlayerRevealedCards',
    version: "version"
};

export const DEFAULT_SHORTCUT_SETTINGS = {
    hands: {
        displayed: true,
        scale: 0.1,
        left: 800,
        bottom: 110, 
        maxPerLine: 5,
        icon: 'modules/ready-to-use-cards/resources/hands-icon.webp'
    },
    revealed: {
        displayed: true,
        scale: 0.1,
        left: 800,
        bottom: 8,
        maxPerLine: 5,
        icon: 'modules/ready-to-use-cards/resources/revealed-icon.webp'
    }
};
