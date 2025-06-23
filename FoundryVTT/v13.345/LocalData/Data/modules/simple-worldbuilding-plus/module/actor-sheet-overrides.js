import { SimpleActorSheet } from '../../../systems/worldbuilding/module/actor-sheet.js';

export class SwpActorSheet extends SimpleActorSheet {

  // SimpleActorSheet accomplishes most of what SwpActorSheet used to accomplish.
  // This class is mostly empty now aside from specific overrides as needed.

  /** @inheritdoc */
  constructor(...args) {
    super(...args);

    // Add a warning for the user if we have to do a replacement for legacy
    // inline roll syntax.
    this.swbp = {
      rollRegexes: {
        braces: /(\{\{)(\/[a-zA-Z]+\s)?([^\}]+)(\}\})/gi,
        brackets: /(\[\[)((?:\/[a-zA-Z]+\s)?(?:[^\]]+))(\]\])/gi,
        attr: /@([\w\d\.]+)/gi,
      }
    };
    if (this.document.system.biography.match(this.swbp.rollRegexes.braces)) {
      console.warn(`Actor ${this.document.name} with ID ${this.document.id} uses the legcay {{rollFormula}} format in its sheet description. This should be updated to use [[rollFormula]] instead.`)
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);

    // Replace the legacy {{rollFormula}} syntax with core's [[rollFormula]].
    const bioReplaceBraces = context.systemData.biography.replace(this.swbp.rollRegexes.braces, (match, p1, p2, p3, p4) => {
      return `[[${p2 ?? ''}${p3 ?? ''}]]`;
    });

    // Enrich the bio HTML and include actor roll data.
    context.biographyHTML = await this.customEnrichHTML(bioReplaceBraces, {
      secrets: this.document.isOwner,
      async: true,
      rollData: this.document.getRollData(),
    });
    return context;
  }

  /* -------------------------------------------- */
  
  /**
   * Replace labels and then enrich rolls.
   * 
   * Custom handler that will replace attribute labels/strings and then
   * run TextEditor.enrichHTML() on the results. This is primarily used
   * to allow users to add content like `[[@attr1.label]]` to their
   * character descriptions so that labels can be shown dynamically.
   * 
   * @param {string} content Content string to run the enrichment on.
   * @param {object} options TextEditor enrichment options.
   * @returns {Promise}
   */
  async customEnrichHTML(content, options = {}) {
    let newContent = content;
    // If we have any custom labels, we need to parse for them.
    if (options?.rollData?.labels) {
      const labelProps = Object.keys(options.rollData.labels);

      // --- START newContent.replace() --------------------
      // Run a regex against [[@inlineRolls]].
      newContent = newContent.replace(this.swbp.rollRegexes.brackets, (match, leftBrackets, interior, rightBrackets) => {
        // Keep track of whether or not a label was replaced in this match.
        let labelReplaced = false;

        // --- START interior.replace() --------------------
        // Run a regex against @attributes within a given inline roll.
        let result = interior.replace(this.swbp.rollRegexes.attr, (match, attr) => {
          // If this match was in the label props defined earlier, replace it.
          if (labelProps.includes(attr)) {
            labelReplaced = true;
            return `<a class="inline-roll-plus inline-result-plus">${options.rollData.labels[attr]}</a>`;
          }
          // If there was a label replacement, also run value replacements on the rest of the formula.
          if (labelReplaced) {
            const attrValue = foundry.utils.getProperty(options.rollData, attr);
            return attrValue ? `<a class="inline-roll-plus inline-result-plus">${attrValue}</a>` : match;
          }
          // Otherwise, return it as is for processing by TextEditor.enrichHTML().
          // Note: this is technically ignored since we use 'interior' instead in
          // this scenario.
          return match;
        });
        // -- END interior.replace() ----------------------

        // If a label was replaced in the match, return it without the brackets.
        // Otherwise, return it unmodified with the brackets for processing by TextEditor.enrichHTML().
        return labelReplaced ? result : `${leftBrackets}${interior}${rightBrackets}`;
      });
      // --- END newContent.replace() ----------------------

    }

    return await TextEditor.enrichHTML(newContent, options);
  }

  /* -------------------------------------------- */

  /**
   * Override the item roll method.
   *
   * This override hotfixes a bug in the SWB system where actor attributes
   * referenced in an item formula cause fatal errors.
   *
   * @see https://github.com/foundryvtt/worldbuilding/issues/63
   *
   * @param {MouseEvent} event    The originating left click event
   */
  _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    // Build our combined roll data using the actor roll data and
    // the specific item's roll data.
    const actorRollData = this.actor.getRollData();
    const rollData = Object.assign(
      actorRollData,
      actorRollData.items[item.name.slugify({strict: true})],
    );
    // Construct our roll formula and handle nested replacements.
    const rollFormula = Roll.replaceFormulaData(button.data('roll'), rollData);
    // Make the roll.
    let r = new Roll(rollFormula, rollData);
    return r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`
    });
  }

}