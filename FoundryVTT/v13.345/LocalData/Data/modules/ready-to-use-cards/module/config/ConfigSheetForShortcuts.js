import { GlobalConfiguration, defaultShortcutSettings, defaultUIDataForHand, defaultUIDataForRevealed } from "../constants.js";
import { BaseApplicationV2 } from "../BaseApplicationV2.js";

/**
 * A configuration sheet to configure shortcuts GUI
 * @extends {BaseApplicationV2}
 */
export class ConfigSheetForShortcuts extends BaseApplicationV2 {


	/** @override */
	static DEFAULT_OPTIONS = {
		id: "rtucards-config-shortcuts",
		classes: ["rtucards-config-shortcuts"],
		position: {
			width: 600,
			height: "auto",
		},
		window: {
			icon: "fas fa-settings"
		},
		actions: {
			header: ConfigSheetForShortcuts.#onClickToggleStack,
			otherUsers: ConfigSheetForShortcuts.#onClickToggleDisplayForOthers,
			resetStacks: ConfigSheetForShortcuts.#onClickRestoreDefault
		}
	}
	/** @override */
	static PARTS = {
		main: {
			template: "modules/ready-to-use-cards/resources/config-shortcuts.hbs"
		}
	}

	/* -------------------------------------------- */

	/** @override */
	get title() {
		return game.i18n.localize("RTUCards.settings.config-shortcuts.menu");
	}

	/* -------------------------------------------- */

	constructor(options={}) {
		super(options);
		this.module = game.modules.get('ready-to-use-cards');
		if(!this.object || this.object === '') {
			this.object = defaultShortcutSettings(game.user);
		}
	}

	get currentSettings() {
		const settings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
		if( settings && settings !== '') {
			return settings;
		}
		return defaultShortcutSettings(game.user);

	}


	/** @override */
	async _prepareContext(_options) {

		const userImg = (user) => user.isGM ? "modules/ready-to-use-cards/resources/gmIcon.png" : (user.character?.img ?? user.avatar);
		const userCss = (user, value) => {
			let css = value.displayOtherUsers ? "enabled" : "disabled";
			let selection = "unselected";
			if(value.byUsers[user.id] && value.byUsers[user.id].displayed) {
				selection = "selected";
			}
			css += " " + selection;;
			return css;
		};
		const otherUsers = [...game.users.values()].filter(u => u.id !== game.user.id);
		otherUsers.sort((u1, u2) => u2.name.localeCompare(u1.name));

		const stacks = Object.entries(this.currentSettings).map( ([key, value]) => {
			const stack = {
				key: key,
				header: {
					label: game.i18n.localize(`RTUCards.settings.config-shortcuts.stack.${key}`),
					used: value.displayed,
					enabled: true,
					css: "header"
				},
				otherUsers: {
					label: game.i18n.localize(`RTUCards.settings.config-shortcuts.stack.${key}ForOthers`),
					used: value.displayOtherUsers,
					enabled: value.displayed,
					css: "otherUsers",
				},
				others: otherUsers.map(u => {
					return {
						id: u.id,
						icon: userImg(u),
						name: u.name,
						css: userCss(u, value),
						stack: key
					};
				}),
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
	_onRender(_context, _options) {
		this.bindEvent('.icon-input', this.#onClickChanceIcon, {event: "change"} );
		this.bindEvent('.max-cards', this.#onClickUpdateMaxCards, {event: "change"} );
		this.bindEvent('.card-scale', this.#onClickUpdateScale, {event: "change"} );
		this.bindEvent('.other-user.enabled.selected', this.#onClickUnselectOtherDisplay );
		this.bindEvent('.other-user.enabled.unselected', this.#onClickSelectOtherDisplay );
	}

	async updateSettings(settings) {
		await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, settings);
		this.module.shortcuts.allHands.forEach(h => h.someSettingsHaveChanged());
		this.module.shortcuts.allRevealed.forEach(r => r.someSettingsHaveChanged());
		this.render();
	}

	/* -------------------------------------------- */

	static async #onClickToggleStack(event, currentTarget) {
		event.preventDefault();
		const stack = currentTarget.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].displayed = !settings[stack].displayed;
		if(!settings[stack].displayed) {
			settings[stack].displayOtherUsers = false;
		}
		await this.updateSettings(settings);
	}

	static async #onClickToggleDisplayForOthers(event, currentTarget) {
		event.preventDefault();
		const stack = currentTarget.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].displayOtherUsers = !settings[stack].displayOtherUsers;
		await this.updateSettings(settings);
	}

	static async #onClickRestoreDefault(event, currentTarget) {
		event.preventDefault();
		await this.updateSettings(defaultShortcutSettings(game.user));
	}

	async #onClickSelectOtherDisplay(event) { return this.#onClickToggleOtherDisplay(event, true) ; }
	async #onClickUnselectOtherDisplay(event) { return this.#onClickToggleOtherDisplay(event, false) ; }
	async #onClickToggleOtherDisplay(event, newState) {
		event.preventDefault();
		const img = event.currentTarget;
		const userId = img.dataset.id;
		const stack = img.dataset.stack;

		const settings = this.currentSettings;
		const stackData = settings[stack];
		if(!stackData.byUsers[userId]) {
			stackData.byUsers[userId] = stack=== "hands" ?  defaultUIDataForHand() : defaultUIDataForRevealed();
		}
		stackData.byUsers[userId].displayed = newState;
		await this.updateSettings(settings);
	}

	async #onClickChanceIcon(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const iconPath = a.value;
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].icon = iconPath;
		await this.updateSettings(settings);
	}

	async #onClickUpdateMaxCards(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const newValue = parseInt(a.value);
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].maxPerLine = newValue;
		await this.updateSettings(settings);
	}

	async #onClickUpdateScale(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const newValue = parseInt(a.value);
		const stack = a.parentElement.parentElement.dataset.stack;

		const settings = this.currentSettings;
		settings[stack].scale = newValue / 100.0;
		await this.updateSettings(settings);
	}


}

