export type NormalizedIgdbGame = {
  igdb_id: number;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string | null;
  cover_url: string | null;
  release_date: string | null;
  rating: number | null;
  source: 'igdb';
};

export class IgdbRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'IgdbRequestError';
    this.status = status;
  }
}

type RawNamedRecord = {
  name?: string | null;
};

type RawCover = {
  image_id?: string | null;
  url?: string | null;
};

type RawIgdbGame = {
  id?: number | null;
  name?: string | null;
  summary?: string | null;
  first_release_date?: number | null;
  rating?: number | null;
  cover?: RawCover | null;
  genres?: RawNamedRecord[] | null;
  platforms?: RawNamedRecord[] | null;
  game_modes?: RawNamedRecord[] | null;
};

let cachedTwitchToken: string | null = null;
let cachedTwitchTokenExpiresAt = 0;
let activeIgdbRequestCount = 0;

const igdbRequestTimestamps: number[] = [];

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_GAMES_URL = 'https://api.igdb.com/v4/games';
const IGDB_REQUEST_WINDOW_MS = 1000;
const IGDB_MAX_REQUESTS_PER_WINDOW = 4;
const IGDB_MAX_OPEN_REQUESTS = 8;

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required function secret: ${name}`);
  }

  return value;
};

const escapeApicalypseString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const joinNamedValues = (values: RawNamedRecord[] | null | undefined, fallback: string) => {
  const joined = (values ?? [])
    .map((value) => value.name?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' / ');

  return joined || fallback;
};

const normalizeCoverUrl = (cover: RawCover | null | undefined) => {
  if (!cover) {
    return null;
  }

  const directUrl = cover.url?.trim();
  if (directUrl) {
    const httpsUrl = directUrl.startsWith('//') ? `https:${directUrl}` : directUrl;
    return httpsUrl.replace('/t_thumb/', '/t_cover_big/');
  }

  if (cover.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`;
  }

  return null;
};

const normalizeReleaseDate = (timestamp: number | null | undefined) => {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString().slice(0, 10);
};

const derivePlayerCount = (gameModes: RawNamedRecord[] | null | undefined) => {
  const normalizedModes = (gameModes ?? [])
    .map((mode) => mode.name?.toLowerCase().trim())
    .filter((mode): mode is string => Boolean(mode));

  if (normalizedModes.includes('single player') && normalizedModes.length === 1) {
    return '1 player';
  }

  if (
    normalizedModes.some((mode) =>
      ['multiplayer', 'co-operative', 'battle royale', 'massively multiplayer online (mmo)'].includes(mode),
    )
  ) {
    return '2+ players';
  }

  if (normalizedModes.includes('single player')) {
    return '1-2 players';
  }

  return 'Players TBA';
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getIgdbMatchTier = (title: string, query: string) => {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return 99;
  }

  if (normalizedTitle === normalizedQuery) {
    return 0;
  }

  if (normalizedTitle.startsWith(`${normalizedQuery} `) || normalizedTitle.startsWith(normalizedQuery)) {
    return 1;
  }

  if (normalizedTitle.split(' ').includes(normalizedQuery)) {
    return 2;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    return 3;
  }

  return 4;
};

const compareIgdbResults = (query: string, left: NormalizedIgdbGame, right: NormalizedIgdbGame) => {
  const leftTier = getIgdbMatchTier(left.title, query);
  const rightTier = getIgdbMatchTier(right.title, query);

  if (leftTier !== rightTier) {
    return leftTier - rightTier;
  }

  const leftRating = left.rating ?? -1;
  const rightRating = right.rating ?? -1;

  if (leftRating !== rightRating) {
    return rightRating - leftRating;
  }

  return left.title.localeCompare(right.title);
};

const pruneIgdbRequestWindow = (now: number) => {
  while (
    igdbRequestTimestamps.length > 0 &&
    now - igdbRequestTimestamps[0] >= IGDB_REQUEST_WINDOW_MS
  ) {
    igdbRequestTimestamps.shift();
  }
};

const reserveIgdbRequestSlot = () => {
  const now = Date.now();
  pruneIgdbRequestWindow(now);

  if (activeIgdbRequestCount >= IGDB_MAX_OPEN_REQUESTS) {
    throw new IgdbRequestError('IGDB is handling too many searches right now. Try again in a few seconds.', 429);
  }

  if (igdbRequestTimestamps.length >= IGDB_MAX_REQUESTS_PER_WINDOW) {
    throw new IgdbRequestError('IGDB search is moving too fast right now. Try again in a few seconds.', 429);
  }

  igdbRequestTimestamps.push(now);
  activeIgdbRequestCount += 1;

  return () => {
    activeIgdbRequestCount = Math.max(0, activeIgdbRequestCount - 1);
  };
};

export const buildIgdbSearchBody = (query: string) => `
fields id, name, summary, cover.url, cover.image_id, genres.name, platforms.name, first_release_date, rating, game_modes.name;
search "${escapeApicalypseString(query)}";
limit 10;
`;

export async function getTwitchAppToken() {
  const now = Date.now();
  if (cachedTwitchToken && cachedTwitchTokenExpiresAt > now + 60_000) {
    return cachedTwitchToken;
  }

  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const clientSecret = getRequiredEnv('TWITCH_CLIENT_SECRET');

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitch token request failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.expires_in) {
    throw new Error('Twitch token response did not include an access token.');
  }

  cachedTwitchToken = payload.access_token;
  cachedTwitchTokenExpiresAt = now + payload.expires_in * 1000;

  return cachedTwitchToken;
}

export async function searchIgdbCatalog(query: string) {
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const accessToken = await getTwitchAppToken();
  const releaseIgdbRequestSlot = reserveIgdbRequestSlot();

  try {
    const response = await fetch(IGDB_GAMES_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
      body: buildIgdbSearchBody(query),
    });

    if (response.status === 429) {
      throw new IgdbRequestError('IGDB is rate-limiting search right now. Try again in a few seconds.', 429);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new IgdbRequestError(
        errorText
          ? `IGDB search failed: ${errorText}`
          : 'IGDB search failed before it could return any results.',
        502,
      );
    }

    const payload = (await response.json()) as RawIgdbGame[];
    return payload
      .map(normalizeIgdbGame)
      .filter((game): game is NormalizedIgdbGame => Boolean(game))
      .sort((left, right) => compareIgdbResults(query, left, right));
  } finally {
    releaseIgdbRequestSlot();
  }
}

export const normalizeIgdbGame = (game: RawIgdbGame): NormalizedIgdbGame | null => {
  if (!game.id || !game.name?.trim()) {
    return null;
  }

  return {
    igdb_id: game.id,
    title: game.name.trim(),
    genre: joinNamedValues(game.genres, 'Unknown genre'),
    platform: joinNamedValues(game.platforms, 'Unknown platform'),
    player_count: derivePlayerCount(game.game_modes),
    description: game.summary?.trim() || null,
    cover_url: normalizeCoverUrl(game.cover),
    release_date: normalizeReleaseDate(game.first_release_date),
    rating: typeof game.rating === 'number' ? Math.round(game.rating * 10) / 10 : null,
    source: 'igdb',
  };
};

export const normalizeImportedGame = (payload: unknown): NormalizedIgdbGame => {
  const candidate = payload as Partial<NormalizedIgdbGame> | null;

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Missing IGDB game payload.');
  }

  if (typeof candidate.igdb_id !== 'number' || !Number.isFinite(candidate.igdb_id)) {
    throw new Error('IGDB import payload is missing a valid igdb_id.');
  }

  if (typeof candidate.title !== 'string' || !candidate.title.trim()) {
    throw new Error('IGDB import payload is missing a valid title.');
  }

  return {
    igdb_id: candidate.igdb_id,
    title: candidate.title.trim(),
    genre: typeof candidate.genre === 'string' && candidate.genre.trim() ? candidate.genre.trim() : 'Unknown genre',
    platform:
      typeof candidate.platform === 'string' && candidate.platform.trim()
        ? candidate.platform.trim()
        : 'Unknown platform',
    player_count:
      typeof candidate.player_count === 'string' && candidate.player_count.trim()
        ? candidate.player_count.trim()
        : 'Players TBA',
    description: typeof candidate.description === 'string' && candidate.description.trim() ? candidate.description.trim() : null,
    cover_url: typeof candidate.cover_url === 'string' && candidate.cover_url.trim() ? candidate.cover_url.trim() : null,
    release_date:
      typeof candidate.release_date === 'string' && candidate.release_date.trim()
        ? candidate.release_date.trim()
        : null,
    rating: typeof candidate.rating === 'number' ? Math.round(candidate.rating * 10) / 10 : null,
    source: 'igdb',
  };
};
