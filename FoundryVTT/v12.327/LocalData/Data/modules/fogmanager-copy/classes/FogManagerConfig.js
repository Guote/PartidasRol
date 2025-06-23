
export default class FogManagerConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      width: 500,
      template: 'modules/fogmanager/templates/scene-config.html',
      id: 'fogmanager-scene-config',
      title: game.i18n.localize('FogManager Options'),
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

      await canvas.fogmanager.setSetting(key, val);
      // If saveDefaults button clicked, also save to user's defaults
      if (event.submitter?.name === 'saveDefaults') {
        canvas.fogmanager.setUserSetting(key, val);
      }
    });

    // If save button was clicked, close app
    if (event.submitter?.name === 'submit') {
      Object.values(ui.windows).forEach((val) => {
        if (val.id === 'fogmanager-scene-config') val.close();
      });
    }

  }
}
