import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import type { GameRecord, IgdbSearchResult } from './homeTypes';
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
  const [libraryGames, setLibraryGames] = React.useState<GameRecord[]>([]);
  const [gameSearch, setGameSearch] = React.useState('');
  const [favoriteGameIds, setFavoriteGameIds] = React.useState<string[]>([]);
  const [gameActionBusyId, setGameActionBusyId] = React.useState<string | null>(null);
  const [gameActionError, setGameActionError] = React.useState('');
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
      setGamesError('');
      setLibraryGames([]);
      setGamesLoading(false);
      return;
    }

    setGamesLoading(true);
    setGamesError('');

    const { data, error } = await supabase
      .from('profile_games')
      .select(
        'created_at, game_id, games!inner(id, title, genre, platform, player_count, description, is_featured, igdb_id, cover_url, release_date, rating, source)',
      )
      .eq('profile_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setGamesError(error.message);
      setLibraryGames([]);
    } else if (data && data.length > 0) {
      setLibraryGames(
        data
          .map((entry) =>
            unwrapRelation(
              (entry as {
                games: (Partial<GameRecord> &
                  Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count' | 'is_featured'>)[] |
                  (Partial<GameRecord> &
                    Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count' | 'is_featured'>) |
                  null;
              }).games,
            ),
          )
          .filter(
            (
              game,
            ): game is Partial<GameRecord> &
              Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count' | 'is_featured'> =>
              Boolean(game),
          )
          .map((game) =>
          normalizeGameRecord(
            game,
          ),
          ),
      );
    } else {
      setLibraryGames([]);
    }

    setGamesLoading(false);
  }, [session]);

  React.useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const loadFavoriteGameIds = React.useCallback(async () => {
    if (!session?.user) {
      setFavoriteGameIds([]);
      return;
    }

    const { data: favorites, error: favoritesError } = await supabase
      .from('favorite_games')
      .select('game_id')
      .eq('profile_id', session.user.id);

    if (!favoritesError && favorites) {
      setFavoriteGameIds(favorites.map((entry) => entry.game_id));
    }
  }, [session]);

  React.useEffect(() => {
    void loadFavoriteGameIds();
  }, [loadFavoriteGameIds]);

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
    gameActionError,
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
    loadFavoriteGameIds,
    setFavoriteGameIds,
    setGameActionBusyId,
    setGameActionError,
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
  };
}
