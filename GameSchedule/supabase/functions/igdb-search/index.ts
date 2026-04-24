import { getAuthenticatedUser } from '../_shared/auth.ts';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { IgdbRequestError, searchIgdbCatalog } from '../_shared/igdb.ts';

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
    const { query } = (await request.json()) as { query?: string };
    const normalizedQuery = query?.trim() ?? '';

    if (normalizedQuery.length < 2) {
      return new Response(JSON.stringify({ error: 'Search query must be at least 2 characters.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const results = await searchIgdbCatalog(normalizedQuery);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const status = error instanceof IgdbRequestError ? error.status : 500;
    const message =
      error instanceof IgdbRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unable to search IGDB right now.';

    console.error('IGDB search failed', {
      message,
      status,
    });

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status,
        headers: jsonHeaders,
      },
    );
  }
});
