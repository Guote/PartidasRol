import "../../node_modules/svelte/src/internal/disclose-version.js";
import { first_child, sibling, child } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { push, get, pop } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { set, state } from "../../node_modules/svelte/src/internal/client/reactivity/sources.js";
import { delegate } from "../../node_modules/svelte/src/internal/client/dom/elements/events.js";
import { comment, append, template } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { await_block } from "../../node_modules/svelte/src/internal/client/dom/blocks/await.js";
import { if_block } from "../../node_modules/svelte/src/internal/client/dom/blocks/if.js";
import { html } from "../../node_modules/svelte/src/internal/client/dom/blocks/html.js";
import { derived } from "../../node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
import Editor from "../../node_modules/@tinymce/tinymce-svelte/dist/component/Editor.svelte.js";
var root_3 = template(`<div class="editor-content"><!></div>`);
var on_click = (_, editing) => set(editing, true);
var root_4 = template(`<a class="editor-edit"><i class="fas fa-edit"></i></a>`);
var root_2 = template(`<div class="editor"><!> <!></div>`);
function Editor_1($$anchor, $$props) {
  push($$props, true);
  let value = prop($$props, "value", 7), button = prop($$props, "button", 3, true), editable = prop($$props, "editable", 3, true), owner = prop($$props, "owner", 3, false), documents = prop($$props, "documents", 3, true), links = prop($$props, "links", 3, true), rolls = prop($$props, "rolls", 3, true), rollData = prop($$props, "rollData", 19, () => ({})), async = prop($$props, "async", 3, false);
  let editing = state(false);
  const config = {
    ...CONFIG.TinyMCE,
    init_instance_callback: (editor) => {
      const window = editor.getWin();
      editor.focus();
      editor.selection.setCursorLocation(editor.getBody(), editor.getBody().childElementCount);
      window.addEventListener(
        "wheel",
        (event) => {
          if (event.ctrlKey) event.preventDefault();
        },
        { passive: false }
      );
      editor.off("drop dragover");
      editor.on("drop", (event) => TextEditor._onDropEditorData(event, editor));
    },
    save_enablewhendirty: false,
    save_onsavecallback: async () => {
      $$props.onsave?.();
      set(editing, false);
    }
  };
  let enrichedHTML = derived(() => TextEditor.enrichHTML(value(), {
    secrets: owner(),
    documents: documents(),
    links: links(),
    rolls: rolls(),
    rollData: rollData(),
    async: async()
  }));
  var fragment = comment();
  var node = first_child(fragment);
  if_block(
    node,
    () => get(editing),
    ($$anchor2) => {
      Editor($$anchor2, {
        cssClass: "editor",
        get value() {
          return value();
        },
        set value($$value) {
          value($$value);
        },
        conf: config
      });
    },
    ($$anchor2) => {
      var div = root_2();
      var node_1 = child(div);
      await_block(node_1, () => get(enrichedHTML), null, ($$anchor3, content) => {
        var div_1 = root_3();
        var node_2 = child(div_1);
        html(node_2, () => get(content));
        append($$anchor3, div_1);
      });
      var node_3 = sibling(node_1, 2);
      if_block(node_3, () => button() && editable(), ($$anchor3) => {
        var a = root_4();
        a.__click = [on_click, editing];
        append($$anchor3, a);
      });
      append($$anchor2, div);
    }
  );
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);
export {
  Editor_1 as default
};
