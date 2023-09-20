import BrushControls from '../classes/BrushControls.js';
import { fogManagerLog } from "../js/helpers.js";

/**
 * Add control buttons
 */
Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    controls.push({
      name: 'fogmanager',
      title: game.i18n.localize('FOGMANAGER.fogmanager'),
      icon: 'fas fa-cloud-upload-alt',
      layer: 'fogmanager',
      tools: [
        {
          name: 'merge',
          title: 'Merge from others', // game.i18n.localize('FOGMANAGER.onoff'),
          icon: 'fas fa-download',
          onClick: () => {
            canvas.fogmanager.receive_fog();
          },
          button: true,
        },
        {
          name: 'broadcast',
          title: 'Broadcast to others',// game.i18n.localize('FOGMANAGER.onoff'),
          icon: 'fas fa-upload',
          onClick: () => {
            canvas.fogmanager.broadcast_fog();
          },
          button: true,
        },
        // {
        //   name: 'autoShare',
        //   title: '*ALPHA* Automatic Fog Share',// game.i18n.localize('FOGMANAGER.onoff'),
        //   icon: 'fas fa-magic',
        //   active: game.settings.get('fogmanager', "autoShare"),
        //   onClick: toggled => {game.settings.set('fogmanager', "autoShare",toggled)},
        //   toggle: true,
        // },
        {
          name: 'userConfig',
          title: 'Show User Config',// game.i18n.localize('FOGMANAGER.onoff'),
          icon: 'fas fa-users-cog',
          active: canvas.fogmanager?.showusers,
          onClick: toggled => {canvas.fogmanager.showusers = toggled
            if (toggled)
              $("#fogmanager-brush-controls #user-mode-container").show();
            else
              $("#fogmanager-brush-controls #user-mode-container").hide();
          },
          toggle: true,
        },
        
        {
          name: 'brush',
          title: game.i18n.localize('FOGMANAGER.brushTool'),
          icon: 'fas fa-paint-brush',
        },
        {
          name: 'grid',
          title: game.i18n.localize('FOGMANAGER.gridTool'),
          icon: 'fas fa-border-none',
        },
        {
          name: 'polygon',
          title: game.i18n.localize('FOGMANAGER.polygonTool'),
          icon: 'fas fa-draw-polygon',
        },
        {
          name: 'box',
          title: game.i18n.localize('FOGMANAGER.boxTool'),
          icon: 'far fa-square',
        },
        {
          name: 'ellipse',
          title: game.i18n.localize('FOGMANAGER.ellipseTool'),
          icon: 'far fa-circle',
        },
        {
          name: 'clearfog',
          title: game.i18n.localize('FOGMANAGER.reset'),
          icon: 'fas fa-trash',
          onClick: () => {
            const dg = new Dialog({
              title: game.i18n.localize('FOGMANAGER.reset'),
              content: game.i18n.localize('FOGMANAGER.confirmReset'),
              buttons: {
                reset: {
                  icon: '<i class="fas fa-trash"></i>',
                  label: 'Full Clear',
                  callback: () => canvas.fogmanager.blankMask(true),
                },
                blank: {
                  icon: '<i class="fas fa-eye"></i>',
                  label: 'Full Cover',
                  callback: () => canvas.fogmanager.blankMask(false),
                },
                cancel: {
                  icon: '<i class="fas fa-times"></i>',
                  label: 'Cancel',
                },
              },
              default: 'reset',
            });
            dg.render(true);
          },
          button: true,
        },
      ],
      activeTool: 'brush',
    });
  }
});

/**
 * Handles adding the custom brush controls pallet
 * and switching active brush flag
 */
Hooks.on('renderSceneControls', (controls) => {
  // Switching to layer
  if (controls.activeControl === 'fogmanager') {
    if(( game.release.generation !== 9 && !(canvas?._fog.tokenVision && canvas?._fog.fogExploration))||
    ( game.release.generation === 9 && !(canvas.sight.tokenVision && canvas.sight.fogExploration))) {
      ui.notifications.warn("FOGMANAGER.visionwarn", {localize: true});  
    }

    // Open brush tools if not already open
    if (!$('#fogmanager-brush-controls').length) new BrushControls().render(true);
    // Set active tool
    if (game.release.generation === 9) {
      const tool = controls.controls.find((control) => control.name === 'fogmanager').activeTool;
    canvas.fogmanager.setActiveTool(tool);
    }
    else {
      canvas.fogmanager.setActiveTool(ui.controls.activeTool);

    }
  }
  // Switching away from layer
  else {
    // Clear active tool
    try{
      canvas.fogmanager.clearActiveTool();
    }
    catch {
      
    }
    // Remove brush tools if open
    const bc = $('#fogmanager-brush-controls');
    if (bc) bc.remove();
  }
});

/**
 * Sets Y position of the brush controls to account for scene navigation buttons
 */
function setBrushControlPos() {
  const bc = $('#fogmanager-brush-controls');
  if (bc) {
    const h = $('#navigation').height();
    bc.css({ top: `${h + 30}px` });
  }
}

// Reset position when brush controls are rendered or sceneNavigation changes
Hooks.on('renderBrushControls', setBrushControlPos);
Hooks.on('renderSceneNavigation', setBrushControlPos);
