import { normalizeUsername } from '@/lib/username'

export const BRAND = 'leak'

/** Tab title: `Results · hikaru · leak`. Landing can pass nothing for just `leak`. */
export function pageTitle(...parts: Array<string | null | undefined>): string {
  const cleaned: string[] = []
  for (const part of parts) {
    const trimmed = part?.trim()
    if (trimmed) cleaned.push(trimmed)
  }
  while (cleaned.at(-1)?.toLowerCase() === BRAND) cleaned.pop()
  return cleaned.length ? `${cleaned.join(' · ')} · ${BRAND}` : BRAND
}

export function playerTitle(page: string, username: string, extra?: string | null) {
  return pageTitle(page, extra, normalizeUsername(username))
}

/** Whose library this tab is about. Prefer the linked handle when it is your page. */
export function sessionWho(library: string, you?: string | null): string {
  const route = normalizeUsername(library)
  const linked = you ? normalizeUsername(you) : ''
  if (linked && linked === route) return linked
  return route
}

/** `Fork · Drill · michele · leak` — activity first, then surface, then player. */
export function sessionTitle(input: {
  activity?: string | null
  page: string
  library: string
  you?: string | null
}): string {
  return pageTitle(input.activity, input.page, sessionWho(input.library, input.you))
}

export function titleHead(...parts: Array<string | null | undefined>) {
  return { meta: [{ title: pageTitle(...parts) }] }
}

export function playerHead(page: string, username: string, extra?: string | null) {
  return { meta: [{ title: playerTitle(page, username, extra) }] }
}
