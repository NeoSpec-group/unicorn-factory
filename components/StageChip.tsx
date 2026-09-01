'use client';

import type { ProjectStatus } from '@/types';

/**
 * The single, platform-wide humanized status → label mapping (DA-9). Both the
 * founder dashboard (this component) and the ops queue (frontend-2, read-only
 * consumer) render the same labels for the same `ProjectStatus` — no screen
 * prints a raw status enum.
 *
 * This is a *composition* built from tokens, not a new `components/ui/*`
 * primitive — it does not touch the frozen `Badge` contract (Badge's 3 variants
 * don't cover the 10+ journey states; see ux-spec §3.2).
 */
export const STAGE_CHIP_LABEL: Record<ProjectStatus, string> = {
  intake: 'In the Workshop',
  blueprint_ready: 'Blueprint ready',
  commissioned: 'In review',
  approved: 'Green-Light',
  paid: 'Ignition',
  building: 'In the Forge',
  uat: 'Proving Ground',
  handover: 'Handover',
  launched: 'Launched',
  managed: 'Managed',
  parked: 'Parked',
  declined: 'Declined',
};

type ChipTone = 'primary' | 'accent' | 'success' | 'neutral';

const STAGE_CHIP_TONE: Record<ProjectStatus, ChipTone> = {
  intake: 'primary',
  blueprint_ready: 'primary',
  commissioned: 'primary',
  approved: 'primary',
  paid: 'accent',
  building: 'accent',
  uat: 'primary',
  handover: 'primary',
  launched: 'success',
  managed: 'success',
  parked: 'neutral',
  declined: 'neutral',
};

const TONE_CLASSES: Record<ChipTone, string> = {
  primary: 'bg-primary-soft text-primary-hover',
  accent: 'bg-accent-soft text-[var(--color-accent-fg)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
  neutral: 'bg-surface-muted text-foreground-muted',
};

interface StageChipProps {
  status: ProjectStatus;
  className?: string;
}

export default function StageChip({ status, className = '' }: StageChipProps) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONE_CLASSES[STAGE_CHIP_TONE[status]],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {STAGE_CHIP_LABEL[status]}
    </span>
  );
}
