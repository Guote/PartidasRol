import CONSTANTS from "../constants.mjs";

// ================================
// Logger utility
// ================================
// export let debugEnabled = 0;

// 0 = none, warnings = 1, debug = 2, all = 3
export function debug(msg, args = "") {
	if (game.settings.get(CONSTANTS.MODULE_NAME, "debug")) {
		console.log(`DEBUG | ${CONSTANTS.MODULE_NAME} | ${msg}`, args);
	}
	return msg;
}
export function log(message) {
	message = `${CONSTANTS.MODULE_NAME} | ${message}`;
	console.log(message.replace("<br>", "\n"));
	return message;
}
export function notify(message) {
	message = `${CONSTANTS.MODULE_NAME} | ${message}`;
	ui.notifications?.notify(message);
	console.log(message.replace("<br>", "\n"));
	return message;
}
export function info(info, notify = false) {
	info = `${CONSTANTS.MODULE_NAME} | ${info}`;
	if (notify) ui.notifications?.info(info);
	console.log(info.replace("<br>", "\n"));
	return info;
}
export function warn(warning, notify = false) {
	warning = `${CONSTANTS.MODULE_NAME} | ${warning}`;
	if (notify) ui.notifications?.warn(warning);
	console.warn(warning.replace("<br>", "\n"));
	return warning;
}
export function error(error, notify = true) {
	error = `${CONSTANTS.MODULE_NAME} | ${error}`;
	if (notify) ui.notifications?.error(error);
	return new Error(error.replace("<br>", "\n"));
}
export function timelog(message) {
	warn(Date.now(), message);
}
export const i18n = (key) => {
	return game.i18n.localize(key)?.trim();
};
export const i18nFormat = (key, data = {}) => {
	return game.i18n.format(key, data)?.trim();
};
// export const setDebugLevel = (debugText: string): void => {
//   debugEnabled = { none: 0, warn: 1, debug: 2, all: 3 }[debugText] || 0;
//   // 0 = none, warnings = 1, debug = 2, all = 3
//   if (debugEnabled >= 3) CONFIG.debug.hooks = true;
// };
export function dialogWarning(message, icon = "fas fa-exclamation-triangle") {
	return `<p class="${CONSTANTS.MODULE_NAME}-dialog">
        <i style="font-size:3rem;" class="${icon}"></i><br><br>
        <strong style="font-size:1.2rem;">${CONSTANTS.MODULE_NAME}</strong>
        <br><br>${message}
    </p>`;
}
// =========================================================================================
export function getActor(target) {
	if (target instanceof Actor) return target;
	if (stringIsUuid(target)) {
		target = fromUuidSync(target);
	}
	target = getDocument(target);
	return target?.actor ?? target;
}

export function getToken(documentUuid) {
	const document = fromUuidSync(documentUuid);
	return document instanceof TokenDocument ? document.object : document;
}

export function getDocument(target) {
	if (stringIsUuid(target)) {
		target = fromUuidSync(target);
	}
	return target?.document ?? target;
}

export function stringIsUuid(inId) {
	return typeof inId === "string" && (inId.match(/\./g) || []).length && !inId.endsWith(".");
}

export function getUuid(target) {
	if (stringIsUuid(target)) return target;
	const document = getDocument(target);
	return document?.uuid ?? false;
}

/**
 * Retrieves all visible tokens on a given location
 *
 * @param position
 * @returns {Array<Token>}
 */
export function getTokensAtLocation(position) {
	const tokens = [...canvas.tokens.placeables].filter((token) => token.mesh.visible);
	return tokens.filter((token) => {
		return (
			position.x >= token.x &&
			position.x < token.x + token.document.width * canvas.grid.size &&
			position.y >= token.y &&
			position.y < token.y + token.document.height * canvas.grid.size
		);
	});
}
