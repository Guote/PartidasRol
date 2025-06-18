import { DEFAULT_SHORTCUT_SETTINGS, GlobalConfiguration } from "../constants.js";

/**
 * A configuration sheet to configure shortcuts GUI
 * @extends {FormApplication}
 */
export class ConfigSheetForShortcuts extends FormApplication {


	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "rtucards-config-shortcuts",
			classes: ["rtucards-config-shortcuts"],
			template: "modules/ready-to-use-cards/resources/config-shortcuts.hbs",
			width: 600,
			height: "auto",
			closeOnSubmit: false
		});
	}

	/* -------------------------------------------- */

	/** @override */
	get title() {
		return game.i18n.localize("RTUCards.settings.config-shortcuts.menu");
	}

	/* -------------------------------------------- */

	constructor(object={}, options={}) {
		super(object, options);
		this.module = game.modules.get('ready-to-use-cards');
		if(!this.object || this.object == '') {
			this.object = duplicate(DEFAULT_SHORTCUT_SETTINGS);

			this.undo = duplicate(this.object);
		}
	}

	get currentSettings() {
		const settings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
		if( settings && settings != '') { 
			return settings;
		}
		return duplicate(DEFAULT_SHORTCUT_SETTINGS);

	}


	/** @override */
	async getData() {
		
		const stacks = Object.entries(this.currentSettings).map( ([key, value]) => {
			const stack = {
				key: key,
				title: game.i18n.localize('RTUCards.settings.config-shortcuts.stack.' + key),
				used: value.displayed,
				icon: value.icon,
				maxPerLine: value.maxPerLine,
				scalePercent: Math.round(value.scale * 100.0),
			};
			return stack;
		});

		return {
			stacks: stacks
		};
	}

	/** @override */
    activateListeners(html) {
		super.activateListeners(html);

        html.find('.toggle-button').click(event => this._onClickToggleStack(event) );
        html.find('.icon-input').change(event => this._onClickChanceIcon(event) );
        html.find('.max-cards').change(event => this._onClickUpdateMaxCards(event) );
        html.find('.card-scale').change(event => this._onClickUpdateScale(event) );
        html.find('.reset-stacks').click(event => this._onClickRestoreDefault(event) );
	}

	/** @override */
	_updateObject(event, formData) {
		// Not used
	}

	async updateSettings(settings) {
		await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, settings);
		this.module.shortcuts.hand.someSettingsHaveChanged();
		this.module.shortcuts.revealed.someSettingsHaveChanged();
		this.render();
	}

	/* -------------------------------------------- */

	async _onClickToggleStack(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].displayed = !settings[stack].displayed;
		await this.updateSettings(settings);
	}

	async _onClickRestoreDefault(event) {
		event.preventDefault();
		await this.updateSettings(DEFAULT_SHORTCUT_SETTINGS);
	}

	async _onClickChanceIcon(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const iconPath = a.value;
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].icon = iconPath;
		await this.updateSettings(settings);
	}

	async _onClickUpdateMaxCards(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const newValue = parseInt(a.value);
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].maxPerLine = newValue;
		await this.updateSettings(settings);
	}

	async _onClickUpdateScale(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const newValue = parseInt(a.value);
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].scale = newValue / 100.0;
		await this.updateSettings(settings);
	}


}

