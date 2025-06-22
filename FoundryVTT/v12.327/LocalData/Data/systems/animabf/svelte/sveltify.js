import { Templates } from "../module/utils/constants.js";
import { ABFSettingsKeys } from "../utils/registerSettings.js";
import { debouncedStore } from "./store.js";
import { SvelteElement } from "./SvelteElement.js";
import { ITEM_CONFIGURATIONS } from "../module/actor/utils/prepareItems/constants.js";
const RENDER_STATES = Application.RENDER_STATES;
function sveltify(Base) {
  class SvelteApplication extends Base {
    /**
     * Array of the `SvelteElement`s in the Application
     * @type {SvelteElement[]}
     */
    _svelteElements = [];
    /**
     * Svelte store containing the data returned from `.getData()`, allowing Svelte components to access it.
     * @type {import('.').DebouncedStore<TData>}
     */
    dataStore = debouncedStore();
    /**
     * Whether the application uses handlebars or is completely Svelte-based.
     * Uses the Application's template to check if it uses handlebars,
     * thus it returns `undefined` if `this.options.template` is undefined.
     * If the extension of the Application's template is `.hbs`, `hasHandlebars` is `true`,
     * otherwise it is false.
     * @returns {boolean | undefined}
     */
    get hasHandlebars() {
      return this.template.endsWith(".hbs");
    }
    /**
     * Whether the application is an ActorSheet / ItemSheet or other application.
     * @returns {boolean}
     */
    get isSheet() {
      return this.options.baseApplication?.includes("Sheet") || false;
    }
    /**
     * @param {any[]} args
     * @inheritdoc
     */
    constructor(...args) {
      super(...args);
      this.updateStore();
      this.dataStore.debounceSubscribe((v) => this.onStoreUpdate(v));
      const descriptors = (
        /** @type {typeof SvelteApplication} */
        this.constructor.svelteDescriptors
      );
      for (const descriptor of descriptors) {
        const element = new SvelteElement(descriptor);
        element.updateProps({ data: this.dataStore });
        this._svelteElements.push(element);
      }
    }
    /**
     * @inheritdoc
     */
    static get defaultOptions() {
      const options = {
        classes: ["svelte-application"],
        popOut: true,
        resizable: true,
        width: 260,
        height: 160,
        template: Templates.Svelte.SvelteApp,
        id: "svelte-application",
        title: "Svelte Application"
      };
      return mergeObject(super["defaultOptions"], options);
    }
    /**
     * @inheritdoc
     * @param {Partial<ApplicationOptions>} [options]
     * @returns {TData | Promise<TData>} The data used for rendering the application
     */
    // @ts-ignore
    getData(options) {
      return super.getData(options);
    }
    /**
     * Updates the value of `this.dataStore` using `this.getData()`.
     * @param {Partial<ApplicationOptions>} [options] options parameter passed to `.getData()`
     */
    async updateStore(options = {}) {
      let data = await this.getData(options);
      this.dataStore.set(data);
    }
    /**
     * Method in charge of reporting back to Foundry's App the changes made inside the Svelte part.
     * It gets triggered every time `this.dataStore` is updated, and does one of the following:
     * - If the Application `isSheet`, then updates the base document using (which makws foundry
     *   re-render the sheet.
     * - If not, but `this.object` exists (e.g. when `Base` is `FormApplication`), updates `this.object`
     *   the updated version in the dataStore, and then re-renders the application (skiping the store
     *   update during render).
     *   **Note:** In this case, the implementation asumes `.getData()` to return `this.object`;
     *   otherwise this method should be overriden to update the object correctly.
     * - Otherwise, it yields an error informing the user that they should override this method.
     *
     * @param {TData} value The new value in the store.
     */
    async onStoreUpdate(value) {
      if (!this.isSheet && !("object" in this)) {
        throw new Error(
          // @ts-ignore
          `${this.constructor.name} must override the method '.onStoreUpdate()', since neither it has 'this.object' nor it is an Actor or Item sheet.`
        );
      }
      if (this.isSheet) {
        const document = (
          /**
           * @type {import('../module/actor/ABFActor').ABFActor | import('../module/items/ABFItem').default}
           */
          this.object
        );
        const { name, img, system } = value["document"];
        const diff = await document.updateSource({ name, img, system }, { dryRun: true });
        if (!diff) return;
        if (isEmpty(diff)) return;
        const itemsPaths = Object.values(ITEM_CONFIGURATIONS).map(
          (itemConfig) => ["system", ...itemConfig.fieldPath].join(".")
        );
        const diffKeys = Object.keys(flattenObject(diff));
        if (diffKeys.filter((k) => !itemsPaths.includes(k)).length === 0) return;
        await document.update({ name, img, system });
      } else {
        this.object = value;
      }
      this.render(false, { skipUpdateStore: true });
    }
    /**
     * Static method returning a list of descriptors for each `SvelteComponent` in the application.
     * @abstract
     * @returns {import('.').ComponentDescriptor[]} A list of Svelte elements' descriptors.
     */
    static get svelteDescriptors() {
      throw new Error(
        `${this.constructor.name} must implement a static method 'svelteElements'.`
      );
    }
    /**
     * @inheritdoc
     * @param {boolean} [force]
     * @param {Application.RenderOptions & {skipUpdateStore?: boolean}} [options]
     */
    render(force, options) {
      return super.render(force, options);
    }
    /**
     * @inheritdoc
     * @param {boolean} [force]
     * @param {Application.RenderOptions & {skipUpdateStore?: boolean}} [options]
     */
    async _render(force, options) {
      if (!options?.skipUpdateStore) {
        this.updateStore();
      }
      if (this.element?.length && !this.hasHandlebars) {
        return;
      }
      await super._render(force, options);
    }
    /**
     * @inheritdoc
     * @param {JQuery<HTMLElement>} element
     * @param {JQuery<HTMLElement>} html
     */
    _replaceHTML(element, html) {
      super._replaceHTML(element, html);
      this._renderSvelte();
    }
    /**
     * @inheritdoc
     * @param {JQuery<HTMLElement>} element
     * @param {JQuery<HTMLElement>} html
     */
    _injectHTML(html) {
      super._injectHTML(html);
      this._renderSvelte();
    }
    /**
     * Renders all the svelte compontens
     */
    _renderSvelte() {
      for (const element of this._svelteElements) {
        const target = this.element.find(element.selector).get(0);
        if (target) {
          element.inject(target);
        } else if (this._state > RENDER_STATES.CLOSED && game.settings.get("animabf", ABFSettingsKeys.DEVELOP_MODE)) {
          console.warn(
            `AnimaBF | Error rendering SvelteApplication ${this.appId}: element '${element.selector}' not found in the HTML.`
          );
        }
      }
    }
    /**
     * @inheritdoc
     * @param {Application.CloseOptions} [options]
     */
    async close(options) {
      return super.close(options).then((_) => {
        for (const element of this._svelteElements) {
          element.destroy();
        }
      });
    }
  }
  return SvelteApplication;
}
export {
  sveltify
};
