export const REASON_TAGS = [
  'develop',
  'control_square',
  'prophylaxis',
  'tempo_gain',
  'tempo_avoid',
  'break_prep',
  'break_stop',
  'structure_fix',
  'open_line',
  'king_safety',
  'target_create',
  'piece_reroute',
  'trade_favorable',
  'transposition_control',
] as const

export type ReasonTag = (typeof REASON_TAGS)[number]

export const TAGS_NEEDING_TARGET: readonly ReasonTag[] = [
  'prophylaxis',
  'break_prep',
  'break_stop',
  'control_square',
]

export const REASON_TAG_LABEL: Record<ReasonTag, string> = {
  develop: 'Develop a piece',
  control_square: 'Fight for a square',
  prophylaxis: 'Stop their idea',
  tempo_gain: 'Gain a tempo',
  tempo_avoid: 'Avoid losing a tempo',
  break_prep: 'Prepare a pawn break',
  break_stop: 'Stop their pawn break',
  structure_fix: 'Fix the pawn structure',
  open_line: 'Open a file or diagonal',
  king_safety: 'King safety',
  target_create: 'Create a target',
  piece_reroute: 'Reroute a piece',
  trade_favorable: 'Favorable trade',
  transposition_control: 'Steer the transposition',
}

export function isReasonTag(value: string): value is ReasonTag {
  return (REASON_TAGS as readonly string[]).includes(value)
}
