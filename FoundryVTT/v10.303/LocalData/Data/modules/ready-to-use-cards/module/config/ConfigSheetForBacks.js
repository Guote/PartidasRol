import { deckBacksSettings, updateDeckBacksSettings } from "../tools.js";

/**
 * A configuration sheet to configure a deck backs and icons
 * @extends {Application}
 */
export class ConfigSheetForBacks extends Application {


	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "rtucards-config-backs",
			classes: ["rtucards-config-backs"],
			template: "modules/ready-to-use-cards/resources/config-backs.hbs",
			width: 600,
			height: "auto",
			closeOnSubmit: false
		});
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
	async getData() {

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

	/** @override */
    activateListeners(html) {
		super.activateListeners(html);
        html.find(".img-col img").click(event => this._onClickEditImage(event) );
	}

	/**
	 * Change one of the images for this card stack
	 * @private
	 */
	_onClickEditImage(event) {
		const div = event.currentTarget.parentElement;
		const type = div.dataset.type;
		const target = div.dataset.target;

		let childKey; 
		if( type == 'stack-icon' ) {
			childKey = target == 'deck' ? 'deckIcon' : 'discardIcon';
		} else {
			childKey = target == 'deck' ? 'deckBg' : 'discardBg';
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
			if( deck.img != this.settings.deckIcon ) {
				const updatedData = { img: this.settings.deckIcon };
				await deck.update( updatedData );
			}

			deck.sheet.render();
		}
		

		// Update discard icon and potential current display
		const discard = this.module.cardStacks.piles[this.coreStackRef]?.stack;
		if(discard) {
			if( discard.img != this.settings.discardIcon ) {
				const updatedData = { img: this.settings.discardIcon };
				await discard.update( updatedData );
			}

			discard.sheet.render();
		}

		// Refresh current sheet
		this.render();
	}

}

