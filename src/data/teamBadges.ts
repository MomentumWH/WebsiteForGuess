import type { Team } from './matches.ts'

const localBadges = new Map([
  ['arsenal', '/images/arsenal.png'],
  ['city', '/images/city.svg'],
  ['chelsea', '/images/chelsea.svg'],
  ['liverpool', '/images/liverpool.png'],
  ['tottenham', '/images/tottenham.png'],
  ['bayern', '/images/bayern.png'],
  ['madrid', '/images/madrid.png'],
  ['atletico', '/images/atletico.png'],
  ['porto', '/images/porto.png'],
])

export function premierLeagueBadge(id: string): string | undefined {
  return /^[1-9]\d{0,9}$/.test(id)
    ? `https://resources.premierleague.com/premierleague/badges/t${id}.png`
    : undefined
}

export function uefaBadge(id: string): string | undefined {
  return /^[1-9]\d{0,9}$/.test(id)
    ? `https://img.uefa.com/imgml/TP/teams/logos/240x240/${id}.png`
    : undefined
}

export function officialBadgeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    if (url.username || url.password) return undefined
    if (
      (url.origin === 'https://resources.premierleague.com' &&
        /^\/premierleague\/badges\/t[1-9]\d*\.(png|svg)$/.test(url.pathname)) ||
      (url.origin === 'https://img.uefa.com' &&
        /^\/imgml\/TP\/teams\/logos\/(70x70|240x240|700x700)\/[1-9]\d*\.png$/.test(url.pathname))
    ) {
      return url.href
    }
  } catch {
    /* Missing or invalid optional artwork must not prevent displaying a fixture. */
  }
  return undefined
}

export function teamBadgeSources(team: Team): string[] {
  // Older fixture caches have no badgeUrl, but keep the official ID in the team key.
  const plId = team.id === 'forest' ? '17' : /^pl-team-(\d+)$/.exec(team.id)?.[1]
  const uclId = /^ucl-team-(\d+)$/.exec(team.id)?.[1]
  return [
    ...new Set(
      [
        localBadges.get(team.id),
        officialBadgeUrl(team.badgeUrl),
        plId ? premierLeagueBadge(plId) : undefined,
        uclId ? uefaBadge(uclId) : undefined,
      ].filter((url): url is string => !!url),
    ),
  ]
}
