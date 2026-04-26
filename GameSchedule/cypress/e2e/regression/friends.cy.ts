type MockProfile = {
  id: string;
  username: string;
  friend_code: string;
  avatar_url: string | null;
  display_name: string;
  onboarding_complete: boolean;
  birthday_month?: number | null;
  birthday_day?: number | null;
  birthday_visibility?: 'private' | 'public';
  busy_visibility?: 'private' | 'public';
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

type MockFriendRequest = {
  id: string;
  requester_profile_id: string;
  addressee_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
};

type MockFriendship = {
  profile_id: string;
  friend_profile_id: string;
  is_favorite: boolean;
};

type MockPublicProfileCard = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  birthday_label: string | null;
  is_discord_connected: boolean;
};

const authStore = new Map<string, MockAccount>();
const friendRequestsStore: MockFriendRequest[] = [];
const friendshipsStore: MockFriendship[] = [];

const makeUserId = (email: string) => `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const makeFriendCode = (seed: string) => {
  const normalizedSeed = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(12, 'X');
  return `GS-${normalizedSeed.slice(0, 4)}-${normalizedSeed.slice(4, 8)}-${normalizedSeed.slice(8, 12)}`;
};

const makeAccount = (
  email: string,
  password: string,
  displayName?: string,
  username?: string,
  friendCodeSeed?: string,
): MockAccount => {
  const userId = makeUserId(email);
  const resolvedUsername = username ?? email.split('@')[0].toLowerCase();
  const resolvedDisplayName = displayName ?? resolvedUsername;
  const now = new Date().toISOString();

  return {
    email,
    password,
    userId,
    profile: {
      id: userId,
      username: resolvedUsername,
      friend_code: makeFriendCode(friendCodeSeed ?? resolvedUsername),
      avatar_url: null,
      display_name: resolvedDisplayName,
      onboarding_complete: true,
      primary_community_id: null,
      discord_user_id: `discord-${userId}`,
      discord_username: resolvedDisplayName,
      discord_avatar_url: null,
      discord_connected_at: now,
    },
  };
};

const formatBirthdayLabel = (month: number | null | undefined, day: number | null | undefined) => {
  if (!month || !day) {
    return null;
  }

  const date = new Date(2000, month - 1, day);
  return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}`;
};

const toPublicProfileCard = (profile: MockProfile): MockPublicProfileCard => ({
  id: profile.id,
  username: profile.username ?? null,
  avatar_url: profile.avatar_url ?? profile.discord_avatar_url ?? null,
  display_name: profile.display_name ?? null,
  birthday_label:
    profile.birthday_visibility === 'public'
      ? formatBirthdayLabel(profile.birthday_month, profile.birthday_day)
      : null,
  is_discord_connected: Boolean(profile.discord_user_id),
});

const makeAuthBody = (account: MockAccount) => {
  const now = new Date().toISOString();

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

const registerMockFriends = (currentUser: MockAccount) => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    authStore.set(currentUser.userId, currentUser);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(currentUser),
    });
  }).as('signupRequest');

  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    authStore.set(currentUser.userId, currentUser);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(currentUser),
    });
  }).as('signinRequest');

  cy.intercept('POST', '**/auth/v1/logout', {
    statusCode: 204,
    body: {},
  }).as('logoutRequest');

  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    const idValue = getQueryValue(req.url, 'id');

    req.reply({
      statusCode: 200,
      body: authStore.get(idValue)?.profile ?? null,
    });
  }).as('profilesRequest');

  cy.intercept('POST', '**/rest/v1/rpc/get_visible_profiles', (req) => {
    const requestedIds = ((req.body as { p_profile_ids?: string[] | null } | null)?.p_profile_ids ?? []).filter(
      Boolean,
    );

    const visibleProfiles = requestedIds
      .map((id) => authStore.get(id)?.profile ?? null)
      .filter((profile): profile is MockProfile => {
        if (!profile) {
          return false;
        }

        if (profile.id === currentUser.userId) {
          return true;
        }

        if (
          friendshipsStore.some(
            (friendship) =>
              friendship.profile_id === currentUser.userId && friendship.friend_profile_id === profile.id,
          )
        ) {
          return true;
        }

        return friendRequestsStore.some(
          (request) =>
            request.status === 'pending' &&
            ((request.requester_profile_id === currentUser.userId &&
              request.addressee_profile_id === profile.id) ||
              (request.addressee_profile_id === currentUser.userId &&
                request.requester_profile_id === profile.id)),
        );
      })
      .map(toPublicProfileCard);

    req.reply({
      statusCode: 200,
      body: visibleProfiles,
    });
  }).as('visibleProfilesRpc');

  cy.intercept('POST', '**/rest/v1/rpc/lookup_friend_code', (req) => {
    const requestedCode = ((req.body as { p_code?: string } | null)?.p_code ?? '').trim().toLowerCase();

    const matchedProfile =
      Array.from(authStore.values())
        .map((account) => account.profile)
        .find((profile) => profile.friend_code.toLowerCase() === requestedCode) ?? null;

    const alreadyFriends = matchedProfile
      ? friendshipsStore.some(
          (friendship) =>
            friendship.profile_id === currentUser.userId && friendship.friend_profile_id === matchedProfile.id,
        )
      : false;

    const pendingRequest = matchedProfile
      ? friendRequestsStore.some(
          (request) =>
            request.status === 'pending' &&
            ((request.requester_profile_id === currentUser.userId &&
              request.addressee_profile_id === matchedProfile.id) ||
              (request.addressee_profile_id === currentUser.userId &&
                request.requester_profile_id === matchedProfile.id)),
        )
      : false;

    req.reply({
      statusCode: 200,
      body:
        matchedProfile &&
        matchedProfile.id !== currentUser.userId &&
        !alreadyFriends &&
        !pendingRequest
          ? [toPublicProfileCard(matchedProfile)]
          : [],
    });
  }).as('lookupFriendCodeRpc');

  cy.intercept('POST', '**/rest/v1/rpc/regenerate_friend_code', (req) => {
    currentUser.profile.friend_code = makeFriendCode(`regen${Date.now()}`);

    req.reply({
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(currentUser.profile.friend_code),
    });
  }).as('regenerateFriendCodeRpc');

  cy.intercept('GET', '**/rest/v1/games*', {
    statusCode: 200,
    body: [],
  }).as('gamesRequest');

  cy.intercept('GET', '**/rest/v1/profile_games*', {
    statusCode: 200,
    body: [],
  }).as('profileGamesRequest');

  cy.intercept('GET', '**/rest/v1/favorite_games*', {
    statusCode: 200,
    body: [],
  }).as('favoriteGamesRequest');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', {
    statusCode: 200,
    body: [],
  }).as('rouletteRequest');

  cy.intercept('GET', '**/rest/v1/lobbies*', {
    statusCode: 200,
    body: [],
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', {
    statusCode: 200,
    body: null,
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', {
    statusCode: 200,
    body: [],
  }).as('availabilityWindowsRequest');

  cy.intercept('GET', '**/rest/v1/friends*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    req.reply({
      statusCode: 200,
      body: friendshipsStore.filter((row) => row.profile_id === userId),
    });
  }).as('friendsRequest');

  cy.intercept('PATCH', '**/rest/v1/friends*', (req) => {
    const profileId = getQueryValue(req.url, 'profile_id');
    const friendProfileId = getQueryValue(req.url, 'friend_profile_id');
    const row = friendshipsStore.find(
      (entry) => entry.profile_id === profileId && entry.friend_profile_id === friendProfileId,
    );

    if (row) {
      row.is_favorite = Boolean((req.body as { is_favorite?: boolean }).is_favorite);
    }

    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('friendsUpdate');

  cy.intercept('GET', '**/rest/v1/friend_requests*', (req) => {
    const decodedUrl = decodeURIComponent(req.url);
    const relatedToUser = friendRequestsStore.filter(
      (request) =>
        request.requester_profile_id === currentUser.userId ||
        request.addressee_profile_id === currentUser.userId,
    );

    req.reply({
      statusCode: 200,
      body: decodedUrl.includes('order=created_at.desc')
        ? [...relatedToUser].sort((a, b) => b.created_at.localeCompare(a.created_at))
        : relatedToUser,
    });
  }).as('friendRequestsRequest');

  cy.intercept('POST', '**/rest/v1/friend_requests*', (req) => {
    const payload = req.body as Omit<MockFriendRequest, 'id' | 'created_at'>;
    const record: MockFriendRequest = {
      id: `request-${Date.now()}`,
      requester_profile_id: payload.requester_profile_id,
      addressee_profile_id: payload.addressee_profile_id,
      status: payload.status,
      created_at: new Date().toISOString(),
    };

    friendRequestsStore.unshift(record);

    req.reply({
      statusCode: 201,
      body: record,
    });
  }).as('friendRequestInsert');

  cy.intercept('PATCH', '**/rest/v1/friend_requests*', (req) => {
    const requestId = getQueryValue(req.url, 'id');
    const record = friendRequestsStore.find((request) => request.id === requestId);

    if (record) {
      record.status = ((req.body as { status?: MockFriendRequest['status'] }).status ?? record.status);
    }

    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('friendRequestUpdate');

  cy.intercept('POST', '**/rest/v1/rpc/accept_friend_request', (req) => {
    const requestId = (req.body as { p_request_id: string }).p_request_id;
    const requestRecord = friendRequestsStore.find((request) => request.id === requestId);

    if (!requestRecord) {
      req.reply({
        statusCode: 404,
        body: { message: 'Friend request not found' },
      });
      return;
    }

    requestRecord.status = 'accepted';

    friendshipsStore.push(
      {
        profile_id: requestRecord.requester_profile_id,
        friend_profile_id: requestRecord.addressee_profile_id,
        is_favorite: false,
      },
      {
        profile_id: requestRecord.addressee_profile_id,
        friend_profile_id: requestRecord.requester_profile_id,
        is_favorite: false,
      },
    );

    req.reply({
      statusCode: 200,
      body: null,
    });
  }).as('acceptFriendRequestRpc');
};

describe('friends', () => {
  const currentUser = makeAccount(
    `current-${Date.now()}@example.com`,
    'Password123!',
    'Current User',
    'currentuser',
    'curraaaa1111',
  );
  const otherUser = makeAccount(
    `other-${Date.now()}@example.com`,
    'Password123!',
    'Nova Hex',
    'novahex',
    'nova9999aaaa',
  );

  beforeEach(() => {
    authStore.clear();
    friendRequestsStore.length = 0;
    friendshipsStore.length = 0;
    currentUser.profile.friend_code = makeFriendCode('curraaaa1111');
    otherUser.profile.friend_code = makeFriendCode('nova9999aaaa');
    authStore.set(currentUser.userId, currentUser);
    authStore.set(otherUser.userId, otherUser);
    registerMockFriends(currentUser);
  });

  const signInAndOpenFriends = () => {
    cy.visit('/');
    cy.signupUi(currentUser.email, currentUser.password);
    cy.contains('Friends').click();
    cy.contains(/share codes on purpose/i).should('be.visible');
  };

  it('keeps a signed-in user on Home instead of auto-opening Friends', () => {
    cy.visit('/');
    cy.signupUi(currentUser.email, currentUser.password);

    cy.contains(/play together, faster/i).should('be.visible');
  });

  it('shows the signed-in user friend code and lets them regenerate it', () => {
    signInAndOpenFriends();

    cy.contains('Profile').click();
    cy.contains(/^Your friend code$/).should('be.visible');
    cy.get('[data-testid="friend-code-value"]').should('contain', currentUser.profile.friend_code);
    cy.get('[data-testid="regenerate-friend-code-button"]').click();
    cy.wait('@regenerateFriendCodeRpc');
    cy.get('[data-testid="friend-code-value"]').should('not.contain', 'GS-CURR-AAAA-1111');
    cy.contains(/friend code regenerated/i).should('be.visible');
  });

  it('looks up a player by friend code and sends a friend request', () => {
    signInAndOpenFriends();

    cy.get('[data-testid="friend-code-input"]').type(otherUser.profile.friend_code);
    cy.get('[data-testid="friend-code-lookup-button"]').click();
    cy.wait('@lookupFriendCodeRpc');

    cy.contains('Nova Hex').should('be.visible');
    cy.get(`[data-testid="friend-code-request-${otherUser.userId}"]`).click();

    cy.contains(/friend request sent to nova hex/i).should('be.visible');
    cy.contains('Pending requests').should('be.visible');
    cy.contains('Request sent').should('be.visible');
  });

  it('shows a friendly not-found state for unknown or no-longer-available codes', () => {
    signInAndOpenFriends();

    cy.get('[data-testid="friend-code-input"]').type('GS-MISS-ING0-CODE');
    cy.get('[data-testid="friend-code-lookup-button"]').click();
    cy.wait('@lookupFriendCodeRpc');
    cy.contains(/no player found for that friend code/i).should('be.visible');

    friendshipsStore.push({
      profile_id: currentUser.userId,
      friend_profile_id: otherUser.userId,
      is_favorite: false,
    });

    cy.get('[data-testid="friend-code-input"]').clear().type(otherUser.profile.friend_code);
    cy.get('[data-testid="friend-code-lookup-button"]').click();
    cy.wait('@lookupFriendCodeRpc');
    cy.contains(/no player found for that friend code/i).should('be.visible');
  });

  it('accepts an incoming request and shows the friend in the list', () => {
    friendRequestsStore.push({
      id: 'request-incoming-1',
      requester_profile_id: otherUser.userId,
      addressee_profile_id: currentUser.userId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    signInAndOpenFriends();

    cy.contains('Pending requests').should('be.visible');
    cy.contains('Nova Hex').should('be.visible');
    cy.get('[data-testid="accept-friend-request-request-incoming-1"]').click();

    cy.contains(/nova hex is now in your friends list/i).should('be.visible');
    cy.contains(/^Friend$/).should('be.visible');
    cy.contains('@novahex').should('be.visible');
  });

  it('still lets favorites work for accepted friends', () => {
    friendshipsStore.push({
      profile_id: currentUser.userId,
      friend_profile_id: otherUser.userId,
      is_favorite: false,
    });

    signInAndOpenFriends();

    cy.get(`[data-testid="toggle-friend-favorite-${otherUser.userId}"]`).click();
    cy.contains(/friend added to favorites/i).should('be.visible');
    cy.contains(/^Favorites$/).click();
    cy.contains('Nova Hex').should('be.visible');
    cy.contains(/favorite friend/i).should('be.visible');
  });
});

export {};
