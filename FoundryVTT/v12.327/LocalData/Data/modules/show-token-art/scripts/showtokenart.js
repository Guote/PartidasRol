/* global game, Hooks, ImagePopout, CONST */

class ShowArt {
  // Registers keybindings to show art for tokens and tiles.
  // The default binding is Shift + I to show the artwork, and
  // Shift + O to share the actor's avatar artwork.

  // Keybinding for opening the token art
  static registerBindings () {
    game.keybindings.register('show-token-art', 'token-art-open', {
      name: 'STA.keybind.tokenImage.name',
      hint: 'STA.keybind.tokenImage.hint',
      editable: [
        {
          key: 'KeyI',
          modifiers: ['Shift']
        }
      ],
      onDown: keybind => this.handleShowArt(false)
    })
    // Keybinding for opening the avatar art
    game.keybindings.register('show-token-art', 'avatar-art-open', {
      name: 'STA.keybind.actorImage.name',
      hint: 'STA.keybind.actorImage.hint',
      editable: [
        {
          key: 'KeyO',
          modifiers: ['Shift']
        }
      ],
      onDown: keybind => this.handleShowArt(true)
    })
  }

  // Displays an image popup with the image and title from the
  // selected or targeted actor
  static handleShowArt (altImage) {
    const targetedObject = game.user.targets
    const selectedObject = game.canvas.activeLayer.controlled

    this.checkDuplicates(targetedObject, selectedObject, altImage).forEach(object => {
      // Go through the newly created array and display all
      // images that need displaying
      this.createImagePopup(object.actorImage, object.actorTitle)
    })
  }

  // Function to check all selected and targeted tokens and ensure we won't
  // display any duplicates
  static checkDuplicates (targetedObject, selectedObject, altImage) {
    const allImages = []

    // Run through targeted objects while preventing duplicates
    targetedObject.forEach(object => {
      const { image, title } = this.getObjectData(object, altImage)
      if (!image) return

      // Check for duplicates
      const isDuplicate = allImages.some(actor => actor.actorImage === image)

      // Push the object if it's not a duplicate
      if (!isDuplicate) {
        allImages.push({ actorImage: image, actorTitle: title })
      }
    })

    // Run through selected objects while preventing duplicates
    selectedObject.forEach(object => {
      const { image, title } = this.getObjectData(object, altImage)
      if (!image) return

      // Check for duplicates
      const isDuplicate = allImages.some(actor => actor.actorImage === image)

      // Push the object if it's not a duplicate
      if (!isDuplicate) {
        allImages.push({ actorImage: image, actorTitle: title })
      }
    })

    return allImages
  }

  // Return the apprpriate image and title for the token
  static getObjectData (object, altImage) {
    // Make sure it's a token, or things get a bit messy
    if (object.document.documentName === 'Token') {
      return this.getTokenData(object, altImage)
    }

    // If it's not a token, return null
    return { image: null, title: '' }
  }

  // Get data for the necessary token
  static getTokenData (token, avatarImage) {
    // Token to get the data for
    const actor = this.getTokenActor(token.document)
    // Grab token images
    const images = this.getTokenImages(token.document, actor)
    // Grab token titles
    const titles = this.getTokenTitles(token.document, actor)

    // Return the image and title;
    // If avatarImage is true, show the avatar
    // If not, show the token image and token name
    return {
      image: avatarImage ? images.actor : images.token,
      title: avatarImage ? titles.actor : titles.token
    }
  }

  // Creates and renders a custom image popout
  static createImagePopup (image, title) {
    return new MediaPopout(image, {
      title,
      shareable: true
    }).render(true)
  }

  // Retrieves the token of the given actor
  static getTokenActor (token) {
    return game.actors.get(token.actorId)
  }

  // Grab the title of the token
  static getTokenTitles (token, actor) {
    const displayModes = CONST.TOKEN_DISPLAY_MODES
    const displayName = token.displayName

    // If the "displayName" setting is set to "Always"
    // or "On Hover," then show the name on the token
    // Using the name on the token is most accurate,
    // and prevents accidental spoilers of a character's
    // "true name" if the one on the actor sheet is different
    // from the one on the token.
    if (displayName === displayModes.ALWAYS || displayName === displayModes.HOVER) {
      return {
        actor: token.name,
        token: token.name
      }
    }

    // If "displayName" is anything else, just show
    // "Actor Image" or "Token Image"
    return {
      actor: game.i18n.localize('STA.ActorImg'),
      token: game.i18n.localize('STA.TokenImg')
    }
  }

  // Determine the correct image paths
  static getTokenImages (token, actor) {
    const mysteryDefaults = [
      'icons/svg/mystery-man.svg', // Foundry default icon
      'systems/pf2e/icons/default-icons/character.svg', // PF2e default icon
      'systems/pf2e/icons/default-icons/npc.svg', // PF2e default icon for NPCs
      'systems/pf2e/icons/default-icons/familiar.svg', // PF2e default icon for familiars
      'systems/pf2e/icons/default-icons/hazard.svg', // PF2e default icon for hazards
      'systems/pf2e/icons/default-icons/vehicle.svg' // PF2e default icon for vehicles
    ]

    // Set the actor image and token image
    let actorImg = token.actor.img || actor.img
    let tokenImg = token.texture.src

    // Check if either actorImg or tokenImg are set to a default icon
    const avatarMystery = mysteryDefaults.includes(actorImg)
    const tokenMystery = mysteryDefaults.includes(tokenImg)

    // If either of the actorImg or tokenImg are set to default
    // then replace the default with the opposing image path
    if (avatarMystery) {
      actorImg = avatarMystery ? tokenImg : actorImg
    } else if (avatarMystery) {
      tokenImg = tokenMystery ? actorImg : tokenImg
    }

    // Return the resulting actor and token images after all data manipulation is done
    return { actor: actorImg, token: tokenImg }
  }
}

// Just a basic popout for media
class MediaPopout extends ImagePopout {
  constructor (src, options = {}) {
    super(src, options)

    this.options.template = 'modules/show-token-art/templates/art-popout.hbs'
  }

  /** @override */
  async getData (options) {
    const data = await super.getData()
    data.isVideo = this.video

    return data
  }
}

Hooks.once('init', ShowArt.registerBindings.bind(ShowArt))
