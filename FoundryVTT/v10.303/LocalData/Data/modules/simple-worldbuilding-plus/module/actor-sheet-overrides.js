import { SimpleActorSheet } from '../../../systems/worldbuilding/module/actor-sheet.js';

export class SwpActorSheet extends SimpleActorSheet {

  // TODO: This section will require a significant refactor to account for
  // formula attributes.

  // activateListeners(html) {
  //   super.activateListeners(html);

  //   // Disable the default input behavior so that only inputs in the header
  //   // area trigger form updates and re-renders. This allows us to only trigger
  //   // re-renders on the attribute tab if the tab is changed or the form is
  //   // closed.
  //   html.off("change", "input,select,textarea");
  //   html.on("change", ".sheet-header input, .sheet-header select, .sheet-header textarea", this._onChangeInput.bind(this));

  //   // When the user changes tabs, update the actor data.
  //   html.find('.tabs a.item').on('click', event => {
  //     this._onSubmit(event);
  //   });

  //   // If the user tabs into the last column, automatically create a new
  //   // attribute row for them.
  //   $(window).keyup(async e => {
  //     var code = (e.keyCode ? e.keyCode : e.which);
  //     if (code == 9 && html.find('.attribute:last-child select:focus').length) {
  //       const attrs = this.object.data.data.attributes;
  //       const form = this.form;

  //       // Add new attribute
  //       const nk = Object.keys(attrs).length + 1;
  //       let newKey = document.createElement("div");
  //       newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
  //       newKey = newKey.children[0];
  //       form.appendChild(newKey);
  //       await this._onSubmit(event);

  //       // Reapply focus to the last element due to the re-render.
  //       setTimeout(() => {
  //         let newHtml = $(document).find(`.app[data-appid="${this.appId}"]`);
  //         newHtml.find('.attribute:nth-last-child(2) select').focus();
  //       }, 150);
  //     }
  //   });
  // }

  // /** @override */
  // _updateObject(event, formData) {

  //   // Handle the free-form attributes list
  //   const formAttrs = expandObject(formData).data.attributes || {};
  //   const attributes = Object.values(formAttrs).reduce((obj, v) => {
  //     // Fix malformed attributes.
  //     if (Array.isArray(v.key)) {
  //       v.key = v.key[0];
  //     }
  //     let k = v["key"].trim();
  //     if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
  //     delete v["key"];
  //     obj[k] = v;
  //     return obj;
  //   }, {});

  //   // Remove attributes which are no longer used
  //   for (let k of Object.keys(this.object.data.data.attributes)) {
  //     if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
  //   }

  //   // Re-combine formData
  //   formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
  //     obj[e[0]] = e[1];
  //     return obj;
  //   }, { _id: this.object._id, "data.attributes": attributes });

  //   // Update the Actor
  //   return this.object.update(formData);
  // }

}