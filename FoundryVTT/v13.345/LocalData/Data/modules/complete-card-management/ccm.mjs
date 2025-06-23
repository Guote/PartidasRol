const MODULE_ID = "complete-card-management";
const MoveCardType = `${MODULE_ID}.moveCard`;

/**
 * @param {string} valuePath    - Path on the Card document
 * @param {(original?: any) => any} valueMod - Callback to transform the fetched value
 * @param {object} [object] - Object to fetch values from, otherwise it uses each individual card
 * @param {string} [targetPath] - Path of value to fetch
 * @param {boolean} [ignoreLock=false] - Whether to allow updating a locked card
 * @returns
 */
function generateUpdates(valuePath, valueMod, {object, targetPath = "", ignoreLock = false} = {}) {
  let fetchedValue;
  if (object) fetchedValue = foundry.utils.getProperty(object, targetPath);
  const updates = canvas.cards.controlled.reduce((cards, o) => {
    if (!ignoreLock && o.document.locked) return cards;
    const d = fromUuidSync(o.id);
    const updateData = {
      _id: d.id,
      [valuePath]: valueMod(fetchedValue === undefined ? o : fetchedValue)
    };
    if (d instanceof Cards) {
      cards.cardStackUpdates.push(updateData);
    } else {
      const parentSlot = cards[d.parent.id];
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
    }
    return cards;
  }, {cardStackUpdates: []});

  return updates;
}

/**
 * Loops through an array of updates matching the ID of cards to an update array for their embedded collection
 * @param {Record<string, Array<{ _id: string } & Record<string, unknown>>>} processedUpdates
 */
async function processUpdates(processedUpdates) {
  for (const [id, updates] of Object.entries(processedUpdates)) {
    if (id === "cardStackUpdates") await Cards.implementation.updateDocuments(updates);
    else await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
  }
}

/**
 * Loop through player hands to see if the PlayerList needs to be re-rendered
 * @param {Card} card - The card being created or deleted
 * @param {"create" | "delete"} action
 */
function checkHandDisplayUpdate(card, action) {
  let render = false;

  for (const user of game.users) {
    const showCardCount = user.getFlag(MODULE_ID, "showCardCount");
    if (!showCardCount) continue;
    const handId = user.getFlag(MODULE_ID, "playerHand");
    const hand = game.cards.get(handId);
    render ||= card.parent === hand;
  }

  if (render) {
    if (action === "delete") setTimeout(() => ui.players.render(), 100);
    else ui.players.render();
  }
}

/**
 * Places a card on the scene or updates its location
 * @param {Card | Cards} card      Card or Cards to place
 * @param {object} data            Data for the CanvasCard
 * @param {number} data.x          Center of the card's horizontal location
 * @param {number} data.y          Center of the card's vertical location
 * @param {number} [data.rotation] Rotation on the canvas (default: The card's rotation)
 * @param {number} [data.sort]     Sort value on the canvas (default: The card's sort)
 * @param {string} [data.sceneId]  ID of the scene to place (default: the current scene)
 * @returns {Card | Card}          The updated document
 */
async function placeCard(card, data = {}) {
  const scene = game.scenes.get(data.sceneId) ?? canvas.scene;
  if (!scene) throw new Error("Not viewing a canvas to place cards");
  if (isNaN(data.x) || isNaN(data.y)) throw new Error("You must provide numerical x and y canvas coordinates");
  if (!scene.canUserModify(game.user, "update")) {
    if (game.users.activeGM) {
      ccm.socket.emit("placeCardHandler", {
        uuid: card.uuid,
        sceneId: scene.id,
        ...data
      });
      return;
    }
    throw new Error("Placing a card requires updating the scene");
  }
  const canvasCardData = {
    x: Math.clamp(data.x - ((card.width ?? 2) * canvas.grid.sizeX) / 2, 0, canvas.dimensions.width),
    y: Math.clamp(data.y - ((card.height ?? 3) * canvas.grid.sizeY) / 2, 0, canvas.dimensions.height),
    rotation: data.rotation ?? card.rotation,
    sort: data.sort ?? card.sort
  };
  const currentCards = new Set(scene.getFlag(MODULE_ID, "cardCollection")).add(card.uuid);
  await scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  return card.setFlag(MODULE_ID, scene.id, canvasCardData);
}

/**
 * Removes a card from the scene
 * @param {Card | Cards} card
 * @returns {Promise<Card | Cards>}      A promise that resolves to the updated card or cards document.
 */
async function removeCard$1(card) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  const sceneId = canvas.scene.id;
  return card.unsetFlag(MODULE_ID, sceneId);
}

/**
 * Purges cards without relevant CanvasCard data from the current scene
 * @returns {Scene} The updated scene
 */
async function cleanCardCollection() {
  if (!canvas.scene) throw new Error("You must be viewing a scene to clean its collection");
  if (!canvas.scene.canUserModify(game.user, "update")) throw new Error("This function requires updating the scene");
  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
  const refreshed = [];
  for (const uuid of currentCards) {
    const card = fromUuidSync(uuid);
    if (!card) continue;
    if (card.getFlag(MODULE_ID, canvas.scene.id)) refreshed.push(uuid);
  }
  return canvas.scene.setFlag(MODULE_ID, "cardCollection", refreshed);
}

/**
 * Creates a grid of placed cards
 * @param {object} config                       Mandatory configuration object
 * @param {Cards} config.from                   The Cards document to draw from
 * @param {Cards} config.to                     The Cards document to put the cards into
 * @param {number} config.rows                  Number of rows to layout
 * @param {number} config.columns               Number of columns to layout
 * @param {object} [options]                    Options modifying the layout
 * @param {number} [options.how=0]              How to draw, a value from CONST.CARD_DRAW_MODES
 * @param {object} [options.updateData={}]      Modifications to make to each Card as part of
 *                                              the draw operation, for example the displayed face
 * @param {number} [options.horizontalSpacing]  Spacing between cards horizontally
 *                                              Defaults to `canvas.grid.sizeX`
 * @param {number} [options.verticalSpacing]    Spacing between cards vertically
 *                                              Defaults to `canvas.grid.sizeY`
 * @param {number} [options.defaultWidth=2]     Default width of a card in grid squares
 * @param {number} [options.defaultHeight=3]    Default height of a card in grid squares
 * @param {number} [options.offsetX]            Adjust X offset from the top left of the scene
 * @param {number} [options.offsetY]            Adjust Y offset from the top left of the scene
 * @param {number} [options.sceneId]            Scene ID to play cards to. Defaults to canvas.scene
 * @returns {Promise<Card[]>}                   A promise that resolves to the drawn cards.
 */
async function grid(config, options = {}) {
  const scene = options.sceneId ? game.scenes.get(options.sceneId) : canvas.scene;

  if (!scene) {
    if (!options.sceneId) throw new Error("Not viewing a scene to place cards.");
    else throw new Error(`Could not find scene with ID '${options.sceneId}'.`);
  }
  if (config.from.type !== "deck") {
    throw new Error("You can only create a grid with cards retrieved from a deck.");
  }
  if (!scene.canUserModify(game.user, "update")) {
    throw new Error("Placing a card requires permission to update the scene.");
  }

  const {sceneHeight, sceneWidth, sceneX, sceneY} = scene.dimensions;
  const cardWidth = scene.grid.sizeX * (options.defaultWidth ?? 2);
  const cardHeight = scene.grid.sizeY * (options.defaultHeight ?? 3);
  const spacing = {
    x: options.horizontalSpacing ?? scene.grid.sizeX,
    y: options.verticalSpacing ?? scene.grid.sizeY
  };

  // Only need spacing between cards, not either end, so 1 less than # cards
  const totalHeight = config.rows * (spacing.y + cardHeight) - spacing.y;
  const totalWidth = config.columns * (spacing.x + cardWidth) - spacing.x;

  if ((totalWidth > sceneWidth) || (totalHeight > sceneHeight)) {
    throw new Error("Not enough space on the scene to place cards.");
  }

  const drawCount = config.rows * config.columns;
  const cards = await config.to.draw(config.from, drawCount, {
    how: options.how,
    updateData: options.updateData ?? {}
  });

  const offsetX = sceneX + (options.offsetX ?? 0);
  const offsetY = sceneY + (options.offsetY ?? 0);

  const updateData = [];

  for (let i = 0; i < config.rows; i++) {
    for (let j = 0; j < config.columns; j++) {
      const card = cards[j * config.rows + i];
      const cardUpdate = {
        _id: card._id,
        [`flags.${MODULE_ID}.${scene.id}`]: {
          x: offsetX + j * (cardWidth + spacing.x),
          y: offsetY + i * (cardHeight + spacing.y),
          rotation: card.rotation,
          sort: card.sort
        }
      };
      updateData.push(cardUpdate);
    }
  }

  await config.to.updateEmbeddedDocuments("Card", updateData);
  const currentCards = new Set(scene.getFlag(MODULE_ID, "cardCollection")).union(
    new Set(cards.map((card) => card.uuid))
  );
  await scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  if (options.sceneId) ui.notifications.info(game.i18n.format("CCM.API.LayoutScene", {name: scene.name}));
  return cards;
}

/* -------------------------------------------------- */

/**
 * Creates a pyramid of placed cards
 * @param {object} config                       Mandatory configuration object
 * @param {Cards} config.from                   The Cards document to draw from
 * @param {Cards} config.to                     The Cards document to put the cards into
 * @param {number} config.base                  Number of cards per side
 * @param {object} [options]                    Options modifying the layout
 * @param {number} [options.how=0]              How to draw, a value from CONST.CARD_DRAW_MODES
 * @param {object} [options.updateData={}]      Modifications to make to each Card as part of
 *                                              the draw operation, for example the displayed face
 * @param {number} [options.horizontalSpacing]  Spacing between cards horizontally
 *                                              Defaults to `canvas.grid.sizeX`
 * @param {number} [options.verticalSpacing]    Spacing between cards vertically
 *                                              Defaults to `canvas.grid.sizeY`
 * @param {number} [options.defaultWidth=2]     Default width of a card in grid squares
 * @param {number} [options.defaultHeight=3]    Default height of a card in grid squares
 * @param {number} [options.offsetX]            Adjust X offset from the top left of the scene
 * @param {number} [options.offsetY]            Adjust Y offset from the top left of the scene
 * @param {"UP" | "DOWN" | "LEFT" | "RIGHT"} [options.direction] Direction to orient the pyramid
 * @param {number} [options.sceneId]            Scene ID to play cards to. Defaults to canvas.scene
 * @returns {Promise<Card[]>}                   A promise that resolves to the drawn cards.
 */
async function triangle(config, options = {}) {
  const scene = options.sceneId ? game.scenes.get(options.sceneId) : canvas.scene;

  if (!scene) {
    if (!options.sceneId) throw new Error("Not viewing a scene to place cards.");
    else throw new Error(`Could not find scene with ID '${options.sceneId}'.`);
  }
  if (config.from.type !== "deck") {
    throw new Error("You can only create a triangle with cards retrieved from a deck.");
  }
  if (!scene.canUserModify(game.user, "update")) {
    throw new Error("Placing a card requires permission to update the scene.");
  }

  const {sceneHeight, sceneWidth, sceneX, sceneY} = scene.dimensions;
  const cardWidth = scene.grid.sizeX * (options.defaultWidth ?? 2);
  const cardHeight = scene.grid.sizeY * (options.defaultHeight ?? 3);
  const spacing = {
    x: options.horizontalSpacing ?? scene.grid.sizeX,
    y: options.verticalSpacing ?? scene.grid.sizeY
  };
  const direction = options.direction ?? "UP";
  const direction_x = direction === "LEFT" ? -1 : 1;
  const direction_y = direction === "UP" ? -1 : 1;
  const isVertical = ["UP", "DOWN"].includes(direction);

  // Only need spacing between cards, not either end, so 1 less than # cards
  const totalHeight = config.base * (spacing.y + cardHeight) - spacing.y;
  const totalWidth = config.base * (spacing.x + cardWidth) - spacing.x;

  if ((totalWidth > sceneWidth) || (totalHeight > sceneHeight)) {
    throw new Error("Not enough space on the scene to place cards.");
  }

  const drawCount = (config.base * (config.base + 1)) / 2;
  const cards = await config.to.draw(config.from, drawCount, {
    how: options.how,
    updateData: options.updateData ?? {}
  });

  const updateData = [];

  for (let i = 0; i < config.base; i++) {
    let offsetX = sceneX + (options.offsetX ?? 0);
    let offsetY = sceneY + (options.offsetY ?? 0);
    switch (direction) {
      case "DOWN":
        offsetX += (spacing.x + cardWidth) * 0.5 * i;
        break;
      case "UP":
        offsetX += (spacing.x + cardWidth) * 0.5 * i;
        offsetY += totalHeight - cardHeight;
        break;
      case "RIGHT":
        offsetY += (spacing.y + cardHeight) * 0.5 * i;
        break;
      case "LEFT":
        offsetY += (spacing.y + cardHeight) * 0.5 * i;
        offsetX += totalWidth - cardWidth;
        break;
    }
    for (let j = 0; j < (config.base - i); j++) {
      const index = i * config.base + j - ((i * (i - 1)) / 2);
      const loop_x = isVertical ? j : i;
      const loop_y = isVertical ? i : j;
      const card = cards[index];
      const cardUpdate = {
        _id: card._id,
        [`flags.${MODULE_ID}.${scene.id}`]: {
          x: offsetX + loop_x * (cardWidth + spacing.x) * direction_x,
          y: offsetY + loop_y * (cardHeight + spacing.y) * direction_y,
          rotation: card.rotation,
          sort: card.sort
        }
      };
      updateData.push(cardUpdate);
    }
  }

  await config.to.updateEmbeddedDocuments("Card", updateData);
  const currentCards = new Set(scene.getFlag(MODULE_ID, "cardCollection")).union(
    new Set(cards.map((card) => card.uuid))
  );
  await scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  if (options.sceneId) ui.notifications.info(game.i18n.format("CCM.API.LayoutScene", {name: scene.name}));
  return cards;
}

const {HandlebarsApplicationMixin: HandlebarsApplicationMixin$2, ApplicationV2} = foundry.applications.api;

/**
 * Scry on a number of cards in a deck, hand, or pile.
 * @param {Cards} deck                                            The deck, hand, or pile on which to spy.
 * @param {object} [options={}]                                   Options that modify the scrying.
 * @param {number} [options.amount=1]                             The number of cards to reveal.
 * @param {number} [options.how=CONST.CARD_DRAW_MODES.FIRST]      From where in the deck to draw the cards to scry on.
 */
async function scry(deck, {amount = 1, how = CONST.CARD_DRAW_MODES.FIRST} = {}) {
  const cards = deck._drawCards(amount, how);
  const application = ScryDialog.create(cards, {how});
  ChatMessage.implementation.create({
    content: game.i18n.format("CCM.CardSheet.ScryingMessage", {
      name: game.user.name,
      number: cards.length,
      deck: deck.name
    })
  });
  return application;
}

/**
 * Utility class for scrying.
 */
class ScryDialog extends HandlebarsApplicationMixin$2(ApplicationV2) {
  /**
   * @class
   * @param {object} [options]                                      Application rendering options.
   * @param {Card[]} [options.cards]                                The revealed cards.
   * @param {number} [options.how=CONST.CARD_DRAW_MODES.FIRST]      From where in the deck to draw the cards to scry on.
   */
  constructor({cards, how, ...options} = {}) {
    super(options);
    this.#cards = cards ?? [];
    this.#deck = cards[0]?.parent ?? null;
    this.#how = how;
  }

  /* -------------------------------------------------- */

  /**
   * Factory method to create an instance of this application.
   * @param {Card[]} cards                                          The revealed cards.
   * @param {object} [options]                                      Application rendering options.
   * @param {number} [options.how=CONST.CARD_DRAW_MODES.FIRST]      From where in the deck to draw the cards to scry on.
   * @returns {Promise<ScryDialog>}                                 A promise resolving to the created application instance.
   */
  static create(cards, {how = CONST.CARD_DRAW_MODES.FIRST, ...options} = {}) {
    const application = new this({cards, how, ...options});
    application.render({force: true});
    return application;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "scry"],
    modal: true,
    rejectClose: false,
    position: {
      width: 600,
      top: 100,
      height: "auto"
    },
    window: {
      icon: "fa-solid fa-eye",
      contentClasses: ["standard-form"]
    },
    actions: {
      shuffleReplace: this.#shuffleCards,
      confirm: this.#confirm,
      playCard: this.#playCard,
      moveCard: this.#moveCard
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    cards: {template: "modules/complete-card-management/templates/card/scrying.hbs"},
    footer: {template: "modules/complete-card-management/templates/card/scrying-footer.hbs"}
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};
    context.cards = this.#cards;
    context.shuffle = this.#how !== CONST.CARD_DRAW_MODES.RANDOM;
    context.isTop = this.#how === CONST.CARD_DRAW_MODES.TOP;
    context.isBottom = this.#how === CONST.CARD_DRAW_MODES.BOTTOM;
    return context;
  }

  /** @inheritdoc */
  _onRender(...T) {
    super._onRender(...T);
    // Can't rearrange random pulls
    if (this.#how !== CONST.CARD_DRAW_MODES.RANDOM) this.#setupDragDrop();
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The cards being revealed.
   * @type {Card[]}
   */
  #cards = null;

  /* -------------------------------------------------- */

  /**
   * Reference to the method in which the cards were drawn from the deck.
   * @type {number}
   */
  #how = null;

  /* -------------------------------------------------- */

  /**
   * The deck from which cards are being revealed.
   * @type {Cards}
   */
  #deck = null;

  /**
   * A getter to align functionality with proper deck sheets
   * @returns {Cards}
   */
  get document() {
    return this.#deck;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("CCM.CardSheet.ScryingTitle", {name: this.#deck.name});
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /**
   * Set up drag and drop.
   */
  #setupDragDrop() {
    const dd = new foundry.applications.ux.DragDrop({
      dragSelector: "[data-card-id]",
      dropSelector: "fieldset.cards",
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      }
    });
    dd.bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Handle dragstart event.
   * @param {DragEvent} event     The triggering drag event.
   */
  _onDragStart(event) {
    const id = event.currentTarget.closest("[data-card-id]")?.dataset.cardId;
    const card = this.#deck.cards.get(id);
    if (card) event.dataTransfer.setData("text/plain", JSON.stringify(card.toDragData()));
  }

  /* -------------------------------------------------- */

  /**
   * Drag and drop the
   * @param {DragEvent} event     The triggering drag event.
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data.type !== "Card") return;
    const card = await Card.implementation.fromDropData(data);
    if (card.parent.id !== this.document.id) {
      ui.notifications.error("CCM.Warning.NoScryDrop", {localize: true});
      return;
    }
    const currentIndex = this.#cards.findIndex(c => c.id === card.id);
    /** @type {HTMLElement} */
    const target = event.target.closest("[data-card-id]");
    const targetCard = this.document.cards.get(target?.dataset.cardId);
    if (card.id === targetCard) return; // Don't sort on self
    if (targetCard) {
      const targetIndex = this.#cards.findIndex(c => c.id === targetCard.id);
      this.#cards.splice(targetIndex, 0, this.#cards.splice(currentIndex, 1)[0]);
    }

    return this.render();
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Shuffle the order of the revealed cards.
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static #shuffleCards(event, target) {
    // Cannot shuffle back in randomly drawn cards yet.
    if (this.#how === CONST.CARD_DRAW_MODES.RANDOM) return;

    this.close();
    const {min, max} = this.#cards.reduce((acc, card) => {
      const sort = card.sort;
      acc.min = Math.min(acc.min, sort);
      acc.max = Math.max(acc.max, sort);
      return acc;
    }, {min: Infinity, max: -Infinity});

    const order = Array.fromRange(max - min + 1, min)
      .map(n => ({value: n, sort: Math.random()}))
      .sort((a, b) => a.sort - b.sort)
      .map(o => o.value);

    const updates = this.#cards.map((card, i) => {
      return {_id: card.id, sort: order[i]};
    });

    const canPerform = this.#deck.isOwner;
    if (canPerform) this.#deck.updateEmbeddedDocuments("Card", updates);
    else {
      const userId = game.users.getDesignatedUser(u => u.active && this.#deck.testUserPermission(u, "OWNER"))?.id;
      if (!userId) {
        ui.notifications.warn("CCM.Warning.DeckOwnerNotFound", {localize: true});
        return;
      }
      ccm.socket.emit("updateEmbeddedCards", {
        userId: userId,
        updates: updates,
        uuid: this.#deck.uuid
      });
    }
    ChatMessage.implementation.create({
      content: game.i18n.format("CCM.CardSheet.ScryingMessageReorder", {
        name: game.user.name,
        number: this.#cards.length,
        deck: this.#deck.name
      })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Move a card to the top or bottom
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static async #moveCard(event, target) {
    const figure = target.closest("[data-card-id]");
    const cardId = figure.dataset.cardId;
    const card = this.#deck.cards.get(cardId);
    // If this is the top of the deck, we're sending to the bottom
    // Which means all cards in between need to be shifted up
    // Vise-versa for scrying the bottom of the deck
    const adjustment = this.#how === CONST.CARD_DRAW_MODES.FIRST ? -1 : 1;
    const comparison = this.#how === CONST.CARD_DRAW_MODES.FIRST ? c => c.sort > card.sort : c => c.sort < card.sort;

    const updates = this.#deck.cards.filter(comparison).map(c => {
      return {
        _id: c._id,
        sort: c.sort + adjustment
      };
    });

    updates.push({
      _id: cardId,
      sort: this.#how === CONST.CARD_DRAW_MODES.FIRST ? this.#deck.cards.size - 1 : 0
    });

    await this.#deck.updateEmbeddedDocuments("Card", updates);

    this.#cards.findSplice(c => c.id === cardId);
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Play a card from the dialog
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static async #playCard(event, target) {
    const figure = target.closest("[data-card-id]");
    const cardId = figure.dataset.cardId;
    const card = this.#deck.cards.get(cardId);
    const play = await this.#deck.playDialog(card);
    if (play) {
      this.#cards.findSplice(c => c.id === cardId);
      this.render();
    }
  }

  /* -------------------------------------------------- */

  /**
   * Close the application with the Confirm button.
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static async #confirm(event, target) {
    if (this.#how !== CONST.CARD_DRAW_MODES.RANDOM) {
      const startIndex = this.#how === CONST.CARD_DRAW_MODES.FIRST ? 0 : this.#deck.cards.size - this.#cards.length;
      const updates = this.#cards.map((c, index) => ({
        _id: c._id,
        sort: index + startIndex
      }));
      await this.#deck.updateEmbeddedDocuments("Card", updates);
    }
    this.close();
  }
}

/**
 * Recall a drawn card from a deck.
 * @param {Cards} deck          The deck to recall a drawn card to.
 * @param {string} cardId       The id of the card to recall.
 * @returns {Promise<Card>}     A reference to the recalled card belonging to its original parent.
 */
async function recallCard(deck, cardId) {
  if (deck.type !== "deck") {
    console.warn("You can only recall a card to a Deck.");
    return;
  }
  const card = deck.cards.get(cardId);
  if (!card) {
    console.warn("The card to be recalled does not exist in this Deck.");
    return;
  }
  if (!card.drawn) {
    console.warn("A card that has not been drawn cannot be recalled.");
    return;
  }
  const clone = findClone(card);
  ChatMessage.implementation.create({
    content: game.i18n.format("CCM.CardSheet.RecalledCard", {
      card: card.link,
      deck: deck.link
    })
  });
  return clone ? clone.recall() : card.recall();
}

/**
 * Find the "clone" of a card in a hand or pile.
 * @param {Card} card       The card of which to find a clone.
 * @returns {Card|void}     The clone if any is found.
 */
function findClone(card) {
  for (const cards of game.cards) {
    if (cards.type === "deck") continue;
    const c = cards.cards.find(c => {
      return (c.source === card.parent) && (c.id === card.id);
    });
    if (c) return c;
  }
}

var api$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  cleanCardCollection: cleanCardCollection,
  grid: grid,
  placeCard: placeCard,
  recallCard: recallCard,
  removeCard: removeCard$1,
  scry: scry,
  triangle: triangle
});

/** @import Card from "@client/documents/card.mjs"; */

const {HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, DocumentSheetV2: DocumentSheetV2$1} = foundry.applications.api;

/** AppV2 cards sheet (Deck, Hand, Pile) */
class CardsSheet extends HandlebarsApplicationMixin$1(DocumentSheetV2$1) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "cards"],
    position: {
      width: 620,
      height: "auto"
    },
    actions: {
      createCard: CardsSheet.#onCreateCard,
      editCard: CardsSheet.#onEditCard,
      deleteCard: CardsSheet.#onDeleteCard,
      shuffleCards: CardsSheet.#onShuffleCards,
      dealCards: CardsSheet.#onDealCards,
      resetCards: CardsSheet.#onResetCards,
      toggleSort: CardsSheet.#onToggleSort,
      previousFace: CardsSheet.#onPreviousFace,
      nextFace: CardsSheet.#onNextFace,
      drawCards: CardsSheet.#onDrawCards,
      passCards: CardsSheet.#onPassCards,
      playCard: CardsSheet.#onPlayCard
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-cards"
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  tabGroups = {
    primary: "cards"
  };

  /* -------------------------------------------------- */

  /**
   * Tabs that are present on this sheet.
   * @enum {TabConfiguration}
   */
  static TABS = {
    configuration: {
      id: "configuration",
      group: "primary",
      label: "CCM.CardSheet.TabConfiguration",
      icon: "fa-solid fa-cogs"
    },
    cards: {
      id: "cards",
      group: "primary",
      label: "CCM.CardSheet.TabCards",
      icon: "fa-solid fa-id-badge"
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {template: "modules/complete-card-management/templates/card/header.hbs"},
    navigation: {template: "modules/complete-card-management/templates/card/nav.hbs"},
    configuration: {template: "modules/complete-card-management/templates/card/configuration.hbs"},
    cards: {template: "modules/complete-card-management/templates/card/cards.hbs", scrollable: [""]},
    footer: {template: "modules/complete-card-management/templates/card/cards-footer.hbs"}
  };

  /* -------------------------------------------------- */

  /**
   * The allowed sorting methods which can be used for this sheet.
   * @enum {string}
   */
  static SORT_TYPES = {
    STANDARD: "standard",
    SHUFFLED: "shuffled"
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};
    const src = this.document.toObject();

    const makeField = (name, options = {}) => {
      const document = options.document ?? this.document;
      const schema = options.schema ?? document.schema;

      return {
        field: schema.getField(name),
        value: foundry.utils.getProperty(document, name),
        ...options
      };
    };

    // Header
    context.name = makeField("name");
    context.currentFace = this.document.img;

    // Navigation
    context.tabs = Object.values(this.constructor.TABS).reduce((acc, v) => {
      const isActive = this.tabGroups[v.group] === v.id;
      acc[v.id] = {
        ...v,
        active: isActive,
        cssClass: isActive ? "item active" : "item",
        tabCssClass: isActive ? "tab scrollable active" : "tab scrollable"
      };
      return acc;
    }, {});

    // Configuration
    context.img = makeField("img", {
      placeholder: "icons/svg/card-hand.svg",
      value: src.img || ""
    });
    context.description = makeField("description", {
      enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.description, {
        relativeTo: this.document
      })
    });
    context.width = makeField("width", {placeholder: game.i18n.localize("Width")});
    context.height = makeField("height", {placeholder: game.i18n.localize("Height")});
    context.rotation = makeField("rotation", {
      placeholder: game.i18n.localize("Rotation"),
      value: this.document.rotation || ""
    });
    context.primaryOwner = {
      field: new foundry.data.fields.ForeignDocumentField(User, {
        label: "CCM.CardSheet.PrimaryOwner"
      }, {name: `flags.${MODULE_ID}.primaryOwner`}),
      value: (options.document ?? this.document).getFlag(MODULE_ID, "primaryOwner")
    };

    // Cards
    const sortFn = {
      standard: this.document.sortStandard,
      shuffled: this.document.sortShuffled
    }[this.sort || "standard"];
    const cards = this.document.cards.contents.sort((a, b) => sortFn.call(this.document, a, b)).map(card => {
      const show = (this.document.type === "deck") || !!card.currentFace;
      return {
        card: card,
        type: show ? game.i18n.localize(CONFIG.Card.typeLabels[card.type]) : null,
        suit: show ? card.suit : null,
        value: show ? card.value : null
      };
    });
    context.cards = cards;

    // Footer
    context.footer = {
      pass: false,
      reset: false,
      shuffle: false,
      deal: false,
      draw: false
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onRender(...T) {
    super._onRender(...T);
    this.#setupDragDrop();
    this.#setupSearch();
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Convenient access to the contained Cards document.
   * @type {Cards} The cards document this sheet represents.
   */
  get cards() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * The current sorting method of this deck.
   * @type {string}
   */
  #sort = "shuffled";
  get sort() {
    return this.#sort;
  }
  set sort(mode) {
    if (Object.values(this.constructor.SORT_TYPES).includes(mode)) {
      this.#sort = mode;
    }
  }

  /* -------------------------------------------------- */
  /*   Search filtering                                 */
  /* -------------------------------------------------- */

  /**
   * Current value of the search filter.
   * @type {string}
   */
  #search = null;

  /* -------------------------------------------------- */

  /**
   * Set up search filter.
   */
  #setupSearch() {
    const search = new foundry.applications.ux.SearchFilter({
      inputSelector: "input[type=search]",
      contentSelector: "ol.cards",
      initial: this.#search ?? "",
      callback: (event, value, rgx, element) => {
        for (const card of element.querySelectorAll(".card")) {
          let hidden = false;
          const name = card.querySelector(".name").textContent.trim();
          hidden = value && !rgx.test(name);
          card.classList.toggle("hidden", hidden);
        }
        this.#search = value;
      }
    });

    search.bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /**
   * Set up drag and drop.
   */
  #setupDragDrop() {
    const sheet = this;
    const dd = new foundry.applications.ux.DragDrop({
      dragSelector: (this.document.type === "deck") ? "ol.cards li.card" : "ol.cards li.card .name",
      dropSelector: "ol.cards",
      permissions: {
        dragstart: () => sheet.isEditable,
        drop: () => sheet.isEditable
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        // Easy way to copy implementation from core sheet
        drop: this._onDrop.bind(sheet)
      }
    });
    dd.bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Handle dragstart event.
   * @param {DragEvent} event     The triggering drag event.
   * @protected
   */
  _onDragStart(event) {
    const id = event.currentTarget.closest("[data-card-id]")?.dataset.cardId;
    const card = this.document.cards.get(id);
    if (card) event.dataTransfer.setData("text/plain", JSON.stringify(card.toDragData()));
  }

  /**
   * The "dragdrop" event handler for individual cards
   * @param {DragEvent} event
   * @protected
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data.type !== "Card") return;
    const card = await getDocumentClass("Card").fromDropData(data);
    const stack = this.document;
    if (card.parent.id === stack.id) return this.#onSortCard(event, card);
    try {
      return await card.pass(stack);
    } catch (err) {
      Hooks.onError("CardsConfig##onDrop", err, {log: "error", notify: "error"});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle sorting a Card relative to other siblings within this document
   * @param {Event} event     The drag drop event
   * @param {Card} card       The card being dragged
   */
  async #onSortCard(event, card) {
    const stack = this.document;
    const li = event.target.closest("[data-card-id]");
    const target = stack.cards.get(li?.dataset.cardId);
    if (!target || (card === target)) return;
    const siblings = stack.cards.filter(c => c.id !== card.id);
    const updateData = SortingHelpers
      .performIntegerSort(card, {target, siblings})
      .map(u => ({_id: u.target.id, sort: u.update.sort}));
    await stack.updateEmbeddedDocuments("Card", updateData);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle creation of a new card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onCreateCard(event, target) {
    if (!this.isEditable) return;
    getDocumentClass("Card").createDialog({
      faces: [{}],
      face: 0
    }, {
      parent: this.document,
      pack: this.document.pack
    });
  }

  /* -------------------------------------------------- */

  /**
   * Handle editing a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onEditCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    this.document.cards.get(id).sheet.render({force: true});
  }

  /* -------------------------------------------------- */

  /**
   * Handle deleting a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onDeleteCard(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    this.document.cards.get(id).deleteDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle shuffling the order of cards.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onShuffleCards(event, target) {
    if (!this.isEditable) return;
    this.sort = this.constructor.SORT_TYPES.SHUFFLED;
    this.document.shuffle();
  }

  /* -------------------------------------------------- */

  /**
   * Handle dealing a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onDealCards(event, target) {
    if (!this.isEditable) return;
    this.document.dealDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle resetting the card stack.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onResetCards(event, target) {
    if (!this.isEditable) return;
    this.document.resetDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling sort mode.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onToggleSort(event, target) {
    if (!this.isEditable) return;
    const {SHUFFLED, STANDARD} = this.constructor.SORT_TYPES;
    this.sort = (this.sort === SHUFFLED) ? STANDARD : SHUFFLED;
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling the face of a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onPreviousFace(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    card.update({face: (card.face === 0) ? null : card.face - 1});
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling the face of a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onNextFace(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    card.update({face: (card.face === null) ? 0 : card.face + 1});
  }

  /* -------------------------------------------------- */

  /**
   * Handle drawing cards.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onDrawCards(event, target) {
    if (!this.isEditable) return;
    this.document.drawDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle passing cards.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onPassCards(event, target) {
    if (!this.isEditable) return;
    this.document.passDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle playing a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   * @protected
   */
  static #onPlayCard(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    this.document.playDialog(card);
  }
}

class DeckSheet extends CardsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["deck"],
    actions: {
      recallCard: this.#recallCard,
      viewCard: this.#viewCard
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  tabGroups = {
    primary: "configuration"
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isDeck = true;
    if (!this.document.cards.size) context.footer.shuffle;
    if (!this.document.drawnCards.length) context.footer.reset = true;
    if (!this.document.availableCards.length) context.footer.deal = true;
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * @this DeckSheet
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #recallCard(event, target) {
    const cardId = target.closest("[data-card-id]").dataset.cardId;
    ccm.api.recallCard(this.document, cardId);
  }

  /**
   * @this DeckSheet
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #viewCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    /** @type {Card} */
    const card = this.document.cards.get(id);
    new foundry.applications.apps.ImagePopout({
      src: card.currentFace.img,
      uuid: card.uuid,
      window: {title: card.name}
    }).render({force: true});
  }
}

class HandSheet extends CardsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["hand"]
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isHand = true;
    if (!this.document.cards.size) context.footer.pass = context.footer.reset = true;
    return context;
  }
}

class DockedHandSheet extends HandSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["docked", "faded-ui"],
    window: {positioned: false}
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    cardList: {
      template: "modules/complete-card-management/templates/card/docked.hbs"
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDragStart(event) {
    super._onDragStart(event);
    const img = event.target.querySelector("img");
    const w = 67;
    const h = 100;
    const preview = foundry.applications.ux.DragDrop.createDragImage(img, w, h);
    event.dataTransfer.setDragImage(preview, w / 2, h / 2);
  }
}

class PileSheet extends CardsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["pile"]
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isPile = true;
    if (!this.document.cards.size) context.footer.pass = context.footer.reset = context.footer.shuffle = true;
    return context;
  }
}

var CardsSheet$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CardsSheet: CardsSheet,
  DeckSheet: DeckSheet,
  DockedHandSheet: DockedHandSheet,
  HandSheet: HandSheet,
  PileSheet: PileSheet
});

/**
 * @typedef {object} TabConfiguration
 * @property {string} id        The unique key for this tab.
 * @property {string} group     The group that this tab belongs to.
 * @property {string} label     The displayed label for this tab.
 */

const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

/**
 * AppV2 card sheet
 */
class CardSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "card"],
    position: {
      width: 500,
      height: "auto"
    },
    actions: {
      addFace: this._onAddFace,
      deleteFace: this._onDeleteFace
    },
    form: {
      closeOnSubmit: true
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-card-spade",
      contentTag: "div"
    }
  };

  /** @inheritdoc */
  tabGroups = {
    primary: "details"
  };

  /**
   * Tabs that are present on this sheet.
   * @enum {TabConfiguration}
   */
  static TABS = {
    details: {id: "details", group: "primary", label: "CCM.CardSheet.TabDetails", icon: "fa-solid fa-pen-fancy"},
    faces: {id: "faces", group: "primary", label: "CCM.CardSheet.TabFaces", icon: "fa-solid fa-masks-theater"},
    back: {id: "back", group: "primary", label: "CCM.CardSheet.TabBack", icon: "fa-solid fa-mask"}
  };

  /** @inheritdoc */
  static PARTS = {
    header: {template: "modules/complete-card-management/templates/card/header.hbs"},
    nav: {template: "modules/complete-card-management/templates/card/nav.hbs"},
    details: {template: "modules/complete-card-management/templates/card/details.hbs"},
    faces: {template: "modules/complete-card-management/templates/card/faces.hbs", scrollable: [""]},
    back: {template: "modules/complete-card-management/templates/card/back.hbs"},
    footer: {template: "modules/complete-card-management/templates/card/footer.hbs"}
  };

  /** @inheritdoc */
  get title() {
    const stack = this.document.parent;
    if (!stack) return super.title;
    return game.i18n.format("CCM.CardSheet.CardParentTitle", {
      cardName: this.document.name,
      stackName: stack.name
    });
  }

  /** @inheritdoc */
  _onRender(...T) {
    super._onRender(...T);
    this.#faces = this.element.querySelector("[name=face]");
    this.element.querySelectorAll(".faces legend input").forEach(n => {
      n.addEventListener("change", this._onChangeFaceName.bind(this));
    });
    this.element.querySelector("[name='back.name']").addEventListener("change", this._onChangeFaceName.bind(this));
  }

  /** @inheritdoc */
  async _prepareContext(_options) {
    const context = {};
    const src = this.document.toObject();

    const makeField = (name, options = {}) => {
      const document = options.document ?? this.document;
      const schema = options.schema ?? document.schema;

      return {
        field: schema.getField(name),
        value: foundry.utils.getProperty(document, name),
        ...options
      };
    };

    // Header
    context.currentFace = this.document.faces[this.document.face]?.img || this.document.constructor.DEFAULT_ICON;
    context.name = makeField("name", {value: src.name, placeholder: game.i18n.localize("Name")});

    // Navigation
    context.tabs = Object.values(this.constructor.TABS).reduce((acc, v) => {
      const isActive = this.tabGroups[v.group] === v.id;
      acc[v.id] = {
        ...v,
        active: isActive,
        cssClass: isActive ? "item active" : "item",
        tabCssClass: isActive ? "tab scrollable active" : "tab scrollable"
      };
      return acc;
    }, {});

    // Details
    context.type = makeField("type", {choices: CONFIG.Card.typeLabels});
    context.suit = makeField("suit");
    context.value = makeField("value");
    context.width = makeField("width", {placeholder: game.i18n.localize("Width")});
    context.height = makeField("height", {placeholder: game.i18n.localize("Height")});
    context.rotation = makeField("rotation", {
      value: this.document.rotation || "",
      placeholder: game.i18n.localize("Rotation")
    });
    context.description = makeField("description", {
      enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.description, {relativeTo: this.document})
    });

    // Faces
    context.face = makeField("face", {
      choices: {},
      blank: this.document.back.name || "CCM.CardSheet.BacksideUp"
    });
    context.faces = [];
    const fph = game.i18n.localize("CARD.FIELDS.faces.name.label");
    const schema = this.document.schema.getField("faces.element");
    for (const face of this.document.faces) {
      const idx = context.faces.length;
      const f = {
        name: makeField("name", {schema: schema, document: face, name: `faces.${idx}.name`, placeholder: fph}),
        img: makeField("img", {schema: schema, document: face, name: `faces.${idx}.img`}),
        text: makeField("text", {
          schema: schema,
          document: face,
          name: `faces.${idx}.text`,
          enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(face.text, {
            relativeTo: this.document
          })
        })
      };
      context.face.choices[idx] = f.name.value || game.i18n.format("CCM.CardSheet.Unnamed", {idx: idx});
      context.faces.push(f);
    }

    // Back
    const back = this.document.schema.getField("back");
    const backDoc = this.document.back;
    context.backName = makeField("name", {schema: back, document: backDoc});
    context.backImg = makeField("img", {schema: back, document: backDoc, value: src.back.img});
    context.backText = makeField("text", {
      schema: back,
      document: backDoc,
      enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(backDoc.text, {relativeTo: this.document})
    });

    return context;
  }

  /* ----------------------------- */
  /* Properties                    */
  /* ----------------------------- */

  /**
   * Convenient access to the contained Cards document
   * @type {Card} The card document this sheet represents
   */
  get card() {
    return this.document;
  }

  /**
   * Reference to the 'face' select.
   * @type {HTMLElement}
   */
  #faces = null;

  /* ----------------------------- */
  /* Event Handlers                */
  /* ----------------------------- */

  /**
   * Handle adding a new face.
   * @param {Event} event             Triggering click event.
   * @param {HTMLElement} target      The current target of the event.
   */
  static _onAddFace(event, target) {
    const formData = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
    formData.faces = Object.values(formData.faces ?? {}).concat([{name: "", img: "", text: ""}]);
    this.document.update(formData);
  }

  /**
   * Handle deleting a face.
   * @param {Event} event             Triggering click event.
   * @param {HTMLElement} target      The current target of the event.
   */
  static async _onDeleteFace(event, target) {
    const confirm = await foundry.applications.api.DialogV2.confirm({
      rejectClose: false,
      content: game.i18n.localize("CARD.ACTIONS.DeleteFace.Warning"),
      modal: true,
      window: {
        icon: "fa-solid fa-cards",
        title: "CARD.ACTIONS.DeleteFace.Title"
      }
    });
    if (!confirm) return;

    target.closest(".faces").remove();
    const formData = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
    formData.faces = Object.values(formData.faces ?? {});
    if (formData.face >= formData.faces.length) formData.face = 0;
    this.document.update(formData);
  }

  /**
   * Change the displayed label in the 'face' dropdown when changing
   * the name of a face in the 'faces' array or the back.
   * @param {Event} event     Initiating change event.
   */
  _onChangeFaceName(event) {
    // Changing the backside's name.
    if (event.currentTarget.name === "back.name") {
      const value = event.currentTarget.value || game.i18n.localize("CCM.CardSheet.BacksideUp");
      this.#faces.children[0].textContent = value;
    }

    // Changing a face's name.
    else {
      const idx = parseInt(event.currentTarget.closest("[data-idx]").dataset.idx);
      const value = event.currentTarget.value || game.i18n.format("CCM.CardSheet.Unnamed", {idx: idx});
      this.#faces.querySelector(`option[value="${idx}"]`).textContent = value;
    }
  }
}

/** @import CardLayer from "./CardLayer.mjs"; */
/** @import DocumentSheetV2 from "@client/applications/api/document-sheet.mjs"; */
/** @import {Card, Cards} from "@client/documents/_module.mjs" */

/**
 * A data model that captures the necessary characteristics for a CardObject on the canvas
 * Contains many properties to enable functionality as a synthetic document
 */
class CanvasCard extends foundry.abstract.DataModel {
  /**
   * @param {Card | Cards} card The document represented by this data model
   */
  constructor(card) {
    if (!((card instanceof Card) || (card instanceof Cards))) {
      throw new Error("The card object model takes a Card document as its only argument");
    }

    const data = card.getFlag(MODULE_ID, canvas.scene?.id);

    if (!data) {
      throw new Error("The card doesn't have location data for the current scene");
    }

    let img = card.img;

    if ((card instanceof Cards) && data.flipped) {
      try {
        const [bottomCard] = card._drawCards(1, CONST.CARD_DRAW_MODES.BOTTOM);
        img = bottomCard.img;
      }
      catch {
        console.error("Failed to flip deck", card.name);
      }
    }

    Object.assign(data, {
      texture: {
        src: img
      },
      width: (card.width ?? 2) * canvas.grid.sizeX,
      height: (card.height ?? 3) * canvas.grid.sizeY
    });

    super(data, {parent: canvas.scene});

    /**
     * A reference to the card or cards document this takes data from.
     * @type {Card | Cards}
     */
    this.card = card;
  }

  /**
   * Synthetic parent
   * @type {Scene}
   */
  // Using this.parent so that way it sticks after constructor.
  parent = this.parent ?? null;

  /** @import CardObject from "./CardObject.mjs" */

  /**
   * A lazily constructed PlaceableObject instance which can represent this Document on the game canvas.
   * @type {CardObject}
   */
  get object() {
    if (this._object || this._destroyed) return this._object;
    if (!this.parent?.isView || !this.layer) return null;
    return this._object = this.layer.createObject(this);
  }

  /**
   * Attached object
   * @type {CardObject}
   */
  // Using this._object so that way it sticks after constructor.
  _object = this._object ?? null;

  static LOCALIZATION_PREFIXES = ["CCM", "CardObjectModel"];

  static defineSchema() {
    const {NumberField, AngleField, IntegerSortField, BooleanField} = foundry.data.fields;
    return {
      x: new NumberField({
        required: true,
        integer: true,
        nullable: false
      }),
      y: new NumberField({
        required: true,
        integer: true,
        nullable: false
      }),
      elevation: new NumberField({
        required: true,
        nullable: false,
        initial: 0
      }),
      sort: new IntegerSortField(),
      rotation: new AngleField(),
      hidden: new BooleanField(),
      locked: new BooleanField(),
      /** Only used with Cards documents */
      flipped: new BooleanField(),
      width: new NumberField({
        required: true,
        min: 0,
        nullable: false,
        step: 0.1
      }),
      height: new NumberField({
        required: true,
        min: 0,
        nullable: false,
        step: 0.1
      }),
      texture: new foundry.data.TextureData(
        {},
        {
          initial: {
            anchorX: 0.5,
            anchorY: 0.5,
            fit: "contain",
            alphaThreshold: 0.75
          },
          wildcard: true
        }
      )
    };
  }

  /**
   * Properties fetched from the appropriate flag
   * @type {string[]}
   */
  static flagProps = ["x", "y", "elevation", "sort", "rotation", "hidden", "locked", "flipped"];

  static registerSettings() {
    game.settings.register(MODULE_ID, "showOwner", {
      name: "CCM.Settings.ShowNames.Label",
      hint: "CCM.Settings.ShowNames.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.BooleanField(),
      initial: true,
      onChange: value => canvas.cards.draw()
    });

    game.settings.register(MODULE_ID, "ownerFontSize", {
      name: "CCM.Settings.OwnerFontSize.Label",
      hint: "CCM.Settings.OwnerFontSize.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.NumberField({
        nullable: false,
        integer: true,
        min: 8,
        max: 512,
        initial: 160,
        validationError: "must be an integer between 8 and 512"
      }),
      onChange: value => canvas.cards.draw()
    });

    game.settings.register(MODULE_ID, "ownerTextColor", {
      name: "CCM.Settings.OwnerTextColor.Label",
      hint: "CCM.Settings.OwnerTextColor.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.ColorField({nullable: false, initial: "#ffffff"}),
      onChange: value => canvas.cards.draw()
    });

    game.settings.register(MODULE_ID, "ownerTextAlpha", {
      name: "CCM.Settings.OwnerTextAlpha.Label",
      hint: "CCM.Settings.OwnerTextAlpha.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.AlphaField(),
      onChange: value => canvas.cards.draw()
    });
  }

  /**
   * The linked card's ID
   * @type {string}
   */
  get id() {
    return this.card.id;
  }

  /**
   * The linked card's UUID
   * @type {string}
   */
  get uuid() {
    return this.card.uuid;
  }

  /**
   * The linked card's document name
   * @type {"Card" | "Cards"}
   */
  get documentName() {
    return this.card.documentName;
  }

  /**
   * The canvas card layer
   * @type {CardLayer}
   */
  get layer() {
    return canvas.cards;
  }

  /**
   * The linked document sheet for the Card
   * @type {DocumentSheetV2}
   */
  get sheet() {
    // TODO: Consider a custom sheet for these at some point
    return this.card.sheet;
  }

  /**
   * The font size used to display text within this card
   */
  get fontSize() {
    return game.settings.get(MODULE_ID, "ownerFontSize");
  }

  /**
   * The font family used to display text within this card
   * @returns {string} Defaults to `CONFIG.defaultFontFamily`
   */
  get fontFamily() {
    return CONFIG.defaultFontFamily || "Signika";
  }

  /** @import Color from "@common/utils/color.mjs" */

  /**
   * The color of the text displayed within this card
   * @returns {Color}
   */
  get textColor() {
    return game.settings.get(MODULE_ID, "ownerTextColor");
  }

  /**
   * The name of the user who owns this card
   * @returns {string}
   */
  get text() {
    const showOwner = game.settings.get(MODULE_ID, "showOwner");
    if (!showOwner) return "";
    /** @type {Cards} */
    const stack = this.card.documentName === "Card" ? this.card.parent : this.card;
    const ownerId = stack.getFlag(MODULE_ID, "primaryOwner");
    let owner = game.users.get(ownerId);
    if (!owner && (stack.type === "hand")) owner = game.users.find(u => (u.getFlag(MODULE_ID, "playerHand") === stack.id));
    return owner?.name ?? "";
  }

  /**
   * The opacity of text displayed on this card
   * @returns {number}
   */
  get textAlpha() {
    return 1;
  }

  /** @inheritdoc */
  clone(data = {}, context = {}) {
    // TODO: Possible refactor actually using the data and context object?
    return new this.constructor(this.card);
  }

  /**
   * Translate update operations on the original card to this synthetic document
   * @param {object} changed  Differential data that was used to update the document
   * @param {Partial<DatabaseUpdateOperation>} options Additional options which modified the update request
   */
  update(changed, options, userId) {
    const flatChanges = foundry.utils.flattenObject(changed);
    if (flatChanges[`flags.${MODULE_ID}.-=${canvas.scene.id}`] === null) {
      return this.delete(options, userId);
    }
    const updates = {};
    const baseProps = ["height", "width"];
    for (const p of baseProps) {
      if (p in flatChanges) {
        let newValue = flatChanges[p];
        if (p === "height") newValue *= canvas.grid.sizeY;
        else if (p === "width") newValue *= canvas.grid.sizeX;
        updates[p] = newValue;
      }
    }
    for (const p of this.constructor.flagProps) {
      const translatedProp = `flags.${MODULE_ID}.${canvas.scene.id}.${p}`;
      if (translatedProp in flatChanges) {
        updates[p] = flatChanges[translatedProp];
        if ((p === "flipped") && (this.documentName === "Cards")) {
          try {
            const [bottomCard] = this.card._drawCards(1, CONST.CARD_DRAW_MODES.BOTTOM);
            updates["texture"] = {src: updates[p] ? bottomCard.img : this.card.img};
          }
          catch {
            console.error("Failed to flip deck", this.card.name);
            updates["texture"] = {src: this.card.img};
          }
        }
      }
    }
    // Face handling
    if (("face" in flatChanges) || (`faces.${this.card.face}.img` in flatChanges) || ("img" in flatChanges)) {
      if (
        (this.documentName === "Card")
        || (!this.flipped && !(("flipped" in updates) && updates["flipped"]))
      ) {
        updates["texture"] = {src: this.card.img};
      }
    }
    // Primary Owner Card Text
    if (foundry.utils.getProperty(changed, `flags.${MODULE_ID}.primaryOwner`) !== undefined) {
      options.cardText = true;
      if (this.card instanceof Cards) {
        for (const card of this.card.cards) {
          card.canvasCard?.object?.renderFlags.set({refreshText: true});
        }
      }
    }
    if ((this.card instanceof Card) && (("x" in updates) || ("y" in updates))) this._checkRegionTrigger(updates, userId);
    this.updateSource(updates);
    this.object?._onUpdate(updates, options, userId);
  }

  /**
   * Refreshes the canvas card's face
   */
  refreshFace() {
    if (this.card instanceof Card) return; // Not needed at the moment
    let src;
    if (this.flipped) {
      try {
        const [bottomCard] = this.card._drawCards(1, CONST.CARD_DRAW_MODES.BOTTOM);
        src = bottomCard.img;
      }
      catch {
        console.error("Failed to flip deck", this.card.name);
      }
    }
    else src = this.card.img;

    const updates = {texture: {src}};
    this.updateSource(updates);
    this.object?._onUpdate(updates, {}, "");
  }

  /**
   * Trigger leave and enter region behaviors for the custom region type & event triggers
   * Uses the incoming update data to compare to current document properties
   * @param {{x?: number, y?: number}} updates
   * @param {string} userId                     The ID of the user performing the check
   * @param {boolean} [newCard=false]           If this is a freshly dropped card
   */
  _checkRegionTrigger(updates, userId, newCard = false) {
    if (game.user.id !== userId) return;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const origin = {x: this.x + centerX, y: this.y + centerY, elevation: this.elevation};
    const destination = {
      x: (updates.x ?? this.x) + centerX,
      y: (updates.y ?? this.y) + centerY,
      elevation: updates.elevation ?? this.elevation
    };
    const eventData = {
      card: this.card,
      origin,
      destination
    };
    let makingMove = false;
    for (const region of this.parent.regions) {
      if (!region.object) continue;
      const triggeredBehaviors = region.behaviors.filter(b =>
        !b.disabled && (
          b.hasEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_OUT)
          || b.hasEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_IN)
        )
      );
      if (!triggeredBehaviors.length) continue;
      const originInside = region.testPoint(origin);
      const destinationInside = region.testPoint(destination);
      if (originInside && !destinationInside) {
        region._triggerEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_OUT, eventData);
      } else if ((!originInside || newCard) && destinationInside) {
        region._triggerEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_IN, eventData);
        // Crude way to approximate if this is going to trigger a pass event.
        makingMove ||= region.behaviors.some(b => b.type === "complete-card-management.moveCard");
      }
    }
    // Don't check deck drops if there's a region setup, and only original user does this part
    if (makingMove || (userId !== game.userId)) return;
    const decks = canvas.cards.documentCollection.filter(c => c.documentName === "Cards");
    for (const d of decks) {
      if (!d.canvasCard) continue;
      const {x, y, width, height} = d.canvasCard;
      if (destination.x.between(x, x + width, false) && destination.y.between(y, y + height, false)) {
        if (this.card.parent === d) {
          ui.notifications.warn(game.i18n.format("CCM.Warning.AlreadyInside", {card: this.card.name, stack: d.name}));
          continue;
        }
        ui.notifications.info(game.i18n.format("CCM.MoveCardBehavior.AddCard",
          {name: this.card.name, stack: d.name})
        );
        return this.card.pass(d);
      }
    }

    // Canvas Pile Handling
    const canvasPileId = canvas.scene.getFlag(MODULE_ID, "canvasPile");
    const canvasPile = game.cards.get(canvasPileId);
    const parent = this.card.parent;
    if (!canvasPile || (parent === canvasPile)) return;
    return this.card.pass(canvasPile);
  }

  /**
   * Handles the deletion process for this synthetic document
   * @param {*} options
   * @param {*} userId
   */
  delete(options, userId) {
    // fix for #136, ensures that draw is complete before attempting to delete
    this._object?._partialDraw(() => this._object._onDelete(options, userId));
    this.card.canvasCard = undefined;
  }

  /**
   * Synthetic passthrough
   * @returns {boolean}
   */
  get isOwner() {
    return this.card.isOwner;
  }

  /**
   * Synthetic pass through
   * @param  {...any} args Arguments to Document#canUserModify
   * @returns {boolean}
   */
  canUserModify(...args) {
    return this.card.canUserModify(...args);
  }

  /**
   * Synthetic pass through
   * @param  {...any} args Arguments to Document#testUserPermission
   * @returns {boolean}
   */
  testUserPermission(...args) {
    return this.card.testUserPermission(...args);
  }
}

/**
 * A CardObject is an implementation of PlaceableObject which represents a single Card document within the Scene.
 * CardObjects are drawn inside of the {@link CardLayer} container
 */
class CardObject extends foundry.canvas.placeables.PlaceableObject {
  constructor(canvasCard) {
    if (!(canvasCard instanceof CanvasCard)) {
      throw new Error("You must provide a CanvasCard to construct a CardObject");
    }

    // PlaceableObject constructor checks for both document status and embedded
    let document = canvasCard.card;
    if (canvasCard.card instanceof Cards) {
      const handler = {
        get(target, prop, receiver) {
          if (prop === "isEmbedded") return true;
          return Reflect.get(...arguments);
        }
      };
      document = new Proxy(document, handler);
    }
    super(document);

    /** @inheritdoc */
    this.scene = canvasCard.parent;

    /** @inheritdoc */
    this.document = canvasCard;
  }

  static embeddedName = "Card";

  /**
   * The texture that is used to fill this Drawing, if any.
   * @type {PIXI.Texture}
   */
  texture;

  /**
   * A reference to the SpriteMesh which displays this CardObject in the InterfaceCanvasGroup.
   * @type {SpriteMesh}
   */
  mesh;

  /**
   * The border frame for the CardObject.
   * @type {PIXI.Container}
   */
  frame;

  /**
   * A Card background which is displayed if no valid image texture is present
   * @type {PIXI.Graphics}
   */
  bg;

  static RENDER_FLAGS = {
    redraw: {propagate: ["refresh"]},
    refresh: {
      propagate: ["refreshState", "refreshTransform", "refreshMesh", "refreshText", "refreshElevation"],
      alias: true
    },
    refreshState: {},
    refreshTransform: {propagate: ["refreshRotation", "refreshSize"], alias: true},
    refreshRotation: {propagate: ["refreshFrame"]},
    refreshSize: {propagate: ["refreshPosition", "refreshFrame", "refreshText"]},
    refreshPosition: {},
    refreshMesh: {},
    refreshText: {},
    refreshFrame: {},
    refreshElevation: {}
  };

  /**
   * @inheritdoc
   * @returns {CardLayer}
   */
  get layer() {
    return canvas["cards"];
  }

  /** @inheritdoc */
  get bounds() {
    let {x, y, width, height, texture, rotation} = this.document;

    // Adjust top left coordinate and dimensions according to scale
    if (texture.scaleX !== 1) {
      const w0 = width;
      width *= Math.abs(texture.scaleX);
      x += (w0 - width) / 2;
    }
    if (texture.scaleY !== 1) {
      const h0 = height;
      height *= Math.abs(texture.scaleY);
      y += (h0 - height) / 2;
    }

    // If the card is rotated, return recomputed bounds according to rotation
    if (rotation !== 0) return PIXI.Rectangle.fromRotation(x, y, width, height, Math.toRadians(rotation)).normalize();

    // Normal case
    return new PIXI.Rectangle(x, y, width, height).normalize();
  }

  /**
   * Does the CanvasCard have text that is displayed?
   * @type {boolean}
   */
  get hasText() {
    return !!this.document.text && (this.document.fontSize > 0);
  }

  /**
   * Is this Card currently visible on the Canvas?
   * @type {boolean}
   */
  get isVisible() {
    const access = this.document.testUserPermission(game.user, "OBSERVER");
    return access || !this.document.hidden || game.user.isGM;
  }

  /** @inheritdoc */
  get id() {
    return this.document.card.uuid;
  }

  /** @inheritdoc */
  get objectId() {
    let id = `${this.document.card.uuid}`;
    if (this.isPreview) id += ".preview";
    return id;
  }

  /** @inheritdoc */
  async _draw(options) {
    // Load Card texture
    let texture;
    if (this._original) texture = this._original.texture?.clone();
    else if (this.document.texture.src) {
      texture = await foundry.canvas.loadTexture(this.document.texture.src, {
        fallback: "cards/backs/light-soft.webp"
      });
    }

    this.texture = texture;

    // Draw the Card mesh
    if (this.texture) {
      this.mesh = canvas.interface.addCard(this);
      this.mesh.canvasCard = this;
      this.bg = undefined;
      // Card text
      this.mesh.text = this.hasText ? this.mesh.addChild(this.#drawText()) : null;
    }

    // Draw a placeholder background
    else {
      canvas.interface.removeCard(this);
      this.texture = this.mesh = null;
      this.bg = this.addChild(new PIXI.Graphics());
    }

    // Control Border
    this.frame = this.addChild(this.#drawFrame());

    // Interactivity
    this.cursor = this.document.isOwner ? "pointer" : null;
  }

  /**
   * Create elements for the Card border and handles
   * @returns {PIXI.Container}
   */
  #drawFrame() {
    const frame = new PIXI.Container();
    frame.eventMode = "passive";
    frame.bounds = new PIXI.Rectangle();
    frame.interaction = frame.addChild(new PIXI.Container());
    frame.interaction.hitArea = frame.bounds;
    frame.interaction.eventMode = "auto";
    frame.border = frame.addChild(new PIXI.Graphics());
    frame.border.eventMode = "none";
    return frame;
  }

  /**
   * Create a PreciseText element to be displayed as part of this drawing.
   * @returns {PreciseText}
   */
  #drawText() {
    const text = new foundry.canvas.containers.PreciseText(this.document.text || "", this._getTextStyle());
    text.eventMode = "none";
    text.anchor.set(0.5, 0.5);
    return text;
  }

  /** @inheritdoc */
  _destroy(options) {
    canvas.interface.removeCard(this);
    this.texture?.destroy();
    this.frame?.destroy(); // Unsure if needed? Possibly resolves multi-select frame issue
  }

  /**
   * Prepare the text style used to instantiate a PIXI.Text or PreciseText instance for this Drawing document.
   * @returns {PIXI.TextStyle}
   * @protected
   */
  _getTextStyle() {
    const {fontSize, fontFamily, textColor, width} = this.document;
    const stroke = Math.max(Math.round(fontSize / 32), 2);
    return foundry.canvas.containers.PreciseText.getTextStyle({
      fontFamily: fontFamily,
      fontSize: fontSize,
      fill: textColor,
      strokeThickness: stroke,
      dropShadowBlur: Math.max(Math.round(fontSize / 16), 2),
      align: "center",
      wordWrap: true,
      wordWrapWidth: width,
      padding: stroke * 4
    });
  }

  /**
   * Apply render flags before a render occurs.
   * @param {Record<string, boolean>} flags      The render flags which must be applied
   * @protected
   */
  _applyRenderFlags(flags) {
    if (flags.refreshState) this._refreshState();
    if (flags.refreshRotation) this._refreshRotation();
    if (flags.refreshSize) this._refreshSize();
    if (flags.refreshPosition) this._refreshPosition();
    if (flags.refreshMesh) this._refreshMesh();
    if (flags.refreshText) this._refreshText();
    if (flags.refreshFrame) this._refreshFrame();
    if (flags.refreshElevation) this._refreshElevation();

    if (this.hasActiveHUD) canvas.cards.hud.render();
  }

  /* -------------------------------------------- */

  /**
   * Refresh the displayed state of the CardObject.
   * Used to update aspects of the CardObject which change based on the user interaction state.
   * @protected
   */
  _refreshState() {
    const {hidden, locked, sort} = this.document;
    this.visible = this.isVisible;
    this.alpha = this._getTargetAlpha();
    if (this.bg) this.bg.visible = this.layer.active;
    const colors = CONFIG.Canvas.dispositionColors;
    this.frame.border.tint = this.controlled ? (locked ? colors.HOSTILE : colors.CONTROLLED) : colors.INACTIVE;
    this.frame.border.visible = this.controlled || this.hover || this.layer.highlightObjects;
    const zIndex = this.zIndex = this.controlled ? 2 : this.hover ? 1 : 0;
    if (!this.mesh) return;
    this.mesh.visible = this.visible;
    this.mesh.sort = sort;
    this.mesh.zIndex = zIndex;
    this.mesh.alpha = this.alpha * (hidden ? 0.5 : 1);
    this.mesh.hidden = hidden;
  }

  /**
   * Refresh the rotation.
   * @protected
   */
  _refreshRotation() {
    const rotation = this.document.rotation;
    if (!this.mesh) return this.bg.angle = rotation;
    this.mesh.angle = rotation;
  }

  /**
   * Refresh the size.
   * @protected
   */
  _refreshSize() {
    const {width, height, texture: {fit, scaleX, scaleY}} = this.document;
    if (!this.mesh) return this.bg.clear().beginFill(0xFFFFFF, 0.5).drawRect(0, 0, width, height).endFill();
    this._resizeMesh(width, height, {fit, scaleX, scaleY});
  }

  /**
   * Refresh the position.
   * @protected
   */
  _refreshPosition() {
    const {x, y, width, height} = this.document;
    if ((this.position.x !== x) || (this.position.y !== y)) foundry.canvas.interaction.MouseInteractionManager.emulateMoveEvent();
    this.position.set(x, y);
    if (!this.mesh) {
      this.bg.position.set(width / 2, height / 2);
      this.bg.pivot.set(width / 2, height / 2);
      return;
    }
    this.mesh.position.set(x + (width / 2), y + (height / 2));
  }

  /**
   * Refresh the appearance of the CardObject.
   * @protected
   */
  _refreshMesh() {
    if (!this.mesh) return;
    const {width, height, texture} = this.document;
    const {anchorX, anchorY, fit, scaleX, scaleY, tint, alphaThreshold} = texture;
    this.mesh.anchor.set(anchorX, anchorY);
    this._resizeMesh(width, height, {fit, scaleX, scaleY});

    this.mesh.tint = tint;
    this.mesh.textureAlphaThreshold = alphaThreshold;
  }

  /**
   * Refresh the elevation
   * @protected
   */
  _refreshElevation() {
    if (!this.mesh) return;
    this.mesh.elevation = this.document.elevation;
  }

  /**
   * Refresh the content and appearance of text.
   * @protected
   */
  _refreshText() {
    const pixiText = this.mesh?.text;
    if (!pixiText) return;
    const {text, textAlpha} = this.document;
    pixiText.text = text ?? "";
    pixiText.alpha = textAlpha;
    pixiText.style = this._getTextStyle();
  }

  /**
   * Refresh the border frame that encloses the CardObject.
   * @protected
   */
  _refreshFrame() {
    // Update the frame bounds
    const {width, height, rotation} = this.document;
    const bounds = this.frame.bounds;
    const offsetX = (width - this.mesh.width) / 2;
    const offsetY = (height - this.mesh.height) / 2;
    bounds.x = 0 + offsetX;
    bounds.y = 0 + offsetY;
    bounds.width = width - 2 * offsetX;
    bounds.height = height - 2 * offsetY;
    bounds.rotate(Math.toRadians(rotation));
    foundry.canvas.interaction.MouseInteractionManager.emulateMoveEvent();

    // Draw the border
    const thickness = CONFIG.Canvas.objectBorderThickness;
    const border = this.frame.border;
    border.clear();
    border.lineStyle({width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND, alignment: 0.75})
      .drawShape(bounds);
    border.lineStyle({width: thickness / 2, color: 0xFFFFFF, join: PIXI.LINE_JOIN.ROUND, alignment: 1})
      .drawShape(bounds);
  }

  /**
   * Adapted from `PrimarySpriteMesh#resize`, this helper method adjusts the contained SpriteMesh
   * according to desired dimensions and options.
   * @param {number} baseWidth  The base width used for computations.
   * @param {number} baseHeight The base height used for computations.
   * @param {*} [options]       options
   * @param {"fill"|"cover"|"contain"|"width"|"height"} [options.fit="fill"]  The fit type.
   * @param {number} [options.scaleX=1]    The scale on X axis.
   * @param {number} [options.scaleY=1]    The scale on Y axis.
   */
  _resizeMesh(baseWidth, baseHeight, {fit = "fill", scaleX = 1, scaleY = 1} = {}) {
    if (!(baseWidth >= 0) || !(baseHeight >= 0)) {
      throw new Error(`Invalid baseWidth/baseHeight passed to ${this.constructor.name}#_resizeMesh.`);
    }
    const {width: textureWidth, height: textureHeight} = this.mesh._texture;
    let sx;
    let sy;
    switch (fit) {
      case "fill":
        sx = baseWidth / textureWidth;
        sy = baseHeight / textureHeight;
        break;
      case "cover":
        sx = sy = Math.max(baseWidth / textureWidth, baseHeight / textureHeight);
        break;
      case "contain":
        sx = sy = Math.min(baseWidth / textureWidth, baseHeight / textureHeight);
        break;
      case "width":
        sx = sy = baseWidth / textureWidth;
        break;
      case "height":
        sx = sy = baseHeight / textureHeight;
        break;
      default:
        throw new Error(`Invalid fill type passed to ${this.constructor.name}#_resizeMesh (fit=${fit}).`);
    }
    sx *= scaleX;
    sy *= scaleY;
    this.mesh.scale.set(sx, sy);
    this.mesh._width = Math.abs(sx * textureWidth);
    this.mesh._height = Math.abs(sy * textureHeight);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onCreate(data, options, userId) {
    canvas.cards.objects.addChild(this);
    this.draw();
  }

  /** @inheritdoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    const restrictionsChanged = ("restrictions" in changed) && !foundry.utils.isEmpty(changed.restrictions);

    if (("sort" in changed) || ("elevation" in changed)) {
      this.parent.sortDirty = true;
      if (this.mesh) this.mesh.parent.sortDirty = true;
    }

    // Refresh the Drawing
    this.renderFlags.set({
      redraw: ("texture" in changed) && ("src" in changed.texture),
      refreshState: ("sort" in changed) || ("hidden" in changed) || ("locked" in changed) || restrictionsChanged,
      refreshPosition: ("x" in changed) || ("y" in changed),
      refreshRotation: "rotation" in changed,
      refreshSize: ("width" in changed) || ("height" in changed),
      refreshMesh: ("texture" in changed),
      refreshText: (options.cardText),
      refreshElevation: "elevation" in changed,
      refreshPerception: ("occlusion" in changed) && ("mode" in changed.occlusion)
    });
  }

  /* -------------------------------------------- */
  /*  Interactivity                               */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _onClickLeft2(event) {
    const filePath = this.document.texture.src;
    if (filePath) {
      const ip = new foundry.applications.apps.ImagePopout({
        src: filePath,
        window: {
          title: this.document.card.name
        },
        uuid: this.document.card.uuid
      });
      ip.render(true);
    }
    if (!this._propagateLeftClick(event)) event.stopPropagation();
  }

  /** @inheritdoc */
  _canDragLeftStart(user, event) {
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return false;
    }
    if (this.document.locked && (this.document.documentName === "Card")) {
      ui.notifications.warn(game.i18n.format("CONTROLS.ObjectIsLocked", {type: this.document.documentName}));
      return false;
    }
    return true;
  }

  /**
   * Card draw mode to use for this CardObject
   */
  get cardDrawMode() {
    if (this.document.flipped) return CONST.CARD_DRAW_MODES.LAST;
    return CONST.CARD_DRAW_MODES.FIRST;
  }

  /** @inheritdoc */
  _initializeDragLeft(event) {

    /** @type {this[]} */
    const objects = this.layer.controlled;
    const clones = [];
    for (const o of objects) {
      if (!o._canDrag(game.user, event)) continue;
      else if (o.document.locked) {
        if ((this.document.documentName === "Card")) continue;
        else if ((objects.length > 1) || !game.users.activeGM) continue;
        try {
          const [card] = o.document.card._drawCards(1, this.cardDrawMode);
          if (card.canvasCard?.object) {
            ui.notifications.error("CCM.Warning.FailCanvasDeck", {localize: true});
            continue;
          }
        }
        catch {
          ui.notifications.error("CCM.Warning.FailDraw", {localize: true});
          continue;
        }
        ui.notifications.info(game.i18n.format("CCM.CardLayer.DragCardFromDeck", {name: o.document.card.name}));
      }
      // Clone the object
      const c = o.clone();
      clones.push(c);

      // Draw the clone
      c._onDragStart();
      c.visible = false;
      this.layer.preview.addChild(c);
      c.draw().then(c => c.visible = true);
    }
    event.interactionData.clones = clones;
  }

  /** @inheritdoc */
  _onDragLeftDrop(event) {
    // Ensure that we landed in bounds
    const {clones, destination} = event.interactionData;
    if (!clones || !canvas.dimensions.rect.contains(destination.x, destination.y)) return false;
    event.interactionData.clearPreviewContainer = false;

    // Perform database updates using dropped data
    const updates = this._prepareDragLeftDropUpdates(event);
    if (updates) this.#commitDragLeftDropUpdates(updates);
  }

  /**
   * @typedef DragUpdate
   * @prop {number} x - The new x coordinate
   * @prop {number} y - The new y coordinate
   * @prop {number} rotation - The new rotation
   * @prop {string} _id - The canvas card's UUID
   */

  /**
   * Perform database updates using the result of a drag-left-drop operation.
   * @param {DragUpdate[]} updates      The database updates
   * @returns {Promise<void>}
   */
  async #commitDragLeftDropUpdates(updates) {
    const cardStackUpdates = [];

    const processedUpdates = updates.reduce((cards, u) => {
      const d = fromUuidSync(u._id);
      const updateData = {
        flags: {
          [MODULE_ID]: {
            [this.scene.id]: {
              x: u.x,
              y: u.y,
              rotation: u.rotation
            }
          }
        },
        _id: d.id
      };
      if (d instanceof Cards) {
        const trueLocked = this.document.card.getFlag(MODULE_ID, canvas.scene.id).locked;
        if (!trueLocked) cardStackUpdates.push(updateData);
        else {
          // Pulls the next card.
          const [card] = d._drawCards(1, this.cardDrawMode);
          if (!card) {
            ui.notifications.error("CCM.Warning.FailDraw", {localize: true});
            return cards;
          }
          const data = updateData.flags[MODULE_ID][this.scene.id];

          // Adjust for offset differences between dropping from application
          data.x += ((card.width ?? 2) * canvas.grid.sizeX) / 2;
          data.y += ((card.height ?? 3) * canvas.grid.sizeY) / 2;

          // Reusing API function because it has the socket handling
          placeCard(card, data);
          this.layer.clearPreviewContainer();
          return;
        }
      } else {
        const parentSlot = cards[d.parent.id];
        if (parentSlot) parentSlot.push(updateData);
        else cards[d.parent.id] = [updateData];
      }
      return cards;
    }, {});

    if (!processedUpdates) return;

    await Cards.implementation.updateDocuments(cardStackUpdates);

    for (const [id, updates] of Object.entries(processedUpdates)) {
      await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
    }
    this.layer.clearPreviewContainer();
  }

}

/** @import {PlaceablesLayerOptions} from "@client/canvas/layers/_types.mjs" */

/**
 * The main Card layer
 */
class CardLayer extends foundry.canvas.layers.PlaceablesLayer {
  // "Card" is not a valid document name within the scene document
  static documentName = "Card";

  /**
   * Configuration options for the CardLayer
   * @returns {PlaceablesLayerOptions}
   */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "cards",
      controllableObjects: true,
      rotatableObjects: true,
      zIndex: 100
    });
  }

  /**
   * The collection of card objects which are rendered in the interface.
   *
   * @type {Map<string, CardObject>}
   */
  graphics = new foundry.utils.Collection();

  /**
   * The name used by hooks to construct their hook string.
   *
   * @returns {string} The name
   */
  get hookName() {
    return CardLayer.name;
  }

  /** @inheritdoc */
  get hud() {
    return canvas.hud.cards;
  }

  // TODO: investigate if there's caching performance improvements
  /** @inheritdoc */
  get documentCollection() {
    const activeScene = canvas.scene;
    if (!activeScene) return null;
    const uuids = activeScene.getFlag(MODULE_ID, "cardCollection") ?? [];
    return uuids.reduce((coll, uuid) => {
      const doc = fromUuidSync(uuid);
      if (doc) coll.set(uuid, doc);
      return coll;
    }, new foundry.utils.Collection());
  }

  /** @inheritdoc */
  getMaxSort() {
    let sort = -Infinity;
    const collection = this.documentCollection;
    for (const document of collection) sort = Math.max(sort, document.canvasCard.sort);
    return sort;
  }

  /** @inheritdoc */
  async _sendToBackOrBringToFront(front) {
    if (!this.controlled.length) return true;

    // Determine to-be-updated objects and the minimum/maximum sort value of the other objects
    const toUpdate = [];
    let target = front ? -Infinity : Infinity;
    for (const document of this.documentCollection) {
      if (!document.canvasCard) continue;
      if (document.canvasCard?.object?.controlled && !document.locked) toUpdate.push(document);
      else target = (front ? Math.max : Math.min)(target, document.canvasCard.sort);
    }
    if (!Number.isFinite(target)) return true;
    target += (front ? 1 : -toUpdate.length);

    // Sort the to-be-updated objects by sort in ascending order
    toUpdate.sort((a, b) => a.sort - b.sort);

    // Update the to-be-updated objects
    const updates = toUpdate.reduce((cards, card, i) => {
      const parentSlot = cards[card.id];
      const updateData = {_id: card.id};
      foundry.utils.setProperty(updateData, `flags.${MODULE_ID}.${canvas.scene.id}.sort`, target + i);
      if (parentSlot) parentSlot.push(updateData);
      else cards[card.parent.id] = [updateData];
      return cards;
    }, {});

    await processUpdates(updates);

    return true;
  }

  /** @inheritdoc */
  getSnappedPoint(point) {
    if (canvas.forceSnapVertices) return canvas.grid.getSnappedPoint(point, {mode: CONST.GRID_SNAPPING_MODES.VERTEX});
    return super.getSnappedPoint(point);
  }

  /** @inheritdoc */
  async _draw(options) {

    // Setting up the group functionality
    /** @type {InterfaceCanvasGroup} */
    const itf = this.parent;
    itf.cardCollection = new foundry.utils.Collection();
    itf.cardMeshes = itf.addChild(new PIXI.Container());
    itf.cardMeshes.sortChildren = CardLayer.#sortMeshesByElevationAndSort;
    itf.cardMeshes.sortableChildren = true;
    itf.cardMeshes.eventMode = "none";
    itf.cardMeshes.interactiveChildren = false;
    itf.cardMeshes.zIndex = 100;

    // Layer functionality
    // Inherited from InteractionLayer
    this.hitArea = canvas.dimensions.rect;
    this.zIndex = this.getZIndex();

    // Re-implementation of PlaceablesLayer._draw
    this.objects = this.addChild(new PIXI.Container());
    this.objects.sortableChildren = true;
    this.objects.visible = false;
    this.objects.sortChildren = CardLayer.#sortObjectsByElevationAndSort;
    this.objects.on("childAdded", (obj) => {
      if (obj instanceof CardObject) {
        obj._updateQuadtree();
      }
    });
    this.objects.on("childRemoved", (obj) => {
      if (obj instanceof CardObject) {
        obj._updateQuadtree();
      }
    });

    this.preview = this.addChild(new PIXI.Container());

    /** @type {Array<Card | Cards>} */
    const documents = this.getDocuments();
    const promises = documents.map((doc) => {
      // Preemptively filtering out drawings that would fail
      const data = doc.getFlag(MODULE_ID, canvas.scene.id);
      if (!data || (data.x === undefined) || (data.y === undefined)) {
        console.warn("No canvas data found for", doc.name);
        return;
      }
      const syntheticDoc = new CanvasCard(doc);
      doc.canvasCard = syntheticDoc;
      const obj = (syntheticDoc._object = this.createObject(syntheticDoc));
      this.objects.addChild(obj);
      return obj.draw();
    });

    // Wait for all objects to draw
    await Promise.all(promises);
    this.objects.visible = true;
  }

  /** @inheritdoc */
  static prepareSceneControls() {
    return {
      name: "cards",
      order: 12,
      title: "CCM.CardLayer.Title",
      layer: "cards",
      icon: CONFIG.Cards.sidebarIcon,
      onChange: (event, active) => {
        if (active) canvas.cards.activate();
      },
      onToolChange: () => canvas.cards.setAllRenderFlags({refreshState: true}),
      tools: {
        select: {
          name: "select",
          order: 1,
          title: "CCM.CardLayer.Tools.SelectTitle",
          icon: "fa-solid fa-expand"
        },
        snap: {
          name: "snap",
          order: 2,
          title: "CONTROLS.CommonForceSnap",
          icon: "fa-solid fa-plus",
          toggle: true,
          active: canvas.forceSnapVertices,
          onChange: (event, toggled) => canvas.forceSnapVertices = toggled
        },
        delete: {
          name: "delete",
          order: 3,
          title: "CCM.CardLayer.Tools.ClearTitle",
          icon: "fa-solid fa-trash",
          visible: game.user.isGM,
          button: true,
          onChange: (event, toggled) => canvas.cards.deleteAll()
        }
      },
      activeTool: "select"
    };
  }

  /**
   * The method to sort the objects elevation and sort before sorting by the z-index.
   * @type {Function}
   */
  static #sortObjectsByElevationAndSort = function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i]._lastSortedIndex = i;
    }
    this.children.sort((a, b) => (a.document.elevation - b.document.elevation)
      || (a.document.sort - b.document.sort)
      || (a.zIndex - b.zIndex)
      || (a._lastSortedIndex - b._lastSortedIndex)
    );
    this.sortDirty = false;
  };

  static #sortMeshesByElevationAndSort = function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i]._lastSortedIndex = i;
    }
    this.children.sort((a, b) => {
      const a_uuid = a.name.endsWith(".preview") ? a.name.slice(0, a.name.length - ".preview".length) : a.name;
      const b_uuid = b.name.endsWith(".preview") ? b.name.slice(0, b.name.length - ".preview".length) : b.name;
      const adoc = fromUuidSync(a_uuid)?.canvasCard;
      const bdoc = fromUuidSync(b_uuid)?.canvasCard;
      return (adoc?.elevation - bdoc?.elevation)
      || (adoc?.sort - bdoc?.sort)
      || (a.zIndex - b.zIndex)
      || (a._lastSortedIndex - b._lastSortedIndex);
    });
    this.sortDirty = false;
  };

  /** @inheritdoc */
  async rotateMany({angle, delta, snap, ids, includeLocked = false} = {}) {

    if ((angle ?? delta ?? null) === null) {
      throw new Error("Either a target angle or relative delta must be provided.");
    }

    // Rotation is not permitted
    if (!this.options.rotatableObjects) return [];
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return [];
    }

    // Identify the objects requested for rotation
    const objects = this._getMovableObjects(ids, includeLocked);
    if (!objects.length) return objects;

    // Conceal any active HUD
    this.hud?.clear();

    const updates = generateUpdates(
      `flags.${MODULE_ID}.${canvas.scene.id}.rotation`,
      (o) => o._updateRotation({angle, delta, snap}),
      {targetPath: "rotation"}
    );
    await processUpdates(updates);
    return objects;
  }

  /** @inheritdoc */
  async deleteAll() {
    const type = this.constructor.documentName;
    if (!game.user.isGM) {
      throw new Error(`You do not have permission to delete ${type} objects from the Scene.`);
    }
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: "CONTROLS.ClearAll",
        icon: "fa-solid fa-cards"
      },
      content: game.i18n.format("CONTROLS.ClearAllHint", {type}),
      rejectClose: false,
      modal: true
    });
    if (proceed) {
      const cardCollection = canvas.scene.getFlag(MODULE_ID, "cardCollection");
      if (!cardCollection) {
        ui.notifications.warn("CARDS.NoCards", {localize: true});
        return null;
      }
      for (const uuid of cardCollection) {
        const card = fromUuidSync(uuid);
        if (!card) continue;
        await card.unsetFlag(MODULE_ID, canvas.scene.id);
      }
      ui.notifications.info(game.i18n.format("CONTROLS.DeletedObjects", {count: cardCollection.length, type}));
      return canvas.scene.unsetFlag(MODULE_ID, "cardCollection");
    }
  }

  /** @inheritdoc */
  _getCopyableObjects(options) {
    ui.notifications.warn("CCM.Warning.NoCopyCutPaste", {localize: true});
    return [];
  }

  /** @inheritdoc */
  async _onDeleteKey(event) {
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return;
    }

    // Identify objects which are candidates for deletion
    const objects = this.controlled;
    if (!objects.length) return;

    // Restrict to objects which can be deleted
    const uuids = objects.reduce((objIds, o) => {
      const isDragged = (o.interactionState === foundry.canvas.interaction.MouseInteractionManager.INTERACTION_STATES.DRAG);
      if (isDragged || o.document.locked || !o.document.canUserModify(game.user, "delete")) return objIds;
      if (this.hover === o) this.hover = null;
      objIds.push(o.id);
      return objIds;
    }, []);
    if (uuids.length) {
      if (this.options.confirmDeleteKey) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: {
            title: game.i18n.format("DOCUMENT.Delete", {type: this.constructor.documentName}),
            icon: "fa-solid fa-cards"
          },
          position: {
            width: 400,
            height: "auto"
          },
          content: `<p>${game.i18n.localize("AreYouSure")}</p>`,
          rejectClose: false,
          modal: true
        });
        if (!confirmed) return;
      }
      for (const uuid of uuids) {
        const d = fromUuidSync(uuid);
        await d.unsetFlag(MODULE_ID, canvas.scene.id);
      }
      const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
      const deletedCards = new Set(uuids);
      await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection.difference(deletedCards)));

      if (uuids.length !== 1) {
        ui.notifications.info(game.i18n.format("CONTROLS.DeletedObjects", {
          count: uuids.length, type: this.constructor.documentName
        }));
      }
    }
  }
}

const {api, hud} = foundry.applications;

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for {@link CardObject}.
 * This interface provides controls for visibility...
 * The CardHUD implementation is stored at {@link CONFIG.Card.hudClass}.
 * @extends {BasePlaceableHUD<CardObject, CanvasCard, CardLayer>}
 */
class CardHud extends api.HandlebarsApplicationMixin(hud.BasePlaceableHUD) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "card-hud",
    actions: {
      flip: this._onFlip,
      rotate: {handler: this._onRotate, buttons: [0, 2]},
      locked: this._onToggleLocked,
      visibility: this._onToggleVisibility,
      shuffle: this._onShuffle
    }
  };

  /** @inheritdoc */
  static PARTS = {
    hud: {
      root: true,
      template: "modules/complete-card-management/templates/canvas/card-hud.hbs"
    }
  };

  /**
   * Getter for the source Card or Cards document
   * @type {Card | Cards}
   */
  get card() {
    return this.document.card;
  }

  get _flagPath() {
    return `flags.${MODULE_ID}.${this.object.scene.id}`;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const typeName = this.card.type === CONST.BASE_DOCUMENT_TYPE
      ? this.card.constructor.metadata.label
      : CONFIG[this.card.documentName].typeLabels[this.card.type];
    Object.assign(context, {
      card: this.object.document.card,
      isCardStack: this.object.document.card instanceof Cards,
      lockedClass: this.document.locked ? "active" : "",
      visibilityClass: this.document.hidden ? "active" : "",
      flippedClass: this.document.flipped ? "active" : "",
      flipTooltip: game.i18n.format("CCM.CardLayer.HUD.Flip", {type: game.i18n.localize(typeName)})
    });
    return context;
  }

  /**
   * Actions
   */

  /**
   * Handle click actions to shuffle the deck.
   * @this {CardHUD}
   * @param {PointerEvent} event
   * @param {HTMLButtonElement} target
   */
  static async _onShuffle(event, target) {
    if (!(this.document.card instanceof Cards)) throw new Error("You can only shuffle a card stack");
    return this.document.card.shuffle();
  }

  /**
   * Handle click actions to toggle object visibility.
   * @this {CardHUD}
   * @param {PointerEvent} event
   * @param {HTMLButtonElement} target
   */
  static async _onToggleVisibility(event) {
    event.preventDefault();
    const updates = generateUpdates(
      this._flagPath + ".hidden",
      o => !o,
      {object: this.document, targetPath: "hidden", ignoreLock: true}
    );
    await processUpdates(updates);
  }

  /**
   * Handle click actions to toggle object locked state.
   * @this {CardHUD}
   * @param {PointerEvent} event
   * @param {HTMLButtonElement} target
   */
  static async _onToggleLocked(event) {
    event.preventDefault();
    const updates = generateUpdates(
      this._flagPath + ".locked",
      o => !o,
      {object: this.document, targetPath: "locked", ignoreLock: true}
    );
    await processUpdates(updates);
  }

  /**
   * Flips the selected card and all other controlled cards to match
   * @this {CardHUD}
   * @param {PointerEvent} event The originating click event
   * @param {HTMLButtonElement} target
   */
  static async _onFlip(event, target) {
    let updates;
    if (this.card.documentName === "Card") {
      // TODO: Improve handling for multi-faced cards
      updates = generateUpdates("face", (o) => o === null ? 0 : null, {object: this.card, targetPath: "face"});
    }
    else {
      updates = generateUpdates(
        this._flagPath + ".flipped",
        o => !o,
        {object: this.document, targetPath: "flipped", ignoreLock: true}
      );
    }
    await processUpdates(updates);
  }

  /**
   * Rotate the selected card 90 degrees and all other controlled cards to match
   * Left click rotates clockwise, right click rotates counter-clockwise
   * @this {CardHUD}
   * @param {PointerEvent} event The originating click event
   * @param {HTMLButtonElement} target
   */
  static async _onRotate(event, target) {
    const rotateValue = event.type === "click" ? 90 : -90;
    const updates = generateUpdates(
      this._flagPath + ".rotation",
      (o) => (o ?? 0) + rotateValue,
      {object: this.document, targetPath: "rotation"}
    );
    await processUpdates(updates);
  }
}

var apps = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CardHud: CardHud,
  CardSheet: CardSheet,
  CardsSheets: CardsSheet$1
});

const CCM_CONFIG = {
  REGION_EVENTS: {
    CARD_MOVE_IN: "cardMoveIn",
    CARD_MOVE_OUT: "cardMoveOut"
  }
};

const fields = foundry.data.fields;

class MoveCardBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {

  static LOCALIZATION_PREFIXES = ["CCM.MoveCardBehavior"];

  static defineSchema() {
    return {
      targetStack: new fields.ForeignDocumentField(getDocumentClass("Cards")),
      keepCanvasCard: new fields.BooleanField()
    };
  }

  /** @inheritdoc */
  static _createEventsField({events, initial} = {}) {
    const setFieldOptions = {
      label: "BEHAVIOR.TYPES.base.FIELDS.events.label",
      hint: "BEHAVIOR.TYPES.base.FIELDS.events.hint"
    };
    if (initial) setFieldOptions.initial = initial;
    return new fields.SetField(new fields.StringField({
      required: true,
      choices: {
        [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_OUT]: "CCM.REGION_EVENTS.CardMoveOut.label",
        [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_IN]: "CCM.REGION_EVENTS.CardMoveIn.label"
      }
    }), setFieldOptions);
  }

  /** @inheritdoc */
  static events = {
    [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_IN]: this.#onCardMoveIn,
    [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_OUT]: this.#onCardMoveOut
  };

  /**
   *
   * @this MoveCardBehavior
   * @param {RegionEvent} event
   */
  static async #onCardMoveIn(event) {
    const userCanUpdate = canvas.scene.testUserPermission(event.user, "update");
    const isResponsible = (userCanUpdate && event.user.isSelf) || (!userCanUpdate && game.user.isActiveGM);
    if (!userCanUpdate && !game.users.activeGM) {
      ui.notifications.error("CCM.MoveCardBehavior.NoGM", {localize: true});
      return;
    }
    if (!this.targetStack) {
      ui.notifications.error("CCM.MoveCardBehavior.NoStack", {localize: true});
      return;
    }
    const {card} = event.data;
    if ((this.targetStack !== card.parent) && isResponsible) {
      ui.notifications.info(game.i18n.format("CCM.MoveCardBehavior.AddCard",
        {name: card.name, stack: this.targetStack.name})
      );

      if (!this.keepCanvasCard) {
        await card.unsetFlag(MODULE_ID, canvas.scene.id);
      }

      card.pass(this.targetStack);
    }
  }

  /**
   *
   * @this MoveCardBehavior
   * @param {RegionEvent} event
   */
  static async #onCardMoveOut(event) {
    const {card} = event.data;
    if (this.targetStack && (this.targetStack !== card.parent) && event.user.isSelf) {
      console.debug(game.i18n.format("CCM.MoveCardBehavior.RemoveCard",
        {name: card.name, stack: this.targetStack.name})
      );
    }
  }
}

var canvas$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CanvasCard: CanvasCard,
  CardLayer: CardLayer,
  CardObject: CardObject,
  MoveCardBehavior: MoveCardBehavior
});

/** @import CardObject from "./canvas/CardObject.mjs" */

/**
 * Add a CardObject to the layer
 *
 * @this InterfaceCanvasGroup
 * @param {CardObject} card The CardObject being added
 * @returns {PIXI.Graphics} The created Graphics instance
 */
function addCard(card) {
  const name = card.objectId;
  const mesh = this.cardCollection.get(name) ?? this.cardMeshes.addChild(new foundry.canvas.containers.SpriteMesh(card.texture));
  mesh.texture = card.texture ?? PIXI.Texture.EMPTY;
  mesh.name = name;
  this.cardCollection.set(name, mesh);
  return mesh;
}

/**
 * Remove a CardObject from the layer
 *
 * @this InterfaceCanvasGroup
 * @param {CardObject} card The CardObject being added
 */
function removeCard(card) {
  const name = card.objectId;
  const mesh = this.cardCollection.get(name);
  if (mesh?.destroyed === false) mesh.destroy({children: true});
  this.cardCollection.delete(name);
}

/**
 * Run on Foundry init
 */
function init() {
  console.log("Complete Card Management | Initializing");
  CONFIG.CCM = CCM_CONFIG;

  ccm.socket.registerSocketHandlers();

  // Avoiding risks related to dot notation by preferring manual assignment over mergeObject
  CONFIG.Canvas.layers.cards = {
    group: "interface",
    layerClass: CardLayer
  };
  CONFIG.Card.objectClass = CardObject;
  CONFIG.Card.layerClass = CardLayer;
  CONFIG.Card.hudClass = CardHud;
  CONFIG.RegionBehavior.dataModels[MoveCardType] = MoveCardBehavior;
  CONFIG.RegionBehavior.typeIcons[MoveCardType] = "fa-solid fa-cards";
  CONFIG.controlIcons.flip = "modules/complete-card-management/assets/icons/vertical-flip.svg";
  CONFIG.controlIcons.rotate = "modules/complete-card-management/assets/icons/clockwise-rotation.svg";
  CONFIG.controlIcons.shuffle = "modules/complete-card-management/assets/icons/shuffle.svg";

  CanvasCard.registerSettings();

  const {DocumentSheetConfig} = foundry.applications.apps;

  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, DeckSheet, {
    label: "CCM.Sheets.Deck", types: ["deck"]
  });
  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, HandSheet, {
    label: "CCM.Sheets.Hand", types: ["hand"]
  });
  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, DockedHandSheet, {
    label: "CCM.Sheets.DockedHand", types: ["hand"]
  });
  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, PileSheet, {
    label: "CCM.Sheets.Pile", types: ["pile"]
  });
  DocumentSheetConfig.registerSheet(Card, MODULE_ID, CardSheet, {
    label: "CCM.Sheets.Card"
  });

  const interfaceCls = CONFIG.Canvas.groups.interface.groupClass;
  interfaceCls.prototype.addCard = addCard;
  interfaceCls.prototype.removeCard = removeCard;

  Hooks.callAll("CCMInit");
}

/* -------------------------------------------------- */

/**
 * Run on Foundry ready
 */
function ready() {
  console.log("Complete Card Management | Ready");
}

/* -------------------------------------------------- */
/*   Canvas hooks                                     */
/* -------------------------------------------------- */

/** @import {CanvasDropData} from "./_types.d.ts" */

/**
 * Handles drop data
 *
 * @param {Canvas} canvas                              - The Canvas
 * @param {CanvasDropData} data - Drop data
 */
function dropCanvasData(canvas, data) {
  switch (data.type) {
    case "Card":
      handleCardDrop(canvas, data);
      break;
    case "Cards":
      handleCardStackDrop(canvas, data);
      break;
  }
}

/* -------------------------------------------------- */

/**
 *
 * @param {Canvas} canvas - The Game Canvas
 * @param {CanvasDropData} data - Drop data
 */
async function handleCardDrop(canvas, data) {
  /** @type {Card} */
  let card;
  try {
    card = fromUuidSync(data.uuid);
  }
  catch (e) {
    ui.notifications.error("The dropped card must already be in a card stack in the world");
    return;
  }

  placeCard(card, data);
}

/* -------------------------------------------------- */

/**
 *
 * @param {Canvas} canvas - The Game Canvas
 * @param {CanvasDropData} data - Drop data
 */
async function handleCardStackDrop(canvas, data) {
  let cards = await fromUuidSync(data.uuid);
  if (cards.pack) {
    // We can import Cards documents from compendiums because they're primary documents
    const CardsCls = getDocumentClass("Cards");
    cards = await CardsCls.create(cards);
  }

  placeCard(cards, data);
}

/* -------------------------------------------------- */

/**
 * A hook event that fires when Cards are passed from one stack to another.
 * @event passCards
 * @category Cards
 * @param {Cards} origin                The origin Cards document
 * @param {Cards} destination           The destination Cards document
 * @param {object} context              Additional context which describes the operation
 * @param {string} context.action       The action name being performed, i.e. "pass", "play", "discard", "draw"
 * @param {object[]} context.toCreate     Card creation operations to be performed in the destination Cards document
 * @param {object[]} context.toUpdate     Card update operations to be performed in the destination Cards document
 * @param {object[]} context.fromUpdate   Card update operations to be performed in the origin Cards document
 * @param {object[]} context.fromDelete   Card deletion operations to be performed in the origin Cards document
 */
function passCards(origin, destination, context) {
  const cardCollectionRemovals = new Set(context.fromDelete.map(id => origin.cards.get(id).uuid));
  for (const changes of context.fromUpdate) { // origin type is a deck
    const card = origin.cards.get(changes._id);
    const moduleFlags = foundry.utils.getProperty(card, `flags.${MODULE_ID}`) ?? {};
    for (const sceneId of Object.keys(moduleFlags)) {
      foundry.utils.setProperty(changes, `flags.${MODULE_ID}.-=${sceneId}`, null);
    }
    cardCollectionRemovals.add(card.uuid);
  }
  if (!canvas.scene) {
    console.warn("Not viewing a scene to handle Card Layer updates");
    return;
  }
  const canUpdateScene = canvas.scene.canUserModify(game.user, "update");
  if (canUpdateScene) {
    const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
    for (const uuid of cardCollection) {
      if (!cardCollectionRemovals.has(uuid)) continue;
      cardCollection.delete(uuid);
      cardCollection.add(uuid.replace(origin.id, destination.id));
      canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection));
    }
  }
  else ccm.socket.emit("passCardHandler",
    {cardCollectionRemovals: Array.from(cardCollectionRemovals), originId: origin.id, destinationId: destination.id}
  );
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every embedded Document type after conclusion of a creation workflow.
 * Substitute the Document name in the hook event to target a specific type, for example "createToken".
 * This hook fires for all connected clients after the creation has been processed.
 *
 * @event createDocument
 * @category Document
 * @param {Card | Cards} card                       The new Document instance which has been created
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modified the creation request
 * @param {string} userId                           The ID of the User who triggered the creation workflow
 */
async function createCard(card, options, userId) {
  if (!canvas.scene) return;
  if (card.getFlag(MODULE_ID, canvas.scene.id)) {
    const synthetic = new CanvasCard(card);
    card.canvasCard = synthetic;
    const obj = (synthetic._object = canvas.cards.createObject(synthetic));
    obj._onCreate(card.toObject(), options, userId);
  }

  checkHandDisplayUpdate(card, "create");
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every Document type after conclusion of an update workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "updateActor".
 * This hook fires for all connected clients after the update has been processed.
 * @param {(Card | Cards) & { canvasCard?: ccm_canvas.CanvasCard}} card  The existing Document which was updated
 * @param {object} changed                                     Differential data that was used to update the document
 * @param {Partial<DatabaseUpdateOperation>} options           Additional options which modified the update request
 * @param {string} userId                                      The ID of the User who triggered the update workflow
 */
async function updateCard(card, changed, options, userId) {
  const moduleFlags = foundry.utils.getProperty(changed, `flags.${MODULE_ID}`) ?? {};
  /** @type {ccm_canvas.CanvasCard} */
  let synthetic = card.canvasCard;
  if (synthetic && (synthetic.parent === canvas.scene)) { // A synthetic card exists & exists on the canvas
    synthetic.update(changed, options, userId);
    if ((card.documentName === "Card") && card.parent && card.parent.canvasCard) {
      card.parent.canvasCard.refreshFace();
    }
  }
  else if (canvas.scene?.id in moduleFlags) { // New cards
    if (card.drawn && card.isHome) {
      ui.notifications.error("CCM.Warning.CardDrawn", {localize: true});
      return;
    }
    const synthetic = new CanvasCard(card);
    card.canvasCard = synthetic;
    const obj = (synthetic._object = canvas.cards.createObject(synthetic));
    obj._onCreate(card.toObject(), options, userId);
    if (card.documentName === "Card") {
      if (card.parent && card.parent.canvasCard) card.parent.canvasCard.refreshFace();
      synthetic._checkRegionTrigger(moduleFlags[canvas.scene.id], userId, true);
    }
  }
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every Document type after conclusion of an deletion workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "deleteActor".
 * This hook fires for all connected clients after the deletion has been processed.
 *
 * @event deleteDocument
 * @category Document
 * @param {Card | Cards} card                       The existing Document which was deleted
 * @param {Partial<DatabaseDeleteOperation>} options Additional options which modified the deletion request
 * @param {string} userId                           The ID of the User who triggered the deletion workflow
 */
async function deleteCard(card, options, userId) {
  if (card.canvasCard) {
    card.canvasCard.object._onDelete(options, userId);
  }

  checkHandDisplayUpdate(card, "delete");
}

/**
 * A hook event that fires for every Document type after conclusion of an update workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "updateActor".
 * This hook fires for all connected clients after the update has been processed.
 * @param {User} user  The existing Document which was updated
 * @param {object} changed                                     Differential data that was used to update the document
 * @param {Partial<DatabaseUpdateOperation>} options           Additional options which modified the update request
 * @param {string} userId                                      The ID of the User who triggered the update workflow
 */
async function updateUser(user, changed, options, userId) {
  const handId = foundry.utils.getProperty(changed, `flags.${MODULE_ID}.playerHand`);
  const changeShow = foundry.utils.getProperty(changed, `flags.${MODULE_ID}.showCardCount`);
  if (handId || changeShow) ui.players.render();
}

/* -------------------------------------------------- */

/**
 * A hook called when the canvas HUD is rendered during `Canvas#initialize`
 * @param {HeadsUpDisplayContainer} app  - The HeadsUpDisplayContainer application
 * @param {HTMLElement[]} jquery       - A JQuery object of the HUD
 * @param {object} context      - Context passed from HeadsUpDisplayContainer#getData
 */
function renderHeadsUpDisplayContainer(app, html, context, options) {
  if (!app.cards) app.cards = new CONFIG.Card.hudClass;
  // Position the CardHUD within the appropriate HTML
  const cardHudTemplate = document.createElement("template");
  cardHudTemplate.setAttribute("id", "card-hud");
  html.appendChild(cardHudTemplate);
}

/** @import UserConfig from "@client/applications/sheets/user-config.mjs" */

/**
 * A hook called when the UserConfig application opens
 * @param {UserConfig} app - The UserConfig application
 * @param {HTMLElement} html - The app's rendered HTML
 */
function renderUserConfig(app, html) {
  const PCDisplay = html.querySelector("fieldset:nth-child(2)");
  const cardSelect = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.innerText = game.modules.get("complete-card-management").title;
  PCDisplay.after(cardSelect);
  cardSelect.prepend(legend);

  /** @type {User} */
  const user = app.document;
  const handId = user.getFlag(MODULE_ID, "playerHand");
  const options = game.cards.reduce((arr, doc) => {
    if (!doc.visible || (doc.type !== "hand") || !doc.canUserModify(game.user, "update")) return arr;
    arr.push({value: doc.id, label: doc.name});
    return arr;
  }, []);

  const handSelect = foundry.applications.fields.createSelectInput({
    name: `flags.${MODULE_ID}.playerHand`,
    value: handId,
    options,
    blank: ""
  });

  const handSelectGroup = foundry.applications.fields.createFormGroup({
    label: "CCM.UserConfig.PlayerHand",
    localize: true,
    input: handSelect
  });

  cardSelect.append(handSelectGroup);

  const showCardCount = foundry.applications.fields.createCheckboxInput({
    name: `flags.${MODULE_ID}.showCardCount`,
    value: user.getFlag(MODULE_ID, "showCardCount")
  });

  const showCardCountGroup = foundry.applications.fields.createFormGroup({
    label: "CCM.UserConfig.ShowCardCount",
    localize: true,
    input: showCardCount
  });

  cardSelect.append(showCardCountGroup);
}

/** @import Players from "@client/applications/ui/players.mjs" */

/**
 * Add card displays to the player list
 * @param {Players} app
 * @param {HTMLElement} html
 * @param {object} context
 * @param {object} options
 */
function renderPlayers(app, html, context, options) {
  const list = html.querySelector("#players-active ol.players-list");
  for (const li of list.children) {
    const user = game.users.get(li.dataset.userId);
    const showCards = user.getFlag(MODULE_ID, "showCardCount");
    if (!showCards) continue;
    const handId = user.getFlag(MODULE_ID, "playerHand");
    const hand = game.cards.get(handId);
    if (!hand) continue;
    const cardCount = document.createElement("div");
    cardCount.classList = "card-count";
    const count = hand.cards.size;
    cardCount.innerText = count;
    cardCount.dataset.tooltip = game.i18n.format("CCM.UserConfig.CardCount", {count, stack: hand.name});
    cardCount.dataset.tooltipDirection = "UP";
    li.append(cardCount);
  }
}

/**
 *
 * @param {HTMLElement} html
 * @param {ContextMenuEntry[]} contextOptions
 */
function getUserContextOptions(html, contextOptions) {
  contextOptions.push({
    name: game.i18n.localize("CCM.UserConfig.OpenHand"),
    icon: "<i class=\"fa-solid fa-fw fa-cards\"></i>",
    condition: (li) => {
      const user = game.users.get(li.dataset.userId);
      const handId = user.getFlag(MODULE_ID, "playerHand");
      return game.cards.get(handId)?.visible;
    },
    callback: (li) => {
      const user = game.users.get(li.dataset.userId);
      const handId = user.getFlag(MODULE_ID, "playerHand");
      game.cards.get(handId)?.sheet.render(true);
    }
  });
}

/** @typedef {import("@client/applications/sheets/scene-config.mjs").default} SceneConfig */

/**
 * Add Scene pile selection
 * @param {SceneConfig} app
 * @param {HTMLElement} html
 * @param {Record<string, unknown>} context
 * @param {Record<string, unknown>} options
 */
function renderSceneConfig(app, html, context, options) {
  /** @type {Scene} */
  const scene = app.document;

  const selectOptions = game.cards.reduce((arr, doc) => {
    if (!doc.visible || (doc.type !== "pile") || !doc.canUserModify(game.user, "update")) return arr;
    arr.push({value: doc.id, label: doc.name});
    return arr;
  }, []);

  const input = foundry.applications.fields.createSelectInput({
    name: `flags.${MODULE_ID}.canvasPile`,
    value: scene.getFlag(MODULE_ID, "canvasPile"),
    options: selectOptions,
    blank: ""
  });

  const group = foundry.applications.fields.createFormGroup({
    input,
    label: "CCM.SceneConfig.CanvasPileLabel",
    hint: "CCM.SceneConfig.CanvasPileHint",
    localize: true
  });

  const basicOptions = html.querySelector(".tab[data-group=\"ambience\"][data-tab=\"basic\"]");

  basicOptions.append(group);

  app.setPosition();
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every embedded Document type after conclusion of a creation workflow.
 * Substitute the Document name in the hook event to target a specific type, for example "createToken".
 * This hook fires for all connected clients after the creation has been processed.
 *
 * @event createDocument
 * @category Document
 * @param {Scene} scene                       The new Document instance which has been created
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modified the creation request
 * @param {string} userId                           The ID of the User who triggered the creation workflow
 */
async function createScene(scene, options, userId) {
  if (userId !== game.userId) return; // guaranteed to be GM level user
  const cardCollection = scene.getFlag(MODULE_ID, "cardCollection");
  const sourceScene = fromUuidSync(scene._stats.duplicateSource);
  if (!cardCollection || !sourceScene || !(sourceScene instanceof Scene) || sourceScene.pack) return;
  const cardStackUpdates = [];
  const cardUpdates = cardCollection.reduce((cards, uuid) => {
    const d = fromUuidSync(uuid);
    if (!d) return cards;
    const updateData = {
      flags: {
        [MODULE_ID]: {
          [scene.id]: d.getFlag(MODULE_ID, sourceScene.id)
        }
      },
      _id: d.id
    };
    if (d instanceof Cards) cardStackUpdates.push(updateData);
    else {
      const parentSlot = cards[d.parent.id];
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
    }
    return cards;
  }, {});

  await Cards.implementation.updateDocuments(cardStackUpdates);

  for (const [id, updates] of Object.entries(cardUpdates)) {
    await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
  }
}

/* -------------------------------------------------- */

/** @typedef {import("@client/applications/sidebar/tabs/cards-directory.mjs").default} CardsDirectory */

/**
 * Add additional context options to cards in cards directory.
 * @param {CardsDirectory} app    The sidebar html.
 * @param {object[]} options      The array of context menu options.
 */
function addCardsDirectoryOptions(app, options) {
  options.push({
    name: "CCM.CardSheet.ScryingContext",
    icon: "<i class='fa-solid fa-eye'></i>",
    callback: async (li) => {
      const id = li.dataset.entryId;
      const cards = game.cards.get(id);
      const data = await promptAmount(cards);
      if (!data) return;
      ccm.api.scry(cards, {amount: data.amount, how: data.mode});
    }
  });
}

/* -------------------------------------------------- */

/**
 * Create a prompt for the user to select how many cards they want to have revealed, and how.
 * @param {Cards} cards                     The deck, hand, or pile of cards.
 * @returns {Promise<object|null|void>}     A promise that resolves to the number of cards and how to draw.
 */
async function promptAmount(cards) {
  const max = (cards.type === "deck") ? cards.availableCards.length : cards.cards.size;
  if (!max) {
    ui.notifications.warn(game.i18n.format("CCM.Warning.NoCardsAvailable", {
      type: game.i18n.localize(CONFIG.Cards.typeLabels[cards.type])
    }));
    return;
  }

  const rangePicker = new foundry.data.fields.NumberField({
    label: "CCM.CardSheet.ScryPromptLabel",
    hint: "CCM.CardSheet.ScryPromptHint"
  }).toFormGroup({localize: true}, {
    value: 1, step: 1, min: 1, max: max, name: "amount"
  }).outerHTML;

  const drawMode = new foundry.data.fields.NumberField({
    label: "CARDS.DrawMode",
    choices: {
      [CONST.CARD_DRAW_MODES.TOP]: "CARDS.DrawModeTop",
      [CONST.CARD_DRAW_MODES.BOTTOM]: "CARDS.DrawModeBottom"
    }
  }).toFormGroup({localize: true}, {
    value: CONST.CARD_DRAW_MODES.TOP, blank: false, name: "mode", localize: true
  }).outerHTML;

  const title = game.i18n.format("CCM.CardSheet.ScryingTitle", {name: cards.name});

  const data = await foundry.applications.api.DialogV2.input({
    modal: true,
    rejectClose: false,
    content: `<fieldset>${rangePicker}${drawMode}</fieldset>`,
    window: {title: title, icon: "fa-solid fa-eye"},
    position: {width: 400}
  });
  return data;
}

class CCMSocketHandler {
  constructor() {
    /**
     * Identifier used for socket operations
     * @type {string}
     */
    this.identifier = "module.complete-card-management";
  }

  /* -------------------------------------------------- */

  /**
   * Sets up socket reception
   */
  registerSocketHandlers() {
    game.socket.on(this.identifier, ({type, payload}) => {
      switch (type) {
        case "passCardHandler":
          this.#passCardHandler(payload);
          break;
        case "placeCardHandler":
          this.#placeCardHandler(payload);
          break;
        case "updateEmbeddedCards":
          this.#updateEmbeddedCards(payload);
          break;
        default:
          throw new Error("Unknown type");
      }
    });
  }

  /* -------------------------------------------------- */

  /**
   * Emits a socket message to all other connected clients
   * @param {string} type
   * @param {object} payload
   */
  emit(type, payload) {
    return game.socket.emit(this.identifier, {type, payload});
  }

  /* -------------------------------------------------- */

  /**
   *
   * @param {object} payload                          The received data
   * @param {string[]} payload.cardCollectionRemovals Cards that have been removed from the viewed scene's cardCollection
   * @param {object} payload.originId                 The ID of the origin card stack
   * @param {object} payload.destinationId            The ID of the destination card stack
   */
  #passCardHandler(payload) {
    if (!game.user.isActiveGM) return;
    if (!canvas.scene) {
      console.error("Not viewing a scene to handle Card Layer updates");
      return;
    }
    const {cardCollectionRemovals, originId, destinationId} = payload;
    const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
    for (const uuid of cardCollection) {
      if (!cardCollectionRemovals.includes(uuid)) continue;
      cardCollection.delete(uuid);
      cardCollection.add(uuid.replace(originId, destinationId));
      canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection));
    }
  }

  /* -------------------------------------------------- */

  /**
   * Delegate placing a card to the Active GM
   * @param {object} payload
   * @param {string} payload.uuid       UUID for the card to place
   * @param {string} payload.sceneId    ID for the scene to add the card to
   * @param {number} payload.x          Center of the card's horizontal location
   * @param {number} payload.y          Center of the card's vertical location
   * @param {number} [payload.rotation] Center of the card's horizontal location
   * @param {number} [payload.sort]     Center of the card's vertical location
   */
  #placeCardHandler(payload) {
    if (!game.user.isActiveGM) return;
    const {uuid, ...data} = payload;
    const card = fromUuidSync(uuid);
    placeCard(card, data);
  }

  /* -------------------------------------------------- */

  /**
   * Update cards embedded in a Cards document.
   * @param {object} payload                The received data.
   * @param {string} payload.uuid           The uuid of the Cards document whose cards to update.
   * @param {object[]} payload.updates      The array of updates to perform.
   * @param {string} payload.userId         The id of the user requested to perform the update.
   */
  #updateEmbeddedCards({uuid, updates, userId}) {
    if (game.user.id !== userId) return;
    const cards = fromUuidSync(uuid);
    cards.updateEmbeddedDocuments("Card", updates);
  }
}

globalThis.ccm = {canvas: canvas$1, api: api$1, apps, socket: new CCMSocketHandler()};

Hooks.once("init", init);

Hooks.once("ready", ready);

Hooks.on("dropCanvasData", dropCanvasData);

Hooks.on("renderSceneConfig", renderSceneConfig);

Hooks.on("renderHeadsUpDisplayContainer", renderHeadsUpDisplayContainer);
Hooks.on("renderUserConfig", renderUserConfig);
Hooks.on("renderPlayers", renderPlayers);
Hooks.on("getUserContextOptions", getUserContextOptions);
Hooks.on("updateUser", updateUser);

Hooks.on("passCards", passCards);

Hooks.on("createCard", createCard);
Hooks.on("createCards", createCard);

Hooks.on("updateCard", updateCard);
Hooks.on("updateCards", updateCard);

Hooks.on("deleteCard", deleteCard);
Hooks.on("deleteCards", deleteCard);

Hooks.on("createScene", createScene);

Hooks.on("getCardsContextOptions", addCardsDirectoryOptions);
