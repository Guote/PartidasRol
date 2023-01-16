import { fogManagerLog } from "../js/helpers.js";

export default class BrushControls extends FormApplication {
  static get defaultOptions() {
    $("#fogmanager-brush-controls #user-mode-container").hide(); // Likely a poor spot for this.
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: false,
      editable: game.user.isGM,
      template: 'modules/fogmanager/templates/brush-controls.html',
      id: 'filter-config',
      title: game.i18n.localize('FogManager Options'),
      save_mode: game.users.contents.map(x=>true)
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  getData() {
    // Return data to the template


    var userModes = game.settings.get('fogmanager', "userModes")  // TODO HANDLE UNSET CASE
  
    if (userModes == null || userModes.length != game.users.size){
      userModes = []
      for (var i = 0;i<game.users.size;i++){
        userModes.push({loadMode:true,saveMode:true})
      }
      game.settings.set('fogmanager', "userModes", userModes)
    }
    // Always set name, incase the user is remamed.
    for (var i = 0;i<game.users.size;i++){
      userModes[i].name = game.users.contents[i].name
    }
    fogManagerLog.debug(userModes)
    return {
      brushSize: canvas.fogmanager.getUserSetting('brushSize'),
      brushMode: canvas.fogmanager.getUserSetting("brushMode"),
      userModes: userModes
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {
    canvas.fogmanager.setUserSetting('brushSize', formData.brushSize);
    await canvas.fogmanager.setUserSetting('brushMode', formData.brushMode);
    canvas.fogmanager.setPreviewTint();

    var userModes = game.settings.get('fogmanager', "userModes")
    fogManagerLog.debug(formData)
    for (var i = 0;i<game.users.size;i++){
      userModes[i]["loadMode"] = formData[game.users.contents[i].name+'-loadModes']
      userModes[i]["saveMode"] = formData[game.users.contents[i].name+'-saveModes']
    }
    fogManagerLog.debug(event, userModes)
    game.settings.set('fogmanager', "userModes", userModes)

  }
}
