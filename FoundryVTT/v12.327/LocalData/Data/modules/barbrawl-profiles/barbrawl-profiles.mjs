const CONSTANTS = {
  MODULE_ID: "barbrawl-profiles",
  SETTINGS: {
    PROFILES: "profiles",
    PROFILES_MENU: "barbrawlProfilesMenu",
    PROFILES_TOKEN_MOLD: "barbrawlProfilesTokenMold",
    DEFAULT_PROFILE_BOOLEAN: "defaultProfileBoolean",
    DEFAULT_PROFILE_VALUE: "defaultProfileValue",
    ASK_PROFILE: "askProfile"
  },
  BAR_VISIBILITY: {
    INHERIT: -1,
    NONE: 0,
    ALWAYS: 50,
    HOVER_CONTROL: 35,
    HOVER: 30,
    CONTROL: 10,
  },
};
Object.freeze(CONSTANTS);

function registerSettings() {
  const { apps, data } = game.modules.get(CONSTANTS.MODULE_ID);

  game.settings.register(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES, {
    names: "Profies Storage",
    scope: "world",
    config: false,
    type: data.ProfilesSetting,
    requiresReload: false,
    default: {
      profiles: [],
    },
  });

  game.settings.registerMenu(
    CONSTANTS.MODULE_ID,
    CONSTANTS.SETTINGS.PROFILES_MENU,
    {
      name: "Barbrawl Profiles Manager",
      label: "Barbrawl Profile Manager",
      hint: "Manage Barbrawl profiles",
      icon: "fas fa-bars",
      type: apps.BarbrawlProfileConfig,
      restricted: true,
    }
  );

  if (game.modules.get("token-mold")) {
    game.settings.register(
      CONSTANTS.MODULE_ID,
      CONSTANTS.SETTINGS.PROFILES_TOKEN_MOLD,
      {
        names: "Profies Token Mold Storage",
        scope: "world",
        config: false,
        type: data.TokenMoldSetting,
        requiresReload: false,
        default: {
          profile: "",
          overwrite: false,
        },
      }
    );
  }

  game.settings.register(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.ASK_PROFILE, {
    name: "Ask for Profile on Actor Creation",
    hint: "When enabled, a dialog will appear each time an Actor is created, allowing you to choose which profile to apply.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.DEFAULT_PROFILE_BOOLEAN, {
    name: "Default Actor Profile",
    hint: "When enabled, new actors will use the specified default profile without showing the creation dialog.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.DEFAULT_PROFILE_VALUE, {
    name: "Default Actor Profile ID",
    hint: "Defines the default profile to be assigned when creating new actors. Only applies if the 'Default Actor Profile' setting is enabled.",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      blank: true,
      choices: (game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES)?.profiles ?? []).reduce((acc, v) => {
        acc[v.id] = v.name;
        return acc;
      }, {})
    }),
    requiresReload: false,
    default: "",
  });

}

/**
 * Generates a unique bar ID for a new resource bar.
 * - If no bars exist, it starts with `"bar1"`.
 * - If `"bar1"` to `"bar9"` are occupied, it generates `"bar[randomID()]"`.
 *
 * @param {string[]} barsIds - An array of existing bar IDs.
 * @returns {Object} - The default bar configuration.
 */
const getDefaultBarData = (barsIds) => {
  let id = null;

  // Try to find an available bar ID from "bar1" to "bar9"
  for (let i = 1; i <= 9; i++) {
    const barId = `bar${i}`;
    if (!barsIds.includes(barId)) {
      id = barId;
      break;
    }
  }

  // If all "bar1" to "bar9" are taken, generate a random ID
  if (!id) {
    id = `bar${foundry.utils.randomID()}`;
  }

  const defaultConfig = {
    id,
    order: id === "bar2" ? 1 : 0,
    attribute: "custom",
    mincolor: { bar1: "#FF0000", bar2: "#000080" }[id] || "#000000",
    maxcolor: { bar1: "#80FF00", bar2: "#80B3FF" }[id] || "#FFFFFF",
    position: id === "bar2" ? "top-inner" : "bottom-inner",
    value: 10,
    max: 10,
    gmVisibility: CONSTANTS.BAR_VISIBILITY.INHERIT,
    ownerVisibility: CONSTANTS.BAR_VISIBILITY.ALWAYS,
    otherVisibility: CONSTANTS.BAR_VISIBILITY.NONE,
  };

  return defaultConfig;
};

/**
 * Creates the first two bars with specific configurations.
 * @returns {Object} - An object containing the configurations for "bar1" and "bar2".
 */
function createFirstTwoBars() {
  const bar1 = {
    id: "bar1",
    order: 0,
    attribute: "custom",
    mincolor: "#FF0000",
    maxcolor: "#80FF00",
    position: "bottom-inner",
    value: 10,
    max: 10,
    gmVisibility: CONSTANTS.BAR_VISIBILITY.INHERIT,
    ownerVisibility: CONSTANTS.BAR_VISIBILITY.ALWAYS,
    otherVisibility: CONSTANTS.BAR_VISIBILITY.NONE,
  };

  const bar2 = {
    id: "bar2",
    order: 1,
    attribute: "custom",
    mincolor: "#000080",
    maxcolor: "#80B3FF",
    position: "top-inner",
    value: 10,
    max: 10,
    gmVisibility: CONSTANTS.BAR_VISIBILITY.INHERIT,
    ownerVisibility: CONSTANTS.BAR_VISIBILITY.ALWAYS,
    otherVisibility: CONSTANTS.BAR_VISIBILITY.NONE,
  };

  return { bar1, bar2 };
}

/**
 * Generates a new unique profile name based on existing profiles.
 *
 * @param {Array<{ name: string }>} profiles - List of profiles.
 * @returns {String} - A unique profile name.
 */
function generateNewProfileName(profiles) {
  const baseName = "New Profile";
  if (!profiles.length) return baseName;

  const existingNames = new Set(profiles.map((p) => p.name));
  let number = 1;

  while (existingNames.has(`${baseName} (${number})`)) number++;

  return number === 1 ? baseName : `${baseName} (${number})`;
}

const UTILS = {
  getDefaultBarData,
  createFirstTwoBars,
  generateNewProfileName,
};

/**
 * Imports a profile from the world-setting to the token.
 * @param {TokenDocument} tokenDoc - The Token document instance.
 * @returns {TokenDocument|null} - The updated TokenDocument instance or null.
 */
async function importProfile(tokenDoc) {
  const profiles =
    game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES)
      ?.profiles ?? [];

  const profileChoices = profiles.reduce(
    (acc, { id, name }) => ({ ...acc, [id]: name }),
    {}
  );

  const profileId = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Import Profile", icon: "fas fa-square-user" },
    position: { width: 300 },
    content: new foundry.data.fields.StringField({
      choices: profileChoices,
      label: "Profiles",
      hint: `Select profile to import from settings to the Token ${tokenDoc.name}`,
    }).toFormGroup({}, { name: "profileId" }).outerHTML,
    ok: {
      label: "Load Profile",
      icon: "fa-solid fa-file-import",
      callback: (_, button) => button.form.elements.profileId.value,
    },
    rejectClose: false,
  });

  if (!profileId) return null;

  const barData = profiles.find((p) => p.id === profileId)?.barData;
  if (barData) {
    await tokenDoc.update(
      { "flags.barbrawl.resourceBars": barData },
      { diff: false, recursive: false }
    );  
  }
}

/**
 * Export the bardata from a token to the world-setting
 * @param {TokenDocument} tokenDoc - The Token document instance
 * @returns {Object} - The assigned setting value
 */
async function exportProfile(tokenDoc) {
  const { StringField } = foundry.data.fields;

  const profiles =
    game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES)
      ?.profiles ?? [];

  const nameField = new StringField(
    {
      label: "Profile Name",
      hint: `Write the name for the new profile ${tokenDoc.name}`,
      initial: UTILS.generateNewProfileName(profiles),
    },
    { name: "nameProfile" }
  ).toFormGroup().outerHTML;

  const nameProfile = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Export Profile", icon: "fas fa-square-user" },
    position: {
      width: 300,
    },
    content: `${nameField}`,
    ok: {
      label: "Save Profile",
      icon: "fa-solid fa-file-export",
      callback: (_, button) => button.form.elements.nameProfile.value,
    },
    rejectClose: false,
  });

  if (!nameProfile) return;

  const barData = tokenDoc.getFlag("barbrawl", "resourceBars") ?? {};

  profiles.push({
    name: nameProfile,
    id: foundry.utils.randomID(16),
    barData,
  });

  return await game.settings.set(
    CONSTANTS.MODULE_ID,
    CONSTANTS.SETTINGS.PROFILES,
    { profiles }
  );
}
/**
 * Appends a context menu item for saving or loading profiles when the `#context-menu` element is attached.
 * @param {Event} event - The event triggering the function.
 * @param {string} type - The action type, either 'save' or 'load'.
 * @param {TokenDocument} tokenDoc - The Token document instance.
 */
async function appendContextItem(event, type, tokenDoc) {
  const actions = {
    save: { name: "Save Profile", icon: "fa-file-export" },
    load: { name: "Load Profile", icon: "fa-file-import" },
  };

  const { name, icon } = actions[type];
  const targetElement = event.target;
  const existingMenu = targetElement.querySelector("#context-menu");

  const createMenuItem = (menu) => {
    if (!menu.querySelector(".context-item.barbrawl-profiles")) {
      const listItem = document.createElement("li");
      listItem.className = "context-item barbrawl-profiles";
      listItem.innerHTML = `<i class="fa-solid ${icon}"></i> ${name}`;
      listItem.addEventListener("click", () =>
        type === "load" ? importProfile(tokenDoc) : exportProfile(tokenDoc)
      );
      menu.querySelector("ol.context-items")?.appendChild(listItem);
    }
  };

  if (existingMenu) return createMenuItem(existingMenu);

  let timeoutId = setTimeout(() => observer.disconnect(), 3000);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.id === "context-menu") {
          createMenuItem(node);
          clearTimeout(timeoutId);
          observer.disconnect();
        }
      });
    }
  });

  observer.observe(targetElement, { childList: true });
}

/**
 * A hook event function that fires when a TokenConfig is rendered.
 * @param {Application} app - The TokenConfig application instance.
 * @param {jQuery} $html - The jQuery object containing the rendered HTML.
 */
function onRenderTokenConfig(app, [html]) {
  const resourcesTab = html.querySelector(
    ".app.token-sheet div[data-tab='resources']"
  );
  if (!resourcesTab) return;

  const buttonMap = {
    ".brawlbar-save": "save",
    ".brawlbar-load": "load",
  };

  resourcesTab.addEventListener("click", (event) => {
    const clickedButton = Object.keys(buttonMap).find((selector) =>
      event.target.closest(selector)
    );
    if (clickedButton)
      appendContextItem(event, buttonMap[clickedButton], app.document);
  });
}

/**
 * Enhances the Token Mold configuration form by adding profile selection and overwrite options.
 *
 * @param {Application} app - The Application instance being rendered.
 * @param {JQuery<HTMLElement>} $html - A jQuery-wrapped element representing the form’s HTML.
 */
function onRenderTokenMoldForm(app, $html) {
  const settingValues = game.settings.get(
    CONSTANTS.MODULE_ID,
    CONSTANTS.SETTINGS.PROFILES_TOKEN_MOLD
  );
  if (!app.barbrawlProfiles) app.barbrawlProfiles = settingValues?._source;

  const tab = $html[0]?.querySelector("div[data-tab='config']");
  if (!tab) return;

  const profiles =
    game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES)
      ?.profiles ?? [];

  const { StringField, BooleanField } = foundry.data.fields;

  const selectProfileInput = new StringField({
    choices: Object.fromEntries(profiles.map(({ id, name }) => [id, name])),
    label: "Profiles",
    hint: "Select profile to use when a new token is created.",
  }).toFormGroup(
    { classes: ["barbrawl-profile-select"] },
    { value: app.barbrawlProfiles.profile }
  );

  const overwriteBarData = new BooleanField({
    label: "Overwrite Profile",
    hint: "Overwrite Barbrawl bar data with the profile's data.",
  }).toFormGroup(
    { classes: ["barbrawl-profile-checkbox"] },
    {
      value: app.barbrawlProfiles.overwrite,
    }
  );

  overwriteBarData
    .querySelector("input")
    ?.addEventListener("change", (event) => {
      const checkbox = event.target;
      app.barbrawlProfiles.overwrite = checkbox.checked;
      app.render();
    });

  selectProfileInput
    .querySelector("select")
    ?.addEventListener("change", (event) => {
      const select = event.target;
      app.barbrawlProfiles.profile = select.value;
      app.render();
    });

  tab.prepend(overwriteBarData, selectProfileInput);

  if (app.barbrawlProfiles.profile && app.barbrawlProfiles.overwrite) {
    [
      "[name='config.displayBars.use']",
      "[name='config.displayBars.value']",
      "[name='config.bar1.use']",
      "[name='config.bar1.attribute']",
      "[name='config.bar2.attribute']",
      "[name='config.bar2.use']",
    ].forEach((selector) => {
      const element = tab.querySelector(selector);
      if (element) element.disabled = true;
    });
  }
}

/**
 * 
 * @param {Application} app - The Application instance being closed.
 * @returns 
 */
function onCloseTokenMoldForm(app) {
  if (!app.barbrawlProfiles) return;
    game.settings.set(
      CONSTANTS.MODULE_ID,
      CONSTANTS.SETTINGS.PROFILES_TOKEN_MOLD,
      app.barbrawlProfiles
    );

}

async function onCreateActor(actor, options) {
  if (options.pack) return;

  const settings = game.settings;
  const { MODULE_ID, SETTINGS } = CONSTANTS;

  const profiles = settings.get(MODULE_ID, SETTINGS.PROFILES)?.profiles ?? [];
  const useDefault = settings.get(MODULE_ID, SETTINGS.DEFAULT_PROFILE_BOOLEAN);
  const defaultId = settings.get(MODULE_ID, SETTINGS.DEFAULT_PROFILE_VALUE) ?? false;
  const askProfile = settings.get(MODULE_ID, SETTINGS.ASK_PROFILE);

  let profileId = useDefault ? defaultId : false;

  if (!profileId && askProfile) {
    const choices = Object.fromEntries(profiles.map(p => [p.id, p.name]));

    profileId = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Import Profile to Actor", icon: "fas fa-square-user" },
      position: { width: 300 },
      content: new foundry.data.fields.StringField({
        choices,
        label: "Profiles",
        hint: `Select profile to import from settings to the Actor ${actor.name}`,
      }).toFormGroup({}, { name: "profileId" }).outerHTML,
      ok: {
        label: "Load Profile",
        icon: "fa-solid fa-file-import",
        callback: (_, button) => button.form.elements.profileId.value,
      },
      modal: true,
      rejectClose: false,
    });
  }

  if (!profileId) return null;

  const barData = profiles.find(p => p.id === profileId)?.barData;
  if (barData) {
    await actor.update(
      { "prototypeToken.flags.barbrawl.resourceBars": barData },
      { diff: false }
    );
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, ApplicationV2: ApplicationV2$1 } = foundry.applications.api;

/**
 * The Barbrawl Profiles configuration application.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @alias BarbrawlProfileConfig
 */
class BarbrawlProfileConfig extends HandlebarsApplicationMixin$1(
  ApplicationV2$1
) {
  constructor(options) {
    super(options);
    this.profiles =
      game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES)?.profiles ?? [];
  }

  _openDialogs = new Collection();

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: {
      icon: "fas fa-square-user",
      title: "Bar-Brawl Profiles",
      contentClasses: ["barbrawl-profile-config"],
      resizable: true,
      controls: [
        {
          icon: "fa-solid fa-file-export",
          label: "Export JSON",
          action: "exportJson",
          visible: true,
        },
        {
          icon: "fa-solid fa-file-import",
          label: "Import JSON",
          action: "importJson",
          visible: true,
        },
      ],
    },
    form: {
      handler: BarbrawlProfileConfig.#formHandler,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    position: { width: 400, height: "auto" },
    actions: {
      createProfile: BarbrawlProfileConfig._createProfile,
      editProfile: BarbrawlProfileConfig._editProfile,
      importJson: BarbrawlProfileConfig._importJson,
      exportJson: BarbrawlProfileConfig._exportJson,
      deleteProfile: BarbrawlProfileConfig._deleteProfile,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: `modules/${CONSTANTS.MODULE_ID}/templates/barbrawl-profile-config/form.hbs`,
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /** @override */
  async _prepareContext(options = {}) {
    return {
      profiles: this.profiles,
      buttons: [
        {
          type: "submit",
          icon: "fa-solid fa-save",
          label: "PERMISSION.Submit",
        },
      ],
    };
  }

  /**
   * Handle submission
   * @this {BarbrawlProfileConfig} - The handler is called with the application as its bound scope
   * @param {SubmitEvent} event - The originating form submission event
   * @param {HTMLFormElement} form - The form element that was submitted
   * @param {FormDataExtended} formData - Processed data for the submitted form
   */
  static async #formHandler(event, form, formData) {
    await game.settings.set(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES, {
      profiles: this.profiles,
    });

    return this.close({ submitted: true });
  }

  /** @inheritDoc */
  async close(options = {}) {
    if (!options.submitted) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        content:
          "Are you sure you want to close? Unsaved changes will be lost.",
        rejectClose: false,
        modal: true,
      });

      if (!proceed) return;
    }

    return super.close(options);
  }

  /** @inheritDoc */
  _onClose(options = {}) {
    if (this._openDialogs.size) {
      this._openDialogs.forEach((dialog) => {
        dialog.close();
      });
    }
    super._onClose(options);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Imports profile data from a JSON file. Allows the user to choose whether to overwrite existing data or merge it.
   *
   * @param {PointerEvent} event - The click event that triggered the import.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static async _importJson(event, target) {
    const { DialogV2 } = foundry.applications.api;
    const { BooleanField } = foundry.data.fields;

    const overwriteField = new BooleanField(
      {
        initial: false,
        label: "Overwrite Existing Data",
        hint: "If enabled, the imported JSON data will replace all existing data. If disabled, the imported data will be merged with the current data.",
      },
      { name: "overwriteData" }
    ).toFormGroup().outerHTML;

    const action = await DialogV2.wait({
      window: { title: "Import Profile Data" },
      content: `<div class="form-group">
            <label for="data">${game.i18n.localize(
              "DOCUMENT.ImportSource"
            )}</label>
            <input type="file" name="data" accept=".json"/>
        </div> ${overwriteField}`,
      position: { width: 450 },
      modal: true,
      buttons: [
        {
          action: "import",
          default: false,
          label: "Import",
          icon: "fa-solid fa-file-import",
          callback: (_, button) => ({
            data: button.form.data.files,
            overwriteData: button.form.overwriteData.checked,
          }),
        },
        {
          action: "cancel",
          default: true,
          label: "Cancel",
          icon: "fas fa-times",
        },
      ],
      rejectClose: false,
    });

    if (!action || action === "cancel") return;

    const { data, overwriteData } = action;
    if (!data.length)
      return ui.notifications.error("You did not upload a data file!");

    const importedProfiles = JSON.parse(
      await readTextFromFile(data[0])
    ).profiles;

    let profiles = overwriteData
      ? [...importedProfiles]
      : [...this.profiles, ...importedProfiles];

    const existingIds = new Set();
    profiles = profiles.map((profile) => {
      const isValidId =
        profile.id && typeof profile.id === "string" && profile.id.length >= 16;

      if (!isValidId || existingIds.has(profile.id)) {
        profile.id = foundry.utils.randomID();
      }

      existingIds.add(profile.id);
      return profile;
    });
    this.profiles = profiles;
    await game.settings.set(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES, { profiles });
    this.render();
  }

  /**
   * Exports the current profile data as a JSON file.
   * If the stored profiles differ from the current ones, prompts the user for confirmation before overwriting.
   *
   * @param {PointerEvent} event - The click event that triggered the export.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static async _exportJson(event, target) {
    event.preventDefault();

    const settingData = game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES);
    const filename = `barbrawl-profiles-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}`;

    if (!foundry.utils.objectsEqual(settingData.profiles, this.profiles)) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        content:
          "The current profiles differ from the saved ones. Do you want to overwrite the settings?",
        rejectClose: false,
        modal: true,
      });

      if (!proceed) return;

      await game.settings.set(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES, {
        profiles: this.profiles,
      });
    }

    saveDataToFile(
      JSON.stringify({ profiles: this.profiles }, null, 2),
      "text/json",
      `${filename}.json`
    );
  }

  /**
   * Creates a new profile with a generated name and default bar data, then updates the UI.
   *
   * @param {PointerEvent} event - The click event that triggered the profile creation.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static _createProfile(event, target) {
    event.preventDefault();

    const name = UTILS.generateNewProfileName(this.profiles);

    this.profiles.push({
      name,
      id: foundry.utils.randomID(16),
      barData: UTILS.createFirstTwoBars(),
    });

    this.render();
  }

  /**
   * Opens a dialog to edit an existing profile. Updates the profile data upon submission.
   *
   * @param {PointerEvent} event - The click event that triggered the profile edit.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static async _editProfile(event, target) {
    event.preventDefault();
    const profileId = target.closest(".profile")?.dataset?.id;
    const profileIndex = this.profiles.findIndex((p) => p.id === profileId);

    if (profileIndex === -1) return;

    const profile = this.profiles[profileIndex];

    const { BarbrawlProfileDialog } = game.modules.get(
      CONSTANTS.MODULE_ID
    ).apps;
    const dialog = new BarbrawlProfileDialog({
      profile,
      callbackClose: () => {
        this._openDialogs.delete(dialog.id);
      },
      callbackSubmit: (profileData) => {
        foundry.utils.mergeObject(profileData, profile, {
          overwrite: false,
        });
        this.profiles[profileIndex] = profileData;
        this.render();
      },
    });

    this._openDialogs.set(dialog.id, dialog);
    dialog.render(true);
  }

  /**
   * Deletes a profile after confirming with the user.
   *
   * @param {PointerEvent} event - The click event that triggered the profile deletion.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static async _deleteProfile(event, target) {
    event.preventDefault();

    const profileId = target.closest(".profile")?.dataset?.id;
    if (!profileId) return;

    const proceed = await foundry.applications.api.DialogV2.confirm({
      content: "Are you sure you want to delete this profile?",
      rejectClose: false,
      modal: true,
    });

    if (!proceed) return;

    this.profiles = this.profiles.filter((p) => p.id !== profileId);
    this.render();
  }
}

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * The Barbrawl Profile dialog application.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @alias BarbrawlProfileDialog
 */
class BarbrawlProfileDialog extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor(options) {
    super(options);
    this.profile = options.profile;
    this.callbackClose = options.callbackClose;
    this.callbackSubmit = options.callbackSubmit;
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: {
      icon: "fas fa-square-user",
      title: "Bar-Brawl Profile Dialog",
      contentClasses: ["barbrawl-profile-dialog"],
      resizable: true,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
      handler: BarbrawlProfileDialog.#formHandler,
    },
    position: { width: 480, height: "auto" },
    actions: {
      addResource: BarbrawlProfileDialog._addResource,
      deleteResource: BarbrawlProfileDialog._deleteResource,
    },
  };

  /** @inheritDoc */
  _onRender(context, options) {
    this.element.querySelectorAll(".input-attribute").forEach((input) => {
      input.addEventListener("change", (ev) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();

        const groupValue = ev.currentTarget
          .closest(".indent-details")
          ?.querySelector(".group-value");

        if (!groupValue) return;

        groupValue.style.display =
          ev.currentTarget.value === "custom" ? "" : "none";
      });
    });
  }

  /** @override */
  static PARTS = {
    header: {
      template: `modules/${CONSTANTS.MODULE_ID}/templates/barbrawl-profile-dialog/header.hbs`,
    },
    form: {
      template: `modules/${CONSTANTS.MODULE_ID}/templates/barbrawl-profile-dialog/form.hbs`,
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /** @override */
  async _prepareContext(options = {}) {
    return {
      nameField: this._prepareNameField(),
      barData: this._prepareBarData(),
      positionOptions: {
        "top-inner": "barbrawl.position.top-inner",
        "top-outer": "barbrawl.position.top-outer",
        "bottom-inner": "barbrawl.position.bottom-inner",
        "bottom-outer": "barbrawl.position.bottom-outer",
        "left-inner": "barbrawl.position.left-inner",
        "left-outer": "barbrawl.position.left-outer",
        "right-inner": "barbrawl.position.right-inner",
        "right-outer": "barbrawl.position.right-outer",
      },
      otherVisibilityOptions: {
        [CONSTANTS.BAR_VISIBILITY.ALWAYS]: "barbrawl.visibility.always",
        [CONSTANTS.BAR_VISIBILITY.HOVER]: "barbrawl.visibility.hover",
        [CONSTANTS.BAR_VISIBILITY.NONE]: "barbrawl.visibility.none",
      },
      ownerVisibilityOptions: {
        [CONSTANTS.BAR_VISIBILITY.INHERIT]:
          "barbrawl.visibility.inheritFromOther",
        [CONSTANTS.BAR_VISIBILITY.ALWAYS]: "barbrawl.visibility.always",
        [CONSTANTS.BAR_VISIBILITY.HOVER_CONTROL]:
          "barbrawl.visibility.hoverOrControl",
        [CONSTANTS.BAR_VISIBILITY.HOVER]: "barbrawl.visibility.hover",
        [CONSTANTS.BAR_VISIBILITY.CONTROL]: "barbrawl.visibility.control",
        [CONSTANTS.BAR_VISIBILITY.NONE]: "barbrawl.visibility.none",
      },
      gmVisibilityOptions: {
        [CONSTANTS.BAR_VISIBILITY.INHERIT]:
          "barbrawl.visibility.inheritFromOwner",
        [CONSTANTS.BAR_VISIBILITY.ALWAYS]: "barbrawl.visibility.always",
        [CONSTANTS.BAR_VISIBILITY.HOVER_CONTROL]:
          "barbrawl.visibility.hoverOrControl",
        [CONSTANTS.BAR_VISIBILITY.HOVER]: "barbrawl.visibility.hover",
        [CONSTANTS.BAR_VISIBILITY.CONTROL]: "barbrawl.visibility.control",
        [CONSTANTS.BAR_VISIBILITY.NONE]: "barbrawl.visibility.none",
      },
      stylesOptions: {
        user: "barbrawl.textStyle.user",
        none: "barbrawl.textStyle.none",
        fraction: "barbrawl.textStyle.fraction",
        percent: "barbrawl.textStyle.percent",
      },
      buttons: [
        {
          type: "submit",
          icon: "fa-solid fa-save",
          label: "PERMISSION.Submit",
        },
      ],
    };
  }

  /**
   * Prepares the name field for the profile, ensuring it is a non-null, non-blank string.
   *
   * @returns {foundry.data.fields.StringField} - A configured string field for the name.
   */
  _prepareNameField() {
    const nameValue = this.profile.name;

    return new foundry.data.fields.StringField(
      {
        blank: false,
        nullable: false,
        initial: nameValue,
      },
      { name: "name" }
    );
  }

  /**
   * Duplicates the profile's bar data and prepares its fields, including colors and images.
   *
   * @returns {Object} - The processed bar data with updated field configurations.
   */
  _prepareBarData() {
    const barData = foundry.utils.duplicate(this.profile.barData);

    for (const bar of Object.values(barData)) {
      bar.mincolor = this._prepareColorsFields(
        bar.id,
        bar.mincolor,
        "mincolor"
      );
      bar.maxcolor = this._prepareColorsFields(
        bar.id,
        bar.maxcolor,
        "maxcolor"
      );
      bar.fgImage = this._prepareImgPathFields(bar.id, bar.fgImage, "fgImage");
      bar.bgImage = this._prepareImgPathFields(bar.id, bar.bgImage, "bgImage");
    }
    return barData;
  }

  /**
   * Prepares a color field for a specific bar, ensuring it has a valid color value.
   *
   * @param {string} barId - The unique identifier of the bar.
   * @param {string} colorValue - The initial color value.
   * @param {string} colorKey - The key associated with the color field (e.g., "mincolor" or "maxcolor").
   * @returns {{ field: foundry.data.fields.ColorField, value: string }} - The configured color field and its value.
   */
  _prepareColorsFields(barId, colorValue, colorKey) {
    const { ColorField } = foundry.data.fields;
    const field = new ColorField(
      {
        blank: false,
        nullable: false,
        initial: colorValue,
      },
      {
        name: `barData.${barId}.${colorKey}`,
      }
    );

    return {
      field,
      value: colorValue,
    };
  }

  /**
   * Prepares an image path field for a specific bar, allowing users to select an image file.
   *
   * @param {string} barId - The unique identifier of the bar.
   * @param {string} [pathValue=""] - The initial file path for the image.
   * @param {string} pathKey - The key associated with the image field (e.g., "fgImage" or "bgImage").
   * @returns {{ field: foundry.data.fields.FilePathField, value: string }} - The configured file path field and its value.
   */
  _prepareImgPathFields(barId, pathValue = "", pathKey) {
    const { FilePathField } = foundry.data.fields;
    const field = new FilePathField(
      {
        initial: pathValue,
        categories: ["IMAGE"],
      },
      {
        name: `barData.${barId}.${pathKey}`,
      }
    );

    return {
      field,
      value: pathValue,
    };
  }

  /**
   * Handle submission
   * @this {BarbrawlProfileConfig} - The handler is called with the application as its bound scope
   * @param {SubmitEvent} event - The originating form submission event
   * @param {HTMLFormElement} form - The form element that was submitted
   * @param {FormDataExtended} formData - Processed data for the submitted form
   */
  static #formHandler(event, form, formData) {
    const profileData = foundry.utils.expandObject(formData.object);
    if (this.callbackSubmit instanceof Function)
      this.callbackSubmit(profileData);

    return this.close({ submitted: true });
  }

  /** @inheritDoc */
  async close(options = {}) {
    if (!options.submitted) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        content:
          "Are you sure you want to close? Unsaved changes will be lost.",
        rejectClose: false,
        modal: true,
      });

      if (!proceed) return;
    }

    if (this.callbackClose instanceof Function) this.callbackClose();
    return super.close(options);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Creates a new resource for the profile with default bar data, then updates the UI
   *
   * @param {PointerEvent} event - The click event that triggered the import.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static _addResource(event, target) {
    event.preventDefault();
    const barsIds = Object.keys(this.profile.barData);
    const newBar = UTILS.getDefaultBarData(barsIds);

    this.profile.barData[newBar.id] = newBar;
    this.render({ parts: ["form"]});
  }

  /**
   * Delete a resource for the profile, then updates the UI
   *
   * @param {PointerEvent} event - The click event that triggered the import.
   * @param {HTMLElement} target - The HTML element that initiated the action, containing the [data-action] attribute.
   */
  static _deleteResource(event, target) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const barId = target.dataset.id;

    delete this.profile.barData[barId];

    this.render({ parts: ["form"]});

  }
}

var apps = /*#__PURE__*/Object.freeze({
  __proto__: null,
  BarbrawlProfileConfig: BarbrawlProfileConfig,
  BarbrawlProfileDialog: BarbrawlProfileDialog
});

/**
 * A data model that represents the Profile configuration options.
 */
class ProfilesSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, SchemaField, StringField, ObjectField } =
      foundry.data.fields;
    return {
      profiles: new ArrayField(
        new SchemaField({
          name: new StringField({
            trim: true,
            blank: true,
          }),
          id: new StringField(),
          barData: new ObjectField(),
        }),
        {
          initial: [],
          gmOnly: true,
        }
      ),
    };
  }
}

class TokenMoldSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const { StringField, BooleanField } = foundry.data.fields;
    return {
      profile: new StringField({
        initial: "",
      }),
      overwrite: new BooleanField({
        initial: false,
      }),
    };
  }
}

var data = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ProfilesSetting: ProfilesSetting,
  TokenMoldSetting: TokenMoldSetting
});

Hooks.on("init", () => {
  foundry.utils.mergeObject(game.modules.get(CONSTANTS.MODULE_ID), {
    apps,
    data,
  });
});

Hooks.on("ready", () => {
  registerSettings();
  if (game.modules.get("token-mold")?.active) {
    Hooks.on("renderTokenMoldForm", onRenderTokenMoldForm);
    Hooks.on("closeTokenMoldForm", onCloseTokenMoldForm);

    const tokenMold = game["token-mold"];

    if (!tokenMold || typeof tokenMold._overwriteConfig !== "function") {
      console.warn("Token Mold module or _setTokenData method not found.");
      return;
    }
    const originalOverwriteConfig = tokenMold._overwriteConfig;
    tokenMold._overwriteConfig = function (tokenData, actor) {
      originalOverwriteConfig.call(this, tokenData, actor);

      const tokenMoldSettingData = game.settings.get(
        CONSTANTS.MODULE_ID,
        CONSTANTS.SETTINGS.PROFILES_TOKEN_MOLD
      );

      if (tokenMoldSettingData.overwrite) {
        const profiles =
          game.settings.get(CONSTANTS.MODULE_ID, CONSTANTS.SETTINGS.PROFILES)
            ?.profiles ?? [];

        const barData = profiles.find(
          (p) => p.id === tokenMoldSettingData.profile
        )?.barData;
        if (barData) {
          ["bar1.attribute", "bar2.attribute", "displayBars"].forEach((key) => {
            if (key in tokenData) delete tokenData[key];
          });

          foundry.utils.setProperty(
            tokenData,
            "flags.barbrawl.resourceBars",
            barData
          );
        }
      }
      return tokenData;
    };
  }
});

Hooks.on("renderTokenConfig", onRenderTokenConfig);
Hooks.on("createActor", onCreateActor);
