'use client';

import { JOURNEY_STAGES, STATUS_TO_STAGE } from '@/types';
import type { ProjectStatus } from '@/types';

interface JourneyTrackerProps {
  status: ProjectStatus;
  /** Override the active stage index (for screens that sit visually between statuses). */
  activeStageIndex?: number;
  className?: string;
}

type NodeState = 'done' | 'active' | 'upcoming' | 'stopped';

/**
 * The founder-facing lifecycle stepper. Renders all 10 journey stages with the
 * current one highlighted, past ones checked, future ones greyed. Terminal
 * off-path statuses (declined / parked) render the stop point in amber.
 */
export default function JourneyTracker({ status, activeStageIndex, className }: JourneyTrackerProps) {
  const mapped = STATUS_TO_STAGE[status];
  const { terminal, offPath } = mapped;
  const stageIndex = activeStageIndex ?? mapped.stageIndex;

  function nodeState(index: number): NodeState {
    if (offPath) {
      if (index < stageIndex) return 'done';
      if (index === stageIndex) return 'stopped';
      return 'upcoming';
    }
    if (terminal) return index <= stageIndex ? 'done' : 'upcoming';
    if (index < stageIndex) return 'done';
    if (index === stageIndex) return 'active';
    return 'upcoming';
  }

  const offPathLabel =
    offPath === 'declined' ? 'Declined here' : offPath === 'parked' ? 'Parked here' : null;

  return (
    <div className={['w-full', className ?? ''].join(' ')}>
      <ol className="flex flex-wrap gap-x-2 gap-y-4 sm:gap-x-3">
        {JOURNEY_STAGES.map((stage, index) => {
          const state = nodeState(index);
          return (
            <li key={stage.key} className="flex min-w-[84px] flex-1 flex-col items-center text-center">
              <Node state={state} index={index} />
              <span
                className={[
                  'mt-2 text-[11px] font-medium leading-tight',
                  state === 'active'
                    ? 'text-indigo-700'
                    : state === 'stopped'
                    ? 'text-amber-700'
                    : state === 'done'
                    ? 'text-gray-700'
                    : 'text-gray-400',
                ].join(' ')}
              >
                {stage.label}
              </span>
              {state === 'active' && (
                <span className="mt-0.5 text-[10px] text-gray-400 leading-tight">{stage.blurb}</span>
              )}
              {state === 'stopped' && offPathLabel && (
                <span className="mt-0.5 text-[10px] text-amber-600 leading-tight">{offPathLabel}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Node({ state, index }: { state: NodeState; index: number }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-1';
  if (state === 'done') {
    return (
      <div className={`${base} bg-green-100 text-green-700 ring-green-200`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className={`${base} bg-indigo-600 text-white ring-indigo-600 shadow-sm`}>{index + 1}</div>
    );
  }
  if (state === 'stopped') {
    return <div className={`${base} bg-amber-100 text-amber-700 ring-amber-300`}>!</div>;
  }
  return <div className={`${base} bg-gray-100 text-gray-400 ring-gray-200`}>{index + 1}</div>;
}
