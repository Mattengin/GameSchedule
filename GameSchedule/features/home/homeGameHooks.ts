import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import { fallbackGames } from './homeConstants';
import type { GameRecord, RelatedGameSummary, RouletteEntry } from './homeTypes';
import { unwrapRelation } from './homeUtils';
import { supabase } from '../../services/supabaseClient';

export function useGamesState(session: Session | null) {
  const [gamesLoading, setGamesLoading] = React.useState(false);
  const [gamesError, setGamesError] = React.useState('');
  const [libraryGames, setLibraryGames] = React.useState<GameRecord[]>(fallbackGames);
  const [gameSearch, setGameSearch] = React.useState('');
  const [favoriteGameIds, setFavoriteGameIds] = React.useState<string[]>([]);
  const [rouletteEntries, setRouletteEntries] = React.useState<RouletteEntry[]>([]);
  const [gameActionBusyId, setGameActionBusyId] = React.useState<string | null>(null);
  const [gameActionMessage, setGameActionMessage] = React.useState('');

  React.useEffect(() => {
    const loadGames = async () => {
      if (!session?.user) {
        setLibraryGames(fallbackGames);
        setGamesLoading(false);
        return;
      }

      setGamesLoading(true);
      setGamesError('');

      const { data, error } = await supabase
        .from('games')
        .select('id, title, genre, platform, player_count, description, is_featured')
        .order('is_featured', { ascending: false })
        .order('title', { ascending: true });

      if (error) {
        setGamesError(error.message);
        setLibraryGames(fallbackGames);
      } else if (data && data.length > 0) {
        setLibraryGames(data);
      } else {
        setLibraryGames(fallbackGames);
      }

      setGamesLoading(false);
    };

    loadGames();
  }, [session]);

  React.useEffect(() => {
    const loadGameRelations = async () => {
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
    };

    loadGameRelations();
  }, [session]);

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

  return {
    favoriteGameIds,
    filteredGames,
    gameActionBusyId,
    gameActionMessage,
    gameSearch,
    gamesError,
    gamesLoading,
    libraryGames,
    rouletteEntries,
    roulettePoolGames,
    setFavoriteGameIds,
    setGameActionBusyId,
    setGameActionMessage,
    setGameSearch,
    setGamesError,
    setLibraryGames,
    setRouletteEntries,
  };
}
