import { describe, it, expect } from 'vitest';
import { TIER_BANDS } from '@/types';
import type { Tier } from '@/types';

describe('Estimator (ADR-8) — TIER_BANDS', () => {
  it('defines exactly the three value-anchored tiers', () => {
    expect(Object.keys(TIER_BANDS).sort()).toEqual(['advanced', 'spark', 'standard'].sort());
  });

  it('Spark is $3,000–$5,000', () => {
    expect(TIER_BANDS.spark).toEqual({ low: 3000, high: 5000, label: 'Spark' });
  });

  it('Standard is $7,000–$12,000', () => {
    expect(TIER_BANDS.standard).toEqual({ low: 7000, high: 12000, label: 'Standard' });
  });

  it('Advanced is $15,000–$22,000', () => {
    expect(TIER_BANDS.advanced).toEqual({ low: 15000, high: 22000, label: 'Advanced' });
  });

  it('every band has low < high (no degenerate/inverted bands)', () => {
    for (const tier of Object.keys(TIER_BANDS) as Tier[]) {
      const band = TIER_BANDS[tier];
      expect(band.low).toBeLessThan(band.high);
    }
  });

  it('bands are strictly ordered and non-overlapping: spark < standard < advanced', () => {
    expect(TIER_BANDS.spark.high).toBeLessThan(TIER_BANDS.standard.low);
    expect(TIER_BANDS.standard.high).toBeLessThan(TIER_BANDS.advanced.low);
  });

  it('tier → band mapping resolves a firm price display range for each tier', () => {
    const tierToBand = (tier: Tier) => TIER_BANDS[tier];
    expect(tierToBand('spark')).toEqual({ low: 3000, high: 5000, label: 'Spark' });
    expect(tierToBand('standard')).toEqual({ low: 7000, high: 12000, label: 'Standard' });
    expect(tierToBand('advanced')).toEqual({ low: 15000, high: 22000, label: 'Advanced' });
  });
});
