import {
  mount,
  unmount,
} from "../node_modules/svelte/src/internal/client/render.js";
class SvelteElement {
  /**
   * Holds the Svelte component instance
   * @type {T | undefined}
   * @private
   */
  _component;
  /**
   * Holds the HTMLElement inside which we inject the component.
   * Used to recover the component instead of re-creating it when re-rendering the Application
   * @type {HTMLElement | undefined}
   * @private
   */
  _htmlElement;
  /**
   * The Svelte component inside this `SvelteElement`
   * @type{T}
   * @private
   */
  _SvelteComponent;
  /**
   * Props used to inject the svelte component
   * @type{Partial<import('svelte').ComponentProps<T>>}
   * @private
   */
  _props;
  /**
   * Selector of the HTML element inside which this `SvelteElement` will be injected
   * @type {string}
   * @private
   */
  _selector;
  /**
   * @param {import('.').ComponentDescriptor<T>} descriptor
   */
  constructor(descriptor) {
    const { selector, SvelteComponent, props } = descriptor;
    this._SvelteComponent = SvelteComponent;
    this._props = props || {};
    this._selector = selector || `#svelte-${this.name}`;
  }
  /**
   * Returns wether the component is rendered
   * @returns {boolean}
   */
  get isRendered() {
    return !!this._component && !!this._htmlElement;
  }
  /**
   * Name of the component inside the `SvelteElement`
   * @returns {string}
   */
  get name() {
    return this._SvelteComponent.name;
  }
  /**
   * CSS-like selector for the `SvelteElement`
   * @returns {string}
   */
  get selector() {
    return this._selector;
  }
  /**
   * Updates the props used to inject the component if the component hasn't been injected yet.
   * @param {import('svelte').ComponentProps<T>} props - Props object to initialise the Svelte component.
   * @remark `props` merges (overriding) into the default props given in the element's constructor, if any.
   */
  updateProps(props) {
    if (!this._component) {
      return foundry.utils.mergeObject(this._props || {}, props || {}, {
        insertKeys: true,
        insertValues: true,
        overwrite: true,
        recursive: true,
      });
    }
  }
  /**
   * Initialises and renders the `SvelteElement` if it is not rendered yet, otherwise it reinjects the
   * already created `SvelteElement` into its place inside the HTML.
   * @param {HTMLElement} target The target HTML element to be substituted by the `SvelteElement`
   * @param {import('svelte').ComponentProps<T>} [props] - Props object to initialise the Svelte component.
   * @remark `props` merges (overriding) into the default props given in the element's constructor, if any.
   */
  inject(target, props = void 0) {
    if (props) this.updateProps(props);
    if (this._component && this._htmlElement) {
      target.replaceWith(this._htmlElement);
    } else {
      this._component = mount(this._SvelteComponent, {
        target,
        props: this._props,
      });
      this._htmlElement = target;
    }
  }
  destroy() {
    if (this._component) unmount(this._component);
    this._htmlElement = void 0;
  }
}
export { SvelteElement };
