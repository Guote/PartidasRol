// Step 1: Get the Tile Object
const tileId = 'B9Pu3KqMcgjOomYI';
const tile = canvas.tiles.get(tileId);
console.log(tile);

// Step 2: Fetch the Image Paths
const imagePaths = tile.document.getFlag('totm-manager', 'imagePaths') || [];
console.log(imagePaths);

// Step 3: Identify the Image
const imageId = 'media/img-book_AAG/001-00-001.wildspace-splash.webp'; // Example image ID
const image = imagePaths.find(img => img.img === imageId);
console.log(image);

// Step 4: Remove the Effect
const effectFilterId = 'bevel'; // Example effect filter ID
if (image) {
  image.effects = (image.effects || []).flat().filter(effect => effect.filterId !== effectFilterId);
  console.log("Updated effects for image:", image.effects);
} else {
  console.error("Image not found.");
}

// Step 5: Update the Flag
await tile.document.setFlag('totm-manager', 'imagePaths', imagePaths);
console.log("Updated imagePaths:", imagePaths);


// Define the namespace
const NAMESPACE = 'totm-manager';

// Function to clear all effects from the totm-manager flag
async function clearAllEffectsFromTiles() {
    // Get all tiles on the canvas
    const tiles = canvas.tiles.placeables;

    for (let tile of tiles) {
        // Get the current flags
        let tileEffects = tile.document.getFlag(NAMESPACE, 'tileEffects');
      // let imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths');

      // If there are any flags, remove them
      if (tileEffects) {
        await tile.document.unsetFlag(NAMESPACE, 'tileEffects');
        // await tile.document.unsetFlag(NAMESPACE, 'imagePaths');
        console.log(`Cleared effects for tile ${tile.id}`);
      }
    }

    console.log("All effects cleared from totm-manager flag for all tiles.");
}

// Run the function
clearAllEffectsFromTiles();


////////////////////////////////////////
// Remove all flags from totm-manager //
////////////////////////////////////////

//Note you can run this from the console!
// Not sure this really works....

const NAMESPACE = 'totm-manager';

// Get the current active scene
const scene = game.scenes.active;

// Check if a scene is active
if (!scene) {
  console.error("No active scene found.");
} else {
  // Function to remove the flag from a document
  const removeFlag = async (document) => {
    if (document) {
      try {
        // Check if the flag exists before attempting to remove it
        const currentFlags = document.getFlag(NAMESPACE);
        if (currentFlags) {
          await document.unsetFlag(NAMESPACE);
          console.log(`Removed flags from ${document.constructor.name} with ID: ${document.id}`);
        } else {
          console.log(`No flags found for ${document.constructor.name} with ID: ${document.id}`);
        }
      } catch (error) {
        console.error(`Failed to remove flag from ${document.constructor.name} with ID: ${document.id}`, error);
      }
    } else {
      console.error("Document is undefined");
    }
  };

  // Helper function to process each collection
  const processCollection = async (collection, type) => {
    for (let item of collection) {
      console.log(`Processing ${type}:`, item);
      const doc = item.document || item;
      if (doc) {
        await removeFlag(doc);
      } else {
        console.error(`${type} document is undefined for item:`, item);
      }
    }
  };

  // Remove flags from all tiles
  await processCollection(scene.tiles, 'Tile');

  // Remove flags from all tokens
  await processCollection(scene.tokens, 'Token');

  // Add additional loops for other document types if needed (e.g., drawings, notes, etc.)
  // Example:
  // await processCollection(scene.drawings, 'Drawing');
  // await processCollection(scene.notes, 'Note');

  console.log(`All flags under the namespace '${NAMESPACE}' have been removed.`);
}


////////////////////////////////////////////
// Remove token magic filter from console //
////////////////////////////////////////////

const instance = game.scenes.viewed; // or another way to get the current instance
const tileId = 'B9Pu3KqMcgjOomYI'; // replace with your actual tile ID
const tile = canvas.tiles.get(tileId);
console.log("Tile:", tile);

TokenMagic.deleteFilters(tile, 'glow');


//////////////////////////////////////
// List tiles by ID and tagger tags //
//////////////////////////////////////

// Function to list all tiles by ID and tags
function listTilesByIdAndTags() {
  // Get all tiles on the canvas
  const allTiles = canvas.tiles.placeables;
  
  // Iterate through each tile and retrieve ID and tags
  allTiles.forEach(tile => {
    const tileId = tile.id;
    const tags = tile.document.getFlag("tagger", "tags") || [];
    
    console.log(`Tile ID: ${tileId}, Tags: ${tags.join(", ")}`);
  });
}

// Call the function to list all tiles by ID and tags
listTilesByIdAndTags();

////////////////////////////////////////////////////
// remove all Tile Effects from totm-manager flag //
////////////////////////////////////////////////////

const tileId = 'B9Pu3KqMcgjOomYI'; // Replace with your actual tile ID
const tile = canvas.tiles.get(tileId);
console.log("Tile:", tile);

async function clearTileEffects(tile) {
  // Get the current tileEffects
  let tileEffects = tile.document.getFlag("totm-manager", "tileEffects") || [];
  console.log("Tile Effects before clearing:", tileEffects);

  // Clear the tileEffects
  tileEffects = [];
  await tile.document.setFlag("totm-manager", "tileEffects", tileEffects);

  console.log("Tile Effects after clearing:", tileEffects);
}

if (tile) {
  await clearTileEffects(tile);
} else {
  console.error("Tile not found");
}


export async function updateEffects(target, effectParams, isAdd, isTile = true) {
  if (!target) {
    console.error("No target provided for updating effects.");
    return;
  }

  const flag = isTile ? 'tileEffects' : 'imagePaths';
  let effects = await target.document.getFlag(NAMESPACE, flag) || (isTile ? [] : []);

  if (isTile) {
    if (isAdd) {
      effects.push(effectParams);
    } else {
      effects = effects.filter(effect => effect.filterId !== effectParams.filterId);
    }
    await target.document.setFlag(NAMESPACE, flag, effects);
  } else {
    const imagePaths = effects.map(imgPath =>
      imgPath.img === target.img
        ? { ...imgPath, effects: isAdd ? [...(imgPath.effects || []), effectParams] : (imgPath.effects || []).filter(effect => effect.filterId !== effectParams.filterId) }
      : imgPath
    );
    await target.document.setFlag(NAMESPACE, flag, imagePaths);
  }
}


async function handleTileEffectRemoval(tile, effectName) {
  let tileEffects = tile.document.getFlag("totm-manager", 'tileEffects') || [];
  console.log("Tile Effects Before Removal:", JSON.stringify(tileEffects, null, 2));
  const result = removeEffectFromList(tileEffects, effectName);
  console.log("Tile Effects After Removal:", JSON.stringify(tileEffects, null, 2));
  if (result) {
    await tile.document.setFlag("totm-manager", 'tileEffects', tileEffects);
    console.log(`Effect ${effectName} removed from tile effects`);
  } else {
    console.error(`Failed to remove effect ${effectName} from tile effects`);
  }

  // Remove the effect using TokenMagic
  await removeTokenMagicEffect(tile, effectName, true);
}

async function handleImageEffectRemoval(tile, effectName) {
  const effectElement = Array.from(document.querySelectorAll('.effect-item')).find(el =>
    el.querySelector('.effect-name').textContent === effectName
  );

  if (!effectElement) {
    console.error("Effect element not found.");
    return;
  }

  const imageId = effectElement.querySelector('.effect-target-name').textContent.trim();
  const imagePaths = tile.document.getFlag("totm-manager", 'imagePaths') || [];
  console.log("Image Paths Before Removal:", JSON.stringify(imagePaths, null, 2));

  let image = imagePaths.find(img => img.displayImg === imageId);

  if (image) {
    const result = removeEffectFromList(image.effects, effectName);
    console.log("Image Paths After Removal:", JSON.stringify(imagePaths, null, 2));
    if (result) {
      await tile.document.setFlag("totm-manager", 'imagePaths', imagePaths);
      console.log(`Effect ${effectName} removed from image effects`);
    } else {
      console.error(`Failed to remove effect ${effectName} from image effects`);
    }

    // Remove the effect using TokenMagic
    await removeTokenMagicEffect(tile, effectName, false);
  } else {
    console.error("No image found with the provided ID.");
  }
}

////

export async function setActiveTile(instance, tile) {
  if (!tile) {
    logMessage("TotM - No tile is currently active.");
    return;
  }

  try {
    canvas.tiles.releaseAll();
    tile.control({ releaseOthers: true });
    logMessage(`TotM - Activated tile with ID: ${tile.id}`);
    instance.currentTile = tile; // Update the current tile
    instance.currentTileId = tile.id; // Update the current tile
    logMessage("Check - Current Tile ID: ", instance.currentTileId);
    await loadTileImages(instance, tile); // Load images for the new active tile
    updateTileButtons(instance); // Update button states
  } catch (error) {
    console.error("Error controlling tile:", error);
    ui.notifications.error("Failed to activate tile; Please add tiles.");
  }
}

////

export function deselectActiveTile(instance) {
  instance.currentTile = null;
  instance.currentTileIndex = null;
  instance.render(true);
}

////

// from listeners

// Use the handleTileButtonClick function
    // handleTileButtonClick(instance, event.currentTarget.dataset.tileId);
    // if (instance.currentTile) {
    //   const imagePaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths');
    //   if (!imagePaths) {
    //     console.warn(`No image paths found for tile ${instance.currentTile.id}`);
    //   }
    //   await setActiveImage(instance, index)
    // }

export function handleTileButtonClick(instance, tileId) {
  const tile = canvas.tiles.get(tileId); // Fetch the Tile object using the tileId
  if (tile) {
    activateTile(instance, tile);
    // Call updateTileButtons after rendering
    setTimeout(() => updateTileButtons(instance), 5);
  } else {
    console.error("Tile not found on canvas:", tileId);
  }
}

// // Event handler for tile button clicks
// function handleTileButtonClick(instance, tile) {
//   activateTile(instance, tile);
//   updateTileButtons(instance); // Ensure buttons are updated after activation
// }

////

export function updateActiveTileButton(instance) {
  console.log("updateActiveTileButton called");
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("No currently active tile or missing document property.");
    return;
  }

  // Use Tagger to get the tile's tag
  const tileTag = Tagger.getTags(instance.currentTile)[0]; // Assuming the first tag is the tile name

  if (!tileTag) {
    console.warn("Current tile does not have a tag.");
    return;
  }

  // Log the current tile and tileTag
  console.log(`Current tile ID: ${instance.currentTile.id}, Tile tag: ${tileTag}`);

  // Remove the active class from all tile buttons
  $('.tile-button').removeClass('active-button');

  // Log to ensure buttons are being targeted
  console.log("Removed active class from all tile buttons");

  // Select the button corresponding to the current tile
  const selector = `.tile-button[data-tile-name="${tileTag}"]`;
  console.log("Selecting button with selector: ", selector);

  const button = $(selector);
  if (button.length === 0) {
    console.warn("No button found with selector: ", selector);
    return;
  }

  // Add the active class to the selected button
  button.addClass('active-button');
  console.log("Button after adding class:", button[0]);
  console.log("Added active class to button with selector: ", selector);
}

html.find('.stage-buttons-container').on('click', '.tile-button', async event => {
  const tileName = event.currentTarget.dataset.tileName;
  console.log(`Switching to tile with Name: ${tileName}`);
  await switchToTileByTag(instance, tileName);
  instance.render(true);

  // Call updateActiveTileButton after rendering
  setTimeout(() => updateActiveTileButton(instance), 5);
});

////

// Fix Save !!

export function collectTileData(container) {
  return container.find('.tile-field').map((tileField) => {
    const $tileField = $(tileField);
    const order = $tileField.attr('data-order');
    return {
      name: $tileField.find(`input[name="tile-name-${order}"]`).val(),
      opacity: $tileField.find(`input[name="tile-opacity-${order}"]`).val(),
      tint: $tileField.find(`input[name="tile-tint-${order}"]`).val(),
      order
    };
  }).get();
}


export async function collectAndSaveTileData(instance, html) {
  logMessage("Saving tile data...");
  const container = html.find('#tile-fields-container').length ? html.find('#tile-fields-container') : html.find('.add-image-container');

  if (container.attr('id') === 'tile-fields-container') {
    instance.tiles = collectTileData(container) || [];
  } else {
    instance.imagePaths = collectImagePaths(container) || [];
  }

  // Get filtered tiles to ensure only those with tags are processed
  const filteredTiles = getFilteredTiles();

  for (let tileData of instance.tiles) {
    const tileName = tileData.name;

    // Ensure the tileName is defined and not empty
    if (!tileName || tileName.trim() === '') {
      console.warn("Skipping tile with empty or undefined tileName.");
      continue;
    }

    // Log the tile name before using it
    logMessage(`Processing tile with tileName: ${tileName}`);

    // Find the actual tile by matching the tileName
    const foundTile = filteredTiles.find(tile => tile.document.getFlag(NAMESPACE, 'tileName') === tileName);

    // Log the found tile before calling saveTileDataToFlags
    logMessage(`Found tile:`, foundTile);

    if (foundTile) {
      await saveTileDataToFlags(tileData, foundTile, instance.imagePaths);
    } else {
      console.warn(`No tile found with the tileName: ${tileName}`);
    }
  }
}


export async function handleSaveAndRender(instance, html) {
  logMessage("Saving tile data...");
  await collectAndSaveTileData(instance, html);

  logMessage("Loading tile data...");
  await loadTileData(instance);

  // Update UI components as needed
  updateActiveTileButton(instance);
  updateTileFields(instance);

  logMessage("Rendering the instance...");
  instance.render(true);

  logMessage("Completed handleSaveAndRender");
}



// export async function handleSaveAndRender(instance, html) {
//   logMessage("Saving tile data...");
//   await collectAndSaveTileData(instance, html);

//   logMessage("Loading tile data...");
//   await loadTileData(instance);

//   // logMessage("Updating tile fields...");
//   updateTileFields(instance);

//   // logMessage("Updating stage buttons...");
//   setTimeout(() => { updateActiveTileButton(instance)}, 100);

//   logMessage("Rendering the instance...");
//   instance.render(true);

//   logMessage("Completed handleSaveAndRender");
// }


////

// Helper function to collect tile data
export function collectTileData(container) {
  const tiles = [];
  container.find('.tile-field').each(function() {
    const order = $(this).data('order');
    const tileName = $(this).find(`input[name="tile-name-${order}"]`).val();
    const opacity = $(this).find(`input[name="tile-opacity-${order}"]`).val();
    const tint = $(this).find(`input[name="tile-tint-${order}"]`).val();

    tiles.push({
      order,
      name: tileName,
      opacity,
      tint
    });
  });
  console.log('Collected tile data:', tiles);
  return tiles;
}

// Helper function to collect image paths
export function collectImagePaths(container) {
  const pathListItems = container.find('#image-path-list .form-field');
  return pathListItems.map((_, pathItem) => {
    const $pathItem = $(pathItem);
    const img = $pathItem.find('.path-field').data('img');
    const tags = $pathItem.find('.tag-field').val().split(',').map(tag => tag.trim());
    const color = $pathItem.find('.color-picker').val();
    return { img, displayImg: img.split('/').pop(), tags, color };
  }).get();
}


//// Deleting Tiles

// Save data to tile document
export async function saveTileData(instance, html) {
  console.log("Saving tile data...");
  const container = html.find('#tile-fields-container').length ? html.find('#tile-fields-container') : html.find('.add-image-container');

  if (container.attr('id') === 'tile-fields-container') {
    instance.tiles = collectTileData(container);
  } else {
    instance.imagePaths = collectImagePaths(container);
  }

  for (let tile of instance.tiles) {
    if (tile.name.trim() === '') {
      console.warn("Skipping tile with empty name.");
      continue;
    }
    const foundTile = findTileByTag(tile.name);

    if (foundTile) {
      await saveTileFlags(tile, foundTile, instance.imagePaths);
    } else {
      console.warn(`No tile found with the name: ${tile.name}`);
    }
  }
}

export async function handleSaveAndRender(instance, html) {
  console.log("Saving tile data...");
  await saveTileData(instance, html);

  console.log("Loading tile data...");
  await loadTileData(instance);

  console.log("Updating stage buttons...");
  updateStageButtons(instance);

  console.log("Updating tile fields...");
  updateTileFields(instance);

  console.log("Rendering the instance...");
  instance.render(true);

  console.log("Completed handleSaveAndRender");
}

export async function deleteTileData(instance, order, html) {
  if (!instance || !instance.tiles) {
    console.error("Instance or instance.tiles is undefined");
    return;
  }

  console.log("Before deletion, instance.tiles:", instance.tiles);

  // Find the tile to be deleted
  const tileToDelete = instance.tiles.find(tile => Number(tile.order) === order);
  if (!tileToDelete) {
    console.warn(`Tile with order ${order} not found in instance`);
    return;
  }

  // Log tile to be deleted
  console.log("Tile to be deleted:", tileToDelete);

  // Remove tile from instance.tiles
  instance.tiles = instance.tiles.filter(tile => Number(tile.order) !== order);
  console.log("After deletion, instance.tiles:", instance.tiles);

  if (!tileToDelete) {
    console.warn(`Tile with order ${order} not found in instance`);
    return;
  }

  // Remove tile from DOM
  html.find(`.tile-field[data-order="${order}"]`).remove();

  if (tileToDelete) {
    // Remove flags from the tile document
    const foundTile = findTileByTag(tileToDelete.name);
    console.log("Tile delete name: ${foundTile}");
    if (foundTile) {
      await foundTile.document.unsetFlag(NAMESPACE, 'tileName');
      await foundTile.document.unsetFlag(NAMESPACE, 'opacity');
      await foundTile.document.unsetFlag(NAMESPACE, 'tint');
      await foundTile.document.unsetFlag(NAMESPACE, 'order');
      await foundTile.document.unsetFlag(NAMESPACE, 'imagePaths');

      console.log("Tile Flags Unset!");
    }
  }
  // Synchronize the internal state with the updated canvas data
  console.log("After updating orders, instance.tiles:", instance.tiles);
}

export async function handleDeleteAndSave(instance, order, html) {
  await deleteTileData(instance, order, html);  // Delete the tile field
  await saveTileData(instance, html);       // Save the updated tile data
  await loadTileData(instance);             // Reload the latest data
  // updateStageButtons(instance);             // Update the UI stage buttons
  // updateTileFields(instance);               // Update the UI tile fields

}
// Helper function to collect tile data
export function collectTileData(container) {
  return container.find('.tile-field').map((index, tileField) => {
    const $tileField = $(tileField);
    const order = $tileField.attr('data-order');
    return {
      name: $tileField.find(`input[name="tile-name-${order}"]`).val(),
      opacity: $tileField.find(`input[name="tile-opacity-${order}"]`).val(),
      tint: $tileField.find(`input[name="tile-tint-${order}"]`).val(),
      order
    };
  }).get();
}

// Helper function to collect image paths
export function collectImagePaths(container) {
  const pathListItems = container.find('#image-path-list .form-field');
  return pathListItems.map((index, pathItem) => {
    const $pathItem = $(pathItem);
    const img = $pathItem.find('.path-field').data('img');
    const tags = $pathItem.find('.tag-field').val().split(',').map(tag => tag.trim());
    const color = $pathItem.find('.color-picker').val();
    return { img, displayImg: img.split('/').pop(), tags, color };
  }).get();
}

// Helper function to save tile flags
export async function saveTileFlags(tile, foundTile, imagePaths) {
  console.log(`Saving flags for tile: ${tile.name}`);
  await foundTile.document.setFlag(NAMESPACE, 'tileName', tile.name);
  await foundTile.document.setFlag(NAMESPACE, 'opacity', tile.opacity);
  await foundTile.document.setFlag(NAMESPACE, 'tint', tile.tint);
  await foundTile.document.setFlag(NAMESPACE, 'order', tile.order);

  console.log("Flags saved:", {
    tileName: tile.name,
    opacity: tile.opacity,
    tint: tile.tint,
    order: tile.order
  });


  if (imagePaths) {
    const existingPaths = await foundTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    const pathsToSave = imagePaths.map((path, index) => ({
      img: path.img,
      displayImg: path.displayImg,
      tags: path.tags,
      color: path.color || existingPaths[index]?.color
    }));
    await foundTile.document.setFlag(NAMESPACE, 'imagePaths', pathsToSave);

    const currentImgIndex = await foundTile.document.getFlag(NAMESPACE, 'imgIndex') || 0;
    await foundTile.document.setFlag(NAMESPACE, 'imgIndex', currentImgIndex >= pathsToSave.length ? pathsToSave.length - 1 : currentImgIndex);
  }
}


    // // Get the current tile data
    // const tileData = {
    //   name: instance.currentTile.document.getFlag(NAMESPACE, 'tileName'),
    //   opacity: instance.currentTile.document.getFlag(NAMESPACE, 'opacity'),
    //   tint: instance.currentTile.document.getFlag(NAMESPACE, 'tint'),
    //   order: instance.currentTile.document.getFlag(NAMESPACE, 'order')
    // };

// logMessage("Saving data for tile...");

// export async function collectAndSaveTileData(instance, tileData) {
//   logMessage("Saving tile data for tile...");

//   // Ensure the tileName is defined and not empty
//   let tileName = tileData.name;

//   // Check if the tile name is empty or undefined
//   if (!tileName || tileName.trim() === '') {
//     const order = tileData.order;
//     const tileField = document.querySelector(`input[name="tile-name-${order}"]`);

//     if (tileField) {
//       tileName = tileField.value.trim();
//       tileData.name = tileName;
//     }

//     if (!tileName) {
//       // Generate a temporary tileName if it's still not provided
//       tileName = `tile-${Date.now()}`;
//       tileData.name = tileName;
//       logMessage(`Generated temporary tileName: ${tileName}`);
//     }
//   }

//   // Log the tile name before using it
//   logMessage(`Processing tile with tileName: ${tileName}`);

//   // Set flags first
//   const foundTile = findAndSwitchToTileByTag(instance, tileName, false);

//   if (foundTile) {
//     // Log the found tile before calling saveTileDataToFlags
//     logMessage("Found tile:", foundTile);
//     await saveTileDataToFlags(tileData, foundTile, instance.imagePaths);
//   } else {
//     console.warn(`No tile found with the tileName: ${tileName}`);
//   }
// }

////

function removeEffectFromList(effects, effectName) {
  let removed = false;

  effects.forEach((effect, i) => {
    if (Array.isArray(effect)) {
      effect.forEach((nestedEffect, j) => {
        if (nestedEffect.filterId === effectName || nestedEffect.tmFilterId === effectName) {
          effect.splice(j, 1);
          if (effect.length === 0) {
            effects.splice(i, 1);
          }
          removed = true;
        }
      });
    } else if (effect.filterId === effectName || effect.tmFilterId === effectName) {
      effects.splice(i, 1);
      removed = true;
    }
  });

  return removed;
}



// // Ensure the 'modify-effect-button' exists before attaching the listener
// const modifyEffectButton = document.getElementById('modify-effect-button');
// if (modifyEffectButton) {
//   modifyEffectButton.addEventListener('click', (ev) => {
//     ev.preventDefault();
//     const target = document.getElementById('target-dropdown').value;
//     const effect = document.getElementById('effect-dropdown').value;
//     new ModifyEffectForm({ target, effect, instance }).render(true);
//   });
// } else {
//   console.warn("modify-effect-button not found");
// }


// Activate Features for Tiles
async toggleFeaturesBasedOnTags(imageTags) {
  const playlists = game.playlists.contents;
  const scene = game.scenes.active;

  // Fetch the current image based on the new index
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  const currentImage = imagePaths[currentIndex];

  // Fetch tags for the current image and toggle features based on these tags
  const imageTags = currentImage.tags || [];
  await this.toggleFeaturesBasedOnTags(imageTags);
  console.log("Cycled to new image at index:", currentIndex, "Path:", currentImage.img);


  // Process each light in the scene
  // Exit the function if the 'sceneLighting' tag is not in the image tags
  if (!imageTags.includes('sceneLighting')) {
    return; // Do nothing as the image does not contain the 'sceneLighting' tag
  }

  // Process each light in the scene
  for (let light of scene.lights.contents) {
    const lightTags = await Tagger.getTags(light);

    // Only process lights that also have the 'sceneLighting' tag
    if (lightTags.includes('sceneLighting')) {
      // Determine if the light should be on
      // A light should be on if there is any matching tag between the image tags and the light tags,
      // excluding the 'sceneLighting' tag itself.
      const lightShouldBeOn = imageTags.some(tag => tag !== 'sceneLighting' && lightTags.includes(tag));

      // Update the light visibility
      // Turn the light on if there's a match, off if not.
      await light.update({ hidden: !lightShouldBeOn });
    }
  }

  // Handle Sounds in Playlists TODO: fix sounds playing on other images
  for (let playlist of playlists) {
    for (let tag of imageTags) {
      if (tag.startsWith("play-")) {
        const playlistId = tag.substring(5); // Extract the ID part after 'play-'
        if (playlistId === playlist.id) {
          console.log("Checking playlist:", playlist.name);
          try {
            // Stop any currently playing sound
            const currentlyPlayingSound = playlist.sounds.find(s => s.playing);
            if (currentlyPlayingSound) {
              await playlist.stopSound(currentlyPlayingSound);
              console.log("Stopped sound in playlist:", playlist.name);
            }

            // Play the first available sound
            const soundToPlay = playlist.sounds.find(s => !s.playing);
            if (soundToPlay) {
              await playlist.playSound(soundToPlay);
              console.log("Playing sound in playlist:", playlist.name);
            }
          } catch (error) {
            console.error("Error controlling sound in playlist:", playlist.name, error);
          }
        }
      }
    }
  }

  // Execute Macros
  for (let macro of game.macros.contents) {
    for (let tag of imageTags) {
      if (tag.startsWith("macro-")) {
        const macroId = tag.substring(6); // Extract the ID part after 'macro-'
        if (macroId === macro.id) {
          macro.execute();
        }
      }
    }
  }
}


---

Replace listener.js, tiles.js, tiles-utils.js to get proper functionality
