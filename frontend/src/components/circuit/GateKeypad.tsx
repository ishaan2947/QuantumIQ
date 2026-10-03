/**
 * The gate keypad.
 *
 * Gates are keys, grouped by physical family, differentiated by fill, outline
 * and width rather than by hue (DESIGN.md §6). The keyboard shortcut is
 * engraved on each cap in 8px mono, which is both an instrument detail and the
 * discoverability mechanism for the keyboard control the console actually
 * supports — a shortcut nobody can see is a shortcut nobody uses.
 *
 * Shared by the public console and the signed-in Lab.
 */

import { GATE_CATALOG, type GateFamily, type GateName } from '../../types';
import { FAMILY_LABEL, FAMILY_ORDER, gateStyle, keySpan } from '../../lib/gateStyles';

const GATES_BY_FAMILY = FAMILY_ORDER.map((family) => ({
  family,
  gates: (Object.keys(GATE_CATALOG) as GateName[]).filter(
    (name) => GATE_CATALOG[name].family === family,
  ),
}));

interface GateKeypadProps {
  armedGate: GateName | null;
  onArm: (gate: GateName) => void;
  numQubits: number;
  /** Circuit is at its gate cap — every key goes inert. */
  isFull?: boolean;
  /** Explains the cap in the key's tooltip. */
  maxGates?: number;
  /** Hides the engraved shortcuts where no global key handler is listening. */
  showShortcuts?: boolean;
}

function GateKey({
  name,
  armed,
  disabled,
  title,
  showShortcut,
  onArm,
}: {
  name: GateName;
  armed: boolean;
  disabled: boolean;
  title: string;
  showShortcut: boolean;
  onArm: () => void;
}) {
  const info = GATE_CATALOG[name];
  const style = gateStyle(info.family);
  const wide = keySpan(info.family) === 2;

  return (
    <button
      type="button"
      onClick={onArm}
      disabled={disabled}
      title={title}
      aria-pressed={armed}
      aria-label={`${info.name}${info.qubits > 1 ? `, ${info.qubits} qubits` : ''}`}
      className={`keycap h-11 font-mono text-readout font-medium
                  ${wide ? 'w-[5.75rem]' : 'w-11'}
                  ${armed ? style.armed : style.key}
                  ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
    >
      {/* Entangling keys draw their glyph as the textbook control/target pair,
          so the key shows what it will put on the wires. */}
      {info.family === 'entangling' ? (
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="flex flex-col items-center gap-px">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="h-1 w-px bg-current" />
            <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full border border-current">
              <span className="h-px w-1.5 bg-current" />
            </span>
          </span>
          {info.symbol}
        </span>
      ) : (
        info.symbol
      )}

      {/* Phase keys carry the copper baseline rule — the Z-rotation mark. */}
      {style.underline && (
        <span aria-hidden className="absolute inset-x-2 bottom-1 h-px bg-copper-500" />
      )}

      {showShortcut && (
        <span
          aria-hidden
          className={`absolute bottom-[3px] right-[4px] font-mono text-[8px] leading-none ${
            info.family === 'superposition' ? 'text-void/50' : 'text-ink-faint'
          }`}
        >
          {info.key}
        </span>
      )}
    </button>
  );
}

export default function GateKeypad({
  armedGate,
  onArm,
  numQubits,
  isFull = false,
  maxGates,
  showShortcuts = true,
}: GateKeypadProps) {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
      {GATES_BY_FAMILY.map(({ family, gates }, groupIndex) => (
        <div
          key={family}
          className={groupIndex > 0 ? 'border-rule sm:border-l sm:pl-5' : undefined}
        >
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            {FAMILY_LABEL[family as GateFamily]}
          </span>
          <div className="flex gap-1.5">
            {gates.map((name) => {
              const info = GATE_CATALOG[name];
              const tooWide = info.qubits > numQubits;
              const disabled = tooWide || isFull;

              return (
                <GateKey
                  key={name}
                  name={name}
                  armed={armedGate === name}
                  disabled={disabled}
                  showShortcut={showShortcuts}
                  onArm={() => onArm(name)}
                  title={
                    tooWide
                      ? `${info.name} needs ${info.qubits} qubits`
                      : isFull && maxGates
                        ? `This circuit is capped at ${maxGates} gates`
                        : `${info.name} — ${info.description}`
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
