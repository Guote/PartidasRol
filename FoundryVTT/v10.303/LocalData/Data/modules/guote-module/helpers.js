// Merge Simple Calendar and SmallTime styles
// 1. Define your time-based color stops in minutes (0–1440). For example:
const COLOR_STOPS = [
  { time: 0, color: "#000000" }, // midnight
  { time: 288, color: "#351984" }, // ~4:48  AM (20% of day)
  { time: 432, color: "#db5a23" }, // ~7:12  AM (30%)
  { time: 504, color: "#d19621" }, // ~8:24  AM (35%)
  { time: 576, color: "#25c5ed" }, // ~9:36  AM (40%)
  { time: 864, color: "#25c5ed" }, // ~14:24 PM (60%)
  { time: 1008, color: "#d19621" }, // ~16:48 PM (70%)
  { time: 1080, color: "#db5a23" }, // ~18:00 PM (75%)
  { time: 1152, color: "#351984" }, // ~19:12 PM (80%)
  { time: 1440, color: "#000000" }, // next midnight
];

// Converts a hex color (#RRGGBB) into [r,g,b] array.
function parseColor(hex) {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

// Linearly interpolates between two [r,g,b] colors with fraction t in [0..1].
function interpolateColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// Given a dayTime in minutes (0..1439), find the interpolated color.
function getTimeColor(dayTime) {
  // Find the two COLOR_STOPS we’re between
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const stop1 = COLOR_STOPS[i];
    const stop2 = COLOR_STOPS[i + 1];
    if (dayTime >= stop1.time && dayTime <= stop2.time) {
      // fraction of the way from stop1 to stop2
      const t = (dayTime - stop1.time) / (stop2.time - stop1.time);
      const c1 = parseColor(stop1.color);
      const c2 = parseColor(stop2.color);
      const [r, g, b] = interpolateColor(c1, c2, t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  // Fallback if none found (shouldn’t happen if stops cover 0..1440)
  return COLOR_STOPS[0].color;
}
