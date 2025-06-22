import CONSTANTS from "./constants.mjs";

export const hotkeyState = {
	ctrlDown: false,
	altDown: false,
	shiftDown: false
};

export function registerHotkeysPre() {
	// Register keybindings
	for (let bar = 0; bar <= 4; bar++) {
		for (let slot = 0; slot <= 9; slot++) {
			let macro_slot = bar ? `${bar}${slot}` : `${slot}`;

			game.keybindings.register(CONSTANTS.MODULE_NAME, `absHotbarBind${macro_slot}`, {
				name: `Execute Hotbar ${bar + 1} Slot ${slot}`,
				hint: `Pressing this will execute the macro in hotbar slot ${slot} of bar ${bar + 1}`,
				editable: [
					{
						key: "Key" + macro_slot,
						modifiers: [KeyboardManager.MODIFIER_KEYS?.SHIFT]
					}
				],
				onDown: () => {
					let macro_id = game.user.hotbar[macro_slot];
					if (macro_id) {
						let macro = game.macros.get(macro_id);
						if (macro) {
							// Execute it
							macro.execute();
						}
					}
				},
				onUp: () => {},
				// reservedModifiers: ["SHIFT", "ALT"],
				precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
			});
		}
	}
}

/*
export function registerHotkeysPost() {
	if (!game.user.isGM) {
		let clicked = false;
		window.addEventListener("mousedown", (event) => {
			if (!canvas.ready) {
                return;
            }
			if (!(canvas.activeLayer instanceof TokenLayer)) {
                return;
            }
			if (game.activeTool !== "select") {
                return;
            }
			const hover = document.elementFromPoint(event.clientX, event.clientY);
			if (!hover || hover.id !== "board") {
                return;
            }
			if (event.button !== 0) {
                return;
            }
			const pos = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage);
			const tokens = getTokensAtLocation(pos).filter((token) => {
				const canView = token._canView(game.user);
				const canSee = token.visible || game.user.isGM;
				return !canView && canSee;
			});
			if (!tokens.length) {
                return;
            }
			tokens.sort((a, b) => b.zIndex - a.zIndex);
			const token = getDocument(tokens[0]);

			if (clicked === token) {
				clicked = false;
				return Application.xxx(token);
			}

			clicked = token;
			setTimeout(() => {
				clicked = false;
			}, 500);
		});
	}
}
*/
