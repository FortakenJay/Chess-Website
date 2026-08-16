import { REASON_TAGS, type ReasonTag } from './tags'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/** Wrong tags that appear in the same opening first, then the rest of the enum. */
export function pickDistractors(
  trueTag: ReasonTag,
  familyTags: ReasonTag[],
  seed: string = trueTag,
): ReasonTag[] {
  const rng = mulberry32(hashSeed(seed))
  const family = [...new Set(familyTags.filter((tag) => tag !== trueTag))]
  const rest = REASON_TAGS.filter((tag) => tag !== trueTag && !family.includes(tag))
  return [...shuffle(family, rng), ...shuffle(rest, rng)].slice(0, 3)
}

export function reasonChoices(
  trueTag: ReasonTag,
  familyTags: ReasonTag[],
  seed: string = trueTag,
): ReasonTag[] {
  return shuffle([trueTag, ...pickDistractors(trueTag, familyTags, seed)], mulberry32(hashSeed(`q:${seed}`)))
}
