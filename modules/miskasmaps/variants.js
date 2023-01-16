// TODO : Clean out this section that is not well documented yet.
// TODO : Make sure this only works with Miska Maps prefixed modules.

// To Capitalize the text for the drop down menus
function capitalize(text) 
{
  var output, i, l, capRe = /[A-Z]/;
  output = [];
  for (i = 0, l = text.length; i < l; i += 1) {
    if (i === 0) {
      output.push(text[i].toUpperCase());
    }
    else {
      if (i > 0 && capRe.test(text[i])) {
        output.push(" ");
      }
      output.push(text[i]);
    }
  }
  return output.join("");
}

function prettify(text){
  var output, splitted;
  splitted = text.split('-');
  output = capitalize(splitted[0]);
  if (splitted.length == 2) {
    output += Strings.create(" ({subvariant})", {subvariant:capitalize(splitted[1])});
  }
  output = output.replace ("_", " ");
  return output;
}

// Formatter for text
var Strings = {
      create : (function() {
              var regexp = /{([^{]+)}/g;

              return function(str, o) {
                   return str.replace(regexp, function(ignore, key){
                         return (key = o[key]) == null ? '' : key;
                   });
              }
      })()
};

function getMapDataFromePath(filename) {
  // Get the current map basename
  variant_name_parts = filename.split('.');

  // Verify if there is actually a variation syntax in map naming
  if (variant_name_parts.length != 3) {
      errorDialog("No variants for this map.");
      return false;
  }
  current_variant = prettify(variant_name_parts[1]);

  map_name_parts = variant_name_parts[0].split("-");
  current_map = map_name_parts[0];

  return [current_map, current_variant];
}

// Popup for error messages
async function errorDialog(error) {
  var content = 
  new Dialog({
        title: CONFIG.Miska.WindowTitle,
        content: Strings.create(CONFIG.Miska.BodyContent, {text:error}),
        default: 'ok',
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: 'ok',
            default: true,
            callback: () => console.log(error)
            },
          },
      }).render(true);
}

/**
 * Interface proper for variant selection by user
 *
 * @param {Array} variants - An array of variant names
 */
async function chosseVariantDialog(variants) {
  var text, content, variant, i;
  text = 'Choose the variant of the current map you wish to use.'
  content = Strings.create(CONFIG.Miska.BodyContent, {text:text})
  content += '\n<div class="form-group dialog variant-prompt" style="margin-top:5px;margin-bottom:5px;">' +
  '\n<select style="text-align:center;display:block;margin:auto;" name="variant" id="variant"><p>'
  for (i = 0; i < variants.length; i++) {
    content += '\n<option>' + variants[i] + '</option>';
  }
  content += '\n</select>' +
  '\n</div>'

  // Call Dialog and wait for result
  variant = await new Promise((resolve, reject) => {
    new Dialog({
      title: CONFIG.Miska.WindowTitle,
      content: content,
      default: 'ok',
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'ok',
          default: true,
          callback: html => {
            resolve(
              html.find('.variant-prompt.dialog [name="variant"]')[0].value,
            );
          },
        },
        cancel: {
         icon: '<i class="fas fa-times"></i>',
         label: "Cancel",
         callback: () => console.log("Cancelled")
        }
      }
    },
    {
      width: 400,
      height: 200
    }).render(true);
  });
  return variant;
}


/**
 * Function called by Interface button "Miska Map's variant chooser"
 *
 * @param {String} entityId - Internal FoundryVTT ID for scene.
 */
async function chosseVariant(entityId) {
    // Get current situation of scene
    const scene = game.scenes.get(entityId);
    const current_image = scene.img;
    
    // Determine root folder and image name
    filepath_parts = current_image.split("/");
    image_filename = filepath_parts.pop();
    image_folder = filepath_parts.join("/");

    let [current_map, current_variant] = getMapDataFromePath(image_filename);   

    // Get all images in the same folder
    let data = await FilePicker.browse("data", image_folder, {bucket:null, extensions: [".jpg",".jpeg", ".webp"]})
    const files = data.files.map(file => {
      return decodeURIComponent(file);
    })

    // Get all images that have same base name as current map
    // Register them as a variant
    // Current nomenclature : 
    // Examples : 
    //   - beacontemple-25x50-140px.green.jpg
    //   - AncestorTemple-35x50.blackAndWhite-grid.jpg
    // RegExp group 1 will be the variant name

    regstr = current_map + "[\\dxp\\-]*\\.(?<variant>[\\w\\-]+)\\.";
    var variants = {};
    for (i = 0; i < files.length; i++) {
      pattern = new RegExp(regstr, 'g');
      match = pattern.exec(files[i]);
      if (match) {
        variants[prettify(match[1])] = files[i];
      }
    }

    // Check if more than 1 variant declared 
    if (variants.length <= 1) {
        errorDialog("No variants for this map.");
        return false;
    }

    // Get an alphabetical sorted list of variants
    variant_codes = Object.keys(variants);
    variant_codes.sort();

    // Remove the current variant from list
    const index = variant_codes.indexOf(current_variant);
    if (index > -1) {
      variant_codes.splice(index, 1);
    }

    // Add the current variant to top of the list
    variant_codes.splice(0, 0, current_variant);

    // Prompt user for new variant
    new_variant = await chosseVariantDialog(variant_codes);

    // If a variant selected, process it in scene
    // Length 0 because the first option is empty, no chane to be done
    if (new_variant.length != 0) {
      await scene.update({"img":variants[new_variant]});
      let thumb = await scene.createThumbnail();
      scene.update({thumb: thumb.thumb});
    }
    return true;
}

function isMiskaMapScene(entityId) {
  var scene = game.scenes.get(entityId);
  const current_image = scene.img;
  if (current_image == null) {
    return false;
  }
  return current_image.startsWith('modules/miskasmap');
}

function miskaVariantsAddDirectoryContext(html, entryOptions) {
  entryOptions.push({
    name: 'Variant Chooser',
    icon: '<img src="modules/miskasmaps/miskasmaps.png" style="width:14px;height:14px;">',
    callback: li => {
      let id = li.data('document-id') ?? li.data('entity-id');
      return chosseVariant(id);
    },
    condition: li => {
      let id = li.data('document-id') ?? li.data('entity-id');
      return isMiskaMapScene(id);
    }
  });
}

Hooks.once("init", async function () {
  console.log("Initializing Miska Maps");
  if (typeof(CONFIG.Miska) != 'undefined') {
    console.log("Miska's Maps already initialised")
    return;
  }
  const Miska = {};
  Miska.WindowTitle = "Miska's Maps Variant Manager";
  Miska.BodyContent = '\n' +
  '\n<div class="box" style="display:flex">' +
  '\n<div class="box" style="margin-right:10px;">' +
  '\n<img src="modules/miskasmaps/miskasmaps.png" style="border:none">' +
  '\n</div>' +
  '\n<div style="margin-top:auto; margin-bottom:auto;margin-left:auto;margin-right:auto;">' +
  '\n<span style="">{text}</span>' +
  '\n</div></div><p>'

  CONFIG.Miska = Miska;
});

Hooks.on('getSceneDirectoryEntryContext', miskaVariantsAddDirectoryContext);
