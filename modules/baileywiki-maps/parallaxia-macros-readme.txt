HERE ARE TWO MACROS TO MAGICALLY TURN PARALLAXIA ON OR OFF. USE IT TO MAKE YOUR BOAT STATIONARY.

PARALLAXIA OFF: Cut and Paste the below text into a Script macro:
~~~~~~~~~~~~~~~~~~~~~~~~
let updates = canvas.tiles.placeables.filter(t => t.data.flags.parallaxia).map(t => {
  return {
    _id: t.id,
    'flags.parallaxia.isTarget': false,
  }
});
canvas.tiles.updateMany(updates)


PARALLAXIA ON: Cut and Paste the below text into a Script macro:
~~~~~~~~~~~~~~~~~~~~~~~~
let updates = canvas.tiles.placeables.filter(t => t.data.flags.parallaxia).map(t => {
  return {
    _id: t.id,
    'flags.parallaxia.isTarget': true,
  }
});
canvas.tiles.updateMany(updates)