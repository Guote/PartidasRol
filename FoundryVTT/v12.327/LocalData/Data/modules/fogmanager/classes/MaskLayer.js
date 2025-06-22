/* eslint-disable semi */
/*global canvas PIXI game CanvasLayer CONFIG Hooks SocketInterface hasProperty mergeObject*/
// noinspection SpellCheckingInspection

/* FogManagerLayer extends CanvasLayer
 *
 * Creates an interactive layer which has an alpha channel mask
 * that can be rendered to and history for syncing between players
 * and replaying the mask / undo etc.
 */


/*
                      _____                   _______                   _____                   _______         
                     /\    \                 /::\    \                 /\    \                 /::\    \        
                    /::\    \               /::::\    \               /::\    \               /::::\    \       
                    \:::\    \             /::::::\    \             /::::\    \             /::::::\    \      
                     \:::\    \           /::::::::\    \           /::::::\    \           /::::::::\    \     
                      \:::\    \         /:::/~~\:::\    \         /:::/\:::\    \         /:::/~~\:::\    \    
                       \:::\    \       /:::/    \:::\    \       /:::/  \:::\    \       /:::/    \:::\    \   
                       /::::\    \     /:::/    / \:::\    \     /:::/    \:::\    \     /:::/    / \:::\    \  
                      /::::::\    \   /:::/____/   \:::\____\   /:::/    / \:::\    \   /:::/____/   \:::\____\ 
                     /:::/\:::\    \ |:::|    |     |:::|    | /:::/    /   \:::\ ___\ |:::|    |     |:::|    |
                    /:::/  \:::\____\|:::|____|     |:::|    |/:::/____/     \:::|    ||:::|____|     |:::|    |
                   /:::/    \::/    / \:::\    \   /:::/    / \:::\    \     /:::|____| \:::\    \   /:::/    / 
                  /:::/    / \/____/   \:::\    \ /:::/    /   \:::\    \   /:::/    /   \:::\    \ /:::/    /  
                 /:::/    /             \:::\    /:::/    /     \:::\    \ /:::/    /     \:::\    /:::/    /   
                /:::/    /               \:::\__/:::/    /       \:::\    /:::/    /       \:::\__/:::/    /    
                \::/    /                 \::::::::/    /         \:::\  /:::/    /         \::::::::/    /     
                 \/____/                   \::::::/    /           \:::\/:::/    /           \::::::/    /      
                                            \::::/    /             \::::::/    /             \::::/    /       
                                             \::/____/               \::::/    /               \::/____/        
                                              ~~                      \::/____/                 ~~              
                                                                       ~~                                       
                                                                                                                


* DONE Make sure the history is fully saved when pulling/pushing. I'm seeing stale rendered section vanish on first move update after a push
* Need to pull on first time, otherwise push doesn't work. (Even though layer is rendered)
* Need to wait for flush before pulling. Otherwise final commits aren't grabbed
* If not visbile/gm, why doe renders notes show up in client console.
  * Because canvas.scene.setFlag gets broadcast
* DONE If client is idle, it triggers "offline" broadcast flow. Why?  - Flows unified
   



*/

import {base64_to_sprite, pixiDump, fogManagerLog, hexObjsToArr} from "../js/helpers.js";
import {ColorToAlphaFilter, AlphaToColorFilter} from "./ColorReplaceFilter.js";

// CONFIG.debug.hooks = true
CONFIG.debug.fogmanager = false
CONFIG.debug.fog = false
CONFIG.debug.fogmanagertriage = false

// Hooks.on("ready", () => {
//     //canvas.sight.debounceSaveFog = debounce(auto_share, 1000);
// })
//
// async function auto_share() {
//
//     await canvas.sight.saveFog() // Save fog needs to be before the guard, since I've stolen the hook into the debounce function
//
//     if (!game.settings.get('fogmanager', "autoShare"))
//         return
//
//     //await canvas.fogmanager.broadcast_fog_fast()
//     await canvas.fogmanager.broadcast_fast()
//
//
// }

function canvas_scene_data() {
    return game.release.generation === 9 ? canvas.scene.data : canvas.scene
}


Hooks.on('init', () => {
    class FogManagerLayer extends (game.release.generation === 9 ? CanvasLayer : InteractionLayer) {
        #fogOverlayDimensions;
        #initialized = false;

        constructor() {
            super();
            this.history = {}
            this.lock = false;
            this.layername = "fogmanager";
            this.historyBuffer = [];
            this.pointer = 0;
            this.dragStart = {
                x: 0,
                y: 0
            };
            // Not actually used, just to prevent foundry from complaining
            this.history = [];
            this.BRUSH_TYPES = {
                ELLIPSE: 0,
                BOX: 1,
                ROUNDED_RECT: 2,
                POLYGON: 3
            };
            this.DEFAULTS = {
                visible: false
            };
            // Register event listerenrs
            this._registerMouseListeners();
            this._registerKeyboardListeners();

            this.DEFAULTS = Object.assign(this.DEFAULTS, {
                gmAlpha: game.release.generation === 9 ? 0.6 : 1, // In v10, dims entire fog scene
                gmTint: "0x000000",
                playerAlpha: 1,
                playerTint: "0x000000",
                transition: true,
                transitionSpeed: 800,
                previewColor: "0x00FFFF",
                handlefill: "0xff6400",
                handlesize: 20,
                previewAlpha: 0.9,  // TODO Add better config for this
                brushSize: 50,
                brushOpacity: 1,
                autoVisibility: false,
                autoVisGM: false,
                vThreshold: 1,
                showusers: false,
                autoShare: false,
            });
            // React to canvas zoom

            // React to changes to current scene
            Hooks.on("updateScene", (scene, data) => this._updateScene(scene, data));
        }

        static get layerOptions() { // @ts-ignore
            return mergeObject(super.layerOptions, {
                zIndex: 220, // Above imageFog  // TODO Check this
            });
        }

        /* -------------------------------------------- */
        /*  Init                                        */

        /* -------------------------------------------- */

        /**
         * Called on canvas init, creates the canvas layers and various objects and registers listeners
         *
         * Important objects:
         *
         * layer       - PIXI Sprite which holds all the mask elements
         * filters     - Holds filters such as blur applied to the layer
         * layer.mask  - PIXI Sprite wrapping the renderable mask
         * maskTexture - renderable texture that holds the actual mask data
         */
        async draw(options={}) { // V10 should have '_draw' and no super, but v9 doesn't like this
            await super.draw(options);
            //this.visible = false;
            if (!this.#initialized) {

                // The layer is the primary sprite to be displayed
                const d = canvas.dimensions;

                this._drawFogContainer();
                // this.layer.name = "Fog Container"
                if (game.release.generation === 9) {
                    this.explored.position.set(d.paddingX, d.paddingY);
                } else {
                    this.explored.position.set(d.sceneX, d.sceneY);
                }


                this.alpha = this.getAlpha()
                this.init()
                this.#initialized = true
            }
            // Render initial history stack
            this.renderStack(this.getHistory(), 0);

        }

        getHistory() {
            if (game.settings.get("fogmanager", "saveHistory") === false){
                if (!(canvas.scene.id in this.history)){
                    let history = {
                        events: [],
                        pointer: 0
                    };
                    this.setHistory(history)
                }

                return this.history[canvas.scene.id]
            }
            else {

                let history =  canvas.scene.getFlag(this.layername, "history");
                if (history){
                    return history
                }
                return {
                    events: [],
                    pointer: 0
                }

            }

        }
        async setHistory(history) {
            if (game.settings.get("fogmanager", "saveHistory") === false){
                this.history[canvas.scene.id] = history
                await this.renderStack(history)
            }
            else {
                await canvas.scene.unsetFlag(this.layername, "history");
                await this.setSetting("history", history);

            }
        }

        createVision() {
            const vision = new PIXI.Container();
            vision.name = "Vision Container"
            vision.fov = vision.addChild(new PIXI.LegacyGraphics());
            vision.fov.name = "fov"
            vision.los = vision.addChild(new PIXI.LegacyGraphics());
            vision.fov.name = "los"
            vision.mask = vision.los;
            vision._explored = false;
            return this.vision = this.addChild(vision);
        }

        async _drawFogContainer() { // Unexplored area is obscured by darkness. We need a larger rectangle so that the blur filter doesn't clip

            // this.unexplored = this.addChild(new PIXI.LegacyGraphics());
            // this.unexplored.name = "Unexplored Texture"
            // const rect = canvas.dimensions.rect.clone().pad(CONFIG.Canvas.blurStrength + 2);
            // this.unexplored.beginFill(0xFFFFFF, 1.0).drawShape(rect).endFill();
            //
            // this.unexplored.tint = 0x444444
            // TODO Add control of editor unexplored brightness This is the padding area around the map


            // Explored area is a sub-container
            this.maskTexture = FogManagerLayer.getMaskTexture()

            this.explored = this.addChild(new PIXI.Container());
            this.explored.name = "Explored Texture"

            this.pending = this.explored.addChild(new PIXI.Container());
            this.pending.name = "Pending"

            this.revealed = this.explored.addChild(new PIXI.Container());
            this.revealed.name = "Revealed"

            this.saved = this.revealed.addChild(new PIXI.Sprite(this.maskTexture));
            this.saved.name = "Saved"

            // If using padding, mask explored area. (Copied from foundry.js)
            if (canvas_scene_data().padding !== 0) {
                this.explored.msk = this.addChild(new PIXI.LegacyGraphics());
                this.explored.msk.name = "Exp Mask"
                this.explored.msk.beginFill(0xFFFFFF, 1.0).drawShape(canvas.dimensions.sceneRect).endFill();
            } else
                this.explored.msk = null;


            this.explored.mask = this.explored.msk;


            if (game.release.generation === 9) {
                this.filter = canvas.blurDistance ? canvas.createBlurFilter() : new PIXI.filters.AlphaFilter(1.0);
                this.filter.blendMode = PIXI.BLEND_MODES.MULTIPLY;
                this.filter.autoFit = false;

                this.filters = [this.filter];
            } else {
                await this.#drawFogOverlay()
                this.filter = VisibilityFilter.create({
                    unexploredColor: [0, 0, 0], // Replaces unexplored area, TODO Better numbers here
                    exploredColor: [.3, .3, .3], // Blends with explored area. Too high will over saturate
                    backgroundColor: [.3, .3, .3],
                    visionTexture: canvas.masks.vision.renderTexture,
                    primaryTexture: canvas.primary.renderTexture,
                    fogTexture: this.fogOverlay?.texture ?? null,
                    dimensions: this.#fogOverlayDimensions,
                    hasFogTexture: !!this.fogOverlay?.texture.valid
                });
                //pixiDump(this.fogOverlay.texture)
                canvas.fogmanager.fullPreview.visible = !this.fogOverlay?.texture.valid
                this.filter.blendMode = PIXI.BLEND_MODES.NORMAL;
                this.filters = [this.filter];
                canvas.addBlurFilter(this.filter);
                // Return the layer
                this.visible = false;


            }


            this.filterArea = canvas.app.screen; // DO NOT DELETE: Fixes large performace issue. (Issue #2)
        }

        async #drawFogOverlay() {
            //Partially copied from foundry.js
            this.fogOverlay = undefined;
            this.#fogOverlayDimensions = [];

            // Checking fog overlay source
            const fogOverlaySrc = canvas.scene.fogOverlay;
            if (!fogOverlaySrc) return;

            // Checking fog texture (no fallback)
            const fogTex = await loadTexture(fogOverlaySrc);
            if (!(fogTex && fogTex.valid)) return;

            // Creating the sprite and updating its base texture with repeating wrap mode
            const fo = this.fogOverlay = new PIXI.Sprite();
            fo.texture = fogTex;
            this.fogOverlay.name = "Fog Overlay"
            // Set dimensions and position according to fog overlay <-> scene foreground dimensions
            const bkg = canvas.primary.background;
            const baseTex = fogTex.baseTexture;
            if (bkg && ((fo.width !== bkg.width) || (fo.height !== bkg.height))) {
                // Set to the size of the scene dimensions
                fo.width = canvas.scene.dimensions.width;
                fo.height = canvas.scene.dimensions.height;
                fo.position.set(0, 0);
                // Activate repeat wrap mode for this base texture (to allow tiling)
                baseTex.wrapMode = PIXI.WRAP_MODES.REPEAT;
            } else {
                // Set the same position and size as the scene primary background
                fo.width = bkg.width;
                fo.height = bkg.height;
                fo.position.set(bkg.x, bkg.y);
            }

            // The fog overlay is added to this canvas container to update its transforms only
            fo.renderable = false;
            this.addChild(this.fogOverlay).name = "FO 1";

            // Manage video playback
            const video = game.video.getVideoSource(fogTex);
            if (video) {
                const playOptions = {volume: 0};
                game.video.play(video, playOptions);
            }

            // Passing overlay and base texture width and height for shader tiling calculations
            this.#fogOverlayDimensions = [fo.width, fo.height, baseTex.width, baseTex.height];
        }

        /* -------------------------------------------- */
        /*  History & Buffer                            */

        /* -------------------------------------------- */

        static getMaskTexture() { // Create the mask elements
            const res = game.release.generation === 9 ? canvas.sight._configureFogResolution() : canvas._fog.resolution
            return PIXI.RenderTexture.create(res);
        }

        /**
         * Gets and sets various layer wide properties
         * Some properties have different values depending on if user is a GM or player
         */

        getSetting(name) {
            let setting = canvas.scene.getFlag(this.layername, name);
            if (setting === undefined)
                setting = this.getUserSetting(name);


            if (setting === undefined)
                setting = this.DEFAULTS[name];


            return setting;
        }

        async setSetting(name, value) {
            return await canvas.scene.setFlag(this.layername, name, value);
        }
        getUserSetting(name) {
            let setting = game.user.getFlag(this.layername, name);
            if (name === "brushOpacity") {
                if (game.user.getFlag(this.layername, "brushMode"))
                    return 0x000000
                else
                    return 0xFFFFFF


            }
            if (name === "mode")
                return PIXI.BLEND_MODES.NORMAL


            if (setting === undefined)
                setting = this.DEFAULTS[name];


            return setting;
        }

        async setUserSetting(name, value) {
            return await game.user.setFlag(this.layername, name, value);
        }

        /**
         * Renders the history stack to the mask
         * @param history {Array}       A collection of history events
         * @param start {Number}        The position in the history stack to begin rendering from
         * @param stop {Number}         The position in the history stack to stop rendering
         */
        async renderStack(history = this.getHistory(), start = this.pointer, stop = this.getHistory().pointer,) { // If history is blank, do nothing
            if (history !== undefined) {
                // If history is zero, reset scene fog
                if (history.events.length === 0)
                    this.resetMask(false);


                if (start === undefined)
                    start = 0;


                if (stop === undefined)
                    stop = history.events.length;


                // If pointer preceeds the stop, reset and start from 0
                if (stop <= this.pointer) {
                    await this.resetMask(false);
                    start = 0;
                }

                fogManagerLog.log(`Rendering from: ${start} to ${stop}`);
                // Render all ops starting from pointer
                this.renderlock = true
                for (let i = start; i < stop; i += 1) {
                    for (let j = 0; j < history.events[i].length; j += 1) {
                        await this.renderBrush(history.events[i][j], false);
                    }
                }
                this.renderlock = false
                // Update local pointer
                this.pointer = stop;
            }
            this.fog_image_setup(true)

        }

        /**
         * Add buffered history stack to scene flag and clear buffer
         */
        async commitHistory() { // Do nothing if no history to be committed, otherwise get history
            if (this.historyBuffer.length === 0) return;
            if (this.lock) return;
            this.lock = true;
            let history = this.getHistory();
            // If history storage doesnt exist, create it
            if (!history) {
                history = {
                    events: [],
                    pointer: 0
                };
            }
            // If pointer is less than history length (f.x. user undo), truncate history
            history.events = history.events.slice(0, history.pointer);
            // Push the new history buffer to the scene
            history.events.push(this.historyBuffer);
            history.pointer = history.events.length;
            await this.setHistory(history);
            fogManagerLog.log(`Pushed ${
                this.historyBuffer.length
            } updates.`);
            // Clear the history buffer

            this.historyBuffer = [];
            this.lock = false;
        }

        /**
         * Resets the mask of the layer
         * @param save {Boolean} If true, also resets the layer history
         */
        async resetMask(save = true) { // Fill fog layer with solid
            await this.setFill();

            // If save, also unset history and reset pointer
            if (save) {

                await this.setHistory( {
                    events: [],
                    pointer: 0
                });
                this.pointer = 0;
            }
        }

        async blankMask(mode) {
            await this.resetMask();
            const d = canvas.dimensions
            const [x, y] = game.release.generation === 9 ? [d.paddingX, d.paddingY] : [d.sceneX, d.sceneY]
            await this.renderBrush({
                shape: this.BRUSH_TYPES.BOX,
                x: x,
                y: y,
                width: d.sceneWidth,
                height: d.sceneHeight,
                fill: mode ? 0xFFFFFF : 0x000000,
                mode: PIXI.BLEND_MODES.NORMAL

            });
            this.commitHistory();
        }

        /**
         * Steps the history buffer back X steps and redraws
         * @param steps {Integer} Number of steps to undo, default 1
         */
        async undo(steps = 1) {
            fogManagerLog.log(`Undoing ${steps} steps.`);
            // Grab existing history
            // Todo: this could probably just grab and set the pointer for a slight performance improvement
            let history = this.getHistory();

            let newpointer = this.pointer - steps;
            if (newpointer < 1 || !history) {
                history = {
                    events: [],
                    pointer: 0
                };
                await this.setHistory(history);
                await this.blankMask(false);
                return
            }

            // Set new pointer & update history
            history.pointer = newpointer;
            await this.blankMask(false);
            await this.setHistory(history);
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
        brush(data) { // Get new graphic & begin filling
            const alpha = (typeof data.alpha === "undefined") ? 1 : data.alpha;
            const visible = (typeof data.visible === "undefined") ? true : data.visible;
            const mode = (typeof data.mode === "undefined") ? PIXI.BLEND_MODES.NORMAL : data.mode;
            const brush = new PIXI.Graphics();
            brush.name = "Brush 1"
            brush.beginFill(data.fill);
            // Draw the shape depending on type of brush
            switch (data.shape) {
                case this.BRUSH_TYPES.ELLIPSE:
                    brush.drawEllipse(0, 0, data.width, data.height);
                    break;
                case this.BRUSH_TYPES.BOX:
                    brush.drawRect(0, 0, data.width, data.height);
                    break;
                case this.BRUSH_TYPES.ROUNDED_RECT:
                    brush.drawRoundedRect(0, 0, data.width, data.height, 10);
                    break;
                case this.BRUSH_TYPES.POLYGON:
                    brush.drawPolygon(data.vertices);
                    break;
                default:
                    break;
            }
            // End fill and set the basic props
            brush.endFill();
            brush.alpha = alpha;
            brush.visible = visible;
            brush.x = data.x;
            brush.y = data.y;
            brush.blendMode = mode;
            return brush;
        }

        /**
         * Gets a brush using the given parameters, renders it to mask and saves the event to history
         * @param data {Object}       A collection of brush parameters
         * @param save {Boolean}      If true, will add the operation to the history buffer
         */
        async renderBrush(data, save = true) { // TODO Remove awaits?

            if (typeof (data) == "string") {
                var brush = new PIXI.Container();
                var tex = await base64_to_sprite(data)
                let sprite = new PIXI.Sprite(tex)
                sprite.name = "Brush Sprite"
                brush.name = "Brush"
                brush.addChild(sprite)
                pixiDump(this.maskTexture, "", "Old Mask Texture")
                await canvas.app.renderer.render(brush, this.maskTexture, false, null, false);
                // TODO Merge this with composite()
                pixiDump(this.maskTexture, "", "New Mask Texture")
                if (!brush.destroyed)
                    brush.destroy();
            } else {
                await this.composite(data);
            }
            if (save)
                this.historyBuffer.push(data);


            await this.fog_image_setup(true)
        }

        /**
         * Renders the given brush to the layer mask
         * @param data {Object}       PIXI Object to be used as brush
         */
        async composite(data) {
            const alpha = (typeof data.alpha === "undefined") ? 1 : data.alpha;
            const visible = (typeof data.visible === "undefined") ? true : data.visible;
            const mode = (typeof data.mode === "undefined") ? PIXI.BLEND_MODES.NORMAL : data.mode;
            const brush = this.pending.addChild(new PIXI.Graphics())
            brush.name = "Brush 1a"
            brush.beginFill(data.fill);
            // Draw the shape depending on type of brush
            switch (data.shape) {
                case this.BRUSH_TYPES.ELLIPSE:
                    brush.drawEllipse(0, 0, data.width, data.height);
                    break;
                case this.BRUSH_TYPES.BOX:
                    brush.drawRect(0, 0, data.width, data.height);
                    break;
                case this.BRUSH_TYPES.ROUNDED_RECT:
                    brush.drawRoundedRect(0, 0, data.width, data.height, 10);
                    break;
                case this.BRUSH_TYPES.POLYGON:
                    brush.drawPolygon(data.vertices);
                    break;
                default:
                    break;
            }
            // End fill and set the basic props
            brush.endFill();
            brush.alpha = alpha;
            brush.visible = visible;
            brush.x = data.x;
            brush.y = data.y;
            brush.blendMode = mode;

            const d = canvas.dimensions
            const [x, y] = game.release.generation === 9 ? [d.paddingX, d.paddingY] : [d.sceneX, d.sceneY]
            const transform = new PIXI.Matrix(1, 0, 0, 1, -x, -y);
            await canvas.app.renderer.render(this.pending, this.maskTexture, false, transform, false);
            this.pending.removeChildren().forEach(c => c.destroy(true));
        }

        /**
         * Returns a blank PIXI Sprite of canvas dimensions
         */
        static getCanvasSprite() {
            const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.name = "Canvas Sprite"
            const d = canvas.dimensions;

            sprite.width = d.sceneWidth;
            sprite.height = d.sceneHeight;
            const [x, y] = game.release.generation === 9 ? [d.paddingX, d.paddingY] : [d.sceneX, d.sceneY]
            sprite.position.set(x, y);
            fogManagerLog.log("getSprite", d.sceneWidth, d.sceneHeight, x, y)
            sprite.zIndex = 0;
            return sprite;
        }

        /**
         * Fills the mask layer with solid white
         */
        async setFill() {
            const fill = new PIXI.Graphics();
            fill.name = "Fill"
            fill.beginFill(0xFFFFFF)

            fill.drawRect(canvas.dimensions.sceneRect);
            fill.endFill();
            await this.composite(fill);

        }


        async fog_image_setup(mode) {
            if (!hasProperty(canvas, "fogImage")) {
                return
            }
            if (this.renderlock)
                return;


            if (this.visible && mode && canvas.scene.getFlag('image-fog', "unexplored-img")) { // Since Fog Manager isn't saving to sight layer all the time, need to stealth update and reset to update fog Image
                const back = canvas.sight.fog.saved.texture
                canvas.sight.fog.saved.texture = this.maskTexture
                await canvas.fogImage._updateUnexploredMaskTexture()
                canvas.sight.fog.saved.texture = back
                // No need to show the internal fog layer, since fogImage will be there as well.
                this.visible = false
                canvas.fogImage.visible = true


            } else {

                // So that sightlayer visiblity gets reset
                // Otherwise there are cornercases where it gets stuck on.
                canvas.fogImage.sightRefresh()
            }

        }

        /**
         * Actions upon layer becoming active
         */
        activate() {
            fogManagerLog.log("Activate")
            super.activate();
            this.visible = true;
            this.interactive = true;
            this.fog_image_setup(true)
        }

        /**
         * Actions upon layer becoming inactive
         */
        deactivate() {
            fogManagerLog.log("Deactivate")
            super.deactivate();
            this.fog_image_setup(false)
            this.visible = false;
            this.interactive = false;

        }


        async receive_fog() {
            var startTime = performance.now()
            this.resetMask(true); // Clear history, since the merge data is BIG!
            const stage = new PIXI.Container();
            stage.name = "Stage"
            // Unexplored area is obscured by darkness. We need a larger rectangle so that the blur filter doesn't clip
            stage.unexplored = stage.addChild(new PIXI.Graphics());
            stage.unexplored.name = "Unexplored Texture"

            // Set default to fully covered, incase all no users return data (such as right after reset)
            // Full cover is transparent in this case, due to how the merging is done.  It's reset to black at the end of the function
            const r = canvas.dimensions.rect.clone().pad();
            stage.unexplored.beginFill(0x000000, 0).drawShape(r).endFill();


            // Basic fog image is Black for unexplored, and gray (0x7f7f7f) for explored.
            // Change the black to transparent, so we can merge the incoming fog.
            const c2a_filter = new ColorToAlphaFilter(0x000000)


            fogManagerLog.log("Start Loading")
            // Force a save of outstanding fog changes on active clients
            // TODO This needs to get wait for a response to be more effective, since it's a race condtion
            game.socket.emit("module.fogmanager", {
                action: "flush"
            }, () => {
            })


            var userModes = await game.settings.get('fogmanager', "userModes")
            for (let i = 0; i < game.users.size; i++) {
                const pct = (i+1)/game.users.size*100
                SceneNavigation.displayProgressBar({label:"Get Fog",pct:pct.toFixed(2)})
                //console.log("Get Fog", pct)
                if (!userModes[i].loadMode)
                    continue


                let user = game.users.contents[i]
                let name = user.name

                fogManagerLog.log("User", i, name)

                // Load the latest saved fog data from the server
                var fog_exploration = await CONFIG.FogExploration.documentClass.get({user: user})

                if (fog_exploration == null) { // Default state after reset
                    fogManagerLog.debug("No fogdata for " + name)
                    continue
                }


                pixiDump(stage, "green", "Staging before " + name, name)
                pixiDump(fog_exploration?.explored ?? fog_exploration.data.explored, "red", name + " Raw", name)

                // Parse base64 data, turn black to transparent, and add to the stage
                let tex = await base64_to_sprite(fog_exploration?.explored ?? fog_exploration.data.explored)
                let sprite = new PIXI.Sprite(tex)
                sprite.name = "Player Sprite"
                const player_fog = new PIXI.Container();
                player_fog.name = "PF container"
                player_fog.addChild(sprite) // .name = name + " Inbound"
                player_fog.filters = [c2a_filter]

                const d = canvas.dimensions;
                // Determine whether a downscaling factor should be used

                const scale = Math.min(d.sceneWidth / sprite.width, d.sceneHeight / sprite.height);
                player_fog.scale.set(scale, scale);
                fogManagerLog.debug("Scale", scale, d, sprite.height, sprite.width, sprite.scale)

                pixiDump(player_fog, "pink", name + " Post-filter", name)

                stage.addChild(player_fog)

                pixiDump(stage, "pink", "Staging after " + name + " merged", name)

            }

            await this.commitHistory()
            // Doesn't get saved earier for some reason TODO: Why is this here?


            // Filter the tranparent back to black
            pixiDump(stage, "green", "Final stage pre-filter", "Finalized")
            const a2c_filter = new AlphaToColorFilter(0x000000)
            stage.blendMode = PIXI.BLEND_MODES.ADD
            stage.filters = [a2c_filter]
            pixiDump(stage, "green", "Final stage", "Finalized")

            // Push to screen
            await this.renderBrush(canvas.app.renderer.extract.base64(stage))
            fogManagerLog.debug("Done receiving fog")
            var endTime = performance.now()

            this.commitHistory();

            fogManagerLog.log(`Receive_fog took ${endTime - startTime} milliseconds`)

        }

    //     async broadcast_fog_fast() { /*
    //   Update all users with the new fog.
    // */
    //         fogManagerLog.info("Broadcasting fog")
    //
    //         let fogData = Object()
    //         fogData.scene = canvas.scene.id;
    //         fogData.source = game.user.name
    //         fogData.explored = canvas.app.renderer.extract.base64(canvas.sight.fog.saved.texture)
    //
    //         game.socket.emit("module.fogmanager", {
    //             action: "auto_update",
    //             data: fogData
    //         }, () => {
    //         });
    //
    //         fogManagerLog.debug("Auto Broadcast", "All")
    //
    //     }

        async broadcast_fog() { /*
      Update all users with the new fog.
    */
            fogManagerLog.info("Broadcasting fog")


            var explored = canvas.app.renderer.extract.base64(this.maskTexture)
            pixiDump(this.maskTexture, "red", "Broadcast", "Broadcast")
            var userModes = await game.settings.get('fogmanager', "userModes")

            var fog_to_delete = []
            var fog_to_create = []
            for (let i = 0; i < game.users.size; i++) {
                const pct = (i+1)/game.users.size*100
                SceneNavigation.displayProgressBar({label:"Set Fog",pct:pct.toFixed(2)})
                if (!userModes[i].saveMode)
                    continue

                var user = game.users.contents[i]

                var exploration = await CONFIG.FogExploration.documentClass.get({user: user})
                if (exploration) {
                    fog_to_delete.push(exploration?._id ?? exploration?.data._id)
                }

                exploration = {
                    user: user.id,
                    scene: canvas_scene_data()._id,
                    explored: explored
                }
                fog_to_create.push(exploration)


            }
            // Need to delete then recreate, since update doesn't seem to clear positions, and can't seem to be hoked
            await CONFIG.FogExploration.documentClass.deleteDocuments(fog_to_delete)
            await CONFIG.FogExploration.documentClass.createDocuments(fog_to_create)
        }


        async init() {
            // Preview brush objects
            this.boxPreview = this.brush({
                shape: this.BRUSH_TYPES.BOX,
                x: 0,
                y: 0,
                fill: 0xFFFFFF,
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
                fill: 0xFFFFFF,
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
                fill: 0xFFFFFF,
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
            this.fullPreview = this.brush({
                shape: this.BRUSH_TYPES.BOX,
                x: canvas.dimensions.sceneRect.x,
                y: canvas.dimensions.sceneRect.y,
                fill: 0x7f7f7f,
                width: canvas.dimensions.sceneRect.width,
                height: canvas.dimensions.sceneRect.height,
                alpha: this.DEFAULTS.previewAlpha/2,
                visible: true,
                zIndex: 15,
            });
            if (game.release.generation === 9) {
                this.fullPreview.visible = false
            }
            // Add preview brushes to layer
            this.brushes = this.addChild(new PIXI.Container())
            this.brushes.name = "Brush Container"
            this.brushes.addChild(this.boxPreview).name = "Box Preview";
            this.brushes.addChild(this.ellipsePreview).name = "Ellipse Preview"
            this.brushes.addChild(this.polygonPreview).name = "Polygon Preview"
            this.brushes.addChild(this.polygonHandle).name = "Polygon Handle"
            this.brushes.addChild(this.fullPreview).name = "Full Preview Handle"

            this.dupes = [];

            // Set default flags if they dont exist already
            Object.keys(this.DEFAULTS).forEach((key) => {
                if (!game.user.isGM) return;
                // Check for existing scene specific setting
                if (this.getSetting(key) !== undefined) return;
                // Check for custom default
                const def = this.getUserSetting(key);
                // If user has custom default, set it for scene
                if (def !== undefined) this.setSetting(key, def);
                // Otherwise fall back to module default
                else this.setSetting(key, this.DEFAULTS[key]);
            });
        }

        /* -------------------------------------------- */
        /*  Getters and setters for layer props         */
        /* -------------------------------------------- */


        getAlpha() {
            let alpha;
            if (game.user.isGM) alpha = this.getSetting("gmAlpha");
            else alpha = this.getSetting("playerAlpha");
            if (!alpha) {
                if (game.user.isGM) alpha = this.DEFAULTS.gmAlpha;
                else alpha = this.DEFAULTS.playerAlpha;
            }
            return alpha;
        }

        // /**
        //  * Sets the scene's alpha for the primary layer.
        //  * @param alpha {Number} 0-1 opacity representation
        //  * @param skip {Boolean} Optional override to skip using animated transition
        //  */
        // async setAlpha(alpha, skip = false) {
        //     // If skip is false, do not transition and just set alpha immediately
        //     if (skip || !this.getSetting("transition")) this.layer.alpha = alpha;
        //     // Loop until transition is complete
        //     else {
        //         const start = this.layer.alpha;
        //         const dist = start - alpha;
        //         const fps = 60;
        //         const speed = this.getSetting("transitionSpeed");
        //         const frame = 1000 / fps;
        //         const rate = dist / (fps * speed / 1000);
        //         let f = fps * speed / 1000;
        //         while (f > 0) {
        //             // Delay 1 frame before updating again
        //             // eslint-disable-next-line no-await-in-loop
        //             await new Promise((resolve) => setTimeout(resolve, frame));
        //             this.layer.alpha -= rate;
        //             f -= 1;
        //         }
        //         // Reset target alpha in case loop overshot a bit
        //         this.layer.alpha = alpha;
        //     }
        // }

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
            if (hasProperty(data, `flags.${this.layername}.visible`)) {
                canvas[this.layername].visible = data.flags[this.layername].visible;
            }
            // React to composite history change
            if (hasProperty(data, `flags.${this.layername}.history`)) {
                canvas[this.layername].renderStack(data.flags[this.layername].history);
            }
            // React to autoVisibility setting changes
        }

        /**
         * Adds the mouse listeners to the layer
         */
        _registerMouseListeners() {
            this.addListener("pointerdown", this._pointerDown);
            this.addListener("pointerup", this._pointerUp);
            this.addListener("pointermove", this._pointerMove);
            this.dragging = false;
            if (game.release.generation !== 9) {
                canvas._origOnMouseMove = canvas._onMouseMove
                canvas._onMouseMove = this._BetteronMouseMove
            }
        }

        _BetteronMouseMove(event) {
            this._origOnMouseMove(event)
            canvas.fogmanager._onMouseMove(event);
        }

        _onDragLeftStart(e) {
            this._pointerDown(e)
        }

        _onDragLeftMove(e) {
            this._pointerMove(e)
        }

        _onMouseMove(e) {
            if (this.interactive) {
                this._pointerMove(e)
            }
        }

        async _onClickLeft(e) {
            await this._pointerDown(e)

            switch (this.activeTool) {
                case "brush":
                case "grid":
                    await this._pointerMove(e)
                    this._pointerUp(e)
            }
        }

        _onDragLeftDrop(e) {
            this._pointerUp(e)
        }

        /**
         * Adds the keyboard listeners to the layer
         */
        _registerKeyboardListeners() {
            $(document).keydown((event) => {
                // Only react if fogmanager layer is active
                if (ui.controls.activeControl !== this.layername) return;
                // Don't react if game body isn't target
                if (!event.target.tagName === "BODY") return;
                if (event.which === 219 && this.activeTool === "brush") {
                    const s = this.getUserSetting("brushSize");
                    this.setBrushSize(s * 0.8);
                }
                if (event.which === 221 && this.activeTool === "brush") {
                    const s = this.getUserSetting("brushSize");
                    this.setBrushSize(s * 1.25);
                }
                // React to ctrl+z
                if (event.which === 90 && event.ctrlKey) {
                    event.stopPropagation();
                    this.undo();
                }
            });
        }

        /**
         * Sets the active tool & shows preview for brush & grid tools
         */
        setActiveTool(tool) {
            let grid,gridType ;
            if (game.release.generation === 9) {
                ({grid, gridType} = canvas.scene.data)
            } else {
                gridType = canvas.scene.grid.type
                grid = canvas.scene.grid.size
            }
            this.clearActiveTool();
            this.activeTool = tool;
            this.setPreviewTint();
            if (tool === "brush") {
                this.ellipsePreview.visible = true;
                $("#fogmanager-brush-controls #brush-size-container").show();
            } else {
                $("#fogmanager-brush-controls #brush-size-container").hide();
            }
            if (tool === "grid") {
                if (gridType === 1) {
                    this.boxPreview.width = grid;
                    this.boxPreview.height = grid;
                    this.boxPreview.visible = true;
                } else if ([2, 3, 4, 5].includes(gridType)) {
                    this._initGrid();
                    this.polygonPreview.visible = true;
                }
            }
        }

        setPreviewTint() {
            const mode = this.getUserSetting("brushMode")
            let tint = mode ? 0x000000 : 0xFFFFFF
            this.ellipsePreview.tint = tint;
            this.boxPreview.tint = tint;
            this.polygonPreview.tint = tint;
        }

        /**
         * Sets the active tool & shows preview for brush & grid tools
         * @param s {Number}  Size in pixels
         */
        async setBrushSize(s) {
            await this.setUserSetting("brushSize", s);
            const p = {x: this.ellipsePreview.x, y: this.ellipsePreview.y};
            this._pointerMoveBrush(p);
        }

        /**
         * Aborts any active drawing tools
         */
        clearActiveTool() {
            // Box preview
            this.boxPreview.visible = false;
            // Ellipse Preview
            this.ellipsePreview.visible = false;
            // Shape preview
            this.polygonPreview.clear();
            this.polygonPreview.visible = false;
            this.polygonHandle.visible = false;
            this.polygon = [];

            // Clear history buffer
            this.historyBuffer = [];
        }

        /**
         * Mouse handlers for canvas layer interactions
         */
        async _pointerDown(e) {
            // Don't allow new action if history push still in progress
            if (this.historyBuffer.length > 0) return;
            // On left mouse button

            if (e.data.button === 0) {
                const p = e.data.getLocalPosition(canvas.app.stage);
                // Round positions to nearest pixel
                p.x = Math.round(p.x);
                p.y = Math.round(p.y);

                // Check active tool
                switch (this.activeTool) {
                    case "brush":
                        this._pointerDownBrush(p, e);
                        break;
                    case "grid":
                        this._pointerDownGrid(p, e);
                        break;
                    case "box":
                        this._pointerDownBox(p, e);
                        break;
                    case "ellipse":
                        this._pointerDownEllipse(p, e);
                        break;
                    case "polygon":
                        this._pointerDownPolygon(p, e);
                        break;
                    default: // Do nothing
                        break;
                }
                // Call _pointermove so single click will still draw brush if mouse does not move
                this._pointerMove(e);
            }
            // On right button, cancel action
            else if (e.data.button === 2) {
                // Todo: Not sure why this doesnt trigger when drawing ellipse & box
                if (["polygon", "box", "ellipse"].includes(this.activeTool)) {
                    this.clearActiveTool();
                }
            }
        }

        async _pointerMove(e) {
            // Get mouse position translated to canvas coords

            const drag = (e.data.buttons === 1)
            const p = e.data.getLocalPosition(canvas.app.stage);
            // Round positions to nearest pixel
            p.x = Math.round(p.x);
            p.y = Math.round(p.y);

            switch (this.activeTool) {
                case "brush":
                    await this._pointerMoveBrush(p, e, drag);
                    break;
                case "box":
                    await this._pointerMoveBox(p, e, drag);
                    break;
                case "grid":
                    await this._pointerMoveGrid(p, e, drag);
                    break;
                case "ellipse":
                    await this._pointerMoveEllipse(p, e, drag);
                    break;
                default:
                    break;
            }
        }

        async _pointerUp(e) {
            // Only react to left mouse button
            if (e.data.button === 0) {
                // Translate click to canvas position
                const p = e.data.getLocalPosition(canvas.app.stage);
                // Round positions to nearest pixel
                p.x = Math.round(p.x);
                p.y = Math.round(p.y);
                switch (this.activeTool) {
                    case "box":
                        await this._pointerUpBox(p, e);
                        break;
                    case "ellipse":
                        await this._pointerUpEllipse(p, e);
                        break;
                    default: // Do nothing
                        break;
                }

                // Push the history buffer
                this.commitHistory();
            }
        }

        /**
         * Brush Tool
         */
        _pointerDownBrush() {

        }

        async _pointerMoveBrush(p, e, drag) {
            const size = this.getUserSetting("brushSize");
            this.ellipsePreview.width = size * 2;
            this.ellipsePreview.height = size * 2;
            this.ellipsePreview.x = p.x;
            this.ellipsePreview.y = p.y;
            // If drag operation has started
            if (drag) {
                // Send brush movement events to renderbrush to be drawn and added to history stack
                await this.renderBrush({
                    shape: this.BRUSH_TYPES.ELLIPSE,
                    x: p.x,
                    y: p.y,
                    fill: this.getUserSetting("brushOpacity"),
                    mode: this.getUserSetting("mode"),

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
            // Set drag start coords
            this.dragStart.x = p.x;
            this.dragStart.y = p.y;
            // Reveal the preview shape
            this.boxPreview.visible = true;
            this.boxPreview.x = p.x;
            this.boxPreview.y = p.y;
        }

        _pointerMoveBox(p, e, drag) {
            // If drag operation has started
            if (drag) {
                // update the preview shape
                const d = this._getDragBounds(p, e);
                this.boxPreview.width = d.w;
                this.boxPreview.height = d.h;
            }
        }

        async _pointerUpBox(p, e) {
            // update the preview shape
            const d = this._getDragBounds(p, e);
            await this.renderBrush({
                shape: this.BRUSH_TYPES.BOX,
                x: this.dragStart.x,
                y: this.dragStart.y,
                width: d.w,
                height: d.h,
                fill: this.getUserSetting("brushOpacity"),
                mode: this.getUserSetting("mode"),
            });
            this.boxPreview.visible = false;
        }

        /*
         * Ellipse Tool
         */
        _pointerDownEllipse(p) {
            // Set active drag operation
            // Set drag start coords
            this.dragStart.x = p.x;
            this.dragStart.y = p.y;
            // Reveal the preview shape
            this.ellipsePreview.x = p.x;
            this.ellipsePreview.y = p.y;
            this.ellipsePreview.visible = true;
        }

        _pointerMoveEllipse(p, e, drag) {
            // If drag operation has started
            const d = this._getDragBounds(p, e);
            if (drag) {
                // Just update the preview shape
                this.ellipsePreview.width = d.w * 2;
                this.ellipsePreview.height = d.h * 2;
            }
        }

        async _pointerUpEllipse(p, e) {
            const d = this._getDragBounds(p, e);
            await this.renderBrush({
                shape: this.BRUSH_TYPES.ELLIPSE,
                x: this.dragStart.x,
                y: this.dragStart.y,
                width: Math.abs(d.w),
                height: Math.abs(d.h),
                fill: this.getUserSetting("brushOpacity"),
                mode: this.getUserSetting("mode"),
            });
            this.ellipsePreview.visible = false;
        }

        /*
         * Polygon Tool
         */
        async _pointerDownPolygon(p) {
            if (!this.polygon) this.polygon = [];
            const x = Math.floor(p.x);
            const y = Math.floor(p.y);
            // If this is not the first vertex...
            if (this.polygon.length) {
                // Check if new point is close enough to start to close the polygon
                const xo = Math.abs(this.polygon[0].x - x);
                const yo = Math.abs(this.polygon[0].y - y);
                if (xo < this.DEFAULTS.handlesize && yo < this.DEFAULTS.handlesize) {
                    const verts = hexObjsToArr(this.polygon);
                    // render the new shape to history
                    await this.renderBrush({
                        shape: this.BRUSH_TYPES.POLYGON,
                        x: 0,
                        y: 0,
                        vertices: verts,
                        fill: this.getUserSetting("brushOpacity"),
                        mode: this.getUserSetting("mode"),
                    });
                    // Reset the preview shape
                    this.polygonPreview.clear();
                    this.polygonPreview.visible = false;
                    this.polygonHandle.visible = false;
                    this.polygon = [];
                    this.commitHistory()
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
            // If intermediate vertex, add it to array and redraw the preview
            this.polygon.push({x, y});
            this.polygonPreview.clear();
            this.polygonPreview.beginFill(0xFFFFFF);
            this.polygonPreview.drawPolygon(hexObjsToArr(this.polygon));
            this.polygonPreview.endFill();
            this.polygonPreview.visible = true;
        }

        /**
         * Grid Tool
         */
        _pointerDownGrid() {
            // Set active drag operation
            this._initGrid();
        }

        async _pointerMoveGrid(p, e, drag) {
            let grid, gridType
            if (game.release.generation === 9) {
                ({grid, gridType} = canvas.scene.data)
            } else {
                gridType = canvas.scene.grid.type
                grid = canvas.scene.grid.size
            }
            // Square grid
            if (gridType === 1) {
                const gridx = Math.floor(p.x / grid);
                const gridy = Math.floor(p.y / grid);
                const x = gridx * grid;
                const y = gridy * grid;
                const coord = `${x},${y}`;
                this.boxPreview.x = x;
                this.boxPreview.y = y;
                this.boxPreview.width = grid;
                this.boxPreview.height = grid;
                if (drag) {
                    if (!this.dupes.includes(coord)) {
                        // Flag cell as drawn in dupes
                        this.dupes.push(coord);
                        await this.renderBrush({
                            shape: this.BRUSH_TYPES.BOX,
                            x,
                            y,
                            width: grid,
                            height: grid,
                            fill: this.getUserSetting("brushOpacity"),
                            mode: this.getUserSetting("mode"),
                        });
                    }
                }
            }
            // Hex Grid
            else if ([2, 3, 4, 5].includes(gridType)) {
                // Convert pixel coord to hex coord
                // Include padding since default math leave slight border due to rounding

                const topleft = canvas.grid.grid.getTopLeft(p.x,p.y)
                var w,h;
                if (game.release.generation === 9) {
                    w = canvas.grid.grid.w
                    h = canvas.grid.grid.h
                }
                else {
                    ({width: w, height: h } = canvas.grid.grid.getRect(1, 1))
                }
                const padding = 2;
                const vertexArray = canvas.grid.grid.getPolygon(topleft[0]-padding/2,topleft[1]-padding/2,w+padding,h+padding)

                // Update the preview shape
                this.polygonPreview.clear();
                this.polygonPreview.beginFill(0xFFFFFF);
                this.polygonPreview.drawPolygon(vertexArray);
                this.polygonPreview.endFill();
                // If drag operation has started
                if (drag) {
                    const coord = `${topleft[0]},${topleft[1]}`;
                    // Check if this grid cell was already drawn
                    if (!this.dupes.includes(coord)) {
                        // Get the vert coords for the hex
                        await this.renderBrush({
                            shape: this.BRUSH_TYPES.POLYGON,
                            vertices: vertexArray,
                            x: 0,
                            y: 0,
                            fill: this.getUserSetting("brushOpacity"),
                            mode: this.getUserSetting("mode"),
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
            return {w, h};
        }

        /*
         * Checks grid type, creates a dupe detection matrix & if hex grid init a layout
         */
        _initGrid() {
            this.dupes = [];
        }

        updateTransform() {
            // For v10 call the visibility transform to make imageFog work!
            super.updateTransform()
            if (game.release.generation !== 9) {
                canvas.effects.visibility.updateTransform()
            }
        }

        async tearDown(options) {
            // Cleanup to prevent stacking of PIXI items
            this.#initialized = false

            const array = [this.explored?.msk, this.explored, this.brushes, this.fogOverlay];
            array.forEach(function (item) {
                if (item && !item?.destroyed)
                    item.destroy()
            })

            await super.tearDown(options)

        }
    }

    const layers = isNewerVersion((game.version ?? game.data.version), "9.00") ? {
        fogmanager: {
            layerClass: FogManagerLayer,
            group: "interface"
        }
    } : {
        fogmanager: FogManagerLayer
    }
    CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, layers);

    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        const layers = Canvas.layers;
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
            }
        })
    }

    fogManagerLog.log("Registered Layers");

});


Hooks.once("ready", () => game.socket.on("module.fogmanager", message_handler))


// Reload the fog when it's recreated.
Hooks.on("createFogExploration", async function (document, options, userId) {
    fogManagerLog.info("UPDATE", document, options, userId)
    if (game.release.generation === 9) {
        if (document.data.user === game.userId && document.data.scene === canvas_scene_data()._id) {
            canvas.sight.loadFog()
            canvas.sight.pending.removeChildren().forEach(c => c.destroy(true));
            //canvas.sight.saved.destroy(true)
            for (let t of canvas.sight._fogTextures) t.destroy(true);
            canvas.sight._fogTextures = [];
            canvas.sight._fogUpdated = false
        }
    } else {
        if (document.user._id === game.userId && document.scene._id === canvas_scene_data()._id) {
            // const updateData = {
            //     explored: document.explored,
            //     timestamp: Date.now()
            // };
            //await canvas.fog.exploration.updateSource(updateData);
            await canvas.fog.commit()
            canvas.fog.sprite.texture.valid = false
            await canvas.fog.load()
            // canvas.effects.visibility.refresh()
            canvas.effects.visibility.initializeSources()
            undefined
            canvas.effects.visibility.refresh({forceUpdateFog: true})
            //canvas.fog.pending.removeChildren().forEach(c => c.destroy(true));

        }

    }
    // canvas.sight.commitFog()  // Make sure to clear any un-saved fog immediately, otherwise it remains until next save

})


async function message_handler(request) {
    if (request.action === "flush") { // TODO This needs an ack
        fogManagerLog.log("SocketMsg -  Flush received")
        if (game.release.generation === 9) {
            canvas.sight.commitFog()
        } else {
            canvas.fog.commit()
        }

    } else if ((request.action === "auto_update") && (request.scene === canvas_scene_data().id)) {
        fogManagerLog.log("SocketMsg - Auto Share message received", request)

        var tex = FogManagerLayer.getMaskTexture()

        const incoming = new PIXI.Sprite(await base64_to_sprite(request?.explored ?? request.data.explored))
        incoming.name = "incoming"

        // Merge incoming fog with existing fog.
        // Unsure why we can't render directly to saved
        const d = canvas.dimensions
        const [x, y] = game.release.generation === 9 ? [d.paddingX, d.paddingY] : [d.sceneX, d.sceneY]
        const transform = new PIXI.Matrix(1, 0, 0, 1, -x, -y);
        canvas.app.renderer.render(canvas.sight.fog.explored, tex, false, transform, false);
        canvas.app.renderer.render(incoming, tex, false, null, false);
        canvas.sight.fog.saved.texture = tex

        pixiDump(canvas.sight.fog.explored, "red", "explored", "auto_update")
        pixiDump(incoming, "red", "Incoming", "auto_update")
        pixiDump(tex, "red", "Final", "auto_update")
    } else {
        fogManagerLog.debug("SocketMsg - Unknown message", request)
    }

}


Hooks.on('ready', () => {
    if (!game.user.isGM) return;

    // History Cleanup - If we're not saving, make sure there is nothing saved
    // History saving is expensive in memory
    if (game.settings.get("fogmanager", "saveHistory") === false)
        game.scenes.forEach(scene => {
            scene.unsetFlag("fogmanager", "history")
        })

    // History Cleanup - Prior version didn't always cleanup the history properly, with multiple receive images stored
    // This deletes everything prior to the last receive image.

    if (game.settings.get("fogmanager", "cleanedHistory") === true) return

    function cleanupFunc(previousValue,currentValue) {
        // console.log(previousValue,currentValue)
        if (typeof(currentValue[0]) == "string") return [currentValue]

        previousValue.push(currentValue)
        return previousValue
    }

    game.scenes.forEach(scene=>{
        let history = scene.getFlag("fogmanager", "history")
        let new_history = {}

        if (!history || history.events.length === 0) return // No history so skip it.

        history.events.length = history.pointer // Truncate to latest pointer

        new_history.events = history.events.reduce(cleanupFunc,[])
        new_history.pointer = new_history.events.length

        scene.setFlag("fogmanager","history",new_history)
        fogManagerLog.info("Reducing ",scene.name," from ",JSON.stringify(history).length, "to",JSON.stringify(new_history.events).length)
        fogManagerLog.log(history.pointer,history.events.length,new_history.events.length)
        fogManagerLog.log(history,new_history)
        fogManagerLog.log('------------------------------')

    })
    console.log("Cleaned FogManager History")
    game.settings.set("fogmanager", "cleanedHistory",true)
});

