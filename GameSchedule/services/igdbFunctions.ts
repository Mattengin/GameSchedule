import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import type { GameRecord, IgdbSearchResult } from '../features/home/homeTypes';
import { supabase } from './supabaseClient';

type IgdbSearchResponse = {
  results?: IgdbSearchResult[];
};

type IgdbImportResponse = {
  game?: GameRecord;
};

type FunctionErrorBody = {
  error?: string;
};

const extractFunctionErrorMessage = async (error: unknown, fallback: string) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as FunctionErrorBody | null;
      if (payload?.error) {
        return payload.error;
      }
    } catch {
      return error.message || fallback;
    }

    return error.message || fallback;
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return 'Unable to reach IGDB right now. Check your connection and try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export async function searchIgdbGames(query: string) {
  const { data, error } = await supabase.functions.invoke('igdb-search', {
    body: { query },
  });

  if (error) {
    throw new Error(await extractFunctionErrorMessage(error, 'Unable to search IGDB right now.'));
  }

  return ((data as IgdbSearchResponse | null)?.results ?? []) as IgdbSearchResult[];
}

export async function importIgdbGame(game: IgdbSearchResult) {
  const { data, error } = await supabase.functions.invoke('igdb-import-game', {
    body: game,
  });

  if (error) {
    throw new Error(await extractFunctionErrorMessage(error, 'Unable to import that game right now.'));
  }

  const importedGame = (data as IgdbImportResponse | null)?.game ?? null;
  if (!importedGame) {
    throw new Error('IGDB import did not return a game record.');
  }

  return importedGame;
}
