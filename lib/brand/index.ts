/**
 * Unicorn Factory — Brand config barrel.
 *
 * This is the single import surface both frontend lanes use, read-only:
 *   import { brand } from '@/lib/brand';
 *   brand.copy.landing.headline
 *   brand.tokens.primary[600]
 *
 * Neither frontend lane edits this directory. Re-skinning the product means
 * editing `tokens.ts` / `copy.ts` here and nothing else.
 */
import * as tokens from './tokens';
import * as copy from './copy';

export { LogoMark, Wordmark } from './Logo';
export * from './tokens';
export * from './copy';

export const brand = {
  tokens,
  copy,
} as const;

export default brand;
