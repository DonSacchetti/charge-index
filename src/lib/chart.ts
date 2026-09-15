/**
 * Zone bands for charge charts, split halfway between tiers — the same
 * boundaries nearestTier() uses, so a point's colour always matches its band.
 */
export const ZONE_BANDS = [
  { value: 100, from: 87.5, to: 100 },
  { value: 75, from: 62.5, to: 87.5 },
  { value: 50, from: 37.5, to: 62.5 },
  { value: 25, from: 17.5, to: 37.5 },
  { value: 10, from: 0, to: 17.5 },
] as const;
