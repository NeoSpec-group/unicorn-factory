import { describe, it, expect } from 'vitest';
import { STATE_TRANSITIONS, TERMINAL_STATES, assertProjectStatus } from '@/lib/state-machine';
import type { ProjectStatus } from '@/types';

describe('lib/state-machine — STATE_TRANSITIONS', () => {
  it('defines the full 10-stage journey graph with actor + guard metadata', () => {
    const expected: Array<[ProjectStatus | null, ProjectStatus]> = [
      [null, 'intake'],
      ['intake', 'blueprint_ready'],
      ['blueprint_ready', 'commissioned'],
      ['blueprint_ready', 'parked'],
      ['commissioned', 'approved'],
      ['commissioned', 'declined'],
      ['approved', 'paid'],
      ['paid', 'building'],
      ['building', 'uat'],
      ['uat', 'handover'],
      ['uat', 'building'],
      ['handover', 'launched'],
      ['handover', 'managed'],
    ];

    const actual = STATE_TRANSITIONS.map((t) => [t.from, t.to]);
    expect(actual).toEqual(expected);

    for (const t of STATE_TRANSITIONS) {
      expect(['founder', 'ops', 'system']).toContain(t.actor);
      expect(typeof t.guard).toBe('string');
      expect(t.guard.length).toBeGreaterThan(0);
    }
  });

  it('marks exactly the four terminal states', () => {
    expect(TERMINAL_STATES.sort()).toEqual(['declined', 'launched', 'managed', 'parked'].sort());
  });

  it('has no outgoing transitions from any terminal state', () => {
    for (const terminal of TERMINAL_STATES) {
      const outgoing = STATE_TRANSITIONS.filter((t) => t.from === terminal);
      expect(outgoing).toHaveLength(0);
    }
  });

  it('allows uat to re-enter building exactly once per report (revision round) and also to advance to handover', () => {
    const fromUat = STATE_TRANSITIONS.filter((t) => t.from === 'uat').map((t) => t.to);
    expect(fromUat.sort()).toEqual(['building', 'handover'].sort());
  });

  it('allows handover to terminate at either launched or managed', () => {
    const fromHandover = STATE_TRANSITIONS.filter((t) => t.from === 'handover').map((t) => t.to);
    expect(fromHandover.sort()).toEqual(['launched', 'managed'].sort());
  });
});

describe('lib/state-machine — assertProjectStatus', () => {
  it('does not throw when current status matches expected', () => {
    expect(() => assertProjectStatus('blueprint_ready', 'blueprint_ready')).not.toThrow();
  });

  it('throws a descriptive error when current status does not match expected', () => {
    expect(() => assertProjectStatus('intake', 'blueprint_ready')).toThrow(
      /Invalid state transition: project is in 'intake', expected 'blueprint_ready'/,
    );
  });

  it('rejects every non-matching status for a given guard (spot check across the enum)', () => {
    const allStatuses: ProjectStatus[] = [
      'intake',
      'blueprint_ready',
      'commissioned',
      'approved',
      'declined',
      'paid',
      'building',
      'uat',
      'handover',
      'launched',
      'managed',
      'parked',
    ];
    for (const status of allStatuses) {
      if (status === 'commissioned') {
        expect(() => assertProjectStatus(status, 'commissioned')).not.toThrow();
      } else {
        expect(() => assertProjectStatus(status, 'commissioned')).toThrow();
      }
    }
  });

  it('rejects a terminal state being used as a current state for any further guard', () => {
    for (const terminal of TERMINAL_STATES) {
      expect(() => assertProjectStatus(terminal, 'building')).toThrow();
    }
  });
});
