// Крихітна, але справжня 8-бітна машина вітрини: програма — генератор псевдовипадкових чисел (LFSR, x⁸+x⁴+x³+x²+1).
// Її стан спільний для ПРОЦЕСОРА, ПАМ'ЯТІ й КОДУ: це різні погляди на одну й ту саму роботу.
export const PROGRAM = [
  { op: 'LDI', a: 'A', v: 0xA5, txt: 'LDI  A, 0xA5' },
  { op: 'LDI', a: 'X', v: 0x00, txt: 'LDI  X, 0' },
  { op: 'SHL', a: 'A', txt: 'SHL  A', label: 'rex' },
  { op: 'JNC', v: 5, txt: 'JNC  +2' },
  { op: 'XOR', a: 'A', v: 0x1D, txt: 'XOR  A, 0x1D' },
  { op: 'ST', txt: 'ST   [X], A' },
  { op: 'OUT', txt: 'OUT  A' },
  { op: 'INC', a: 'X', txt: 'INC  X' },
  { op: 'JMP', v: 2, txt: 'JMP  rex' },
];

export function machine() {
  const m = { pc: 0, A: 0, X: 0, C: 0, mem: new Uint8Array(16), out: [], cycle: 0, last: null };
  for (let i = 0; i < 16; i++) m.mem[i] = (i * 37 + 11) & 0xFF;
  /** Один такт; повертає подію { pc, op, addr?, out? } */
  m.tick = () => {
    const ins = PROGRAM[m.pc], ev = { pc: m.pc, op: ins.op };
    let next = m.pc + 1;
    switch (ins.op) {
      case 'LDI': m[ins.a] = ins.v; break;
      case 'SHL': { const r = m.A << 1; m.C = r > 255 ? 1 : 0; m.A = r & 255; break; }
      case 'JNC': if (!m.C) next = ins.v; break;
      case 'XOR': m.A ^= ins.v; break;
      case 'ST': m.mem[m.X & 15] = m.A; ev.addr = m.X & 15; break;
      case 'OUT': m.out.push(m.A); if (m.out.length > 12) m.out.shift(); ev.out = m.A; break;
      case 'INC': m.X = (m.X + 1) & 15; break;
      case 'JMP': next = ins.v; break;
    }
    m.pc = next % PROGRAM.length; m.cycle++; m.last = ev;
    return ev;
  };
  return m;
}
