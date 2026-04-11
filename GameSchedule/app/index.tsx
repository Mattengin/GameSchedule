import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  FAB,
  HelperText,
  ProgressBar,
  Searchbar,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { supabase } from '../services/supabaseClient';

type SectionKey =
  | 'dashboard'
  | 'friends'
  | 'games'
  | 'roulette'
  | 'lobbies'
  | 'schedule'
  | 'inbox'
  | 'profile';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  onboarding_complete: boolean;
};

type GameRecord = {
  id: string;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string | null;
  is_featured: boolean;
};

type RouletteEntry = {
  game_id: string;
  games: Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform'> | null;
};

type LobbyRecord = {
  id: string;
  title: string;
  scheduled_for: string | null;
  is_private: boolean;
  status: 'scheduled' | 'open' | 'closed';
  game_id: string;
  host_profile_id: string;
  games: Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count'> | null;
  invite_count?: number;
};

type AvailabilitySetting = {
  profile_id: string;
  auto_decline_outside_hours: boolean;
};

type AvailabilitySlot = {
  profile_id: string;
  day_key: string;
  slot_label: string;
};

type FriendshipRecord = {
  profile_id: string;
  friend_profile_id: string;
  is_favorite: boolean;
};

type FriendRequestRecord = {
  id: string;
  requester_profile_id: string;
  addressee_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
};

const fallbackInviteFriends = [
  { name: 'NovaHex', status: 'Online', note: 'Ready for co-op in 20m', favorite: true },
  { name: 'PixelMoth', status: 'In lobby', note: 'Queued for two rounds', favorite: true },
  { name: 'EchoVale', status: 'Offline', note: 'Last online 2h ago', favorite: false },
  { name: 'LumaByte', status: 'Pending', note: 'Sent friend code yesterday', favorite: false },
];

const fallbackGames: GameRecord[] = [
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
    id: 'drift-legends-x',
    title: 'Drift Legends X',
    genre: 'Racing',
    platform: 'PC / Console',
    player_count: '2-8 players',
    description: 'Arcade racing nights with custom lobbies and private party queues.',
    is_featured: false,
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
    id: 'skyforge-party',
    title: 'Skyforge Party',
    genre: 'MMO',
    platform: 'Cross-platform',
    player_count: '4-6 players',
    description: 'Dungeon runs and weekly guild goals for a repeat squad.',
    is_featured: false,
  },
];

const fallbackUpcomingLobbies = [
  { title: 'Helix Arena Ranked', time: 'Today | 8:30 PM', attendees: '4/5 locked in' },
  { title: 'Deep Raid Warmup', time: 'Tomorrow | 7:00 PM', attendees: '3/4 voted yes' },
];

const notifications = [
  { label: 'Invite', message: 'NovaHex invited you to a Helix Arena lobby.', age: '2m ago' },
  { label: 'Reminder', message: 'Deep Raid Warmup starts in 1 hour.', age: '58m ago' },
  { label: 'System', message: 'Discord sync is ready when you decide to connect it.', age: 'Today' },
];

const availabilityGrid = [
  { day: 'Mon', slots: ['6 PM', '8 PM', '10 PM'] },
  { day: 'Tue', slots: ['6 PM', '8 PM', '10 PM'] },
  { day: 'Wed', slots: ['6 PM', '8 PM', '10 PM'] },
  { day: 'Thu', slots: ['6 PM', '8 PM', '10 PM'] },
  { day: 'Fri', slots: ['6 PM', '8 PM', '10 PM'] },
  { day: 'Sat', slots: ['1 PM', '4 PM', '8 PM'] },
  { day: 'Sun', slots: ['1 PM', '4 PM', '8 PM'] },
];

const sections: { value: SectionKey; label: string }[] = [
  { value: 'dashboard', label: 'Home' },
  { value: 'friends', label: 'Friends' },
  { value: 'games', label: 'Games' },
  { value: 'roulette', label: 'Roulette' },
  { value: 'lobbies', label: 'Lobbies' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'profile', label: 'Profile' },
];

const createDefaultAvailabilitySelection = () =>
  availabilityGrid.reduce<Record<string, string[]>>((accumulator, row) => {
    accumulator[row.day] = [...row.slots];
    return accumulator;
  }, {});

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Surface style={[styles.statCard, { borderColor: accent }]} elevation={1}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Surface>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [authError, setAuthError] = React.useState('');
  const [authMessage, setAuthMessage] = React.useState('');
  const [profileForm, setProfileForm] = React.useState({
    username: '',
    displayName: '',
    avatarUrl: '',
  });
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [profileError, setProfileError] = React.useState('');
  const [profileMessage, setProfileMessage] = React.useState('');
  const [gamesLoading, setGamesLoading] = React.useState(false);
  const [gamesError, setGamesError] = React.useState('');
  const [libraryGames, setLibraryGames] = React.useState<GameRecord[]>(fallbackGames);
  const [gameSearch, setGameSearch] = React.useState('');
  const [favoriteGameIds, setFavoriteGameIds] = React.useState<string[]>([]);
  const [rouletteEntries, setRouletteEntries] = React.useState<RouletteEntry[]>([]);
  const [gameActionBusyId, setGameActionBusyId] = React.useState<string | null>(null);
  const [gameActionMessage, setGameActionMessage] = React.useState('');
  const [friendSearch, setFriendSearch] = React.useState('');
  const [friendLoading, setFriendLoading] = React.useState(false);
  const [friendSearchLoading, setFriendSearchLoading] = React.useState(false);
  const [friendError, setFriendError] = React.useState('');
  const [friendMessage, setFriendMessage] = React.useState('');
  const [friendActionBusyId, setFriendActionBusyId] = React.useState<string | null>(null);
  const [friendships, setFriendships] = React.useState<FriendshipRecord[]>([]);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequestRecord[]>([]);
  const [friendDirectory, setFriendDirectory] = React.useState<Record<string, Profile>>({});
  const [friendSearchResults, setFriendSearchResults] = React.useState<Profile[]>([]);
  const [lobbiesLoading, setLobbiesLoading] = React.useState(false);
  const [lobbiesError, setLobbiesError] = React.useState('');
  const [lobbyBusy, setLobbyBusy] = React.useState(false);
  const [lobbyMessage, setLobbyMessage] = React.useState('');
  const [lobbies, setLobbies] = React.useState<LobbyRecord[]>([]);
  const [selectedLobbyGameId, setSelectedLobbyGameId] = React.useState('');
  const [selectedLobbyInviteNames, setSelectedLobbyInviteNames] = React.useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [availabilityBusy, setAvailabilityBusy] = React.useState(false);
  const [availabilityError, setAvailabilityError] = React.useState('');
  const [availabilityMessage, setAvailabilityMessage] = React.useState('');
  const [availabilitySelection, setAvailabilitySelection] =
    React.useState<Record<string, string[]>>(createDefaultAvailabilitySelection());
  const [autoDeclineOutsideHours, setAutoDeclineOutsideHours] = React.useState(false);
  const [lobbyForm, setLobbyForm] = React.useState({
    title: '',
    timeMode: 'now' as 'now' | 'later',
    scheduledFor: '',
    visibility: 'private' as 'private' | 'public',
  });
  const [section, setSection] = React.useState<SectionKey>('dashboard');
  const [friendFilter, setFriendFilter] = React.useState<'all' | 'favorites' | 'pending'>('all');

  React.useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      } else {
        setSession(currentSession);
      }

      setAuthLoading(false);
    };

    bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const syncProfile = async () => {
      if (!session?.user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const user = session.user;
      const fallbackName =
        user.user_metadata?.username ??
        user.user_metadata?.display_name ??
        user.email?.split('@')[0] ??
        'Player One';

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, display_name, onboarding_complete')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        setAuthError(fetchError.message);
        setProfileLoading(false);
        return;
      }

      if (existingProfile) {
        setProfile(existingProfile);
        setProfileLoading(false);
        return;
      }

      const newProfile = {
        id: user.id,
        username: fallbackName,
        display_name: fallbackName,
        avatar_url: null,
        onboarding_complete: false,
      };

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select('id, username, avatar_url, display_name, onboarding_complete')
        .single();

      if (insertError) {
        setAuthError(insertError.message);
      } else {
        setProfile(insertedProfile);
      }

      setProfileLoading(false);
    };

    syncProfile();
  }, [session]);

  React.useEffect(() => {
    if (!profile) {
      setProfileForm({
        username: '',
        displayName: '',
        avatarUrl: '',
      });
      return;
    }

    setProfileForm({
      username: profile.username ?? '',
      displayName: profile.display_name ?? '',
      avatarUrl: profile.avatar_url ?? '',
    });
  }, [profile]);

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
        setRouletteEntries(pool as RouletteEntry[]);
      }
    };

    loadGameRelations();
  }, [session]);

  React.useEffect(() => {
    if (!session?.user) {
      setFriendships([]);
      setFriendRequests([]);
      setFriendDirectory({});
      setFriendSearchResults([]);
      return;
    }

    const loadFriendsData = async () => {
      setFriendLoading(true);
      setFriendError('');

      const [{ data: friendshipsData, error: friendshipsError }, { data: requestsData, error: requestsError }] =
        await Promise.all([
          supabase
            .from('friends')
            .select('profile_id, friend_profile_id, is_favorite')
            .eq('profile_id', session.user.id),
          supabase
            .from('friend_requests')
            .select('id, requester_profile_id, addressee_profile_id, status, created_at')
            .or(`requester_profile_id.eq.${session.user.id},addressee_profile_id.eq.${session.user.id}`)
            .order('created_at', { ascending: false }),
        ]);

      if (friendshipsError || requestsError) {
        setFriendError(friendshipsError?.message ?? requestsError?.message ?? 'Unable to load friends.');
        setFriendLoading(false);
        return;
      }

      const nextFriendships = (friendshipsData as FriendshipRecord[] | null) ?? [];
      const nextRequests = (requestsData as FriendRequestRecord[] | null) ?? [];
      const profileIds = Array.from(
        new Set(
          [
            ...nextFriendships.map((friendship) => friendship.friend_profile_id),
            ...nextRequests.map((request) =>
              request.requester_profile_id === session.user?.id
                ? request.addressee_profile_id
                : request.requester_profile_id,
            ),
          ].filter(Boolean),
        ),
      );

      setFriendships(nextFriendships);
      setFriendRequests(nextRequests);

      if (profileIds.length === 0) {
        setFriendDirectory({});
        setFriendLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, display_name, onboarding_complete')
        .in('id', profileIds);

      if (profilesError) {
        setFriendError(profilesError.message);
      } else {
        const nextDirectory = ((profilesData as Profile[] | null) ?? []).reduce<Record<string, Profile>>(
          (accumulator, currentProfile) => {
            accumulator[currentProfile.id] = currentProfile;
            return accumulator;
          },
          {},
        );

        setFriendDirectory(nextDirectory);
      }

      setFriendLoading(false);
    };

    loadFriendsData();
  }, [session]);

  React.useEffect(() => {
    if (!session?.user || friendSearch.trim().length < 2) {
      setFriendSearchResults([]);
      setFriendSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setFriendSearchLoading(true);

      const query = friendSearch.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, display_name, onboarding_complete')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', session.user.id)
        .limit(6);

      if (error) {
        setFriendError(error.message);
        setFriendSearchResults([]);
      } else {
        setFriendSearchResults((data as Profile[] | null) ?? []);
      }

      setFriendSearchLoading(false);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [friendSearch, session]);

  React.useEffect(() => {
    if (!session?.user) {
      setLobbies([]);
      setLobbiesLoading(false);
      return;
    }

    const loadLobbies = async () => {
      setLobbiesLoading(true);
      setLobbiesError('');

      const { data, error } = await supabase
        .from('lobbies')
        .select(
          'id, title, scheduled_for, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
        )
        .order('created_at', { ascending: false });

      if (error) {
        setLobbiesError(error.message);
      } else {
        setLobbies((data as LobbyRecord[]) ?? []);
      }

      setLobbiesLoading(false);
    };

    loadLobbies();
  }, [session]);

  React.useEffect(() => {
    if (!session?.user) {
      setAvailabilitySelection(createDefaultAvailabilitySelection());
      setAutoDeclineOutsideHours(false);
      setAvailabilityLoading(false);
      return;
    }

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError('');

      const [{ data: settings, error: settingsError }, { data: slots, error: slotsError }] =
        await Promise.all([
          supabase
            .from('availability_settings')
            .select('profile_id, auto_decline_outside_hours')
            .eq('profile_id', session.user.id)
            .maybeSingle(),
          supabase
            .from('availability_slots')
            .select('profile_id, day_key, slot_label')
            .eq('profile_id', session.user.id),
        ]);

      if (settingsError || slotsError) {
        setAvailabilityError(settingsError?.message ?? slotsError?.message ?? 'Unable to load availability.');
        setAvailabilityLoading(false);
        return;
      }

      const selection = (slots as AvailabilitySlot[] | null)?.reduce<Record<string, string[]>>(
        (accumulator, slot) => {
          const current = accumulator[slot.day_key] ?? [];
          accumulator[slot.day_key] = [...current, slot.slot_label];
          return accumulator;
        },
        {},
      );

      const hasSavedAvailability = Boolean((slots as AvailabilitySlot[] | null)?.length);

      setAvailabilitySelection(
        hasSavedAvailability ? selection ?? {} : createDefaultAvailabilitySelection(),
      );
      setAutoDeclineOutsideHours((settings as AvailabilitySetting | null)?.auto_decline_outside_hours ?? false);
      setAvailabilityLoading(false);
    };

    loadAvailability();
  }, [session]);

  React.useEffect(() => {
    if (selectedLobbyGameId || libraryGames.length === 0) {
      return;
    }

    setSelectedLobbyGameId(libraryGames[0].id);
    setLobbyForm((current) => ({
      ...current,
      title: current.title || `${libraryGames[0].title} Lobby`,
    }));
  }, [libraryGames, selectedLobbyGameId]);

  const acceptedFriends = React.useMemo(() => {
    return friendships
      .map((friendship) => {
        const linkedProfile = friendDirectory[friendship.friend_profile_id];

        if (!linkedProfile) {
          return null;
        }

        return {
          ...linkedProfile,
          is_favorite: friendship.is_favorite,
        };
      })
      .filter(
        (
          friend,
        ): friend is Profile & {
          is_favorite: boolean;
        } => Boolean(friend),
      );
  }, [friendDirectory, friendships]);

  const incomingFriendRequests = React.useMemo(() => {
    return friendRequests.filter(
      (request) => request.status === 'pending' && request.addressee_profile_id === session?.user?.id,
    );
  }, [friendRequests, session]);

  const outgoingFriendRequests = React.useMemo(() => {
    return friendRequests.filter(
      (request) => request.status === 'pending' && request.requester_profile_id === session?.user?.id,
    );
  }, [friendRequests, session]);

  const visibleFriends = React.useMemo(() => {
    if (friendFilter === 'pending') {
      return [];
    }

    if (friendFilter === 'favorites') {
      return acceptedFriends.filter((friend) => friend.is_favorite);
    }

    return acceptedFriends;
  }, [acceptedFriends, friendFilter]);

  const filteredGames = React.useMemo(() => {
    const query = gameSearch.trim().toLowerCase();

    if (!query) {
      return libraryGames;
    }

    return libraryGames.filter((game) => {
      return [game.title, game.genre, game.platform, game.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [gameSearch, libraryGames]);

  const roulettePoolGames = React.useMemo(() => {
    return rouletteEntries
      .map((entry) => entry.games)
      .filter((game): game is Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform'> => Boolean(game));
  }, [rouletteEntries]);

  const selectedLobbyGame = React.useMemo(() => {
    return libraryGames.find((game) => game.id === selectedLobbyGameId) ?? null;
  }, [libraryGames, selectedLobbyGameId]);

  const inviteReadyFriends = React.useMemo(() => {
    if (acceptedFriends.length > 0) {
      return acceptedFriends.map((friend) => ({
        name: friend.display_name ?? friend.username ?? 'Player',
      }));
    }

    return fallbackInviteFriends
      .filter((friend) => friend.status !== 'Pending')
      .map((friend) => ({ name: friend.name }));
  }, [acceptedFriends]);

  const selectedAvailabilityCount = React.useMemo(() => {
    return Object.values(availabilitySelection).reduce((total, slots) => total + slots.length, 0);
  }, [availabilitySelection]);

  const scheduleCards = React.useMemo(() => {
    if (lobbies.length === 0) {
      return fallbackUpcomingLobbies;
    }

    return lobbies.slice(0, 4).map((lobby) => ({
      title: lobby.title,
      time: lobby.scheduled_for
        ? new Date(lobby.scheduled_for).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : 'Starts now',
      attendees:
        typeof lobby.invite_count === 'number'
          ? `${lobby.invite_count + 1} players in draft`
          : lobby.is_private
            ? 'Private lobby'
            : 'Public lobby',
    }));
  }, [lobbies]);

  const prepareLobbyDraft = React.useCallback(
    (gameId: string) => {
      const game = libraryGames.find((item) => item.id === gameId);

      if (!game) {
        return;
      }

      setSelectedLobbyGameId(gameId);
      setLobbyForm((current) => ({
        ...current,
        title: `${game.title} Lobby`,
      }));
      setSelectedLobbyInviteNames([]);
      setLobbyMessage('');
      setSection('lobbies');
    },
    [libraryGames],
  );

  const handleCreateLobby = async () => {
    if (!session?.user || !selectedLobbyGame) {
      setLobbiesError('Pick a game before creating a lobby.');
      return;
    }

    const title = lobbyForm.title.trim() || `${selectedLobbyGame.title} Lobby`;
    let scheduledFor: string | null = null;

    if (lobbyForm.timeMode === 'later') {
      const parsedDate = new Date(lobbyForm.scheduledFor);

      if (!lobbyForm.scheduledFor.trim() || Number.isNaN(parsedDate.getTime())) {
        setLobbiesError('Enter a valid date and time for later.');
        setLobbyMessage('');
        return;
      }

      scheduledFor = parsedDate.toISOString();
    } else {
      scheduledFor = new Date().toISOString();
    }

    setLobbyBusy(true);
    setLobbiesError('');
    setLobbyMessage('');

    const { data: createdLobby, error: lobbyError } = await supabase
      .from('lobbies')
      .insert({
        game_id: selectedLobbyGame.id,
        host_profile_id: session.user.id,
        title,
        scheduled_for: scheduledFor,
        is_private: lobbyForm.visibility === 'private',
        status: 'scheduled',
      })
      .select(
        'id, title, scheduled_for, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
      )
      .single();

    if (lobbyError) {
      setLobbiesError(lobbyError.message);
      setLobbyBusy(false);
      return;
    }

    const { error: memberError } = await supabase.from('lobby_members').insert({
      lobby_id: createdLobby.id,
      profile_id: session.user.id,
      role: 'host',
      rsvp_status: 'accepted',
    });

    setLobbies((current) => [
      {
        ...(createdLobby as LobbyRecord),
        invite_count: selectedLobbyInviteNames.length,
      },
      ...current,
    ]);
    setLobbyMessage(
      memberError
        ? `Lobby created, but host membership setup needs attention: ${memberError.message}`
        : `Lobby created.${selectedLobbyInviteNames.length > 0 ? ` ${selectedLobbyInviteNames.length} invite draft${selectedLobbyInviteNames.length === 1 ? '' : 's'} ready.` : ''}`,
    );
    setLobbyForm({
      title: `${selectedLobbyGame.title} Lobby`,
      timeMode: 'now',
      scheduledFor: '',
      visibility: 'private',
    });
    setSelectedLobbyInviteNames([]);
    setLobbyBusy(false);
  };

  const toggleAvailabilitySlot = (dayKey: string, slotLabel: string) => {
    setAvailabilitySelection((current) => {
      const currentSlots = current[dayKey] ?? [];
      const nextSlots = currentSlots.includes(slotLabel)
        ? currentSlots.filter((slot) => slot !== slotLabel)
        : [...currentSlots, slotLabel];

      return {
        ...current,
        [dayKey]: nextSlots,
      };
    });
    setAvailabilityMessage('');
    setAvailabilityError('');
  };

  const handleSaveAvailability = async () => {
    if (!session?.user) {
      return;
    }

    setAvailabilityBusy(true);
    setAvailabilityError('');
    setAvailabilityMessage('');

    const slotRows = Object.entries(availabilitySelection).flatMap(([dayKey, slots]) =>
      slots.map((slotLabel) => ({
        profile_id: session.user.id,
        day_key: dayKey,
        slot_label: slotLabel,
      })),
    );

    const { error: settingsError } = await supabase.from('availability_settings').upsert({
      profile_id: session.user.id,
      auto_decline_outside_hours: autoDeclineOutsideHours,
      updated_at: new Date().toISOString(),
    });

    if (settingsError) {
      setAvailabilityError(settingsError.message);
      setAvailabilityBusy(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from('availability_slots')
      .delete()
      .eq('profile_id', session.user.id);

    if (deleteError) {
      setAvailabilityError(deleteError.message);
      setAvailabilityBusy(false);
      return;
    }

    if (slotRows.length > 0) {
      const { error: insertError } = await supabase.from('availability_slots').insert(slotRows);

      if (insertError) {
        setAvailabilityError(insertError.message);
        setAvailabilityBusy(false);
        return;
      }
    }

    setAvailabilityMessage('Availability saved.');
    setAvailabilityBusy(false);
  };

  const getFriendRequestLabel = (request: FriendRequestRecord) => {
    const otherProfileId =
      request.requester_profile_id === session?.user?.id
        ? request.addressee_profile_id
        : request.requester_profile_id;
    const otherProfile = friendDirectory[otherProfileId];

    return otherProfile?.display_name ?? otherProfile?.username ?? 'Player';
  };

  const getFriendSearchStatus = (candidateId: string) => {
    if (friendships.some((friendship) => friendship.friend_profile_id === candidateId)) {
      return 'friend';
    }

    if (
      friendRequests.some(
        (request) =>
          request.status === 'pending' &&
          ((request.requester_profile_id === session?.user?.id &&
            request.addressee_profile_id === candidateId) ||
            (request.addressee_profile_id === session?.user?.id &&
              request.requester_profile_id === candidateId)),
      )
    ) {
      return 'pending';
    }

    return 'new';
  };

  const sendFriendRequest = async (targetProfile: Profile) => {
    if (!session?.user) {
      return;
    }

    setFriendActionBusyId(`request:${targetProfile.id}`);
    setFriendError('');
    setFriendMessage('');

    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        requester_profile_id: session.user.id,
        addressee_profile_id: targetProfile.id,
        status: 'pending',
      })
      .select('id, requester_profile_id, addressee_profile_id, status, created_at')
      .single();

    if (error) {
      setFriendError(error.code === '23505' ? 'A friend request already exists for that player.' : error.message);
    } else {
      setFriendRequests((current) => [data as FriendRequestRecord, ...current]);
      setFriendDirectory((current) => ({
        ...current,
        [targetProfile.id]: targetProfile,
      }));
      setFriendMessage(`Friend request sent to ${targetProfile.display_name ?? targetProfile.username ?? 'player'}.`);
    }

    setFriendActionBusyId(null);
  };

  const respondToFriendRequest = async (
    request: FriendRequestRecord,
    decision: 'accepted' | 'declined',
  ) => {
    if (!session?.user) {
      return;
    }

    const otherProfileId =
      request.requester_profile_id === session.user.id
        ? request.addressee_profile_id
        : request.requester_profile_id;

    setFriendActionBusyId(`${decision}:${request.id}`);
    setFriendError('');
    setFriendMessage('');

    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: decision })
      .eq('id', request.id);

    if (updateError) {
      setFriendError(updateError.message);
      setFriendActionBusyId(null);
      return;
    }

    if (decision === 'accepted') {
      const { error: insertError } = await supabase.from('friends').upsert([
        {
          profile_id: session.user.id,
          friend_profile_id: otherProfileId,
          is_favorite: false,
        },
        {
          profile_id: otherProfileId,
          friend_profile_id: session.user.id,
          is_favorite: false,
        },
      ]);

      if (insertError) {
        setFriendError(insertError.message);
        setFriendActionBusyId(null);
        return;
      }

      setFriendships((current) => {
        if (current.some((friendship) => friendship.friend_profile_id === otherProfileId)) {
          return current;
        }

        return [
          {
            profile_id: session.user.id,
            friend_profile_id: otherProfileId,
            is_favorite: false,
          },
          ...current,
        ];
      });
      setFriendMessage(`${getFriendRequestLabel(request)} is now in your friends list.`);
    } else {
      setFriendMessage(`Friend request from ${getFriendRequestLabel(request)} declined.`);
    }

    setFriendRequests((current) =>
      current.map((entry) =>
        entry.id === request.id
          ? {
              ...entry,
              status: decision,
            }
          : entry,
      ),
    );
    setFriendActionBusyId(null);
  };

  const toggleFriendFavorite = async (friendProfileId: string) => {
    if (!session?.user) {
      return;
    }

    const currentFriendship = friendships.find(
      (friendship) => friendship.friend_profile_id === friendProfileId,
    );

    if (!currentFriendship) {
      return;
    }

    setFriendActionBusyId(`favorite-friend:${friendProfileId}`);
    setFriendError('');
    setFriendMessage('');

    const nextFavorite = !currentFriendship.is_favorite;
    const { error } = await supabase
      .from('friends')
      .update({ is_favorite: nextFavorite })
      .eq('profile_id', session.user.id)
      .eq('friend_profile_id', friendProfileId);

    if (error) {
      setFriendError(error.message);
    } else {
      setFriendships((current) =>
        current.map((friendship) =>
          friendship.friend_profile_id === friendProfileId
            ? { ...friendship, is_favorite: nextFavorite }
            : friendship,
        ),
      );
      setFriendMessage(nextFavorite ? 'Friend added to favorites.' : 'Friend removed from favorites.');
    }

    setFriendActionBusyId(null);
  };

  const renderDashboard = () => (
    <>
      <Surface style={styles.heroCard} elevation={2}>
        <Chip icon="motion-play" style={styles.liveChip}>
          Live prototype
        </Chip>
        <Text variant="displaySmall" style={styles.heroTitle}>
          Play together, faster.
        </Text>
        <Text style={styles.heroCopy}>
          Placeholder data for the social gaming flow: invites, roulette, lobby setup, and
          availability sync.
        </Text>
        <View style={styles.heroActions}>
          <Button mode="contained" onPress={() => setSection('roulette')}>
            Start group spin
          </Button>
          <Button mode="outlined" onPress={() => setSection('friends')}>
            Manage friends
          </Button>
        </View>
      </Surface>

      <View style={styles.statRow}>
        <StatCard label="Friends online" value="12" accent="#7C5CFF" />
        <StatCard label="Open lobbies" value={String(lobbies.length)} accent="#33D1FF" />
        <StatCard label="Pool games" value={String(roulettePoolGames.length)} accent="#7DFFB3" />
      </View>

      <Card style={styles.panel}>
        <Card.Content>
          <SectionTitle
            title="Setup wizard"
            subtitle="Mirror the onboarding handoff before auth and API work land."
          />
          <Text style={styles.listText}>1. Create username and avatar</Text>
          <Text style={styles.listText}>2. Connect Discord or Twitch later</Text>
          <Text style={styles.listText}>3. Pick favorite games for your pool</Text>
          <Text style={styles.listText}>4. Set weekly availability</Text>
          <ProgressBar progress={0.75} color="#7C5CFF" style={styles.progress} />
        </Card.Content>
      </Card>

      <Card style={styles.panel}>
        <Card.Content>
          <SectionTitle
            title="Tonight's fastest route"
            subtitle="One-tap path from roulette to live lobby."
          />
          <View style={styles.quickPath}>
            <Chip icon="dice-multiple">Spin</Chip>
            <Chip icon="account-multiple">Invite squad</Chip>
            <Chip icon="calendar-clock">Confirm time</Chip>
            <Chip icon="bell-ring">Send reminder</Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.panel}>
        <Card.Content>
          <SectionTitle
            title="Featured games"
            subtitle="Live from your Supabase library when rows exist, otherwise using fallback seed data."
          />
          <View style={styles.quickPath}>
            {libraryGames
              .filter((game) => game.is_featured)
              .slice(0, 3)
              .map((game) => (
                <Chip key={game.id}>{game.title}</Chip>
              ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.panel}>
        <Card.Content>
          <SectionTitle
            title="Your roulette pool"
            subtitle="Personal pool saved in Supabase and ready for the next spin."
          />
          <View style={styles.quickPath}>
            {roulettePoolGames.length > 0 ? (
              roulettePoolGames.slice(0, 4).map((game) => <Chip key={game.id}>{game.title}</Chip>)
            ) : (
              <Text style={styles.friendNote}>Add games from the library to start building your pool.</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </>
  );

  const renderFriends = () => (
    <>
      <SectionTitle
        title="Friends & contacts"
        subtitle="Search profiles, send requests, and manage your real friend list."
      />
      <Searchbar
        placeholder="Search by username or display name"
        value={friendSearch}
        onChangeText={setFriendSearch}
        testID="friends-search-input"
      />
      <SegmentedButtons
        value={friendFilter}
        onValueChange={(value) => setFriendFilter(value as 'all' | 'favorites' | 'pending')}
        style={styles.segmented}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'favorites', label: 'Favorites' },
          { value: 'pending', label: 'Pending' },
        ]}
      />
      {friendError ? (
        <HelperText type="error" visible>
          {friendError}
        </HelperText>
      ) : null}
      {friendMessage ? (
        <HelperText type="info" visible style={styles.successText}>
          {friendMessage}
        </HelperText>
      ) : null}

      {friendSearch.trim().length >= 2 ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">Search results</Text>
            <Text style={styles.friendNote}>
              {friendSearchLoading ? 'Searching profiles...' : 'Send a request to bring someone into your lobby flow.'}
            </Text>
            {friendSearchResults.map((candidate) => {
              const status = getFriendSearchStatus(candidate.id);
              const candidateName = candidate.display_name ?? candidate.username ?? 'Player';

              return (
                <View key={candidate.id} style={styles.friendRow}>
                  <Avatar.Text
                    size={42}
                    label={candidateName.slice(0, 2).toUpperCase()}
                    style={styles.avatar}
                  />
                  <View style={styles.friendMeta}>
                    <Text variant="titleMedium">{candidateName}</Text>
                    <Text style={styles.friendNote}>
                      {candidate.username ? `@${candidate.username}` : 'No username yet'}
                    </Text>
                  </View>
                  {status === 'new' ? (
                    <Button
                      mode="contained-tonal"
                      onPress={() => sendFriendRequest(candidate)}
                      loading={friendActionBusyId === `request:${candidate.id}`}
                      disabled={friendActionBusyId !== null}
                      testID={`send-friend-request-${candidate.id}`}>
                      Send request
                    </Button>
                  ) : (
                    <Chip>{status === 'friend' ? 'Already friends' : 'Pending'}</Chip>
                  )}
                </View>
              );
            })}
            {!friendSearchLoading && friendSearchResults.length === 0 ? (
              <Text style={styles.friendNote}>No matching profiles found.</Text>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}

      {(friendFilter === 'pending' || incomingFriendRequests.length > 0 || outgoingFriendRequests.length > 0) ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">Pending requests</Text>
            {incomingFriendRequests.map((request) => (
              <View key={request.id} style={styles.friendRequestCard}>
                <Text variant="titleMedium">{getFriendRequestLabel(request)}</Text>
                <Text style={styles.friendNote}>Incoming request</Text>
                <View style={styles.cardActions}>
                  <Button
                    mode="contained-tonal"
                    onPress={() => respondToFriendRequest(request, 'accepted')}
                    loading={friendActionBusyId === `accepted:${request.id}`}
                    disabled={friendActionBusyId !== null}
                    testID={`accept-friend-request-${request.id}`}>
                    Accept
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => respondToFriendRequest(request, 'declined')}
                    loading={friendActionBusyId === `declined:${request.id}`}
                    disabled={friendActionBusyId !== null}
                    testID={`decline-friend-request-${request.id}`}>
                    Decline
                  </Button>
                </View>
              </View>
            ))}
            {outgoingFriendRequests.map((request) => (
              <View key={request.id} style={styles.friendRequestCard}>
                <Text variant="titleMedium">{getFriendRequestLabel(request)}</Text>
                <Text style={styles.friendNote}>Request sent</Text>
                <Chip>Pending</Chip>
              </View>
            ))}
            {incomingFriendRequests.length === 0 && outgoingFriendRequests.length === 0 ? (
              <Text style={styles.friendNote}>No pending requests right now.</Text>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}

      {visibleFriends.map((friend) => {
        const friendName = friend.display_name ?? friend.username ?? 'Player';

        return (
          <Card key={friend.id} style={styles.panel}>
            <Card.Content style={styles.friendCard}>
              <Avatar.Text
                size={46}
                label={friendName.slice(0, 2).toUpperCase()}
                style={styles.avatar}
              />
              <View style={styles.friendMeta}>
                <Text variant="titleMedium">{friendName}</Text>
                <Text style={styles.friendStatus}>{friend.is_favorite ? 'Favorite friend' : 'Friend'}</Text>
                <Text style={styles.friendNote}>
                  {friend.username ? `@${friend.username}` : 'Profile still needs a username'}
                </Text>
              </View>
              <Button
                mode="text"
                onPress={() => toggleFriendFavorite(friend.id)}
                loading={friendActionBusyId === `favorite-friend:${friend.id}`}
                disabled={friendActionBusyId !== null}
                testID={`toggle-friend-favorite-${friend.id}`}>
                {friend.is_favorite ? 'Unfavorite' : 'Favorite'}
              </Button>
            </Card.Content>
          </Card>
        );
      })}
      {!friendLoading && visibleFriends.length === 0 && friendFilter !== 'pending' ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">No friends yet.</Text>
            <Text style={styles.friendNote}>Search for another profile and send your first request.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </>
  );

  const renderGames = () => (
    <>
      <SectionTitle
        title="Game library"
        subtitle="Supabase-backed library with local fallback data until the table is seeded."
      />
      <Searchbar
        placeholder="Search title, genre, or platform"
        value={gameSearch}
        onChangeText={setGameSearch}
        testID="games-search-input"
      />
      <View style={styles.quickPath}>
        <Chip icon="filter-variant">Genre</Chip>
        <Chip icon="devices">Platform</Chip>
        <Chip icon="star-outline">{gamesLoading ? 'Loading' : `${filteredGames.length} results`}</Chip>
      </View>
      {gamesError ? (
        <HelperText type="info" visible style={styles.helperText}>
          Falling back to local game seed: {gamesError}
        </HelperText>
      ) : null}
      {gameActionMessage ? (
        <HelperText type="info" visible style={styles.successText}>
          {gameActionMessage}
        </HelperText>
      ) : null}
      {filteredGames.map((game) => (
        <Card key={game.id} style={styles.panel}>
          <Card.Content>
            <Text variant="titleLarge">{game.title}</Text>
            <Text style={styles.supportingText}>{game.genre}</Text>
            <Text style={styles.friendNote}>
              {game.platform} | {game.player_count}
            </Text>
            <Text style={styles.listText}>{game.description ?? 'Description coming soon.'}</Text>
            <View style={styles.quickPath}>
              {favoriteGameIds.includes(game.id) ? (
                <Chip icon="star" selected>
                  Favorite
                </Chip>
              ) : null}
              {rouletteEntries.some((entry) => entry.game_id === game.id) ? (
                <Chip icon="dice-multiple">In roulette pool</Chip>
              ) : null}
            </View>
            <View style={styles.cardActions}>
              <Button mode="contained-tonal" onPress={() => prepareLobbyDraft(game.id)}>
                Create lobby
              </Button>
              <Button
                mode="text"
                onPress={() => toggleFavorite(game.id)}
                loading={gameActionBusyId === `favorite:${game.id}`}
                disabled={gameActionBusyId !== null}>
                {favoriteGameIds.includes(game.id) ? 'Unfavorite' : 'Favorite'}
              </Button>
              <Button
                mode="text"
                onPress={() => toggleRoulettePool(game.id)}
                loading={gameActionBusyId === `pool:${game.id}`}
                disabled={gameActionBusyId !== null}>
                {rouletteEntries.some((entry) => entry.game_id === game.id) ? 'Remove from pool' : 'Add to pool'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
      {!gamesLoading && filteredGames.length === 0 ? (
        <Card style={styles.panel} testID="games-empty-state">
          <Card.Content>
            <Text variant="titleMedium">No games matched your search.</Text>
            <Text style={styles.friendNote}>Try a title, genre, or platform keyword.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </>
  );

  const renderRoulette = () => (
    <>
      <SectionTitle
        title="Game roulette"
        subtitle="Pick from your saved pool before building a lobby."
      />
      <Surface style={styles.rouletteHero} elevation={2}>
        <Text variant="headlineMedium" style={styles.rouletteValue}>
          {roulettePoolGames[0]?.title ?? 'Add games to spin'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {roulettePoolGames.length > 0
            ? `You currently have ${roulettePoolGames.length} game${roulettePoolGames.length === 1 ? '' : 's'} in your pool.`
            : 'Your pool is empty. Add games from the library first.'}
        </Text>
        <View style={styles.heroActions}>
          <Button
            mode="contained"
            onPress={() =>
              roulettePoolGames[0] ? prepareLobbyDraft(roulettePoolGames[0].id) : setSection('games')
            }>
            Invite everyone
          </Button>
          <Button mode="outlined" onPress={() => {}}>
            Spin again
          </Button>
        </View>
      </Surface>
      {roulettePoolGames.map((game) => (
        <Card key={game.id} style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">{game.title}</Text>
            <Text style={styles.friendNote}>
              {game.genre} | {game.platform}
            </Text>
          </Card.Content>
        </Card>
      ))}
      {roulettePoolGames.length === 0 ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">No games in your roulette pool yet.</Text>
            <Text style={styles.friendNote}>Use the Game Library to add a few favorites and come back here.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </>
  );

  const renderLobbies = () => (
    <>
      <SectionTitle
        title="Lobbies"
        subtitle="Create and track real hosted lobbies from your Supabase data."
      />
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Create lobby</Text>
          <Text style={styles.friendNote}>
            Start with one hosted lobby, then we can layer invites and attendance on top.
          </Text>
          <View style={styles.quickPath}>
            {libraryGames.slice(0, 6).map((game) => (
              <Chip
                key={game.id}
                selected={selectedLobbyGameId === game.id}
                onPress={() => prepareLobbyDraft(game.id)}>
                {game.title}
              </Chip>
            ))}
          </View>
          <Text variant="titleSmall" style={styles.subsectionTitle}>
            Invite draft
          </Text>
          <Text style={styles.friendNote}>
            These picks stay local for now. We will persist real invitees once the friends graph is in Supabase.
          </Text>
          <View style={styles.quickPath}>
            {inviteReadyFriends.map((friend) => (
              <Chip
                key={friend.name}
                selected={selectedLobbyInviteNames.includes(friend.name)}
                onPress={() =>
                  setSelectedLobbyInviteNames((current) =>
                    current.includes(friend.name)
                      ? current.filter((name) => name !== friend.name)
                      : [...current, friend.name],
                  )
                }
                testID={`lobby-invite-chip-${friend.name.toLowerCase()}`}>
                {friend.name}
              </Chip>
            ))}
          </View>
          <TextInput
            mode="outlined"
            label="Lobby title"
            value={lobbyForm.title}
            onChangeText={(value) =>
              setLobbyForm((current) => ({
                ...current,
                title: value,
              }))
            }
            style={styles.input}
            testID="lobby-title-input"
          />
          <SegmentedButtons
            value={lobbyForm.timeMode}
            onValueChange={(value) =>
              setLobbyForm((current) => ({
                ...current,
                timeMode: value as 'now' | 'later',
              }))
            }
            style={styles.segmented}
            buttons={[
              { value: 'now', label: 'Now' },
              { value: 'later', label: 'Later' },
            ]}
          />
          {lobbyForm.timeMode === 'later' ? (
            <TextInput
              mode="outlined"
              label="Scheduled for"
              placeholder="2026-04-08 20:30"
              value={lobbyForm.scheduledFor}
              onChangeText={(value) =>
                setLobbyForm((current) => ({
                  ...current,
                  scheduledFor: value,
                }))
              }
              style={styles.input}
              testID="lobby-scheduled-for-input"
            />
          ) : null}
          <SegmentedButtons
            value={lobbyForm.visibility}
            onValueChange={(value) =>
              setLobbyForm((current) => ({
                ...current,
                visibility: value as 'private' | 'public',
              }))
            }
            style={styles.segmented}
            buttons={[
              { value: 'private', label: 'Private' },
              { value: 'public', label: 'Public' },
            ]}
          />
          <View style={styles.quickPath}>
            <Chip icon="controller">
              {selectedLobbyGame ? selectedLobbyGame.title : 'Pick a game'}
            </Chip>
            <Chip icon="account">
              Host: {profile?.display_name ?? profile?.username ?? 'You'}
            </Chip>
            {selectedLobbyInviteNames.length > 0 ? (
              <Chip icon="account-multiple">
                {selectedLobbyInviteNames.length} invite draft{selectedLobbyInviteNames.length === 1 ? '' : 's'}
              </Chip>
            ) : null}
          </View>
          {lobbiesError ? (
            <HelperText type="error" visible>
              {lobbiesError}
            </HelperText>
          ) : null}
          {lobbyMessage ? (
            <HelperText type="info" visible style={styles.successText}>
              {lobbyMessage}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={handleCreateLobby}
            loading={lobbyBusy}
            disabled={lobbyBusy || !selectedLobbyGame}
            style={styles.loginButton}
            testID="create-lobby-button">
            Create lobby
          </Button>
        </Card.Content>
      </Card>
      {lobbiesLoading ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">Loading lobbies</Text>
            <Text style={styles.friendNote}>Pulling your hosted and joined sessions from Supabase.</Text>
          </Card.Content>
        </Card>
      ) : null}
      {lobbies.map((lobby) => (
        <Card key={lobby.id} style={styles.panel}>
          <Card.Content>
            <Text variant="titleLarge">{lobby.title}</Text>
            <Text style={styles.supportingText}>
              {lobby.games?.title ?? 'Game unavailable'} | {lobby.is_private ? 'Private' : 'Public'}
            </Text>
            <Text style={styles.friendNote}>
              {lobby.scheduled_for
                ? new Date(lobby.scheduled_for).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Starts now'}
            </Text>
            {typeof lobby.invite_count === 'number' && lobby.invite_count > 0 ? (
              <Text style={styles.friendNote}>
                Invite draft prepared for {lobby.invite_count} friend{lobby.invite_count === 1 ? '' : 's'}.
              </Text>
            ) : null}
            <View style={styles.cardActions}>
              <Button mode="contained-tonal" onPress={() => setSection('schedule')}>
                Reschedule
              </Button>
              <Button mode="text" onPress={() => setSection('inbox')}>
                Send reminder
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
      {!lobbiesLoading && lobbies.length === 0 ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">No lobbies yet.</Text>
            <Text style={styles.friendNote}>Create your first hosted session from a game or roulette pick.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </>
  );

  const renderSchedule = () => (
    <>
      <SectionTitle
        title="Scheduling"
        subtitle="Save your weekly availability and keep upcoming lobby timing visible."
      />
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Weekly availability</Text>
          <Text style={styles.friendNote}>
            Select the slots when you usually want game invites. We persist this to Supabase now.
          </Text>
          <SegmentedButtons
            value={autoDeclineOutsideHours ? 'on' : 'off'}
            onValueChange={(value) => setAutoDeclineOutsideHours(value === 'on')}
            style={styles.segmented}
            buttons={[
              { value: 'off', label: 'Allow outside hours' },
              { value: 'on', label: 'Auto-decline outside hours' },
            ]}
          />
          <View style={styles.quickPath}>
            <Chip icon="calendar-clock" testID="availability-count-chip">
              {selectedAvailabilityCount} saved slot{selectedAvailabilityCount === 1 ? '' : 's'}
            </Chip>
            {availabilityLoading ? <Chip icon="loading">Loading</Chip> : null}
          </View>
          <View style={styles.scheduleLegend}>
            <Chip compact icon="check-circle" style={styles.availableLegendChip} textStyle={styles.availableLegendText}>
              Available
            </Chip>
            <Chip compact icon="close-circle" style={styles.unavailableLegendChip} textStyle={styles.unavailableLegendText}>
              Not available
            </Chip>
          </View>
          {availabilityGrid.map((row) => (
            <View key={row.day} style={styles.availabilityRow}>
              <Text style={styles.availabilityDay}>{row.day}</Text>
              <View style={styles.slotRow}>
                {row.slots.map((slot) => {
                  const isSelected = (availabilitySelection[row.day] ?? []).includes(slot);

                  return (
                    <Chip
                      key={slot}
                      compact
                      selected={isSelected}
                      icon={isSelected ? 'check-circle' : 'close-circle'}
                      style={isSelected ? styles.availableSlotChip : styles.unavailableSlotChip}
                      textStyle={isSelected ? styles.availableSlotText : styles.unavailableSlotText}
                      onPress={() => toggleAvailabilitySlot(row.day, slot)}
                      testID={`availability-slot-${row.day.toLowerCase()}-${slot.toLowerCase().replace(/\s+/g, '-')}`}>
                      {slot}
                    </Chip>
                  );
                })}
              </View>
            </View>
          ))}
          {availabilityError ? (
            <HelperText type="error" visible>
              {availabilityError}
            </HelperText>
          ) : null}
          {availabilityMessage ? (
            <HelperText type="info" visible style={styles.successText}>
              {availabilityMessage}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={handleSaveAvailability}
            loading={availabilityBusy}
            disabled={availabilityBusy}
            style={styles.loginButton}
            testID="save-availability-button">
            Save availability
          </Button>
        </Card.Content>
      </Card>
      {scheduleCards.map((lobby) => (
        <Card key={`${lobby.title}-countdown`} style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">{lobby.title}</Text>
            <Chip icon="timer-sand" style={styles.countdownChip}>
              Starts in 2h
            </Chip>
          </Card.Content>
        </Card>
      ))}
    </>
  );

  const renderInbox = () => (
    <>
      <SectionTitle
        title="Notifications"
        subtitle="Invites, reminders, and system states with placeholder messaging."
      />
      {notifications.map((item) => (
        <Card key={`${item.label}-${item.message}`} style={styles.panel}>
          <Card.Content>
            <View style={styles.notificationHeader}>
              <Chip compact>{item.label}</Chip>
              <Text style={styles.friendNote}>{item.age}</Text>
            </View>
            <Text variant="bodyLarge">{item.message}</Text>
          </Card.Content>
        </Card>
      ))}
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Lobby chat preview</Text>
          <Divider style={styles.divider} />
          <Text style={styles.listText}>NovaHex: Running ten minutes late.</Text>
          <Text style={styles.listText}>You: No problem, spinning a backup game now.</Text>
        </Card.Content>
      </Card>
    </>
  );

  const renderProfile = () => (
    <>
      <SectionTitle
        title="Profile & settings"
        subtitle="Connected accounts, favorites, privacy, and app preferences."
      />
      <Card style={styles.panel}>
        <Card.Content style={styles.profileHeader}>
          <Avatar.Text
            size={68}
            label={(profile?.display_name ?? profile?.username ?? 'MX').slice(0, 2).toUpperCase()}
            style={styles.avatarLarge}
          />
          <View style={styles.friendMeta}>
            <Text variant="headlineSmall">
              {profile?.display_name ?? profile?.username ?? 'Player'}
            </Text>
            <Text style={styles.friendNote}>
              {profile?.username ? `@${profile.username}` : 'Set your username to finish onboarding'}
            </Text>
          </View>
        </Card.Content>
      </Card>
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Favorite games</Text>
          <View style={styles.quickPath}>
            {libraryGames
              .filter((game) => favoriteGameIds.includes(game.id))
              .slice(0, 6)
              .map((game) => <Chip key={game.id}>{game.title}</Chip>)}
            {favoriteGameIds.length === 0 ? (
              <Text style={styles.friendNote}>No favorites saved yet.</Text>
            ) : null}
          </View>
        </Card.Content>
      </Card>
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Preferences</Text>
          <Text style={styles.listText}>Dark dashboard theme enabled</Text>
          <Text style={styles.listText}>Notifications ready for mobile and Discord</Text>
          <Text style={styles.listText}>Anonymous decline and do-not-invite lists pending backend</Text>
        </Card.Content>
      </Card>
    </>
  );

  const content = {
    dashboard: renderDashboard(),
    friends: renderFriends(),
    games: renderGames(),
    roulette: renderRoulette(),
    lobbies: renderLobbies(),
    schedule: renderSchedule(),
    inbox: renderInbox(),
    profile: renderProfile(),
  }[section];

  const handleAuth = async () => {
    if (!email || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setAuthMessage('Signed in successfully.');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setAuthMessage('Account created and signed in.');
        } else {
          setAuthMessage('Account created. Check Supabase email confirmation settings if sign-in does not continue automatically.');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      setAuthError(message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    } else {
      setSession(null);
      setProfile(null);
      setEmail('');
      setPassword('');
      setAuthError('');
      setAuthMessage('');
      setSection('dashboard');
    }

    setAuthBusy(false);
  };

  const handleProfileSave = async () => {
    if (!session?.user || !profile) {
      return;
    }

    const username = profileForm.username.trim();
    const displayName = profileForm.displayName.trim();
    const avatarUrl = profileForm.avatarUrl.trim();

    if (!username || !displayName) {
      setProfileError('Username and display name are required.');
      setProfileMessage('');
      return;
    }

    setProfileBusy(true);
    setProfileError('');
    setProfileMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username,
        display_name: displayName,
        avatar_url: avatarUrl || null,
        onboarding_complete: true,
      })
      .eq('id', session.user.id)
      .select('id, username, avatar_url, display_name, onboarding_complete')
      .single();

    if (error) {
      if (error.code === '23505') {
        setProfileError('That username is already taken.');
      } else {
        setProfileError(error.message);
      }
    } else {
      setProfile(data);
      setProfileMessage('Profile saved.');
    }

    setProfileBusy(false);
  };

  const toggleFavorite = async (gameId: string) => {
    if (!session?.user) {
      return;
    }

    setGameActionBusyId(`favorite:${gameId}`);
    setGameActionMessage('');

    const isFavorite = favoriteGameIds.includes(gameId);

    if (isFavorite) {
      const { error } = await supabase
        .from('favorite_games')
        .delete()
        .eq('profile_id', session.user.id)
        .eq('game_id', gameId);

      if (!error) {
        setFavoriteGameIds((current) => current.filter((id) => id !== gameId));
        setGameActionMessage('Favorite removed.');
      }
    } else {
      const { error } = await supabase.from('favorite_games').insert({
        profile_id: session.user.id,
        game_id: gameId,
      });

      if (!error) {
        setFavoriteGameIds((current) => [...current, gameId]);
        setGameActionMessage('Game added to favorites.');
      }
    }

    setGameActionBusyId(null);
  };

  const toggleRoulettePool = async (gameId: string) => {
    if (!session?.user) {
      return;
    }

    setGameActionBusyId(`pool:${gameId}`);
    setGameActionMessage('');

    const existing = rouletteEntries.find((entry) => entry.game_id === gameId);

    if (existing) {
      const { error } = await supabase
        .from('roulette_pool_entries')
        .delete()
        .eq('profile_id', session.user.id)
        .eq('game_id', gameId);

      if (!error) {
        setRouletteEntries((current) => current.filter((entry) => entry.game_id !== gameId));
        setGameActionMessage('Game removed from roulette pool.');
      }
    } else {
      const game = libraryGames.find((item) => item.id === gameId);
      const { error } = await supabase.from('roulette_pool_entries').insert({
        profile_id: session.user.id,
        game_id: gameId,
      });

      if (!error && game) {
        setRouletteEntries((current) => [
          ...current,
          {
            game_id: gameId,
            games: {
              id: game.id,
              title: game.title,
              genre: game.genre,
              platform: game.platform,
            },
          },
        ]);
        setGameActionMessage('Game added to roulette pool.');
      }
    }

    setGameActionBusyId(null);
  };

  if (authLoading) {
    return (
      <View style={styles.loginScreen}>
        <Surface style={styles.loginCard} elevation={3}>
          <ActivityIndicator animating size="large" />
          <Text variant="titleMedium" style={styles.loginTitle}>
            Checking session
          </Text>
          <Text style={styles.pageSubtitle}>Loading your Supabase auth state.</Text>
        </Surface>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loginScreen}>
        <Surface style={styles.loginCard} elevation={3}>
          <Text style={styles.eyebrow}>Friend Management App</Text>
          <Text variant="headlineMedium" style={styles.loginTitle}>
            {authMode === 'signin' ? 'Sign in' : 'Create account'}
          </Text>
          <Text style={styles.pageSubtitle}>
            Supabase email/password auth for the first real app step. Kept minimal for testing.
          </Text>

          <SegmentedButtons
            value={authMode}
            onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')}
            testID="auth-mode-toggle"
            buttons={[
              { value: 'signin', label: 'Sign in' },
              { value: 'signup', label: 'Sign up' },
            ]}
          />
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
            testID="auth-email-input"
          />
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
            testID="auth-password-input"
          />
          <HelperText type="info" style={styles.helperText}>
            Use an existing Supabase user to sign in, or create one here for testing.
          </HelperText>
          {authError ? (
            <HelperText type="error" visible>
              {authError}
            </HelperText>
          ) : null}
          {authMessage ? (
            <HelperText type="info" visible style={styles.successText}>
              {authMessage}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleAuth}
            style={styles.loginButton}
            loading={authBusy}
            disabled={authBusy}
            testID="auth-submit-button">
            {authMode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Friend Management App</Text>
        <Text variant="headlineLarge" style={styles.pageTitle}>
          Social gaming handoff prototype
        </Text>
        <Text style={styles.pageSubtitle}>
          Mobile-first placeholder experience for onboarding, invites, roulette, lobbies, schedule,
          and profile work.
        </Text>

        <View style={styles.headerRow}>
          <Chip icon="shield-account" testID="profile-chip">
            {profileLoading
              ? 'Loading profile...'
              : profile?.display_name ?? profile?.username ?? session.user.email ?? 'Signed in user'}
          </Chip>
          <Button mode="text" onPress={handleLogout} disabled={authBusy} testID="logout-button">
            Log out
          </Button>
        </View>

        {profile ? (
          <Card style={styles.panel} testID="profile-summary-card">
            <Card.Content style={styles.profileSummary}>
              <Text variant="titleMedium">
                Welcome back, {profile.display_name ?? profile.username ?? 'Player'}
              </Text>
              <Text style={styles.friendNote}>
                Username: {profile.username ?? 'Not set yet'}
              </Text>
              <Text style={styles.friendNote}>
                Onboarding: {profile.onboarding_complete ? 'Complete' : 'In progress'}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {profile && !profile.onboarding_complete ? (
          <Card style={styles.panel}>
            <Card.Content style={styles.profileSummary}>
              <SectionTitle
                title="Complete your profile"
                subtitle="Set stable app profile data before friends, lobbies, and scheduling start depending on it."
              />
              <TextInput
                mode="outlined"
                label="Username"
                value={profileForm.username}
                onChangeText={(value) =>
                  setProfileForm((current) => ({
                    ...current,
                    username: value.replace(/\s+/g, '').toLowerCase(),
                  }))
                }
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                testID="profile-username-input"
              />
              <TextInput
                mode="outlined"
                label="Display name"
                value={profileForm.displayName}
                onChangeText={(value) =>
                  setProfileForm((current) => ({
                    ...current,
                    displayName: value,
                  }))
                }
                autoCorrect={false}
                style={styles.input}
                testID="profile-display-name-input"
              />
              <TextInput
                mode="outlined"
                label="Avatar URL (optional)"
                value={profileForm.avatarUrl}
                onChangeText={(value) =>
                  setProfileForm((current) => ({
                    ...current,
                    avatarUrl: value,
                  }))
                }
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                testID="profile-avatar-url-input"
              />
              {profileError ? (
                <HelperText type="error" visible>
                  {profileError}
                </HelperText>
              ) : null}
              {profileMessage ? (
                <HelperText type="info" visible style={styles.successText}>
                  {profileMessage}
                </HelperText>
              ) : null}
              <Button
                mode="contained"
                onPress={handleProfileSave}
                loading={profileBusy}
                disabled={profileBusy}
                testID="profile-save-button">
                Save profile
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        <SegmentedButtons
          value={section}
          onValueChange={(value) => setSection(value as SectionKey)}
          density="small"
          style={styles.segmented}
          buttons={sections}
        />

        {content}
      </ScrollView>

      <FAB icon="account-plus" label="Add friend" style={styles.fab} onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  loginScreen: {
    flex: 1,
    backgroundColor: '#0B1020',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  loginCard: {
    backgroundColor: '#151A2D',
    borderColor: '#2C3560',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 10,
  },
  loginTitle: {
    color: '#F5F7FF',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#171A2A',
  },
  helperText: {
    color: '#95A0C8',
  },
  successText: {
    color: '#7DFFB3',
  },
  loginButton: {
    marginTop: 6,
  },
  screen: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 64,
    paddingBottom: 120,
    gap: 16,
  },
  eyebrow: {
    color: '#7DFFB3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  pageTitle: {
    color: '#F5F7FF',
    fontWeight: '800',
  },
  pageSubtitle: {
    color: '#A7B0D6',
    fontSize: 15,
    lineHeight: 22,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  segmented: {
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: '#161B31',
    borderColor: '#2C3560',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  liveChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#252B49',
  },
  heroTitle: {
    color: '#F7F8FF',
    fontWeight: '800',
  },
  heroCopy: {
    color: '#B9C0E0',
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: '#14192D',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  statValue: {
    color: '#F4F6FF',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#95A0C8',
    marginTop: 4,
  },
  panel: {
    backgroundColor: '#151A2D',
    borderRadius: 24,
  },
  sectionHeader: {
    gap: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#F5F7FF',
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#95A0C8',
    lineHeight: 20,
  },
  listText: {
    color: '#D8DDF4',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  progress: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#262C44',
  },
  quickPath: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  friendCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  friendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  friendRequestCard: {
    gap: 8,
    marginTop: 14,
    paddingTop: 4,
  },
  avatar: {
    backgroundColor: '#7C5CFF',
  },
  avatarLarge: {
    backgroundColor: '#33D1FF',
  },
  friendMeta: {
    flex: 1,
    gap: 2,
  },
  friendStatus: {
    color: '#7DFFB3',
    fontSize: 13,
    fontWeight: '700',
  },
  friendNote: {
    color: '#9AA5CA',
    fontSize: 13,
    lineHeight: 18,
  },
  supportingText: {
    color: '#C7CDEA',
    marginTop: 4,
    marginBottom: 2,
  },
  subsectionTitle: {
    color: '#F5F7FF',
    fontWeight: '700',
    marginTop: 10,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  rouletteHero: {
    alignItems: 'center',
    backgroundColor: '#1A2040',
    borderColor: '#32417E',
    borderRadius: 160,
    borderWidth: 1,
    minHeight: 240,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  rouletteValue: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  availabilityDay: {
    color: '#F5F7FF',
    fontWeight: '700',
    width: 36,
  },
  scheduleLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  availableLegendChip: {
    backgroundColor: '#103326',
    borderColor: '#1F8F5F',
    borderWidth: 1,
  },
  availableLegendText: {
    color: '#7DFFB3',
  },
  unavailableLegendChip: {
    backgroundColor: '#35181E',
    borderColor: '#B84A5A',
    borderWidth: 1,
  },
  unavailableLegendText: {
    color: '#FF8A98',
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  availableSlotChip: {
    backgroundColor: '#103326',
    borderColor: '#1F8F5F',
    borderWidth: 1,
  },
  availableSlotText: {
    color: '#D8FFEA',
    fontWeight: '700',
  },
  unavailableSlotChip: {
    backgroundColor: '#35181E',
    borderColor: '#B84A5A',
    borderWidth: 1,
  },
  unavailableSlotText: {
    color: '#FFD8DE',
    fontWeight: '700',
  },
  countdownChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  notificationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  divider: {
    backgroundColor: '#2A3150',
    marginVertical: 12,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileSummary: {
    gap: 6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    backgroundColor: '#7C5CFF',
  },
});
