/**
 * How each gate family looks, in one place.
 *
 * The whole point of the family system (DESIGN.md §6) is that a gate's
 * appearance is derived from its physics rather than assigned a colour, so
 * these mappings exist once and both circuit builders read them. The previous
 * implementation gave every gate its own hex value in the catalog, which is
 * how you end up with a rainbow: there was nowhere to express "these three
 * gates are the same kind of thing".
 *
 * Two chromatic values total — copper and steel.
 */

import type { GateFamily } from '../types';

export interface GateStyle {
  /** Keycap face, border and glyph. */
  key: string;
  /** The same gate drawn on a circuit wire. */
  cell: string;
  /** Armed state: the key is waiting for wires to be clicked. */
  armed: string;
  /** Whether a copper baseline rule is drawn under the glyph (phase gates). */
  underline: boolean;
}

const STYLES: Record<GateFamily, GateStyle> = {
  // The only filled key on the board.
  superposition: {
    key: 'border-copper-500 bg-copper-400 text-void hover:bg-copper-300',
    cell: 'border-copper-500 bg-copper-400 text-void',
    armed: 'border-copper-100 bg-copper-200 text-void',
    underline: false,
  },

  // A π rotation: copper edge, copper glyph, graphite face.
  pauli: {
    key: 'border-copper-600 bg-panel-raised text-copper-200 hover:border-copper-400 hover:bg-copper-900',
    cell: 'border-copper-600 bg-panel text-copper-200',
    armed: 'border-copper-300 bg-copper-900 text-copper-100',
    underline: false,
  },

  // A fraction of π about Z: steel glyph, neutral edge, copper baseline rule
  // marking it as a Z-rotation.
  phase: {
    key: 'border-rule-strong bg-panel-raised text-steel-400 hover:border-copper-600 hover:text-copper-200',
    cell: 'border-rule-strong bg-panel text-steel-200',
    armed: 'border-copper-300 bg-copper-900 text-copper-100',
    underline: true,
  },

  // Acts on more than one wire. The key is double-width, which is what
  // actually signals the arity — see KEY_SPAN below.
  entangling: {
    key: 'border-copper-600 bg-panel-raised text-copper-300 hover:border-copper-400 hover:bg-copper-900',
    cell: 'border-copper-600 bg-panel text-copper-200',
    armed: 'border-copper-300 bg-copper-900 text-copper-100',
    underline: false,
  },
};

export function gateStyle(family: GateFamily): GateStyle {
  return STYLES[family];
}

/**
 * Keycap width in grid columns. Entangling gates get two, so the key's shape
 * tells you it needs more than one wire before you've read the glyph.
 */
export function keySpan(family: GateFamily): 1 | 2 {
  return family === 'entangling' ? 2 : 1;
}

/** Human-readable family name, for the keypad's group labels. */
export const FAMILY_LABEL: Record<GateFamily, string> = {
  superposition: 'Superposition',
  pauli: 'Pauli',
  phase: 'Phase',
  entangling: 'Entangling',
};

/** Order the keypad lays families out in: simplest action first. */
export const FAMILY_ORDER: GateFamily[] = [
  'superposition',
  'pauli',
  'phase',
  'entangling',
];
