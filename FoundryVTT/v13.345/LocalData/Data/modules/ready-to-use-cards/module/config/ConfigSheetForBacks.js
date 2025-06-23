import { deckBacksSettings, updateDeckBacksSettings } from "../tools.js";
import { BaseApplicationV2 } from "../BaseApplicationV2.js";

/**
 * A configuration sheet to configure a deck backs and icons
 * @extends {BaseApplicationV2}
 */
export class ConfigSheetForBacks extends BaseApplicationV2 {

	/** @override */
	static DEFAULT_OPTIONS = {
		id: "rtucards-config-backs",
		classes: ["rtucards-config-backs"],
		position: {
			width: 600,
			height: "auto",
		},
		window: {
			icon: "fas fa-cards"
		},
		actions: {
			updateBack: ConfigSheetForBacks.#onUpdateBack
		}
	}
	/** @override */
	static PARTS = {
		main: {
			template: "modules/ready-to-use-cards/resources/config-backs.hbs"
		}
	}

	/* -------------------------------------------- */

	/** @override */
	get title() {
		return game.i18n.localize("RTUCards.settings.config-backs.menu");
	}

	/* -------------------------------------------- */

	constructor(coreStackRef, options={}) {
		super(options);
		this.module = game.modules.get('ready-to-use-cards');
		this.coreStackRef = coreStackRef;
		this.settings = deckBacksSettings(coreStackRef);
		this.baseName = this.module.cardStacks.decks[this.coreStackRef].retrieveStackBaseName();
	}

	/** @override */
	async _prepareContext(_options) {

		const data = {
			header: this.baseName,
			lines: []
		};

		data.lines.push({
			title: game.i18n.localize("RTUCards.settings.config-backs.stack.icons"),
			columns: [{
				type: 'stack-icon',
				img: this.settings.deckIcon,
				target: 'deck',
				legend: game.i18n.localize("RTUCards.settings.config-backs.type.deck")
			}, {
				type: 'stack-icon',
				img: this.settings.discardIcon,
				target: 'discard',
				legend: game.i18n.localize("RTUCards.settings.config-backs.type.discard")
			}]
		});

		data.lines.push({
			title: game.i18n.localize("RTUCards.settings.config-backs.stack.backs"),
			columns: [{
				type: 'background',
				img: this.settings.deckBg,
				target: 'deck',
				legend: game.i18n.localize("RTUCards.settings.config-backs.type.deck")
			}, {
				type: 'background',
				img: this.settings.discardBg,
				target: 'discard',
				legend: game.i18n.localize("RTUCards.settings.config-backs.type.discard")
			}]
		});

		return data;
	}

	/**
	 * Change one of the images for this card stack
	 * @private
	 */
	static #onUpdateBack(event, currentTarget) {
		const type = currentTarget.dataset.type;
		const target = currentTarget.dataset.target;

		let childKey; 
		if( type === 'stack-icon' ) {
			childKey = target === 'deck' ? 'deckIcon' : 'discardIcon';
		} else {
			childKey = target === 'deck' ? 'deckBg' : 'discardBg';
		}

		const current = this.settings[childKey];
		const fp = new FilePicker({
			type: "image",
			current: current,
			callback: async path => {
				this.settings[childKey] = path;
				return this.updateSettings();
			}
		});
		return fp.browse();
	}

	async updateSettings() {
		this.settings = await updateDeckBacksSettings(this.coreStackRef, this.settings);

		// Update deck icon and potential current display
		const deck = this.module.cardStacks.decks[this.coreStackRef]?.stack;
		if(deck) {
			if( deck.img !== this.settings.deckIcon ) {
				const updatedData = { img: this.settings.deckIcon };
				await deck.update( updatedData );
			}

			deck.sheet.render();
		}
		

		// Update discard icon and potential current display
		const discard = this.module.cardStacks.piles[this.coreStackRef]?.stack;
		if(discard) {
			if( discard.img !== this.settings.discardIcon ) {
				const updatedData = { img: this.settings.discardIcon };
				await discard.update( updatedData );
			}

			discard.sheet.render();
		}

		// Refresh current sheet
		this.render();
	}

}

