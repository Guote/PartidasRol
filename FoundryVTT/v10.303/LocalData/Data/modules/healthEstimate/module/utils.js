/**
 * Shorthand for game.settings.register().
 * Default data: {scope: "world", config: true}
 * @function addSetting
 * @param {string} key
 * @param {object} data
 */
export function addSetting(key, data) {
	const commonData = {
		name: t(`${key}.name`),
		hint: t(`${key}.hint`),
		scope: "world",
		config: true,
	};
	game.settings.register("healthEstimate", key, Object.assign(commonData, data));
}

/**
 * Check whether the entry is an empty string or a falsey value
 * @param string
 * @returns {boolean}
 */
export function isEmpty(string) {
	return !string || string.length === 0 || /^\s*$/.test(string);
}

/**
 * Shorthand for game.i18n.localize()
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
	return game.i18n.localize(`healthEstimate.${key}`);
}
/**
 * Shorthand for game.i18n.format()
 * @param {string} key
 * @param {object} data
 * @returns {string}
 */
export function f(key, data = {}) {
	return game.i18n.format(`healthEstimate.${key}`, data);
}

/**
 * Shorthand for game.settings.set
 * @param {string} key
 * @param value
 */
export async function sSet(key, value) {
	await game.settings.set("healthEstimate", key, value);
}

/**
 * Shorthand for game.settings.get
 * @param {string} key
 * @returns {any}
 */
export function sGet(key) {
	return game.settings.get("healthEstimate", key);
}

/**
 * Shorthand for game.settings.settings.get
 * @param {string} key
 * @returns {Object}
 */
export function settingData(key) {
	return game.settings.settings.get(`healthEstimate.${key}`);
}
