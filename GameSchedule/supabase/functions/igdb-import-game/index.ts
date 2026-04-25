import { createClient } from 'npm:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { normalizeImportedGame } from '../_shared/igdb.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing default Supabase service role environment variables.');
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const importedGame = normalizeImportedGame(await request.json());

    const { data: existingByIgdb, error: igdbLookupError } = await adminClient
      .from('games')
      .select('id')
      .eq('igdb_id', importedGame.igdb_id)
      .maybeSingle();

    if (igdbLookupError) {
      throw new Error(igdbLookupError.message);
    }

    let existingGame = existingByIgdb;

    if (!existingGame) {
      const { data: existingByTitle, error: titleLookupError } = await adminClient
        .from('games')
        .select('id')
        .eq('title', importedGame.title)
        .maybeSingle();

      if (titleLookupError) {
        throw new Error(titleLookupError.message);
      }

      existingGame = existingByTitle;
    }

    const gameId = existingGame?.id ?? `igdb-${importedGame.igdb_id}`;

    const { data: game, error: upsertError } = await adminClient
      .from('games')
      .upsert(
        {
          id: gameId,
          title: importedGame.title,
          genre: importedGame.genre,
          platform: importedGame.platform,
          player_count: importedGame.player_count,
          description: importedGame.description,
          igdb_id: importedGame.igdb_id,
          cover_url: importedGame.cover_url,
          release_date: importedGame.release_date,
          rating: importedGame.rating,
          source: importedGame.source,
          is_featured: false,
        },
        { onConflict: 'id' },
      )
      .select('id, title, genre, platform, player_count, description, is_featured, igdb_id, cover_url, release_date, rating, source')
      .single();

    if (upsertError || !game) {
      throw new Error(upsertError?.message ?? 'IGDB import did not return a game.');
    }

    const { error: libraryMembershipError } = await adminClient.from('profile_games').upsert(
      {
        profile_id: user.id,
        game_id: game.id,
      },
      { onConflict: 'profile_id,game_id' },
    );

    if (libraryMembershipError) {
      throw new Error(libraryMembershipError.message);
    }

    return new Response(JSON.stringify({ game }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unable to import that game right now.',
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
});
