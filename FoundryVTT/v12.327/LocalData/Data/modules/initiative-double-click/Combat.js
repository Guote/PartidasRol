import { libWrapper } from "./shim.js";

let CombatantsInitiative = {};
let firstInitiative = 0;
let lastInitiative = 0;

function getInitiatives(combatTracker) {
	let initiatives = $(combatTracker).find(".initiative");
	if (!initiatives.length > 0) {
		return;
	}

	let firstPlace = Number(initiatives[0].innerText);
	let lastPlace = Number(initiatives[initiatives.length - 1].innerText);
	if (firstPlace > lastPlace) {
		firstInitiative = firstPlace + 1;
		lastInitiative = lastPlace - 1;
	} else if (firstPlace < lastPlace) {
		firstInitiative = firstPlace - 1;
		lastInitiative = lastPlace + 1;
	}
}

class FurnaceCombatQoL {
	static renderCombatTracker(tracker, html, data) {
		if (game.user.role < parseInt(game.settings.get("initiative-double-click", "player-access"))) return;
		const revertButton = game.settings.get("initiative-double-click", "revertButton");
		const orderButtons = game.settings.get("initiative-double-click", "orderButtons");
		const combatTracker = html.find("#combat-tracker");
		if (!combatTracker[0].children.length) return;
		getInitiatives(combatTracker);
		const TokenInitiative = html.find(".token-initiative");
		TokenInitiative.find(".initiative").on("dblclick", FurnaceCombatQoL._onInitiativeDblClick);
		TokenInitiative.find(".combatant-control.roll").on("contextmenu", (event) => {
			const cid = event.target.closest(".combatant").dataset.combatantId;
			game.combat.setInitiative(cid, 0);
		});

		if (orderButtons || revertButton) {
			TokenInitiative.before("<div class='double-click-initiative flexrow'></div>");
			const dblClick = html.find(".double-click-initiative");

			if (orderButtons) {
				dblClick.append(`
					<div class="button double-click-initiative-first"
						data-tooltip="${game.i18n.localize("initiative-double-click.buttons.top")}"
						data-tooltip-direction="UP"
						>
						<a>
							<i class="fas fa-arrow-up"></i>
						</a>
					</div>
					<div class="button double-click-initiative-last"
						data-tooltip="${game.i18n.localize("initiative-double-click.buttons.bottom")}"
						data-tooltip-direction="UP"
						>
						<a>
							<i class="fas fa-arrow-down"></i>
						</a>
					</div>
					`);
				html.find(".double-click-initiative-first a").on("click", FurnaceCombatQoL._onClickFirst);
				html.find(".double-click-initiative-last a").on("click", FurnaceCombatQoL._onClickLast);
			}

			if (revertButton) {
				for (let combatant of html.find("#combat-tracker li.combatant")) {
					const cid = combatant.dataset.combatantId;
					let div = document.createElement("div");
					div.classList.add("button", "double-click-initiative-revert");
					if (CombatantsInitiative[cid]) {
						div.title = game.i18n.format("initiative-double-click.buttons.previous", { previous: CombatantsInitiative[cid].previous });
					} else {
						div.classList.add("double-click-disabled");
					}
					let i = document.createElement("i");
					i.classList.add("fas", "fa-undo");
					let a = document.createElement("a");
					a.appendChild(i);
					div.appendChild(a);
					if (orderButtons) {
						combatant.querySelector(".double-click-initiative-last").before(div);
					} else combatant.querySelector(".double-click-initiative").append(div);
					html.find(".double-click-initiative-revert a").on("click", FurnaceCombatQoL._onClickRevert);
				}
			}
		}
	}
	static _onInitiativeDblClick(event) {
		event.stopPropagation();
		event.preventDefault();
		FurnaceCombatQoL._changeInitiative(event);
	}
	static _changeInitiative(event) {
		let html = $(event.target).closest(".combatant");
		const cid = html.data("combatant-id");
		let initiative = html.find(".token-initiative");
		let combatant = game.combat.combatants.get(cid);
		if (!combatant.isOwner) return;
		const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
		// Width = 50-95, increasing by 15 for every digit over 2
		const width = clamp(20 + 15 * numDigits(combatant.initiative), 50, 95);
		let input = $(`<input class="initiative" style="width: ${width}%" value="${combatant.initiative}"/>`);
		initiative.off("dblclick");
		initiative.empty().append(input);
		input.focus().select();
		input.on("change", (ev) => {
			CombatantsInitiative[cid] = { previous: combatant.initiative };
			game.combat.setInitiative(cid, input.val());
		});
		input.on("focusout", (ev) => game.combats.render());
	}
	static _onClickRevert(event) {
		let html = $(event.target).closest(".combatant");
		const cid = html.data("combatant-id");
		let combatant = game.combat.combatants.get(cid);
		if (!combatant.isOwner) return;
		const previous = CombatantsInitiative[cid].previous;
		CombatantsInitiative[cid] = { previous: combatant.initiative };
		game.combat.setInitiative(cid, previous);
	}
	static _onClickFirst(event) {
		let html = $(event.target).closest(".combatant");
		const cid = html.data("combatant-id");
		let combatant = game.combat.combatants.get(cid);
		if (!combatant.isOwner) return;
		CombatantsInitiative[cid] = { previous: combatant.initiative };
		game.combat.setInitiative(cid, firstInitiative);
	}
	static _onClickLast(event) {
		let html = $(event.target).closest(".combatant");
		const cid = html.data("combatant-id");
		let combatant = game.combat.combatants.get(cid);
		if (!combatant.isOwner) return;
		CombatantsInitiative[cid] = { previous: combatant.initiative };
		game.combat.setInitiative(cid, lastInitiative);
	}
}

Hooks.on("renderCombatTracker", FurnaceCombatQoL.renderCombatTracker);
Hooks.once("init", () => {
	game.settings.register("initiative-double-click", "player-access", {
		name: game.i18n.localize("initiative-double-click.settings.player-access.name"),
		hint: game.i18n.localize("initiative-double-click.settings.player-access.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "4",
		choices: {
			1: "USER.RolePlayer",
			2: "USER.RoleTrusted",
			3: "USER.RoleAssistant",
			4: "USER.RoleGamemaster",
		},
	});
	game.settings.register("initiative-double-click", "revertButton", {
		name: game.i18n.localize("initiative-double-click.settings.revertButton.name"),
		hint: game.i18n.localize("initiative-double-click.settings.revertButton.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true,
	});
	game.settings.register("initiative-double-click", "orderButtons", {
		name: game.i18n.localize("initiative-double-click.settings.orderButtons.name"),
		hint: game.i18n.localize("initiative-double-click.settings.orderButtons.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true,
	});
});

function numDigits(x) {
	return (Math.log10((x ^ (x >> 31)) - (x >> 31)) | 0) + 1;
}

function wrappedOnCombatantMouseDown(wrapped, event) {
	if (event.target.className !== "initiative") {
		wrapped(event);
	}
}

Hooks.once("ready", () => {
	libWrapper.register("initiative-double-click", "CombatTracker.prototype._onCombatantMouseDown", wrappedOnCombatantMouseDown, "MIXED");
});
