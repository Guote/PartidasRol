import { log } from "./module/helpers.js";
import { MODULE_ID, MyFlags, MySettings } from "./module/constants.js";
import { renderSceneConfig } from "./module/hooks/renderSceneConfig.js";
import { FogImageLayer } from "./module/classes/FogImageLayer.js";
import { libWrapper } from "./module/libWrapperShim.js";
import { registerSettings } from "./module/settings.js";
/* Create the FogImageLayer once on the canvas on load */
//@ts-ignore
let theLayers = Canvas.layers;
theLayers.fogImage = FogImageLayer;
//@ts-ignore
Object.defineProperty(Canvas, 'layers', {
    get: function () {
        return theLayers;
    },
});
/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    log(true, `Initializing ${MODULE_ID}`);
    await registerSettings();
    // Debugging Use.
    CONFIG[MODULE_ID] = { debug: false };
    // CONFIG.debug.hooks = true;
    // @ts-ignore
    // CONFIG.debug.fog = true;
    libWrapper.register(MODULE_ID, 'SightLayer.prototype.updateFog', function (updateFog, ...args) {
        var _a;
        const performanceMode = game.settings.get(MODULE_ID, MySettings.performanceMode);
        if (performanceMode && ((_a = canvas === null || canvas === void 0 ? void 0 : canvas.fogImage) === null || _a === void 0 ? void 0 : _a.unexploredFogTexture)) {
            log(false, 'SightLayer.updateFog called, ImageFog is updating the mask', Object.assign({}, args));
            canvas.fogImage.maskRefresh();
        }
        updateFog(args);
    }, 'WRAPPER');
});
/* Inject our scene config settings */
Hooks.on('renderSceneConfig', renderSceneConfig);
/* Recreate the Unexplored Mask Texture on every canvas Init */
Hooks.on('canvasInit', () => canvas.fogImage.createUnexploredMaskTexture());
/* Update the right things when sight refreshes */
Hooks.on('sightRefresh', () => {
    const performanceMode = game.settings.get(MODULE_ID, MySettings.performanceMode);
    if (!performanceMode) {
        log(false, 'sightRefresh hook called, updating ImageFog mask');
        canvas.fogImage.maskRefresh();
    }
});
/* Init on Canvas Ready */
Hooks.on('canvasReady', () => {
    const unexploredImgPath = canvas.scene.getFlag(MODULE_ID, MyFlags.UnexploredImg);
    if (!!unexploredImgPath) {
        canvas.fogImage.init();
    }
});
/* If the updateScene is for the current scene and involved our flags changing, redraw canvas */
Hooks.on('updateScene', (scene, diff, { diff: isDiff }) => {
    var _a;
    if (scene.isView && isDiff && !!((_a = diff === null || diff === void 0 ? void 0 : diff.flags) === null || _a === void 0 ? void 0 : _a[MODULE_ID])) {
        log(false, 'update the scene we are viewing with a new unexploredFogImage');
        canvas.draw();
    }
});
