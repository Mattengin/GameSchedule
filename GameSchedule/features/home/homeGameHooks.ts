import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import { fallbackGames } from './homeConstants';
import type { GameRecord, IgdbSearchResult, RelatedGameSummary, RouletteEntry } from './homeTypes';
import { unwrapRelation } from './homeUtils';
import { supabase } from '../../services/supabaseClient';

const normalizeGameRecord = (game: Partial<GameRecord> & Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count' | 'is_featured'>): GameRecord => ({
  id: game.id,
  title: game.title,
  genre: game.genre,
  platform: game.platform,
  player_count: game.player_count,
  description: game.description ?? null,
  is_featured: Boolean(game.is_featured),
  igdb_id: typeof game.igdb_id === 'number' ? game.igdb_id : null,
  cover_url: game.cover_url ?? null,
  release_date: game.release_date ?? null,
  rating:
    typeof game.rating === 'number'
      ? game.rating
      : typeof game.rating === 'string'
        ? Number(game.rating)
        : null,
  source: game.source === 'igdb' ? 'igdb' : 'seed',
});

export function useGamesState(session: Session | null) {
  const [gamesLoading, setGamesLoading] = React.useState(false);
  const [gamesError, setGamesError] = React.useState('');
  const [libraryGames, setLibraryGames] = React.useState<GameRecord[]>(fallbackGames);
  const [gameSearch, setGameSearch] = React.useState('');
  const [favoriteGameIds, setFavoriteGameIds] = React.useState<string[]>([]);
  const [rouletteEntries, setRouletteEntries] = React.useState<RouletteEntry[]>([]);
  const [gameActionBusyId, setGameActionBusyId] = React.useState<string | null>(null);
  const [gameActionMessage, setGameActionMessage] = React.useState('');
  const [igdbSearchQuery, setIgdbSearchQuery] = React.useState('');
  const [igdbResults, setIgdbResults] = React.useState<IgdbSearchResult[]>([]);
  const [igdbSearchLoading, setIgdbSearchLoading] = React.useState(false);
  const [igdbImportBusyId, setIgdbImportBusyId] = React.useState<number | null>(null);
  const [igdbError, setIgdbError] = React.useState('');
  const [igdbMessage, setIgdbMessage] = React.useState('');
  const [igdbHasSearched, setIgdbHasSearched] = React.useState(false);
  const [igdbSearchCooldownUntil, setIgdbSearchCooldownUntil] = React.useState<number | null>(null);
  const [igdbSearchCooldownSeconds, setIgdbSearchCooldownSeconds] = React.useState(0);

  const loadGames = React.useCallback(async () => {
    if (!session?.user) {
      setLibraryGames(fallbackGames);
      setGamesLoading(false);
      return;
    }

    setGamesLoading(true);
    setGamesError('');

    const { data, error } = await supabase
      .from('games')
      .select('id, title, genre, platform, player_count, description, is_featured, igdb_id, cover_url, release_date, rating, source')
      .order('is_featured', { ascending: false })
      .order('title', { ascending: true });

    if (error) {
      setGamesError(error.message);
      setLibraryGames(fallbackGames);
    } else if (data && data.length > 0) {
      setLibraryGames(
        data.map((game) =>
          normalizeGameRecord(
            game as Partial<GameRecord> &
              Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count' | 'is_featured'>,
          ),
        ),
      );
    } else {
      setLibraryGames(fallbackGames);
    }

    setGamesLoading(false);
  }, [session]);

  React.useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const loadGameRelations = React.useCallback(async () => {
    if (!session?.user) {
      setFavoriteGameIds([]);
      setRouletteEntries([]);
      return;
    }

    const [{ data: favorites, error: favoritesError }, { data: pool, error: poolError }] =
      await Promise.all([
        supabase
          .from('favorite_games')
          .select('game_id')
          .eq('profile_id', session.user.id),
        supabase
          .from('roulette_pool_entries')
          .select('game_id, games(id, title, genre, platform)')
          .eq('profile_id', session.user.id),
      ]);

    if (!favoritesError && favorites) {
      setFavoriteGameIds(favorites.map((entry) => entry.game_id));
    }

    if (!poolError && pool) {
      setRouletteEntries(
        pool.map((entry) => ({
          game_id: entry.game_id,
          games: unwrapRelation(entry.games as RelatedGameSummary[] | RelatedGameSummary | null),
        })),
      );
    }
  }, [session]);

  React.useEffect(() => {
    void loadGameRelations();
  }, [loadGameRelations]);

  const filteredGames = React.useMemo(() => {
    const query = gameSearch.trim().toLowerCase();

    if (!query) {
      return libraryGames;
    }

    return libraryGames.filter((game) =>
      [game.title, game.genre, game.platform, game.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [gameSearch, libraryGames]);

  const roulettePoolGames = React.useMemo(
    () =>
      rouletteEntries
        .map((entry) => entry.games)
        .filter((game): game is Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform'> => Boolean(game)),
    [rouletteEntries],
  );

  const importedIgdbIds = React.useMemo(
    () =>
      libraryGames
        .map((game) => game.igdb_id)
        .filter((igdbId): igdbId is number => typeof igdbId === 'number'),
    [libraryGames],
  );

  React.useEffect(() => {
    if (!igdbSearchCooldownUntil) {
      setIgdbSearchCooldownSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((igdbSearchCooldownUntil - Date.now()) / 1000));
      setIgdbSearchCooldownSeconds(remainingSeconds);

      if (remainingSeconds === 0) {
        setIgdbSearchCooldownUntil(null);
      }
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 250);

    return () => {
      clearInterval(timer);
    };
  }, [igdbSearchCooldownUntil]);

  return {
    favoriteGameIds,
    filteredGames,
    gameActionBusyId,
    gameActionMessage,
    gameSearch,
    gamesError,
    gamesLoading,
    igdbError,
    igdbHasSearched,
    igdbImportBusyId,
    igdbMessage,
    igdbResults,
    igdbSearchCooldownSeconds,
    igdbSearchLoading,
    igdbSearchQuery,
    importedIgdbIds,
    libraryGames,
    loadGames,
    loadGameRelations,
    rouletteEntries,
    roulettePoolGames,
    setFavoriteGameIds,
    setGameActionBusyId,
    setGameActionMessage,
    setGameSearch,
    setGamesError,
    setIgdbError,
    setIgdbHasSearched,
    setIgdbImportBusyId,
    setIgdbMessage,
    setIgdbResults,
    setIgdbSearchCooldownUntil,
    setIgdbSearchLoading,
    setIgdbSearchQuery,
    setLibraryGames,
    setRouletteEntries,
  };
}
