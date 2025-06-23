export class BaseApplicationV2 extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

    constructor(options) {
        super(options);
    }

    bindEvent(selector, callback, {event="click"}={}) {
        const els = this.element.querySelectorAll(selector);
        els.forEach(el => el.addEventListener(event, callback.bind(this)) );
    }
}