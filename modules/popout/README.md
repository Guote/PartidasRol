# [PopOut!](https://foundryvtt.com/packages/popout)

This module adds a PopOut! button to most actor sheets, journal entries, and applications.

The PopOut! button allows you to open a sheet/application/document into its own window, for easier viewing or for use with multiple monitors.

This module **does not work** in the Electron window (the standalone FVTT Application) and can only be used from regular browsers. (i.e. visiting localhost:30000 if you are running it yourself.)

This module is currently tested on Chrome and ~Firefox~ and under MacOS, ~Linux~, and Windows 10.

This module is only tested against the base Foundry application using the DnD5e system. While most other systems and modules _should_ work; Just because there is a PopOut! button on a window, does not guarantee that it _will_ work.

Systems such as Pathfinder that heavily make use of JQuery or JQuery plugins will have severely limited functionality.

In addition, systems using more advanced frameworks like react/svelte/vue will likely _not_ work and can not be made to work.

Due to the necessarily brittle nature of how this module is implemented, other modules may lack functionality or break completely when popped out. See the Compatibility section for a description of how you can fix this if you are module developer.

### Firefox

~Due to a recent update from Firefox that changed the way the `instanceof` method works~ Turns out [the issue](https://bugzilla.mozilla.org/show_bug.cgi?id=339884) is 17 years old, I have no idea why some things are encountering it now. Some core JQuery functions are broken when operating on popped out HTML nodes. Therefore **I am no longer supporting Firefox**, please use Chrome. If you are interested, the following gist can [replicate the issue](https://gist.github.com/Posnet/9d87f790d4f3c64ed468559600c76302).

# Installation

Install using the URL : `https://raw.githubusercontent.com/League-of-Foundry-Developers/fvtt-module-popout/master/module.json`

As DM go to the `Manage Modules` options menu in your Game Settings tab then enable the `PopOut!` module.

# Module Developers

## Compatibility

**IMPORTANT** If your module ever accesses a HTML element, either by `document.getElementById` or `$(...selector...)` or similar functions that access a global document object. Your module will break if it is popped out, because those function calls will not find the correct element.

You **must** always call `find` on the DOM object attached to the Foundry object. For example `sheet.element.find(...selector...)`.

They reason for this is that PopOut! works by creating a new window and migrating DOM nodes from the main window to the new window.
This ensures that event handlers and other related behavior is preserved, and that any assumptions about a Foundry application existing as a single JS object also remain true.
However it does mean that the page now has 2 logical documents, not 1 because there are 2 or more windows.
So any assumptions about being able to access something from the root window/document/jquery object are no longer true.

### Tooltips

Unfortunately an update to foundry-vtt (approximately v10) has broken the built in tool-tips functionality in a way that can't be fixed easily. I have added in a very brittle fix with the latest version, but it will likely break modules that are overriding or modifying tooltip behavior, such as calling `tooltip.activate` manually, but there is nothing I can currently do about this. A notable example of something that is basically unfix-able, is the tooltip in DnD 5e that breaks down AC by effect.

### Disabling PopOut!

If you are a module developer have found that PopOut! is not working correctly or it doesn't make sense for your application to be able to be popped out. You can add the property `_disable_popout_module` to your application, and this module will ignore it.

A second option is when creating an application or dialog, you can add the `popOutModuleDisable` attribute to it's options argument, this will also disable PopOut for that specific object. For example:

```js
Dialog.prompt({ title: '', options: { popOutModuleDisable: true } });
```

### Sidebar (ChatLog...)

Due to the way the sidebar popouts are implemented by Foundry, if you are searching for elements in them. You will have to do the same action again, for the popped out sidebar element.

For example if you want to hide a chat card, you will have to do the following.

```js
ui.chat.element.find(`.message[data-message-id=${data._id}]`).hide();
if (ui.sidebar.popouts.chat) {
    ui.sidebar.popouts.chat.element.find(`.message[data-message-id=${data._id}]`).hide();
}
```

## Integration

Popout! exposes a single API function and a series of hooks so other modules can leverage it's functionality.

This API is new as of version 2.0, with the goal is to maintain API compatibility from this point on.

_Note_: There was a minor compatibility break which is why 2.0 was released, the PopOut hook now only takes 2 arguments instead of 3.

To pop out an application, call the function with the application object.

```js
// Where app is the foundry Application object. For example an actor sheet.
// If the Application exists in the window.ui.windows map, it should be able to be popped out.
PopoutModule.popoutApp(app);
```

PopOut also exposes hooks to developers to alter its behavior to add compatibility to their modules.
For an example of what that might look like, see the PDFoundry compatibility hooks in [./popout.js](./popout.js#697)

```javascript
// app: is the foundry application being popped out.
// popout: is the browser window object where the popped out element will be moved.
Hooks.callAll('PopOut:popout', app, popout);

// app: is the foundry application being popped out.
// node: is the html element of the application after it has been moved to the new window.
Hooks.callAll('Popout:loaded', app, node);

// app: is the foundry application being popped out.
// popout: is the browser window object where the popped out element will be moved.
Hooks.callAll('Popout:loading', app, popout);

// app: is the foundry application being popped in.
Hooks.callAll('PopOut:popin', app);

// app: is the foundry application being popped out.
// parent: The application that PopOut believes owns the diaglog box.
Hooks.callAll('PopOut:dialog', app, parent);

// app: is the foundry application being popped out.
// node: is the html element of the popped out application, before it is deleted or popped in.
Hooks.callAll('PopOut:close', app, node);
```

# License

This Foundry VTT module, written by @KaKaRoTo.
It is currently maintained by @Posnet.

This work is licensed under Foundry Virtual Tabletop [EULA - LIMITED LICENSE AGREEMENT FOR MODULE DEVELOPMENT](https://foundryvtt.com/article/license/)

The contents of this module are licensed under a [Creative Commons Attribution 4.0 International License](./LICENSE.txt) where they do not conflict with the above Foundry License.
