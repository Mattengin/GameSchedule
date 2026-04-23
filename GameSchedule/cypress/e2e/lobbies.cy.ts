type MockGame = {
  id: string;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string;
  is_featured: boolean;
};

type MockProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string;
  onboarding_complete: boolean;
  primary_community_id: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  discord_connected_at: string | null;
};

type MockAccount = {
  email: string;
  password: string;
  userId: string;
  profile: MockProfile;
};

type MockLobby = {
  id: string;
  title: string;
  scheduled_for: string | null;
  scheduled_until: string | null;
  is_private: boolean;
  status: 'scheduled' | 'open' | 'closed';
  game_id: string;
  host_profile_id: string;
  games: {
    id: string;
    title: string;
    genre: string;
    platform: string;
    player_count: string;
  } | null;
  created_at: string;
};

type MockLobbyMember = {
  lobby_id: string;
  profile_id: string;
  role: 'host' | 'member';
  rsvp_status: 'accepted' | 'pending' | 'declined' | 'suggested_time';
  response_comment: string | null;
  suggested_start_at: string | null;
  suggested_end_at: string | null;
  responded_at: string | null;
  invited_at: string;
  created_at: string;
};

type MockLobbyHistory = {
  id: string;
  lobby_id: string;
  profile_id: string;
  actor_profile_id: string;
  rsvp_status: 'accepted' | 'pending' | 'declined' | 'suggested_time';
  comment: string | null;
  suggested_start_at: string | null;
  suggested_end_at: string | null;
  origin: 'member' | 'host_apply';
  created_at: string;
};

type MockFriendship = {
  profile_id: string;
  friend_profile_id: string;
  is_favorite: boolean;
};

const games: MockGame[] = [
  {
    id: 'helix-arena',
    title: 'Helix Arena',
    genre: 'Hero Shooter',
    platform: 'PC / Console',
    player_count: '3-5 players',
    description: 'Fast team-based matches with hero abilities and short queue times.',
    is_featured: true,
  },
  {
    id: 'deep-raid',
    title: 'Deep Raid',
    genre: 'Extraction',
    platform: 'PC',
    player_count: '2-4 players',
    description: 'High-risk co-op missions with short planning sessions and long-term loot.',
    is_featured: true,
  },
  {
    id: 'wild-rally-online',
    title: 'Wild Rally Online',
    genre: 'Racing',
    platform: 'Cross-platform',
    player_count: '2-12 players',
    description: 'Chaotic off-road playlists with short races and easy drop-in play.',
    is_featured: true,
  },
];

const authStore = new Map<string, MockAccount>();
const lobbyStore: MockLobby[] = [];
const lobbyMembersStore: MockLobbyMember[] = [];
const lobbyHistoryStore: MockLobbyHistory[] = [];
const friendshipStore: MockFriendship[] = [];

let currentSessionUserId: string | null = null;
let lobbySequence = 0;
let historySequence = 0;
let timestampSequence = 0;

const friendPassword = 'InvitePass123!';
const hostEmail = `cypress-lobbies-${Date.now()}@example.com`;
const hostPassword = `Password123!${Date.now()}`;
const novaEmail = 'nova.hex@example.com';
const pixelEmail = 'pixel.moth@example.com';

const makeUserId = (email: string) => `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const nextIsoTimestamp = () => {
  timestampSequence += 1;
  return new Date(Date.now() + timestampSequence * 1000).toISOString();
};

const makeAccount = (
  email: string,
  password: string,
  options?: {
    displayName?: string;
    username?: string;
  },
): MockAccount => {
  const userId = makeUserId(email);
  const username = options?.username ?? email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');

  return {
    email,
    password,
    userId,
    profile: {
      id: userId,
      username,
      avatar_url: null,
      display_name: options?.displayName ?? username,
      onboarding_complete: true,
      primary_community_id: null,
      discord_user_id: null,
      discord_username: null,
      discord_avatar_url: null,
      discord_connected_at: null,
    },
  };
};

const makeAuthBody = (account: MockAccount) => {
  const now = nextIsoTimestamp();

  return {
    access_token: `access-token-${account.userId}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-token-${account.userId}`,
    user: {
      id: account.userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: account.email,
      email_confirmed_at: now,
      phone: '',
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {},
      identities: [],
      created_at: now,
      updated_at: now,
    },
  };
};

const getQueryValue = (url: string, key: string) => {
  const decodedUrl = decodeURIComponent(url);
  const match = new RegExp(`${key}=eq\\.([^&]+)`).exec(decodedUrl);
  return match ? decodeURIComponent(match[1]) : '';
};

const getQueryValues = (url: string, key: string) => {
  const decodedUrl = decodeURIComponent(url);
  const match = new RegExp(`${key}=in\\.\\(([^)]+)\\)`).exec(decodedUrl);

  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const getAccountById = (profileId: string) => authStore.get(profileId) ?? null;

const ensureAccount = (email: string, password: string, options?: { displayName?: string; username?: string }) => {
  const userId = makeUserId(email);
  const existing = authStore.get(userId);
  if (existing) {
    return existing;
  }

  const account = makeAccount(email, password, options);
  authStore.set(account.userId, account);
  return account;
};

const upsertFriendship = (profileId: string, friendProfileId: string, isFavorite: boolean) => {
  const existingIndex = friendshipStore.findIndex(
    (friendship) => friendship.profile_id === profileId && friendship.friend_profile_id === friendProfileId,
  );

  if (existingIndex >= 0) {
    friendshipStore[existingIndex] = {
      ...friendshipStore[existingIndex],
      is_favorite: isFavorite,
    };
    return;
  }

  friendshipStore.push({
    profile_id: profileId,
    friend_profile_id: friendProfileId,
    is_favorite: isFavorite,
  });
};

const ensureInviteGraphForHost = (hostAccount: MockAccount) => {
  const novaAccount = ensureAccount(novaEmail, friendPassword, {
    displayName: 'Nova Hex',
    username: 'novahex',
  });
  const pixelAccount = ensureAccount(pixelEmail, friendPassword, {
    displayName: 'Pixel Moth',
    username: 'pixelmoth',
  });

  upsertFriendship(hostAccount.userId, novaAccount.userId, true);
  upsertFriendship(hostAccount.userId, pixelAccount.userId, false);
  upsertFriendship(novaAccount.userId, hostAccount.userId, false);
  upsertFriendship(pixelAccount.userId, hostAccount.userId, false);

  return {
    novaAccount,
    pixelAccount,
  };
};

const buildLobby = (
  hostAccount: MockAccount,
  gameId: string,
  title: string,
  scheduledFor: string | null,
  scheduledUntil: string | null,
  isPrivate: boolean,
): MockLobby => {
  lobbySequence += 1;
  const game = games.find((item) => item.id === gameId) ?? null;

  return {
    id: `lobby-${lobbySequence}`,
    title,
    scheduled_for: scheduledFor,
    scheduled_until: scheduledUntil,
    is_private: isPrivate,
    status: 'scheduled',
    game_id: gameId,
    host_profile_id: hostAccount.userId,
    games: game
      ? {
          id: game.id,
          title: game.title,
          genre: game.genre,
          platform: game.platform,
          player_count: game.player_count,
        }
      : null,
    created_at: nextIsoTimestamp(),
  };
};

const appendHistory = (
  lobbyId: string,
  profileId: string,
  actorProfileId: string,
  status: MockLobbyHistory['rsvp_status'],
  comment: string | null,
  suggestedStartAt: string | null,
  suggestedEndAt: string | null,
  origin: MockLobbyHistory['origin'],
) => {
  historySequence += 1;
  lobbyHistoryStore.unshift({
    id: `history-${historySequence}`,
    lobby_id: lobbyId,
    profile_id: profileId,
    actor_profile_id: actorProfileId,
    rsvp_status: status,
    comment,
    suggested_start_at: suggestedStartAt,
    suggested_end_at: suggestedEndAt,
    origin,
    created_at: nextIsoTimestamp(),
  });
};

const getAccessibleLobbyIds = (profileId: string) =>
  lobbyStore
    .filter(
      (lobby) =>
        lobby.host_profile_id === profileId ||
        lobbyMembersStore.some((member) => member.lobby_id === lobby.id && member.profile_id === profileId),
    )
    .map((lobby) => lobby.id);

const registerMockLobbies = () => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = ensureAccount(email, password);

    ensureInviteGraphForHost(account);
    currentSessionUserId = account.userId;

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signupRequest');

  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = ensureAccount(email, password);

    currentSessionUserId = account.userId;

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signinRequest');

  cy.intercept('POST', '**/auth/v1/logout', (req) => {
    currentSessionUserId = null;
    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('logoutRequest');

  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    const requestedEqId = getQueryValue(req.url, 'id');
    const requestedIds = getQueryValues(req.url, 'id');

    if (requestedIds.length > 0) {
      req.reply({
        statusCode: 200,
        body: requestedIds
          .map((profileId) => getAccountById(profileId)?.profile ?? null)
          .filter((profile): profile is MockProfile => Boolean(profile)),
      });
      return;
    }

    req.reply({
      statusCode: 200,
      body: getAccountById(requestedEqId)?.profile ?? null,
    });
  }).as('profilesRequest');

  cy.intercept('GET', '**/rest/v1/friends*', (req) => {
    req.reply({
      statusCode: 200,
      body: friendshipStore.filter((friendship) => friendship.profile_id === currentSessionUserId),
    });
  }).as('friendsRequest');

  cy.intercept('GET', '**/rest/v1/friend_requests*', {
    statusCode: 200,
    body: [],
  }).as('friendRequestsRequest');

  cy.intercept('GET', '**/rest/v1/games*', {
    statusCode: 200,
    body: games,
  }).as('gamesRequest');

  cy.intercept('GET', '**/rest/v1/favorite_games*', {
    statusCode: 200,
    body: [],
  }).as('favoriteGamesRequest');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', {
    statusCode: 200,
    body: [],
  }).as('rouletteRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        profile_id: currentSessionUserId,
        auto_decline_outside_hours: false,
      },
    });
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', {
    statusCode: 200,
    body: [],
  }).as('availabilityWindowsRequest');

  cy.intercept('GET', '**/rest/v1/lobbies*', (req) => {
    const accessibleLobbyIds = new Set(getAccessibleLobbyIds(currentSessionUserId ?? ''));
    req.reply({
      statusCode: 200,
      body: lobbyStore.filter((lobby) => accessibleLobbyIds.has(lobby.id)),
    });
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/lobby_members*', (req) => {
    const requestedLobbyIds = getQueryValues(req.url, 'lobby_id');
    const visibleLobbyIds = new Set(getAccessibleLobbyIds(currentSessionUserId ?? ''));

    req.reply({
      statusCode: 200,
      body: lobbyMembersStore.filter((member) => {
        if (requestedLobbyIds.length > 0 && !requestedLobbyIds.includes(member.lobby_id)) {
          return false;
        }

        const lobby = lobbyStore.find((item) => item.id === member.lobby_id);
        if (!lobby || !visibleLobbyIds.has(member.lobby_id)) {
          return false;
        }

        return lobby.host_profile_id === currentSessionUserId || member.profile_id === currentSessionUserId;
      }),
    });
  }).as('lobbyMembersRequest');

  cy.intercept('GET', '**/rest/v1/lobby_member_response_history*', (req) => {
    const requestedLobbyIds = getQueryValues(req.url, 'lobby_id');
    const visibleLobbyIds = new Set(getAccessibleLobbyIds(currentSessionUserId ?? ''));

    req.reply({
      statusCode: 200,
      body: lobbyHistoryStore.filter((entry) => {
        if (requestedLobbyIds.length > 0 && !requestedLobbyIds.includes(entry.lobby_id)) {
          return false;
        }

        const lobby = lobbyStore.find((item) => item.id === entry.lobby_id);
        if (!lobby || !visibleLobbyIds.has(entry.lobby_id)) {
          return false;
        }

        return lobby.host_profile_id === currentSessionUserId || entry.profile_id === currentSessionUserId;
      }),
    });
  }).as('lobbyHistoryRequest');

  cy.intercept('POST', '**/rest/v1/rpc/create_lobby_with_invites', (req) => {
    const currentAccount = getAccountById(currentSessionUserId ?? '');
    if (!currentAccount) {
      req.reply({
        statusCode: 401,
        body: { message: 'Missing authenticated user' },
      });
      return;
    }

    const {
      p_game_id: gameId,
      p_title: title,
      p_scheduled_for: scheduledFor,
      p_scheduled_until: scheduledUntil,
      p_is_private: isPrivate,
      p_invited_profile_ids: invitedProfileIds = [],
    } = req.body as {
      p_game_id: string;
      p_title: string;
      p_scheduled_for: string | null;
      p_scheduled_until: string | null;
      p_is_private: boolean;
      p_invited_profile_ids?: string[];
    };

    const lobby = buildLobby(currentAccount, gameId, title, scheduledFor, scheduledUntil, isPrivate);
    lobbyStore.unshift(lobby);

    lobbyMembersStore.push({
      lobby_id: lobby.id,
      profile_id: currentAccount.userId,
      role: 'host',
      rsvp_status: 'accepted',
      response_comment: null,
      suggested_start_at: null,
      suggested_end_at: null,
      responded_at: nextIsoTimestamp(),
      invited_at: nextIsoTimestamp(),
      created_at: nextIsoTimestamp(),
    });

    invitedProfileIds.forEach((profileId) => {
      lobbyMembersStore.push({
        lobby_id: lobby.id,
        profile_id: profileId,
        role: 'member',
        rsvp_status: 'pending',
        response_comment: null,
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: null,
        invited_at: nextIsoTimestamp(),
        created_at: nextIsoTimestamp(),
      });
    });

    req.reply({
      statusCode: 200,
      body: lobby,
    });
  }).as('createLobbyRpc');

  cy.intercept('POST', '**/rest/v1/rpc/respond_to_lobby_invite', (req) => {
    const {
      p_lobby_id: lobbyId,
      p_status: status,
      p_comment: comment,
      p_suggested_start_at: suggestedStartAt,
      p_suggested_end_at: suggestedEndAt,
    } = req.body as {
      p_lobby_id: string;
      p_status: MockLobbyMember['rsvp_status'];
      p_comment: string | null;
      p_suggested_start_at: string | null;
      p_suggested_end_at: string | null;
    };

    const memberIndex = lobbyMembersStore.findIndex(
      (member) => member.lobby_id === lobbyId && member.profile_id === currentSessionUserId,
    );

    if (memberIndex < 0 || !currentSessionUserId) {
      req.reply({
        statusCode: 404,
        body: { message: 'Lobby member not found' },
      });
      return;
    }

    const lobby = lobbyStore.find((item) => item.id === lobbyId) ?? null;
    const currentMember = lobbyMembersStore[memberIndex];
    let nextSuggestedStartAt = status === 'suggested_time' ? suggestedStartAt : null;
    let nextSuggestedEndAt = status === 'suggested_time' ? suggestedEndAt : null;

    if (status === 'suggested_time' && lobby?.scheduled_for && lobby?.scheduled_until) {
      const lobbyStartAt = new Date(lobby.scheduled_for);
      const lobbyEndAt = new Date(lobby.scheduled_until);
      const nextStartAt = new Date(lobbyStartAt);
      const nextEndAt = new Date(lobbyEndAt);

      nextStartAt.setHours(nextStartAt.getHours() + 2);
      nextEndAt.setHours(nextEndAt.getHours() + 2);

      nextSuggestedStartAt = nextStartAt.toISOString();
      nextSuggestedEndAt = nextEndAt.toISOString();
    }

    const nextMember: MockLobbyMember = {
      ...currentMember,
      rsvp_status: status,
      response_comment: comment,
      suggested_start_at: nextSuggestedStartAt,
      suggested_end_at: nextSuggestedEndAt,
      responded_at: nextIsoTimestamp(),
    };

    lobbyMembersStore[memberIndex] = nextMember;
    appendHistory(
      lobbyId,
      currentSessionUserId,
      currentSessionUserId,
      status,
      comment,
      nextSuggestedStartAt,
      nextSuggestedEndAt,
      'member',
    );

    req.reply({
      statusCode: 200,
      body: nextMember,
    });
  }).as('respondToInviteRpc');

  cy.intercept('POST', '**/rest/v1/rpc/apply_lobby_time_suggestion', (req) => {
    const {
      p_lobby_id: lobbyId,
      p_profile_id: profileId,
    } = req.body as {
      p_lobby_id: string;
      p_profile_id: string;
    };

    const lobbyIndex = lobbyStore.findIndex((lobby) => lobby.id === lobbyId);
    const suggestedMemberIndex = lobbyMembersStore.findIndex(
      (member) => member.lobby_id === lobbyId && member.profile_id === profileId,
    );

    if (lobbyIndex < 0 || suggestedMemberIndex < 0 || !currentSessionUserId) {
      req.reply({
        statusCode: 404,
        body: { message: 'Suggestion not found' },
      });
      return;
    }

    const suggestedMember = lobbyMembersStore[suggestedMemberIndex];
    const lobby = lobbyStore[lobbyIndex];

    lobbyStore[lobbyIndex] = {
      ...lobby,
      scheduled_for: suggestedMember.suggested_start_at,
      scheduled_until: suggestedMember.suggested_end_at,
    };

    lobbyMembersStore[suggestedMemberIndex] = {
      ...suggestedMember,
      rsvp_status: 'accepted',
      suggested_start_at: null,
      suggested_end_at: null,
      responded_at: nextIsoTimestamp(),
    };

    appendHistory(
      lobbyId,
      profileId,
      currentSessionUserId,
      'accepted',
      'Suggested time applied by host.',
      lobbyStore[lobbyIndex].scheduled_for,
      lobbyStore[lobbyIndex].scheduled_until,
      'host_apply',
    );

    lobbyMembersStore.forEach((member, index) => {
      if (member.lobby_id !== lobbyId || member.role !== 'member' || member.profile_id === profileId) {
        return;
      }

      lobbyMembersStore[index] = {
        ...member,
        rsvp_status: 'pending',
        response_comment: 'Time changed, please respond again',
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: nextIsoTimestamp(),
      };

      appendHistory(
        lobbyId,
        member.profile_id,
        currentSessionUserId!,
        'pending',
        'Time changed, please respond again',
        null,
        null,
        'host_apply',
      );
    });

    req.reply({
      statusCode: 200,
      body: lobbyStore[lobbyIndex],
    });
  }).as('applyLobbySuggestionRpc');

  cy.intercept('PATCH', '**/rest/v1/lobbies*', (req) => {
    const lobbyId = getQueryValue(req.url, 'id');
    const lobbyIndex = lobbyStore.findIndex((lobby) => lobby.id === lobbyId);

    if (lobbyIndex < 0) {
      req.reply({
        statusCode: 404,
        body: { message: 'Lobby not found' },
      });
      return;
    }

    const body = req.body as {
      scheduled_for?: string;
      scheduled_until?: string;
    };

    lobbyStore[lobbyIndex] = {
      ...lobbyStore[lobbyIndex],
      scheduled_for: body.scheduled_for ?? lobbyStore[lobbyIndex].scheduled_for,
      scheduled_until: body.scheduled_until ?? lobbyStore[lobbyIndex].scheduled_until,
    };

    req.reply({
      statusCode: 200,
      body: lobbyStore[lobbyIndex],
    });
  }).as('updateLobbyRequest');
};

describe('lobbies flow', () => {
  const novaUserId = makeUserId(novaEmail);
  const pixelUserId = makeUserId(pixelEmail);

  const signUpHost = () => {
    cy.visit('/');
    cy.signupUi(hostEmail, hostPassword);
    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
  };

  const logInAs = (email: string, password: string) => {
    cy.visit('/');
    cy.loginUi(email, password);
    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
  };

  const logout = () => {
    cy.get('[data-testid="logout-button"]').click();
    cy.get('[data-testid="auth-email-input"]').should('exist');
  };

  const createLobbyWithInvitees = (inviteeIds: string[]) => {
    cy.contains(/^Lobbies$/).click({ force: true });

    inviteeIds.forEach((profileId) => {
      cy.get(`[data-testid="${`lobby-invite-chip-${profileId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}"]`).click();
    });

    cy.get('[data-testid="create-lobby-button"]').click();
  };

  beforeEach(() => {
    authStore.clear();
    lobbyStore.length = 0;
    lobbyMembersStore.length = 0;
    lobbyHistoryStore.length = 0;
    friendshipStore.length = 0;
    currentSessionUserId = null;
    lobbySequence = 0;
    historySequence = 0;
    timestampSequence = 0;
    registerMockLobbies();
  });

  it('starts a lobby draft from a game card and creates a private lobby through the RPC', () => {
    signUpHost();

    cy.contains('Games').click();
    cy.get('[data-testid="games-search-input"]').type('Helix Arena');
    cy.contains(/^Create lobby$/).click();

    cy.get('[data-testid="lobby-title-input"]').should('exist');
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Helix Arena Lobby');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_game_id).to.equal('helix-arena');
        expect(body.p_is_private).to.equal(true);
        expect(body.p_invited_profile_ids).to.deep.equal([]);
        expect(body.p_scheduled_for).to.be.a('string');
        expect(body.p_scheduled_until).to.be.a('string');
      });

    cy.contains(/lobby created/i).should('exist');
    cy.contains('Helix Arena Lobby').should('be.visible');
    cy.contains(/private lobby/i).should('be.visible');
  });

  it('creates real invite rows and shows invitees grouped under hosted lobbies', () => {
    signUpHost();

    createLobbyWithInvitees([novaUserId, pixelUserId]);

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_invited_profile_ids).to.deep.equal([novaUserId, pixelUserId]);
      });

    cy.contains(/2 invites sent/i).should('exist');
    cy.contains('Hosted lobbies').should('be.visible');
    cy.contains('Pending').should('exist');
    cy.contains('Nova Hex').should('exist');
    cy.contains('Pixel Moth').should('exist');
  });

  it('lets an invitee decline, then accept later, while preserving response history comments', () => {
    signUpHost();
    createLobbyWithInvitees([novaUserId]);
    logout();

    logInAs(novaEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.get('[data-testid="lobby-response-decline-lobby-1"]').click();
    cy.get('[data-testid="lobby-response-comment-lobby-1"]').type('Can only do one match tonight.');
    cy.get('[data-testid="lobby-response-submit-lobby-1"]').click();

    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('declined');
        expect(body.p_comment).to.equal('Can only do one match tonight.');
        expect(body.p_suggested_start_at).to.equal(null);
      });

    cy.contains(/invite declined/i).should('exist');
    cy.contains('Can only do one match tonight.').should('exist');

    cy.get('[data-testid="lobby-response-accept-lobby-1"]').click();
    cy.get('[data-testid="lobby-response-comment-lobby-1"]').clear().type('Actually I can play for 2 hours.');
    cy.get('[data-testid="lobby-response-submit-lobby-1"]').click();

    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('accepted');
        expect(body.p_comment).to.equal('Actually I can play for 2 hours.');
      });

    cy.contains(/invite accepted/i).should('exist');
    cy.contains('Your response history').should('exist');
    cy.contains('Actually I can play for 2 hours.').should('exist');
    cy.contains('Can only do one match tonight.').should('exist');
  });

  it('lets an invitee suggest a new time and lets the host apply it, resetting other invitees to pending', () => {
    signUpHost();
    createLobbyWithInvitees([novaUserId, pixelUserId]);
    logout();

    logInAs(novaEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.get('[data-testid="lobby-response-suggest-lobby-1"]').click();
    cy.get('[data-testid="lobby-response-comment-lobby-1"]').type('I get off work at 9, this is better.');
    cy.get('[data-testid="lobby-response-submit-lobby-1"]').click();

    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('suggested_time');
        expect(body.p_comment).to.equal('I get off work at 9, this is better.');
        expect(body.p_suggested_start_at).to.be.a('string');
        expect(body.p_suggested_end_at).to.be.a('string');
      });

    cy.contains(/suggested time sent to the host/i).should('exist');
    logout();

    logInAs(hostEmail, hostPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Suggested time').should('exist');
    cy.contains('I get off work at 9, this is better.').should('exist');
    cy.get(`[data-testid="apply-lobby-suggestion-lobby-1-${novaUserId}"]`).click();

    cy.wait('@applyLobbySuggestionRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_lobby_id).to.equal('lobby-1');
        expect(body.p_profile_id).to.equal(novaUserId);
      });

    cy.contains(/suggested time applied/i).should('exist');
    cy.contains('Suggested time applied by host.').should('exist');
    logout();

    logInAs(pixelEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Time changed, please respond again').should('exist');
    cy.contains('Pending').should('exist');
  });

  it('keeps host reschedule working from the schedule tab for hosted lobbies', () => {
    signUpHost();

    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Deep Raid').click();
    cy.get('[data-testid="lobby-title-input"]').clear().type('Deep Raid Friday Run');
    cy.contains(/^Public$/).click();
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc');
    cy.contains(/^Schedule$/).click({ force: true });
    cy.contains('Deep Raid Friday Run').should('be.visible');
    cy.get('[data-testid="schedule-edit-lobby-lobby-1"]').click();
    cy.get('[data-testid="schedule-lobby-start-lobby-1"]').should('be.visible');
    cy.get('[data-testid="schedule-save-lobby-lobby-1"]').click();

    cy.wait('@updateLobbyRequest');
    cy.contains(/lobby time updated/i).should('be.visible');
  });
});

export {};
