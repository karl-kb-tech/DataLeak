// High-signal subset of Sherlock platforms used as the DEFAULT username sweep.
//
// Why: the full data.json carries ~481 platforms — many obscure, regional, or
// adult sites that a non-technical NZ user doesn't care about and that block
// datacentre/serverless IPs anyway (producing noisy `unreachable` results). The
// curated set keeps the default sweep fast and relevant; the full list stays
// available as an explicit opt-in (`scope: 'all'`).
//
// Names MUST match keys in ./data/data.json exactly. curated.test.ts enforces
// this so an upstream rename can't silently shrink the default set.
//
// Note: Facebook is intentionally absent — Meta is not in Sherlock's data at
// all (username enumeration is actively blocked), so there is nothing to check.
// PSNProfiles.com stands in for PlayStation (no native PSN entry exists).

export const CURATED_PLATFORMS: readonly string[] = [
  // Social & messaging
  'Instagram',
  'Twitter',
  'threads',
  'TikTok',
  'Snapchat',
  'Pinterest',
  'Reddit',
  'tumblr',
  'LinkedIn',
  'Bluesky',
  'Discord',
  'Telegram',
  // Video / music / streaming
  'YouTube',
  'Twitch',
  'Kick',
  'Vimeo',
  'DailyMotion',
  'SoundCloud',
  'Spotify',
  'last.fm',
  // Photo / creative
  'Flickr',
  'Imgur',
  'DeviantArt',
  'Behance',
  'Dribbble',
  'VSCO',
  // Blogging / reading / writing
  'Medium',
  'Substack',
  'WordPress',
  'Blogger',
  'Wattpad',
  'GoodReads',
  'Letterboxd',
  // Professional / dev
  'GitHub',
  'GitLab',
  'BitBucket',
  'HackerNews',
  'Kaggle',
  'Docker Hub',
  'npm',
  // Gaming
  'Steam Community (User)',
  'Roblox',
  'Xbox Gamertag',
  'Minecraft',
  'Chess',
  'PSNProfiles.com',
  // Identity / link-in-bio / payments
  'Gravatar',
  'About.me',
  'Linktree',
  'AllMyLinks',
  'Strava',
  'Trello',
  'Patreon',
  'Venmo',
]

export const CURATED_SET: ReadonlySet<string> = new Set(CURATED_PLATFORMS)

export type SweepScope = 'curated' | 'all'

/** Coerce arbitrary input to a valid scope; anything but 'all' defaults to curated. */
export function toScope(raw: unknown): SweepScope {
  return raw === 'all' ? 'all' : 'curated'
}
