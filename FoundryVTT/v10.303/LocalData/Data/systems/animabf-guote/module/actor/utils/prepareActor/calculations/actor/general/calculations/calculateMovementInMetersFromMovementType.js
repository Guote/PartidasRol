// TM 1–10: move TM meters; TM 11–13: 10+(tm-10)*5; TM 14–20: canonical table
const ZEN_TABLE = [50, 100, 200, 500, 1000, 2000, 5000]; // TM 14–20

export const calculateMovementInMetersFromMovementType = tm => {
  if (tm <= 10) return Math.max(1, tm);
  if (tm <= 13) return 10 + (tm - 10) * 5;
  return ZEN_TABLE[Math.min(tm - 14, ZEN_TABLE.length - 1)];
};
