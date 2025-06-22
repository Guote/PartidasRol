// ======================================
// PIXI UTILITY
// =======================================

/**
 * Converts web colors to base 16
 * @param n {Hex}               Web format color, f.x. #FF0000
 * @return {Hex}                Base 16 format color, f.x. 0xFF0000
 */
function webToHex(n) {
	return n.replace("#", "0x");
}

/**
 * Converts a base16 color into a web color
 * @param n {Hex}               Base 16 Color, f.x. 0xFF0000
 * @return {Hex}                Web format color, f.x. #FF0000
 */
function hexToWeb(n) {
	return `${n}`.replace("0x", "#");
}

/**
 * Converts a hexadecimal color to an integer percentage
 * @param n {Hex}               Base 16 Color, f.x. 0x000000
 * @return {Integer}             f.x 0
 */
function hexToPercent(n) {
	return Math.ceil((n / 0xffffff) * 100);
}

/**
 * Converts an integer percent (0-100) to a hexadecimal greyscale color
 * @param n {Number}            0-100 numeric input
 * @return {Hex}                Base 16 format color, f.x. 0xFFFFFF
 */
function percentToHex(n) {
	let c = Math.ceil(n * 2.55).toString(16);
	if (c.length === 1) c = `0${c}`;
	c = `0x${c}${c}${c}`;
	return c;
}

/**
 * Converts an object containing coordinate pair arrays into a single array of points for PIXI
 * @param hex {Object}  An object containing a set of [x,y] pairs
 */
function hexObjsToArr(hex) {
	const a = [];
	hex.forEach((point) => {
		a.push(point.x);
		a.push(point.y);
	});
	// Append first point to end of array to complete the shape
	a.push(hex[0].x);
	a.push(hex[0].y);
	return a;
}

class SimplefogConfig extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["form"],
			closeOnSubmit: false,
			submitOnChange: true,
			submitOnClose: true,
			popOut: true,
			editable: game.user.isGM,
			width: 500,
			template: "modules/simplefog/templates/scene-config.html",
			id: "simplefog-scene-config",
			title: game.i18n.localize("Simple Fog Options"),
		});
	}

	/* -------------------------------------------- */

	/**
	 * Obtain module metadata and merge it with game settings which track current module visibility
	 * @return {Object}   The data provided to the template when rendering the form
	 */
	getData() {
		// Return data to the template
		return {
			gmColorAlpha: Math.round(canvas.simplefog.getSetting("gmColorAlpha") * 100),
			gmColorTint: hexToWeb(canvas.simplefog.getSetting("gmColorTint")),
			playerColorAlpha: Math.round(canvas.simplefog.getSetting("playerColorAlpha") * 100),
			playerColorTint: hexToWeb(canvas.simplefog.getSetting("playerColorTint")),
			transition: canvas.simplefog.getSetting("transition"),
			transitionSpeed: canvas.simplefog.getSetting("transitionSpeed"),
			blurEnable: canvas.simplefog.getSetting("blurEnable"),
			blurRadius: canvas.simplefog.getSetting("blurRadius"),
			blurQuality: canvas.simplefog.getSetting("blurQuality"),
			autoVisibility: canvas.simplefog.getSetting("autoVisibility"),
			autoVisGM: canvas.simplefog.getSetting("autoVisGM"),
			vThreshold: Math.round(canvas.simplefog.getSetting("vThreshold") * 100),
			fogImageOverlayFilePath: canvas.simplefog.getSetting("fogImageOverlayFilePath"),
			fogImageOverlayGMAlpha: Math.round(canvas.simplefog.getSetting("fogImageOverlayGMAlpha") * 100),
			fogImageOverlayPlayerAlpha: Math.round(canvas.simplefog.getSetting("fogImageOverlayPlayerAlpha") * 100),
			fogImageOverlayZIndex: canvas.simplefog.getSetting("fogImageOverlayZIndex"),
			fogImageOverlayZIndexOptions: {
				4000: "Color Tint Above Overlay Image",
				6000: "Overlay Image Above Color Tint",
			},
			versionNotification: canvas.simplefog.getSetting("versionNotification"),
		};
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers                */
	/* -------------------------------------------- */

	/**
	 * This method is called upon form submission after form data is validated
	 * @param event {Event}       The initial triggering submission event
	 * @param formData {Object}   The object of validated form data with which to update the object
	 * @private
	 */
	async _updateObject(event, formData) {
		Object.entries(formData).forEach(async ([key, val]) => {
			// If setting is an opacity slider, convert from 1-100 to 0-1
			if (
				[
					"gmColorAlpha",
					"playerColorAlpha",
					"vThreshold",
					"fogImageOverlayGMAlpha",
					"fogImageOverlayPlayerAlpha",
				].includes(key)
			) val /= 100;
			// If setting is a color value, convert webcolor to hex before saving
			if (["gmColorTint", "playerColorTint"].includes(key)) val = webToHex(val);
			// Save settings to scene
			await canvas.simplefog.setSetting(key, val);
			// If saveDefaults button clicked, also save to user's defaults
			if (event.submitter?.name === "saveDefaults") {
				canvas.simplefog.setUserSetting(key, val);
			}
		});

		// If save button was clicked, close app
		if (["submit", "saveDefaults"].includes(event.submitter?.name)) {
			this.close();
		}

		// Update sight layer
		canvas.perception.update({
			refreshLighting: true,
			refreshVision: true,
			refreshOcclusion: true
		});
	}
}

/* eslint-disable */
// Generated code -- CC0 -- No Rights Reserved -- http://www.redblobgames.com/grids/hexagons/
class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
class Hex {
	constructor(q, r, s) {
		this.q = q;
		this.r = r;
		this.s = s;
		if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
	}
	add(b) {
		return new Hex(this.q + b.q, this.r + b.r, this.s + b.s);
	}
	subtract(b) {
		return new Hex(this.q - b.q, this.r - b.r, this.s - b.s);
	}
	scale(k) {
		return new Hex(this.q * k, this.r * k, this.s * k);
	}
	rotateLeft() {
		return new Hex(-this.s, -this.q, -this.r);
	}
	rotateRight() {
		return new Hex(-this.r, -this.s, -this.q);
	}
	static direction(direction) {
		return Hex.directions[direction];
	}
	neighbor(direction) {
		return this.add(Hex.direction(direction));
	}
	diagonalNeighbor(direction) {
		return this.add(Hex.diagonals[direction]);
	}
	len() {
		return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
	}
	distance(b) {
		return this.subtract(b).len();
	}
	round() {
		var qi = Math.round(this.q);
		var ri = Math.round(this.r);
		var si = Math.round(this.s);
		var q_diff = Math.abs(qi - this.q);
		var r_diff = Math.abs(ri - this.r);
		var s_diff = Math.abs(si - this.s);
		if (q_diff > r_diff && q_diff > s_diff) {
			qi = -ri - si;
		} else if (r_diff > s_diff) {
			ri = -qi - si;
		} else {
			si = -qi - ri;
		}
		return new Hex(qi, ri, si);
	}
	lerp(b, t) {
		return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
	}
	linedraw(b) {
		var N = this.distance(b);
		var a_nudge = new Hex(this.q + 1e-6, this.r + 1e-6, this.s - 2e-6);
		var b_nudge = new Hex(b.q + 1e-6, b.r + 1e-6, b.s - 2e-6);
		var results = [];
		var step = 1.0 / Math.max(N, 1);
		for (var i = 0; i <= N; i++) {
			results.push(a_nudge.lerp(b_nudge, step * i).round());
		}
		return results;
	}
}
Hex.directions = [
	new Hex(1, 0, -1),
	new Hex(1, -1, 0),
	new Hex(0, -1, 1),
	new Hex(-1, 0, 1),
	new Hex(-1, 1, 0),
	new Hex(0, 1, -1),
];
Hex.diagonals = [
	new Hex(2, -1, -1),
	new Hex(1, -2, 1),
	new Hex(-1, -1, 2),
	new Hex(-2, 1, 1),
	new Hex(-1, 2, -1),
	new Hex(1, 1, -2),
];
class Orientation {
	constructor(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
		this.f0 = f0;
		this.f1 = f1;
		this.f2 = f2;
		this.f3 = f3;
		this.b0 = b0;
		this.b1 = b1;
		this.b2 = b2;
		this.b3 = b3;
		this.start_angle = start_angle;
	}
}
class Layout {
	constructor(orientation, size, origin) {
		this.orientation = orientation;
		this.size = size;
		this.origin = origin;
	}
	hexToPixel(h) {
		var M = this.orientation;
		var size = this.size;
		var origin = this.origin;
		var x = (M.f0 * h.q + M.f1 * h.r) * size.x;
		var y = (M.f2 * h.q + M.f3 * h.r) * size.y;
		return new Point(x + origin.x, y + origin.y);
	}
	pixelToHex(p) {
		var M = this.orientation;
		var size = this.size;
		var origin = this.origin;
		var pt = new Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y);
		var q = M.b0 * pt.x + M.b1 * pt.y;
		var r = M.b2 * pt.x + M.b3 * pt.y;
		return new Hex(q, r, -q - r);
	}
	hexCornerOffset(corner) {
		var M = this.orientation;
		var size = this.size;
		var angle = (2.0 * Math.PI * (M.start_angle - corner)) / 6.0;
		return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
	}
	polygonCorners(h) {
		var corners = [];
		var center = this.hexToPixel(h);
		for (var i = 0; i < 6; i++) {
			var offset = this.hexCornerOffset(i);
			corners.push(new Point(center.x + offset.x, center.y + offset.y));
		}
		return corners;
	}
}
Layout.pointy = new Orientation(
	Math.sqrt(3.0),
	Math.sqrt(3.0) / 2.0,
	0.0,
	3.0 / 2.0,
	Math.sqrt(3.0) / 3.0,
	-1.0 / 3.0,
	0.0,
	2.0 / 3.0,
	0.5
);
Layout.flat = new Orientation(
	3.0 / 2.0,
	0.0,
	Math.sqrt(3.0) / 2.0,
	Math.sqrt(3.0),
	2.0 / 3.0,
	0.0,
	-1.0 / 3.0,
	Math.sqrt(3.0) / 3.0,
	0.0
);

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class BrushControls extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: "simplefog-filter-config",
		tag: "aside",
		position: {
			width: 320,
			height: "auto"
		},
		window: {
			title: "Brush Controls",
			icon: "fas fa-cloud",
			minimizable: false
		},
		actions: {
			brushSize: BrushControls.brushSize,
			brushOpacity: BrushControls.brushOpacity,
			brushOpacityToggle: BrushControls.brushOpacityToggle
		},
	};

	/** @override */
	static PARTS = {
		list: {
			id: "list",
			template: "modules/simplefog/templates/brush-controls.html",
		}
	};

	/* -------------------------------------------- */

	/** @inheritDoc */
	async _renderFrame(options) {
		const frame = await super._renderFrame(options);
		this.window.close.remove(); // Prevent closing
		return frame;
	}

	/* -------------------------------------------- */

	/** @inheritDoc */
	async close(options={}) {
		if ( !options.closeKey ) return super.close(options);
		return this;
	}

	/* -------------------------------------------- */

	/** @inheritDoc */
	_onFirstRender(context, options) {
		super._onFirstRender(context, options);
		const left = ui.nav?.element[0].getBoundingClientRect().left;
		const top = ui.controls?.element[0].getBoundingClientRect().top;
		options.position = {...options.position, left, top};
		canvas.scene.apps[this.id] = this;
	}

	/* -------------------------------------------- */

	/** @inheritDoc */
	_onRender(context, options) {
		super._onRender(context, options);
		this.element.querySelector("input[name='brushSize']")
			?.addEventListener("change", BrushControls.brushSize.bind(this));
		this.element.querySelector("input[name='brushOpacity']")
			.addEventListener("change", BrushControls.brushOpacity.bind(this));
	}

	/* -------------------------------------------- */

	/** @override */
	_onClose(options) {
		super._onClose(options);
		delete canvas.scene.apps[this.id];
	}

	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(_options) {
		const displayContainer = canvas.simplefog.activeTool === "brush";
		return {
			displayContainer,
			brushSize: canvas.simplefog.getUserSetting("brushSize"),
			brushOpacity: hexToPercent(canvas.simplefog.getUserSetting("brushOpacity")),
		};
	}

	/* -------------------------------------------- */

	static async brushSize(event, target) {
		event?.preventDefault();
		target ??= event?.target.closest("[data-action]") ?? this.element.querySelector("input[name='brushSize']");
		const value = Number(target.value);
		await canvas.simplefog.setUserSetting("brushSize", value);
		target.parentNode.querySelector(".range-value").innerText = `${value}px`;
		canvas.simplefog.setPreviewTint();
	}

	static async brushOpacity(event, target) {
		event?.preventDefault();
		target ??= event?.target.closest("[data-action]") ?? this.element.querySelector("input[name='brushOpacity']");
		const value = Number(target.value);
		await canvas.simplefog.setUserSetting("brushOpacity", percentToHex(value));
		target.parentNode.querySelector(".range-value").innerText = `${value}%`;
		canvas.simplefog.setPreviewTint();
	}

	static async brushOpacityToggle(event, target) {
		event?.preventDefault();
		const bc = canvas.simplefog.brushControls;
		const slider = bc.element.querySelector("input[name=brushOpacity]");
		slider.value = Number(event.target.dataset.value);
		BrushControls.brushOpacity.call(bc);
	}
}

// CWSP which ignores open doors

class CWSPNoDoors extends ClockwiseSweepPolygon {
	_testEdgeInclusion(edge, edgeTypes, bounds) {
		const { type, boundaryShapes, useThreshold, wallDirectionMode, externalRadius } = this.config;

		// Only include edges of the appropriate type
		const m = edgeTypes[edge.type];
		if ( !m ) return false;
		if ( m === 2 ) return true;

		// Test for inclusion in the overall bounding box
		if ( !bounds.lineSegmentIntersects(edge.a, edge.b, { inside: true }) ) return false;

		// Specific boundary shapes may impose additional requirements
		for ( const shape of boundaryShapes ) {
			if ( shape._includeEdge && !shape._includeEdge(edge.a, edge.b) ) return false;
		}

		// Ignore edges which do not block this polygon type
		const isOpenDoor = edge.type === "wall" && edge.object.isOpen;
		if ( (this.config.shiftKey || !isOpenDoor) && edge[type] === CONST.WALL_SENSE_TYPES.NONE ) return false;

		// Ignore edges which are collinear with the origin
		const side = edge.orientPoint(this.origin);
		if ( !side ) return false;

		// Ignore one-directional walls which are facing away from the origin
		const wdm = PointSourcePolygon.WALL_DIRECTION_MODES;
		if ( edge.direction && (wallDirectionMode !== wdm.BOTH) ) {
			if ( (wallDirectionMode === wdm.NORMAL) === (side === edge.direction) ) return false;
		}

		// Ignore threshold walls which do not satisfy their required proximity
		if ( useThreshold ) return !edge.applyThreshold(type, this.origin, externalRadius);
		return true;
	}
}

/* MaskLayer extends CanvasLayer
 *
 * Creates an interactive layer which has an alpha channel mask
 * that can be rendered to and history for syncing between players
 * and replaying the mask / undo etc.
 */

class MaskLayer extends InteractionLayer {
	constructor() {
		super();
		this.lock = false;
		this.historyBuffer = [];
		this.pointer = 0;
		this.gridLayout = {};
		this.dragStart = { x: 0, y: 0 };
		// Not actually used, just to prevent foundry from complaining
		this.history = [];
		this.BRUSH_TYPES = {
			ELLIPSE: 0,
			BOX: 1,
			ROUNDED_RECT: 2,
			POLYGON: 3,
		};
		this.DEFAULTS = {
			visible: false,
			blurEnable: true,
			blurQuality: 2,
			blurRadius: 5,
			gmColorAlpha: 0.6,
			gmColorTint: "0x000000",
			playerColorAlpha: 1,
			playerColorTint: "0x000000",
			fogImageOverlayFilePath: "",
			fogImageOverlayGMAlpha: 0.6,
			fogImageOverlayPlayerAlpha: 1,
			fogImageOverlayZIndex: 6000,
			layerZindex: 220,
		};
	}

	static get layerOptions() {
		return foundry.utils.mergeObject(super.layerOptions, {
			baseClass: MaskLayer,
			zIndex: game.settings.get("simplefog", "zIndex"),
		});
	}

	/* -------------------------------------------- */
	/*  Getters and setters for layer props         */
	/* -------------------------------------------- */

	// Tint & Alpha have special cases because they can differ between GM & Players
	// And alpha can be animated for transition effects

	getColorAlpha() {
		let alpha;
		if (game.user.isGM) alpha = this.getSetting("gmColorAlpha");
		else alpha = this.getSetting("playerColorAlpha");
		if (!alpha) {
			if (game.user.isGM) alpha = this.DEFAULTS.gmColorAlpha;
			else alpha = this.DEFAULTS.playerColorAlpha;
		}
		return alpha;
	}

	/**
	 * Sets the scene's alpha for the primary layer.
	 * @param alpha {Number} 0-1 opacity representation
	 * @param skip {Boolean} Optional override to skip using animated transition
	 */
	async setColorAlpha(alpha, skip = false) {
		// If skip is false, do not transition and just set alpha immediately
		if (skip || !this.getSetting("transition")) {
			this.fogColorLayer.alpha = alpha;
		}
		// Loop until transition is complete
		else {
			const start = this.fogColorLayer.alpha;
			const dist = start - alpha;
			const fps = game.settings.get("core", "maxFPS");
			const speed = this.getSetting("transitionSpeed");
			const frame = 1000 / fps;
			const rate = dist / ((fps * speed) / 1000);
			let f = (fps * speed) / 1000;
			while (f > 0) {
				// Delay 1 frame before updating again
				// eslint-disable-next-line no-promise-executor-return
				await new Promise((resolve) => setTimeout(resolve, frame));
				this.fogColorLayer.alpha -= rate;
				f -= 1;
			}
			// Reset target alpha in case loop overshot a bit
			this.fogColorLayer.alpha = alpha;
		}
	}

	getTint() {
		let tint;
		if (game.user.isGM) tint = this.getSetting("gmColorTint");
		else tint = this.getSetting("playerColorTint");
		if (!tint) {
			if (game.user.isGM) tint = this.gmColorTintDefault;
			else tint = this.playerColorTintDefault;
		}
		return tint;
	}

	setColorTint(tint) {
		this.fogColorLayer.tint = tint;
	}

	static getMaskTexture() {
		const d = canvas.dimensions;
		let res = 1.0;
		if (d.width * d.height > 16000 ** 2) res = 0.25;
		else if (d.width * d.height > 8000 ** 2) res = 0.5;

		// Create the mask elements
		const tex = PIXI.RenderTexture.create({
			width: canvas.dimensions.width,
			height: canvas.dimensions.height,
			resolution: res,
		});
		return tex;
	}

	/* -------------------------------------------- */
	/*  Player Fog Image Overlay                    */
	/* -------------------------------------------- */
	getFogImageOverlayTexture(fogImageOverlayFilePath) {
		if (fogImageOverlayFilePath) {
			return getTexture(fogImageOverlayFilePath);
		}
	}

	setFogImageOverlayTexture(fogImageOverlayFilePath) {
		if (fogImageOverlayFilePath) {
			const texture = getTexture(fogImageOverlayFilePath);
			this.fogImageOverlayLayer.texture = texture;
		} else {
			this.fogImageOverlayLayer.texture = undefined;
		}
	}

	getFogImageOverlayAlpha() {
		let alpha;
		if (game.user.isGM) alpha = this.getSetting("fogImageOverlayGMAlpha");
		else alpha = this.getSetting("fogImageOverlayPlayerAlpha");
		if (!alpha) {
			if (game.user.isGM) alpha = this.DEFAULTS.fogImageOverlayGMAlpha;
			else alpha = this.DEFAULTS.fogImageOverlayAlpha;
		}
		return alpha;
	}

	async setFogImageOverlayAlpha(alpha, skip = false) {
		if (!skip && this.getSetting("transition")) {
			const start = this.fogImageOverlayLayer.alpha;
			const dist = start - alpha;
			const fps = game.settings.get("core", "maxFPS");
			const speed = this.getSetting("transitionSpeed");
			const frame = 1000 / fps;
			const rate = dist / ((fps * speed) / 1000);
			let f = (fps * speed) / 1000;
			while (f > 0) {
				// Delay 1 frame before updating again
				// eslint-disable-next-line no-promise-executor-return
				await new Promise((resolve) => setTimeout(resolve, frame));
				this.fogImageOverlayLayer.alpha -= rate;
				f -= 1;
			}
		}
		this.fogImageOverlayLayer.alpha = alpha;
	}

	/**
	 * Gets and sets various layer wide properties
	 * Some properties have different values depending on if user is a GM or player
	 */

	getSetting(name) {
		return canvas.scene.getFlag("simplefog", name)
			?? this.getUserSetting(name)
			?? this.DEFAULTS[name];
	}

	async setSetting(name, value) {
		return await canvas.scene.setFlag("simplefog", name, value);
	}

	getUserSetting(name) {
		return game.user.getFlag("simplefog", name) ?? this.DEFAULTS[name];
	}

	async setUserSetting(name, value) {
		return await game.user.setFlag("simplefog", name, value);
	}

	/**
	 * Renders the history stack to the mask
	 * @param history {Array}       A collection of history events
	 * @param start {Number}        The position in the history stack to begin rendering from
	 * @param start {Number}        The position in the history stack to stop rendering
	 */
	renderStack({
		history = canvas.scene.getFlag("simplefog", "history"),
		start = this.pointer,
		stop = canvas.scene.getFlag("simplefog", "history.pointer"),
		isInit = false
	}) {
		history ||= { events: [], pointer: 0 };
		// If history is blank, do nothing
		if (history === undefined && !isInit) {
			this.visible = game.settings.get("simplefog", "autoEnableSceneFog");
			return;
		}
		// If history is zero, reset scene fog
		if (history.events.length === 0) this.resetMask(false);
		if (start === undefined) start = 0;
		if (stop === undefined) stop = history.events.length;
		// If pointer preceeds the stop, reset and start from 0
		if (stop <= this.pointer) {
			this.resetMask(false);
			start = 0;
		}

		// Render all ops starting from pointer
		for (let i = start; i < stop; i += 1) {
			for (let j = 0; j < history.events[i].length; j += 1) {
				this.renderBrush(history.events[i][j], false);
			}
		}
		// Update local pointer
		this.pointer = stop;
		// Prevent calling update when no lights loaded
		if (!canvas.sight?.light?.los?.geometry) return;
		// Update sight layer
		canvas.perception.update({
			refreshLighting: true,
			refreshVision: true,
			refreshOcclusion: true
		});
	}

	/**
	 * Add buffered history stack to scene flag and clear buffer
	 */
	async commitHistory() {
		// Do nothing if no history to be committed, otherwise get history
		if (this.historyBuffer.length === 0) return;
		if (this.lock) return;
		this.lock = true;
		let history = canvas.scene.getFlag("simplefog", "history");
		// If history storage doesnt exist, create it
		if (!history) {
			history = {
				events: [],
				pointer: 0,
			};
		}
		// If pointer is less than history length (f.x. user undo), truncate history
		history.events = history.events.slice(0, history.pointer);
		// Push the new history buffer to the scene
		history.events.push(this.historyBuffer);
		history.pointer = history.events.length;
		await canvas.scene.unsetFlag("simplefog", "history");
		await this.setSetting("history", history);
		// Clear the history buffer
		this.historyBuffer = [];
		this.lock = false;
	}

	/**
	 * Resets the mask of the layer
	 * @param save {Boolean} If true, also resets the layer history
	 */
	async resetMask(save = true) {
		// Fill fog layer with solid
		this.setFill();
		// If save, also unset history and reset pointer
		if (save) {
			await canvas.scene.unsetFlag("simplefog", "history");
			await canvas.scene.setFlag("simplefog", "history", {
				events: [],
				pointer: 0,
			});
			this.pointer = 0;
		}
	}

	/**
	 * Resets the mask of the layer
	 * @param save {Boolean} If true, also resets the layer history
	 */
	async blankMask() {
		await this.resetMask();
		this.renderBrush({
			shape: this.BRUSH_TYPES.BOX,
			x: 0,
			y: 0,
			width: this.width,
			height: this.height,
			fill: 0x000000,
		});
		this.commitHistory();
	}

	/**
	 * Steps the history buffer back X steps and redraws
	 * @param steps {Integer} Number of steps to undo, default 1
	 */
	async undo(steps = 1) {
		// Grab existing history
		// Todo: this could probably just grab and set the pointer for a slight performance improvement
		let history = canvas.scene.getFlag("simplefog", "history");
		if (!history) {
			history = {
				events: [],
				pointer: 0,
			};
		}
		let newpointer = this.pointer - steps;
		if (newpointer < 0) newpointer = 0;
		// Set new pointer & update history
		history.pointer = newpointer;
		await canvas.scene.unsetFlag("simplefog", "history");
		await canvas.scene.setFlag("simplefog", "history", history);
	}

	/* -------------------------------------------- */
	/*  Shapes, sprites and PIXI objs               */
	/* -------------------------------------------- */

	/**
	 * Creates a PIXI graphic using the given brush parameters
	 * @param data {Object}       A collection of brush parameters
	 * @returns {Object}          PIXI.Graphics() instance
	 *
	 * @example
	 * const myBrush = this.brush({
	 *      shape: "ellipse",
	 *      x: 0,
	 *      y: 0,
	 *      fill: 0x000000,
	 *      width: 50,
	 *      height: 50,
	 *      alpha: 1,
	 *      visible: true
	 * });
	 */
	brush(data) {
		// Get new graphic & begin filling
		const { alpha = 1, fill, height, shape, vertices, visible = true, width, x, y, zIndex } = data;
		const brush = new PIXI.Graphics();
		brush.beginFill(fill);
		// Draw the shape depending on type of brush
		switch (shape) {
			case this.BRUSH_TYPES.ELLIPSE:
				brush.drawEllipse(0, 0, width, height);
				break;
			case this.BRUSH_TYPES.BOX:
				brush.drawRect(0, 0, width, height);
				break;
			case this.BRUSH_TYPES.ROUNDED_RECT:
				brush.drawRoundedRect(0, 0, width, height, 10);
				break;
			case this.BRUSH_TYPES.POLYGON:
				brush.drawPolygon(vertices);
				break;
		}
		// End fill and set the basic props
		brush.endFill();
		brush.alpha = alpha;
		brush.visible = visible;
		brush.x = x;
		brush.y = y;
		brush.zIndex = zIndex;
		return brush;
	}

	/**
	 * Gets a brush using the given parameters, renders it to mask and saves the event to history
	 * @param data {Object}       A collection of brush parameters
	 * @param save {Boolean}      If true, will add the operation to the history buffer
	 */
	renderBrush(data, save = true) {
		const brush = this.brush(data);
		this.composite(brush);
		brush.destroy();
		if (save) this.historyBuffer.push(data);
	}

	/**
	 * Renders the given brush to the layer mask
	 * @param data {Object}       PIXI Object to be used as brush
	 */
	composite(brush) {
		const opt = {
			renderTexture: this.maskTexture,
			clear: false,
			transform: null,
			skipUpdateTransform: false
		};
		canvas.app.renderer.render(brush, opt);
	}

	/**
	 * Returns a blank PIXI Sprite of canvas dimensions
	 */
	static getCanvasSprite() {
		const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		const d = canvas.dimensions;
		sprite.width = d.width;
		sprite.height = d.height;
		sprite.x = 0;
		sprite.y = 0;
		sprite.zIndex = 5000;
		return sprite;
	}

	/**
	 * Fills the mask layer with solid white
	 */
	setFill() {
		const fill = new PIXI.Graphics();
		fill.beginFill(0xffffff);
		fill.drawRect(0, 0, canvas.dimensions.width, canvas.dimensions.height);
		fill.endFill();
		this.composite(fill);
		fill.destroy();
	}

	/**
	 * Toggles visibility of primary layer
	 */
	toggle() {
		const v = this.getSetting("visible");
		this.visible = !v;
		this.setSetting("visible", !v);

		// If first time, set autofog to opposite so it doesn't reapply it.
		let history = canvas.scene.getFlag("simplefog", "history");

		if (history === undefined) {
			this.setSetting("autoFog", !v);
		}
	}

	async _draw() {
		// Check if masklayer is flagged visible
		let v = this.getSetting("visible");
		if (v === undefined) v = false;
		this.visible = v;

		// The layer is the primary sprite to be displayed
		this.fogColorLayer = MaskLayer.getCanvasSprite();
		this.setColorTint(this.getTint());
		this.setColorAlpha(this.getColorAlpha(), true);

		this.blur = new PIXI.filters.BlurFilter();
		this.blur.padding = 0;
		this.blur.repeatEdgePixels = true;
		this.blur.blur = this.getSetting("blurRadius");
		this.blur.quality = this.getSetting("blurQuality");

		// Filters
		if (this.getSetting("blurEnable")) {
			this.fogColorLayer.filters = [this.blur];
		} else {
			this.fogColorLayer.filters = [];
		}

		// So you can hit escape on the keyboard and it will bring up the menu
		this._controlled = {};

		this.maskTexture = MaskLayer.getMaskTexture();
		this.maskSprite = new PIXI.Sprite(this.maskTexture);

		this.fogColorLayer.mask = this.maskSprite;
		this.setFill();

		// Allow zIndex prop to function for items on this layer
		this.sortableChildren = true;

		// Render entire history stack
		this.renderStack({ start: 0, isInit: true });

		// apply image overlay to fog layer after we renderStack to prevent revealing the map
		const fogImageOverlayFilePath = this.getSetting("fogImageOverlayFilePath");
		const texture = this.getFogImageOverlayTexture(fogImageOverlayFilePath);
		this.fogImageOverlayLayer = new PIXI.Sprite(texture);
		this.fogImageOverlayLayer.position.set(canvas.dimensions.sceneRect.x, canvas.dimensions.sceneRect.y);
		this.fogImageOverlayLayer.width = canvas.dimensions.sceneRect.width;
		this.fogImageOverlayLayer.height = canvas.dimensions.sceneRect.height;
		this.fogImageOverlayLayer.mask = this.maskSprite;
		this.fogImageOverlayLayer.zIndex = this.getSetting("fogImageOverlayZIndex");
		this.setFogImageOverlayAlpha(this.getFogImageOverlayAlpha(), true);

		this.addChild(this.fogImageOverlayLayer);
		this.addChild(this.fogColorLayer);
		this.addChild(this.fogColorLayer.mask);
	}
}

/* SimplefogLayer extends MaskLayer
 *
 * Implements tools for manipulating the MaskLayer
 */

class SimplefogLayer extends MaskLayer {
	constructor() {
		super();

		// Register event listerenrs
		Hooks.on("ready", () => {
			this._registerMouseListeners();
		});

		this.DEFAULTS = Object.assign(this.DEFAULTS, {
			transition: true,
			transitionSpeed: 800,
			previewColor: "0x00FFFF",
			handlefill: "0xff6400",
			handlesize: 20,
			previewAlpha: 0.4,
			brushSize: 50,
			brushOpacity: 1,
			autoVisibility: false,
			autoVisGM: false,
			vThreshold: 1,
			hotKeyTool: "Brush",
		});

		// React to changes to current scene
		Hooks.on("updateScene", (scene, data) => this._updateScene(scene, data));
	}

	static get layerOptions() {
		return foundry.utils.mergeObject(super.layerOptions, {
			name: "simplefog",
			baseClass: SimplefogLayer,
		});
	}

	get activeTool() {
		return this.#activeTool;
	}

	set activeTool(tool) {
		this.#activeTool = tool;
	}

	get brushControls() {
		return this.#brushControls ??= new BrushControls();
	}

	#activeTool;

	#brushControls;

	#gridType;

	#lastPosition;

	#previewTint = 0xff0000;

	#rightclick;

	_activate() {
		super._activate();
		this._changeTool();
	}

		/* -------------------------------------------- */

		/** @inheritDoc */
	_deactivate() {
		super._deactivate();
		this.brushControls.close({animate: false});
		this.clearActiveTool();
	}

	_changeTool() {
		this.clearActiveTool();
		this.activeTool = ui.controls.activeTool;
		this.setPreviewTint();
		if (this.activeTool === "brush") {
			this.ellipsePreview.visible = true;
			this._pointerMoveBrush(canvas.mousePosition);
		} else if (this.activeTool === "grid") {
			this._initGrid();
			this._pointerMoveGrid(canvas.mousePosition);
		} else if (this.activeTool === "room") {
			this._pointerMoveRoom(canvas.mousePosition);
			canvas.walls.objects.visible = true;
			canvas.walls.placeables.forEach((l) => l.renderFlags.set({refreshState: true}));
		}
		this.brushControls.render({ force: true });
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers                */
	/* -------------------------------------------- */

	/**
	 * React to updates of canvas.scene flags
	 */
	_updateScene(scene, data) {
		// Check if update applies to current viewed scene
		if (!scene._view) return;
		// React to visibility change
		if (foundry.utils.hasProperty(data, "flags.simplefog.visible")) {
			canvas.simplefog.visible = data.flags.simplefog.visible;
		}
		// React to composite history change
		if (foundry.utils.hasProperty(data, "flags.simplefog.blurEnable")) {
			if (this.fogColorLayer !== undefined) {
				if (this.getSetting("blurEnable")) {
					this.fogColorLayer.filters = [this.blur];
				} else {
					this.fogColorLayer.filters = [];
				}
			}
		}
		if (foundry.utils.hasProperty(data, "flags.simplefog.blurRadius")) {
			canvas.simplefog.blur.blur = this.getSetting("blurRadius");
		}
		// React to composite history change
		if (foundry.utils.hasProperty(data, "flags.simplefog.blurQuality")) {
			canvas.simplefog.blur.quality = this.getSetting("blurQuality");
		}
		// React to composite history change
		if (foundry.utils.hasProperty(data, "flags.simplefog.history")) {
			canvas.simplefog.renderStack({ history: data.flags.simplefog.history });

			canvas.perception.update({
				refreshLighting: true,
				refreshVision: true,
				refreshOcclusion: true
			});
		}
		// React to autoVisibility setting changes
		if (
			foundry.utils.hasProperty(data, "flags.simplefog.autoVisibility")
			|| foundry.utils.hasProperty(data, "flags.simplefog.vThreshold")
		) {
			canvas.perception.update({
				refreshLighting: true,
				refreshVision: true,
				refreshOcclusion: true
			});
		}
		// React to alpha/tint changes
		if (!game.user.isGM && foundry.utils.hasProperty(data, "flags.simplefog.playerColorAlpha")) {
			canvas.simplefog.setColorAlpha(data.flags.simplefog.playerColorAlpha);
		}
		if (game.user.isGM && foundry.utils.hasProperty(data, "flags.simplefog.gmColorAlpha")) {
			canvas.simplefog.setColorAlpha(data.flags.simplefog.gmColorAlpha);
		}
		if (!game.user.isGM && foundry.utils.hasProperty(data, "flags.simplefog.playerColorTint")) {
			canvas.simplefog.setColorTint(data.flags.simplefog.playerColorTint);
		}
		if (game.user.isGM && foundry.utils.hasProperty(data, "flags.simplefog.gmColorTint")) {
			canvas.simplefog.setColorTint(data.flags.simplefog.gmColorTint);
		}

		// React to Image Overylay file changes
		if (foundry.utils.hasProperty(data, "flags.simplefog.fogImageOverlayFilePath")) {
			canvas.simplefog.setFogImageOverlayTexture(data.flags.simplefog.fogImageOverlayFilePath);
		}

		if (game.user.isGM && foundry.utils.hasProperty(data, "flags.simplefog.fogImageOverlayGMAlpha")) {
			canvas.simplefog.setFogImageOverlayAlpha(data.flags.simplefog.fogImageOverlayGMAlpha);
		}
		if (!game.user.isGM && foundry.utils.hasProperty(data, "flags.simplefog.fogImageOverlayPlayerAlpha")) {
			canvas.simplefog.setFogImageOverlayAlpha(data.flags.simplefog.fogImageOverlayPlayerAlpha);
		}
		if (foundry.utils.hasProperty(data, "flags.simplefog.fogImageOverlayZIndex")) {
			canvas.simplefog.fogImageOverlayLayer.zIndex = data.flags.simplefog.fogImageOverlayZIndex;
		}
	}

	/**
	 * Adds the mouse listeners to the layer
	 */
	_registerMouseListeners() {
		this.addListener("pointerup", this._pointerUp);
		this.addListener("pointermove", this._pointerMove);
	}

	highlightConfig(x, y) {
		return { x, y, color: this.#previewTint, alpha: this.DEFAULTS.previewAlpha };
	}

	setPreviewTint() {
		const vt = this.getSetting("vThreshold");
		const bo = hexToPercent(this.getUserSetting("brushOpacity")) / 100;
		this.#previewTint = 0xff0000;
		if (bo < vt) this.#previewTint = 0x00ff00;
		this.ellipsePreview.tint = this.#previewTint;
		this.boxPreview.tint = this.#previewTint;
		this.polygonPreview.tint = this.#previewTint;
		if (this.activeTool === "grid" && this.#lastPosition) {
			const { x, y } = this.#lastPosition;
			canvas.interface.grid.clearHighlightLayer("simplefog");
			canvas.interface.grid.highlightPosition("simplefog", this.highlightConfig(x, y));
		}
	}

	/**
	 * Sets the active tool & shows preview for brush & grid tools
	 * @param {Number}  Size in pixels
	 */
	async setBrushSize(s) {
		await this.setUserSetting("brushSize", s);
		const p = { x: this.ellipsePreview.x, y: this.ellipsePreview.y };
		this._pointerMoveBrush(p);
	}

	/**
	 * Aborts any active drawing tools
	 */
	clearActiveTool() {
		canvas.interface.grid.clearHighlightLayer("simplefog");
		// Box preview
		this.boxPreview.visible = false;
		// Ellipse Preview
		this.ellipsePreview.visible = false;
		this.polygonPreview.clear();
		this.polygonPreview.visible = false;
		this.polygonHandle.visible = false;
		this.polygon = [];
		// Cancel op flag
		this.op = false;
		// Clear history buffer
		this.historyBuffer = [];
		if (this.activeTool === "room") {
			canvas.walls.objects.visible = false;
			canvas.walls.placeables.forEach((l) => l.renderFlags.set({refreshState: true}));
		}
	}

	_onClickLeft(e) {
		// Don't allow new action if history push still in progress
		if (this.historyBuffer.length > 0) return;
		const p = canvas.mousePosition;
		if (!canvas.dimensions.rect.contains(p.x, p.y)) return;
		// Round positions to nearest pixel
		p.x = Math.round(p.x);
		p.y = Math.round(p.y);
		this.op = true;
		// Check active tool
		switch (this.activeTool) {
			case "brush":
				this._pointerDownBrush();
				break;
			case "grid":
				this._pointerDownGrid();
				break;
			case "box":
				this._pointerDownBox(p);
				break;
			case "ellipse":
				this._pointerDownEllipse(p);
				break;
			case "polygon":
				this._pointerDownPolygon(p);
				break;
			case "room":
				this._pointerDownRoom(p, e);
				break;
		}
		// Call _pointermove so single click will still draw brush if mouse does not move
		this._pointerMove(e);
	}

	_onClickLeft2(e) {
		// Don't allow new action if history push still in progress
		if (this.historyBuffer.length > 0) return;
		const p = canvas.mousePosition;
		if (!canvas.dimensions.rect.contains(p.x, p.y)) return;
		// Round positions to nearest pixel
		p.x = Math.round(p.x);
		p.y = Math.round(p.y);
		this.op = true;
		// Check active tool
		switch (this.activeTool) {
			case "polygon":
				this._pointerDown2Polygon(p);
				break;
		}
		// Call _pointermove so single click will still draw brush if mouse does not move
		this._pointerMove(e);
	}

	_onClickRight(e) {
		if (this.historyBuffer.length > 0) return;
		// Todo: Not sure why this doesnt trigger when drawing ellipse & box
		if (["box", "ellipse"].includes(this.activeTool)) {
			this.clearActiveTool();
		} else if (this.activeTool === "polygon") this.#rightclick = true;
	}

	_pointerMove(e) {
		// Get mouse position translated to canvas coords
		const p = canvas.mousePosition;
		// Round positions to nearest pixel
		p.x = Math.round(p.x);
		p.y = Math.round(p.y);
		switch (this.activeTool) {
			case "brush":
				this._pointerMoveBrush(p);
				break;
			case "box":
				this._pointerMoveBox(p, e);
				break;
			case "grid":
				this._pointerMoveGrid(p);
				break;
			case "ellipse":
				this._pointerMoveEllipse(p, e);
				break;
			case "polygon":
				this.#rightclick = false;
				break;
			case "room":
				this._pointerMoveRoom(p, e);
				break;
		}
	}

	_pointerUp(e) {
		if (e.data.button === 0) {
			// Translate click to canvas position
			const p = canvas.mousePosition;
			// Round positions to nearest pixel
			p.x = Math.round(p.x);
			p.y = Math.round(p.y);
			switch (this.op) {
				case "box":
					this._pointerUpBox(p, e);
					break;
				case "ellipse":
					this._pointerUpEllipse(p, e);
					break;
			}
			// Reset operation
			this.op = false;
			// Push the history buffer
			this.commitHistory();
		} else if (e.data.button === 2) {
			if (this.activeTool === "polygon" && this.#rightclick) {
				this.clearActiveTool();
			}
		}
	}

	/**
	 * Brush Tool
	 */
	_pointerDownBrush() {
		this.op = true;
	}

	_pointerMoveBrush(p) {
		if (!canvas.dimensions.rect.contains(p.x, p.y)) {
			this.ellipsePreview.visible = false;
			return;
		} else this.ellipsePreview.visible = true;
		const size = this.getUserSetting("brushSize");
		this.ellipsePreview.width = size * 2;
		this.ellipsePreview.height = size * 2;
		this.ellipsePreview.x = p.x;
		this.ellipsePreview.y = p.y;
		// If drag operation has started
		if (this.op) {
			// Send brush movement events to renderbrush to be drawn and added to history stack
			this.renderBrush({
				shape: this.BRUSH_TYPES.ELLIPSE,
				x: p.x,
				y: p.y,
				fill: this.getUserSetting("brushOpacity"),
				width: this.getUserSetting("brushSize"),
				height: this.getUserSetting("brushSize"),
			});
		}
	}

	/*
	 * Box Tool
	 */
	_pointerDownBox(p) {
		// Set active drag operation
		this.op = "box";
		// Set drag start coords
		this.dragStart.x = p.x;
		this.dragStart.y = p.y;
		// Reveal the preview shape
		this.boxPreview.visible = true;
		this.boxPreview.x = p.x;
		this.boxPreview.y = p.y;
	}

	_pointerMoveBox(p, e) {
		// If drag operation has started
		if (this.op) {
			// update the preview shape
			const d = this._getDragBounds(p, e);
			this.boxPreview.width = d.w;
			this.boxPreview.height = d.h;
		}
	}

	_pointerUpBox(p, e) {
		// update the preview shape
		const d = this._getDragBounds(p, e);
		this.renderBrush({
			shape: this.BRUSH_TYPES.BOX,
			x: this.dragStart.x,
			y: this.dragStart.y,
			width: d.w,
			height: d.h,
			fill: this.getUserSetting("brushOpacity"),
		});
		this.boxPreview.visible = false;
	}

	/*
	 * Ellipse Tool
	 */
	_pointerDownEllipse(p) {
		// Set active drag operation
		this.op = "ellipse";
		// Set drag start coords
		this.dragStart.x = p.x;
		this.dragStart.y = p.y;
		// Reveal the preview shape
		this.ellipsePreview.x = p.x;
		this.ellipsePreview.y = p.y;
		this.ellipsePreview.visible = true;
	}

	_pointerMoveEllipse(p, e) {
		// If drag operation has started
		const d = this._getDragBounds(p, e);
		if (this.op) {
			// Just update the preview shape
			this.ellipsePreview.width = d.w * 2;
			this.ellipsePreview.height = d.h * 2;
		}
	}

	_pointerUpEllipse(p, e) {
		const d = this._getDragBounds(p, e);
		this.renderBrush({
			shape: this.BRUSH_TYPES.ELLIPSE,
			x: this.dragStart.x,
			y: this.dragStart.y,
			width: Math.abs(d.w),
			height: Math.abs(d.h),
			fill: this.getUserSetting("brushOpacity"),
		});
		this.ellipsePreview.visible = false;
	}

	/*
	 * Polygon Tool
	 */
	_pointerDownPolygon(p) {
		if (!this.polygon) this.polygon = [];
		const x = Math.floor(p.x);
		const y = Math.floor(p.y);
		// If this is not the first vertex...
		if (this.polygon.length) {
			// Check if new point is close enough to start to close the polygon
			const xo = Math.abs(this.polygon[0].x - x);
			const yo = Math.abs(this.polygon[0].y - y);
			if (xo < this.DEFAULTS.handlesize && yo < this.DEFAULTS.handlesize) {
				this._pointerClosePolygon();
				return;
			}
		}
		// If this is first vertex...
		else {
			// Draw shape handle
			this.polygonHandle.x = x - this.DEFAULTS.handlesize;
			this.polygonHandle.y = y - this.DEFAULTS.handlesize;
			this.polygonHandle.visible = true;
		}
		this._pointerUpdatePolygon(x, y);
	}

	_pointerDown2Polygon() {
		if (!this.polygon || this.polygon.length < 3) return;
		this._pointerClosePolygon();
	}

	_pointerClosePolygon() {
		const verts = hexObjsToArr(this.polygon);
		// render the new shape to history
		this.renderBrush({
			shape: this.BRUSH_TYPES.POLYGON,
			x: 0,
			y: 0,
			vertices: verts,
			fill: this.getUserSetting("brushOpacity"),
		});
		// Reset the preview shape
		this.polygonPreview.clear();
		this.polygonPreview.visible = false;
		this.polygonHandle.visible = false;
		this.polygon = [];
		return true;
	}

	_pointerUpdatePolygon(x, y) {
		// If intermediate vertex, add it to array and redraw the preview
		this.polygon.push({ x, y });
		this.polygonPreview.clear();
		this.polygonPreview.beginFill(0xffffff);
		this.polygonPreview.drawPolygon(hexObjsToArr(this.polygon));
		this.polygonPreview.endFill();
		this.polygonPreview.visible = true;
	}

	_pointerDownRoom(p, e) {
		const vertices = this._getRoomVertices(p, e);
		if (!vertices) return false;

		this.renderBrush({
			shape: this.BRUSH_TYPES.POLYGON,
			x: 0,
			y: 0,
			vertices,
			fill: this.getUserSetting("brushOpacity"),
		});
		return true;
	}

	_pointerMoveRoom(p, e) {
		if (!canvas.dimensions.rect.contains(p.x, p.y)) {
			this.polygonPreview.visible = false;
			return;
		} else this.polygonPreview.visible = true;
		this.polygonPreview.clear();
		this.polygonPreview.beginFill(0xffffff);
		this.polygonPreview.drawPolygon(this._getRoomVertices(p, e));
		this.polygonPreview.endFill();
	}

	_getRoomVertices(p, e) {
		const sceneRect = canvas.dimensions.sceneRect;
		if (p.x < sceneRect.left || p.x > sceneRect.right || p.y < sceneRect.top || p.y > sceneRect.bottom) return [];
		const sweep = CWSPNoDoors.create(canvas.mousePosition, { type: "sight", useInnerBounds: true, shiftKey: e?.shiftKey });
		return Array.from(sweep.points);
	}

	/**
	 * Grid Tool
	 */
	_pointerDownGrid() {
		// Set active drag operation
		this.op = "grid";
		this._initGrid();
	}

	_pointerMoveGrid(p) {
		canvas.interface.grid.clearHighlightLayer("simplefog");
		if (!canvas.dimensions.rect.contains(p.x, p.y)) return;
		const { size, type } = canvas.scene.grid;
		// Square grid
		if (type === 1) {
			const { x, y } = canvas.grid.getTopLeftPoint({x: p.x, y: p.y });
			canvas.interface.grid.highlightPosition("simplefog", this.highlightConfig(x, y));
			this.#lastPosition = { x, y };
			if (this.op) {
				const coord = `${x},${y}`;
				if (!this.dupes.includes(coord)) {
					// Flag cell as drawn in dupes
					this.dupes.push(coord);
					this.renderBrush({
						shape: this.BRUSH_TYPES.BOX,
						x,
						y,
						width: size,
						height: size,
						fill: this.getUserSetting("brushOpacity"),
					});
				}
			}
		}
		// Hex Grid
		else if ([2, 3, 4, 5].includes(type)) {
			const coords = canvas.grid.getCenterPoint({ x: p.x, y: p.y });
			const cube = canvas.grid.getCube(coords);
			const offset = canvas.grid.getOffset(cube);
			const { x, y } = canvas.grid.getTopLeftPoint(offset);
			canvas.interface.grid.highlightPosition("simplefog", this.highlightConfig(x, y));
			this.#lastPosition = { x, y };
			// If drag operation has started
			if (this.op) {
				// Convert pixel coord to hex coord
				const qr = this.gridLayout.pixelToHex(p).round();
				const coord = `${qr.q},${qr.r}`;
				// Check if this grid cell was already drawn
				if (!this.dupes.includes(coord)) {
					// Get current grid coord verts
					const vertices = this.gridLayout.polygonCorners({ q: qr.q, r: qr.r });
					// Convert to array of individual verts
					const vertexArray = hexObjsToArr(vertices);
					// Get the vert coords for the hex
					this.renderBrush({
						shape: this.BRUSH_TYPES.POLYGON,
						vertices: vertexArray,
						x: 0,
						y: 0,
						fill: this.getUserSetting("brushOpacity"),
					});
					// Flag cell as drawn in dupes
					this.dupes.push(coord);
				}
			}
		}
	}

	/*
	 * Returns height and width given a pointer coord and event for modifer keys
	 */
	_getDragBounds(p, e) {
		let h = p.y - this.dragStart.y;
		let w = p.x - this.dragStart.x;
		if (e.data.originalEvent.shiftKey) {
			const ws = Math.sign(w);
			const hs = Math.sign(h);
			if (Math.abs(h) > Math.abs(w)) w = Math.abs(h) * ws;
			else h = Math.abs(w) * hs;
		}
		return { w, h };
	}

	/*
	 * Checks grid type, creates a dupe detection matrix & if hex grid init a layout
	 */
	_initGrid() {
		const { size, type } = canvas.scene.grid;
		this.dupes = [];
		if (this.#gridType === type) return;
		const legacyHex = !!canvas.scene.flags.core?.legacyHex;
		const divisor = legacyHex ? 2 : Math.sqrt(3);
		switch (type) {
			// Square grid
			// Pointy Hex Odd
			case 2:
				this.gridLayout = new Layout(
					Layout.pointy,
					{ x: size / divisor, y: size / divisor },
					{ x: 0, y: size / divisor }
				);
				break;
			// Pointy Hex Even
			case 3: {
				const x = legacyHex ? (Math.sqrt(3) * size) / 4 : size / 2;
				this.gridLayout = new Layout(
					Layout.pointy,
					{ x: size / divisor, y: size / divisor },
					{ x, y: size / divisor }
				);
				break;
			}
			// Flat Hex Odd
			case 4:
				this.gridLayout = new Layout(
					Layout.flat,
					{ x: size / divisor, y: size / divisor },
					{ x: size / divisor, y: 0 }
				);
				break;
			// Flat Hex Even
			case 5: {
				const y = legacyHex ? (Math.sqrt(3) * size) / 4 : size / 2;
				this.gridLayout = new Layout(
					Layout.flat,
					{ x: size / divisor, y: size / divisor },
					{ x: size / divisor, y }
				);
				break;
			}
		}
		this.#gridType = type;
	}

	async _draw() {
		super._draw();
		this.boxPreview = this.brush({
			shape: this.BRUSH_TYPES.BOX,
			x: 0,
			y: 0,
			fill: 0xffffff,
			alpha: this.DEFAULTS.previewAlpha,
			width: 100,
			height: 100,
			visible: false,
			zIndex: 10,
		});
		this.ellipsePreview = this.brush({
			shape: this.BRUSH_TYPES.ELLIPSE,
			x: 0,
			y: 0,
			fill: 0xffffff,
			alpha: this.DEFAULTS.previewAlpha,
			width: 100,
			height: 100,
			visible: false,
			zIndex: 10,
		});
		this.polygonPreview = this.brush({
			shape: this.BRUSH_TYPES.POLYGON,
			x: 0,
			y: 0,
			vertices: [],
			fill: 0xffffff,
			alpha: this.DEFAULTS.previewAlpha,
			visible: false,
			zIndex: 10,
		});
		this.polygonHandle = this.brush({
			shape: this.BRUSH_TYPES.BOX,
			x: 0,
			y: 0,
			fill: this.DEFAULTS.handlefill,
			width: this.DEFAULTS.handlesize * 2,
			height: this.DEFAULTS.handlesize * 2,
			alpha: this.DEFAULTS.previewAlpha,
			visible: false,
			zIndex: 15,
		});

		this.addChild(this.boxPreview);
		this.addChild(this.ellipsePreview);
		this.addChild(this.polygonPreview);
		this.addChild(this.polygonHandle);
		canvas.interface.grid.addHighlightLayer("simplefog");
	}
}

const registerSettings = function () {
	// Register global config settings
	game.settings.register("simplefog", "confirmFogDisable", {
		name: "Confirm Disabling of Scene Simple Fog",
		hint: "When enabled, a confirmation dialog will be displayed before Simple Fog can be toggled off for a scene",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register("simplefog", "autoEnableSceneFog", {
		name: "Auto Enable Scene Fog",
		hint: "When enabled, Simple Fog will automatically be enabled for a scene when it is first created.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register("simplefog", "toolHotKeys", {
		name: "Hotkey Tool",
		hint: "Define which tool will be selected when using the keybinding.",
		scope: "world",
		config: true,
		default: "brush",
		type: String,
		choices: {
			brush: "Brush",
			grid: "Grid",
			polygon: "Polygon",
			box: "Box",
			ellipse: "Ellipse",
		},
	});
	game.settings.register("simplefog", "zIndex", {
		name: "Simplefog Z-Index",
		hint: "The z-index determines the order in which various layers are rendered within the Foundry canvas. A higher number will be rendered on top of lower numbered layers (and the objects on that layer). This allows for the adjustment of the z-index to allow for Simple Fog to be rendered above/below other layers; particularly ones added by other modules. Going below 200 will intermingle with Foundry layers such as the foreground image (200), tokens (100), etc... (Default: 220)",
		scope: "world",
		config: true,
		default: 220,
		type: Number,
		onChange: (value) => canvas.simplefog.zIndex = value
	});
};

Hooks.once("init", async () => {
	registerSettings();
	CONFIG.Canvas.layers.simplefog = { group: "interface", layerClass: SimplefogLayer };

	const isActiveControl = () => ui.controls.activeControl === "simplefog";
	game.keybindings.register("simplefog", "swap", {
		name: "Swap to Simple Fog's Controls",
		hint: "Toggles between the Token and Simple Fog layers. Check the module's settings to define which tool will be selected by default.",
		editable: [
			{
				key: "S",
				modifiers: ["Control"]
			}
		],
		onDown: () => {
			const layer = isActiveControl() ? "tokens" : "simplefog";
			canvas[layer].activate();
			return true;
		},
		restricted: true,
		precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY
	});
	game.keybindings.register("simplefog", "undo", {
		name: "Undo Change",
		hint: "",
		editable: [
			{
				key: "Z",
				modifiers: ["Control"]
			}
		],
		onDown: () => {
			if (isActiveControl()) {
				canvas.simplefog.undo();
				return true;
			}
		},
		restricted: true,
		precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY
	});
	game.keybindings.register("simplefog", "opacity", {
		name: "Toggle Opacity",
		hint: "Toggles the Brush Opacity's bar between Reveal/Hide. Only works while editing Simple Fog's layer.",
		uneditable: [],
		editable: [
			{
				key: "T"
			}
		],
		onDown: () => {
			if (isActiveControl()) {
				const bc = canvas.simplefog.brushControls;
				const handler = bc.options.actions.brushOpacity;
				const slider = bc.element.querySelector("input[name=brushOpacity]");
				slider.value = slider.value === "100" ? 0 : 100;
				handler.call(bc);
				return true;
			}
		},
		restricted: true,
	});
	game.keybindings.register("simplefog", "brushReduce", {
		name: "Reduce Brush Size",
		hint: "Only works while the Brush is selected.",
		editable: [
			{
				key: "BracketLeft"
			}
		],
		onDown: () => {
			if (isActiveControl() && canvas.simplefog.activeTool === "brush") {
				const bc = canvas.simplefog.brushControls;
				const handler = bc.options.actions.brushSize;
				const slider = bc.element.querySelector("input[name=brushSize]");
				slider.value = Math.max(Number(slider.value) * 0.8, 10).toNearest(10, "floor");
				handler.call(bc);
				canvas.simplefog.setBrushSize(slider.value);
				return true;
			}
		},
		onUp: () => {},
		repeat: true,
		restricted: true,
	});
	game.keybindings.register("simplefog", "brushIncrease", {
		name: "Increase Brush Size",
		hint: "Only works while the Brush is selected.",
		editable: [
			{
				key: "BracketRight"
			}
		],
		onDown: () => {
			if (isActiveControl() && canvas.simplefog.activeTool === "brush") {
				const bc = canvas.simplefog.brushControls;
				const handler = bc.options.actions.brushSize;
				const slider = bc.element.querySelector("input[name=brushSize]");
				slider.value = Math.min(Number(slider.value) * 1.25, 500).toNearest(10, "ceil");
				handler.call(bc);
				canvas.simplefog.setBrushSize(slider.value);
				return true;
			}
		},
		repeat: true,
		restricted: true,
	});
	game.keybindings.register("simplefog", "forceShape", {
		name: "Force Drag Shape (Hold)",
		hint: "Forces the width and height of Rectangle and Ellipse tools to be the same.",
		uneditable: [
			{
				key: "Shift"
			}
		],
		repeat: true,
		restricted: true,
		precedence: CONST.KEYBINDING_PRECEDENCE.DEFERRED
	});
});

Hooks.once("ready", async () => {
	canvas.simplefog.zIndex = game.settings.get("simplefog", "zIndex");

	canvas.perception.update({
		refreshLighting: true,
		refreshVision: true,
		refreshOcclusion: true
	});
});

Hooks.once("canvasInit", () => {
	if (!game.user.isGM) return;
	Object.keys(canvas.simplefog.DEFAULTS).forEach((key) => {
		// Check for existing scene specific setting
		if (canvas.simplefog.getSetting(key) !== undefined) return;
		// Check for custom default
		const def = canvas.simplefog.getUserSetting(key);
		// If user has custom default, set it for scene
		if (def !== undefined) canvas.simplefog.setSetting(key, def);
		// Otherwise fall back to module default
		else canvas.simplefog.setSetting(key, canvas.simplefog.DEFAULTS[key]);
	});
});

Hooks.on("canvasInit", () => {
	const overlayFile = canvas.simplefog.getSetting("fogImageOverlayFilePath");
	if (overlayFile) {
		canvas.loadTexturesOptions.additionalSources.push(overlayFile);
	}
});

// from controls.js

/**
 * Add control buttons
 */
Hooks.on("getSceneControlButtons", (controls) => {
	if (!game.user.isGM) return;
	const tools = [
		{
			name: "simplefogtoggle",
			title: game.i18n.localize("SIMPLEFOG.onoff"),
			icon: "fas fa-eye",
			onClick: () => toggleSimpleFog(),
			active: canvas.simplefog?.visible,
			toggle: true,
		},
		{
			name: "brush",
			title: game.i18n.localize("SIMPLEFOG.brushTool"),
			icon: "fas fa-paint-brush",
			onClick: () => canvas.simplefog?._changeTool(),
		},
		{
			name: "room",
			title: game.i18n.localize("SIMPLEFOG.roomTool"),
			icon: "fas fa-block-brick",
			onClick: () => canvas.simplefog?._changeTool(),
		},
		{
			name: "polygon",
			title: game.i18n.localize("SIMPLEFOG.polygonTool"),
			icon: "fas fa-draw-polygon",
			onClick: () => canvas.simplefog?._changeTool(),
		},
		{
			name: "box",
			title: game.i18n.localize("SIMPLEFOG.boxTool"),
			icon: "far fa-square",
			onClick: () => canvas.simplefog?._changeTool(),
		},
		{
			name: "ellipse",
			title: game.i18n.localize("SIMPLEFOG.ellipseTool"),
			icon: "far fa-circle",
			onClick: () => canvas.simplefog?._changeTool(),
		},
		{
			name: "sceneConfig",
			title: game.i18n.localize("SIMPLEFOG.sceneConfig"),
			icon: "fas fa-cog",
			onClick: () => {
				new SimplefogConfig().render(true);
			},
			button: true,
		},
		{
			name: "clearfog",
			title: game.i18n.localize("SIMPLEFOG.reset"),
			icon: "fas fa-trash",
			onClick: () => {
				const dg = new Dialog({
					title: game.i18n.localize("SIMPLEFOG.reset"),
					content: game.i18n.localize("SIMPLEFOG.confirmReset"),
					buttons: {
						reset: {
							icon: '<i class="fas fa-trash"></i>',
							label: "Reset",
							callback: () => canvas.simplefog.resetMask(),
						},
						blank: {
							icon: '<i class="fas fa-eye"></i>',
							label: "Blank",
							callback: () => canvas.simplefog.blankMask(),
						},
						cancel: {
							icon: '<i class="fas fa-times"></i>',
							label: "Cancel",
						},
					},
					default: "reset",
				});
				dg.render(true);
			},
			button: true,
		},
	];
	let activeTool = game.settings.get("simplefog", "toolHotKeys");
	if (canvas.grid?.type) {
		tools.splice(2, 0, {
			name: "grid",
			title: game.i18n.localize("SIMPLEFOG.gridTool"),
			icon: "fas fa-border-none",
			onClick: () => canvas.simplefog?._changeTool(),
		});
	} else if (activeTool === "grid") activeTool = "brush";
	controls.push({
		name: "simplefog",
		title: game.i18n.localize("SIMPLEFOG.sf"),
		icon: "fas fa-cloud",
		layer: "simplefog",
		tools,
		activeTool,
	});
});

/**
 * Toggle Simple Fog
 */
function toggleSimpleFog() {
	if (game.settings.get("simplefog", "confirmFogDisable") && canvas.simplefog.getSetting("visible")) {
		let dg = Dialog.confirm({
			title: game.i18n.localize("SIMPLEFOG.disableFog"),
			content: game.i18n.localize("SIMPLEFOG.confirmDisableFog"),
			yes: () => toggleOffSimpleFog(),
			no: () => cancelToggleSimpleFog(),
			defaultYes: false,
			rejectClose: true,
		});
		dg.then(undefined, cancelToggleSimpleFog);
	} else {
		toggleOffSimpleFog();
	}
}

function toggleOffSimpleFog() {
	canvas.simplefog.toggle();
	canvas.perception.update({
		refreshLighting: true,
		refreshVision: true,
		refreshOcclusion: true
	});
}

function cancelToggleSimpleFog(result = undefined) {
	ui.controls.controls.find(({ name }) => name === "simplefog").tools[0].active = true;
	ui.controls.render();
}
//# sourceMappingURL=simplefog.js.map
