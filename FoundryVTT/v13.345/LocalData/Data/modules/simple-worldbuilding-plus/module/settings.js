export class SimpleWorldbuildingPlusDerivedMenu extends FormApplication {
  /** @override */
	static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("simpleWorldbuildingPlus.settings.derived.name"),
      id: "simple-worldbuilding-plus-derived",
      classes: ["simple-worldbuilding-plus", "simple-worldbuilding-plus-derived"],
      template: "modules/simple-worldbuilding-plus/templates/settings-derived.html",
      width: 720,
      height: 800,
      resizable: true,
      closeOnSubmit: true
    })
  }

  getData() {
    return game.settings.get('simple-worldbuilding-plus', 'derived');
  }

  _updateObject(event, formData) {
    const data = expandObject(formData);
    game.settings.set('simple-worldbuilding-plus', 'derived', data);
    window.location.reload();
  }
}