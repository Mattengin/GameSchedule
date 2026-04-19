type MockAccount = {
  email: string;
  password: string;
  userId: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    display_name: string;
    onboarding_complete: boolean;
  };
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

const authStore = new Map<string, MockAccount>();
const friendRequestsStore: MockFriendRequest[] = [];
const friendshipsStore: MockFriendship[] = [];

const makeUserId = (email: string) => `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const makeAccount = (
  email: string,
  password: string,
  displayName?: string,
  username?: string,
): MockAccount => {
  const userId = makeUserId(email);
  const resolvedUsername = username ?? email.split('@')[0].toLowerCase();
  const resolvedDisplayName = displayName ?? resolvedUsername;

  return {
    email,
    password,
    userId,
    profile: {
      id: userId,
      username: resolvedUsername,
      avatar_url: null,
      display_name: resolvedDisplayName,
      onboarding_complete: true,
    },
  };
};

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

const getInValues = (url: string, key: string) => {
  const decodedUrl = decodeURIComponent(url);
  const match = new RegExp(`${key}=in\\.\\(([^)]+)\\)`).exec(decodedUrl);
  return match ? match[1].split(',').map((value) => decodeURIComponent(value.replace(/\"/g, ''))) : [];
};

const registerMockFriends = (currentUser: MockAccount, otherUser: MockAccount) => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    authStore.set(currentUser.userId, currentUser);
    authStore.set(otherUser.userId, otherUser);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(currentUser),
    });
  }).as('signupRequest');

  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    authStore.set(currentUser.userId, currentUser);
    authStore.set(otherUser.userId, otherUser);

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
    if (req.url.includes('username.ilike') || req.url.includes('display_name.ilike')) {
      const query = decodeURIComponent(req.url).toLowerCase();
      const matches = Array.from(authStore.values())
        .map((account) => account.profile)
        .filter(
          (profile) =>
            profile.id !== currentUser.userId &&
            (profile.username?.toLowerCase().includes('nova') ||
              profile.display_name?.toLowerCase().includes('nova') ||
              query.includes('nova')),
        );

      req.reply({
        statusCode: 200,
        body: matches,
      });
      return;
    }

    const idValue = getQueryValue(req.url, 'id');
    if (idValue) {
      const account = authStore.get(idValue);
      req.reply({
        statusCode: 200,
        body: account?.profile ?? null,
      });
      return;
    }

    const ids = getInValues(req.url, 'id');
    if (ids.length > 0) {
      const profiles = ids
        .map((id) => authStore.get(id)?.profile)
        .filter((profile) => Boolean(profile));

      req.reply({
        statusCode: 200,
        body: profiles,
      });
      return;
    }

    req.reply({
      statusCode: 200,
      body: [],
    });
  }).as('profilesRequest');

  cy.intercept('GET', '**/rest/v1/games*', {
    statusCode: 200,
    body: [],
  }).as('gamesRequest');

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

  cy.intercept('POST', '**/rest/v1/friends*', (req) => {
    const rows = Array.isArray(req.body) ? (req.body as MockFriendship[]) : [req.body as MockFriendship];

    rows.forEach((row) => {
      const existingIndex = friendshipsStore.findIndex(
        (entry) =>
          entry.profile_id === row.profile_id && entry.friend_profile_id === row.friend_profile_id,
      );

      if (existingIndex >= 0) {
        friendshipsStore[existingIndex] = { ...friendshipsStore[existingIndex], ...row };
      } else {
        friendshipsStore.push(row);
      }
    });

    req.reply({
      statusCode: 201,
      body: rows,
    });
  }).as('friendsInsert');

  cy.intercept('PATCH', '**/rest/v1/friends*', (req) => {
    const profileId = getQueryValue(req.url, 'profile_id');
    const friendProfileId = getQueryValue(req.url, 'friend_profile_id');
    const row = friendshipsStore.find(
      (entry) =>
        entry.profile_id === profileId && entry.friend_profile_id === friendProfileId,
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
  }).as('friendRequestsInsert');

  cy.intercept('PATCH', '**/rest/v1/friend_requests*', (req) => {
    const requestId = getQueryValue(req.url, 'id');
    const request = friendRequestsStore.find((entry) => entry.id === requestId);

    if (request) {
      request.status = (req.body as { status: MockFriendRequest['status'] }).status;
    }

    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('friendRequestsUpdate');

  cy.intercept('POST', '**/rest/v1/rpc/accept_friend_request', (req) => {
    const requestId = (req.body as { p_request_id: string }).p_request_id;
    const request = friendRequestsStore.find((entry) => entry.id === requestId);

    if (!request) {
      req.reply({
        statusCode: 404,
        body: { message: 'Friend request not found' },
      });
      return;
    }

    request.status = 'accepted';

    const rows: MockFriendship[] = [
      {
        profile_id: request.requester_profile_id,
        friend_profile_id: request.addressee_profile_id,
        is_favorite: false,
      },
      {
        profile_id: request.addressee_profile_id,
        friend_profile_id: request.requester_profile_id,
        is_favorite: false,
      },
    ];

    rows.forEach((row) => {
      const existingIndex = friendshipsStore.findIndex(
        (entry) =>
          entry.profile_id === row.profile_id && entry.friend_profile_id === row.friend_profile_id,
      );

      if (existingIndex >= 0) {
        friendshipsStore[existingIndex] = row;
      } else {
        friendshipsStore.push(row);
      }
    });

    req.reply({
      statusCode: 200,
      body: null,
    });
  }).as('acceptFriendRequestRpc');
};

describe('friends flow', () => {
  const currentUser = makeAccount(
    `cypress-friends-${Date.now()}@example.com`,
    `Password123!${Date.now()}`,
    'Current User',
    'currentuser',
  );
  const otherUser = makeAccount(
    `nova-${Date.now()}@example.com`,
    'Password123!',
    'Nova Hex',
    'novahex',
  );

  before(() => {
    authStore.clear();
    friendRequestsStore.length = 0;
    friendshipsStore.length = 0;
  });

  beforeEach(() => {
    authStore.clear();
    friendRequestsStore.length = 0;
    friendshipsStore.length = 0;
    registerMockFriends(currentUser, otherUser);
  });

  const signInAndOpenFriends = () => {
    cy.visit('/');
    cy.signupUi(currentUser.email, currentUser.password);
    cy.contains('Friends').click();
    cy.contains(/search profiles, send requests, and manage your real friend list/i).should('be.visible');
  };

  it('searches profiles and sends a friend request', () => {
    signInAndOpenFriends();

    cy.get('[data-testid="friends-search-input"]').type('nova');
    cy.contains('Search results').should('be.visible');
    cy.contains('Nova Hex').should('be.visible');
    cy.get(`[data-testid="send-friend-request-${otherUser.userId}"]`).click();

    cy.contains(/friend request sent to nova hex/i).should('be.visible');
    cy.contains('Pending requests').should('be.visible');
    cy.contains('Request sent').should('be.visible');
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

  it('favorites an accepted friend and shows them under the favorites filter', () => {
    friendshipsStore.push({
      profile_id: currentUser.userId,
      friend_profile_id: otherUser.userId,
      is_favorite: false,
    });

    signInAndOpenFriends();

    cy.contains('Nova Hex').should('be.visible');
    cy.get(`[data-testid="toggle-friend-favorite-${otherUser.userId}"]`).click();
    cy.contains(/friend added to favorites/i).should('be.visible');
    cy.contains(/^Favorites$/).click();
    cy.contains('Nova Hex').should('be.visible');
    cy.contains(/favorite friend/i).should('be.visible');
  });
});

export {};
