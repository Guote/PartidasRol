import { ConfigSheetForActions } from "./ConfigSheetForActions.js";
import { ConfigSheetForShortcuts } from "./ConfigSheetForShortcuts.js";
import { defaultShortcutSettings, GlobalConfiguration } from "../constants.js";
import { CustomCardStack } from "../CustomCardStack.js";
import { CustomCardsDisplay } from "../mainui/CardsDisplay.js";
import { SingleCardDisplay } from "../mainui/SingleCardDisplay.js";

export const registerCardSystem = () => {

	// Cards override
	const previousCardsCls = CONFIG.Cards.documentClass;
	class CustomCards extends previousCardsCls {
		constructor(data, context) {
			super(data, context);
		}

		get sheet() {
			const custom = new CustomCardStack(this);
			if(!custom.handledByModule) {
				return super.sheet;
			}
	
			if ( !this._customSheet ) {
				const options = {editable: this.isOwner, document: this };
				this._customSheet = new CustomCardsDisplay(options);
			}        
			return this._customSheet;
		}

		/* -------------------------------------------- 
		    Capture cards movements and trigger custom hook
		/* -------------------------------------------- */

		/** @override */
		_onUpdate(data, options, userId) {
			super._onUpdate(data, options, userId);
			Hooks.call('updateCustomCardsContent', this, options, userId);
		}

		/** @override */
		_onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
			super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
			Hooks.call('updateCustomCardsContent', this, options, userId);
		}

		/** @override */
		_onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
			super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
			Hooks.call('updateCustomCardsContent', this, options, userId);
		}

		/** @override */
		_onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
			super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
			Hooks.call('updateCustomCardsContent', this, options, userId);
		}
	}
	CONFIG.Cards.documentClass = CustomCards;

	// Card override
	const previousCardCls = CONFIG.Card.documentClass;
	class CustomCard extends previousCardCls {
		constructor(data, context) {
			super(data, context);
		}

		get sheet() {
			const custom = new CustomCardStack(this.source);
			if(!custom.handledByModule) {
				return super.sheet;
			}
	
			if ( !this._customSheet ) {
				this._customSheet = new SingleCardDisplay(this, {editable: this.isOwner});
			}        
			return this._customSheet;
		}
	}

	CONFIG.Card.documentClass = CustomCard;
}

/* -------------------------------------------- */

/**
 * Register game settings and menus for managing the Ready To Use Cards module
 */
export const loadCardSettings = () => {

	loadLegacySettings();
	loadHiddenSettings();

	// First menu : Choose your decks!
	//------------------------------------
	game.settings.registerMenu("ready-to-use-cards", "config-actions", {
		name: "RTUCards.settings.config-actions.menu",
		label: "RTUCards.settings.config-actions.title",
		hint: "RTUCards.settings.config-actions.hint",
		icon: "fas fa-cog",
		type: ConfigSheetForActions,
		restricted: true
	});

	// Data will be stored inside 'stacks'
	game.settings.register("ready-to-use-cards", GlobalConfiguration.stacks, {
		scope: "world",
		config: false,
		default: null,
		type: Object,
		onChange: async c => {
			const app = Object.values(ui.windows).find(a => a.constructor === ConfigSheetForActions);
			if ( app ) app.render();
		}
	});

	// Second menu : Configure your shortcuts
	//--------------------------------------
	game.settings.registerMenu("ready-to-use-cards", "config-shortcuts", {
		name: "RTUCards.settings.config-shortcuts.menu",
		label: "RTUCards.settings.config-shortcuts.title",
		hint: "RTUCards.settings.config-shortcuts.hint",
		icon: "fas fa-mouse-pointer",
		type: ConfigSheetForShortcuts,
		restricted: false
	});

	// Data will be stored inside 'shortcuts'
	game.settings.register("ready-to-use-cards", GlobalConfiguration.shortcuts, {
		scope: "client",
		type: Object,
		default: null,
		onChange: async c => {
			const app = Object.values(ui.windows).find(a => a.constructor === ConfigSheetForShortcuts);
			if ( app ) app.render();
		},
		config: false
	});

	// Registering another setting which will store user choice in card sorting.
	// It will directly be handled by the CustomCardStack class
	game.settings.register("ready-to-use-cards", GlobalConfiguration.sortOptions, {
		scope: "client",
		type: Object,
		default: null,
		onChange: async c => {
			const module = game.modules.get('ready-to-use-cards');
			module.shortcuts.hand.render();
			module.shortcuts.revealed.render();
		},
		config: false
	});

	game.settings.register("ready-to-use-cards", GlobalConfiguration.gmName, {
		name: "RTUCards.settings.gmName.label",
		hint: "RTUCards.settings.gmName.hint",
		scope: "world",
		type: String,
		default: 'GM',
		config: true
	});
  
	game.settings.register("ready-to-use-cards", GlobalConfiguration.gmIcon, {
		name: "RTUCards.settings.gmIcon.label",
		hint: "RTUCards.settings.gmIcon.hint",
		scope: "world",
		type: String,
		default: 'modules/ready-to-use-cards/resources/gmIcon.png',
		config: true
	});
  
	game.settings.register("ready-to-use-cards", GlobalConfiguration.smallDisplay, {
		name: "RTUCards.settings.smallDisplay.label",
		hint: "RTUCards.settings.smallDisplay.hint",
		scope: "client",
		type: Boolean,
		default: false,
		config: true,
		onChange: () => window.location.reload()
	});
  
	game.settings.register("ready-to-use-cards", GlobalConfiguration.stackForPlayerHand, {
		name: "RTUCards.settings.stackForPlayerHand.label",
		hint: "RTUCards.settings.stackForPlayerHand.hint",
		scope: "world",
		type: Boolean,
		default: true,
		config: true,
		onChange: () => game.modules.get('ready-to-use-cards').cardStacks.loadCardStacks()
	});
  
	game.settings.register("ready-to-use-cards", GlobalConfiguration.stackForPlayerRevealedCards, {
		name: "RTUCards.settings.stackForPlayerRevealedCards.label",
		hint: "RTUCards.settings.stackForPlayerRevealedCards.hint",
		scope: "world",
		type: Boolean,
		default: true,
		config: true,
		onChange: () => game.modules.get('ready-to-use-cards').cardStacks.loadCardStacks()
	});
	
}

/** Adding a new Keyboard binding Shift + H for displaying those panels */
export const loadKeybindSettings = () => {
	game.keybindings.register("ready-to-use-cards", GlobalConfiguration.shortcutsToggle, {
        name: "RTUCards.settings.shortcutsToggle.label",
        hint: "RTUCards.settings.shortcutsToggle.hint",
		uneditable: [{
			key: "KeyH",
			modifiers: ["Shift"]
		}],
        onDown: async () => {
			const wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts) ?? defaultShortcutSettings(game.user);
			
			const newSettings = foundry.utils.duplicate(wholeSettings);
			const currentlyDisplayed = newSettings.hands.displayed || newSettings.revealed.displayed;
			newSettings.hands.displayed = !currentlyDisplayed;
			newSettings.revealed.displayed = !currentlyDisplayed;

			await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, newSettings);

			const shortcuts = game.modules.get('ready-to-use-cards')?.shortcuts;
			if( shortcuts ) {
				shortcuts.allHands.forEach(h => h.someSettingsHaveChanged());
				shortcuts.allRevealed.forEach(h => h.someSettingsHaveChanged());
			}
        },
        restricted: false,
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });
}

/**
 * Was used inside previous versions.
 * Still declared so we can have access to them for migration purpose
 */
const loadLegacySettings = () => {
	game.settings.register("ready-to-use-cards", "stacks", 
		{ scope: "world", default: null, type: Object, config: false }
	);

	game.settings.register("ready-to-use-cards", "everyHandsPeekOn", 
		{ scope: "world", type: Boolean, default: true, config: false }
	);
  
	game.settings.register("ready-to-use-cards", "everyHandsDiscardAll", 
		{ scope: "world", type: Boolean, default: true, config: false }
	);
  
	game.settings.register("ready-to-use-cards", "everyRevealedDiscardAll", 
		{ scope: "world", type: Boolean, default: true, config: false }
	);
}

/**
 * Stil used, but can't be accessed via the main config settings
 * So no need for labels or hints
 */
 const loadHiddenSettings = () => {
	game.settings.register("ready-to-use-cards", GlobalConfiguration.version, 
		{ scope: "world", type: String, default: '', config: false }
	);
	game.settings.register("ready-to-use-cards", GlobalConfiguration.versionForUser, 
		{ scope: "client", type: String, default: 'V1', config: false }
	);
  
	// Some data will be stored inside 'backs'
	game.settings.register("ready-to-use-cards", GlobalConfiguration.backs, 
		{ scope: "world", config: false, default: {}, type: Object }
	);
}

