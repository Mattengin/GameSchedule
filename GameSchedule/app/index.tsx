import * as React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
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
import {
  DatePickerInput,
  TimePickerModal,
  en,
  registerTranslation,
} from 'react-native-paper-dates';
import { supabase } from '../services/supabaseClient';

registerTranslation('en', en);

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
  primary_community_id: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  discord_connected_at: string | null;
};

type CommunityRecord = {
  id: string;
  name: string;
  invite_code: string;
  discord_guild_id: string | null;
  created_by_profile_id: string;
  created_at: string;
};

type CommunityMemberRecord = {
  community_id: string;
  profile_id: string;
  role: 'owner' | 'member';
  created_at: string;
};

type SuggestedFriendRecord = Profile & {
  community_role: 'owner' | 'member';
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
  scheduled_until: string | null;
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

type AvailabilityWindow = {
  id?: string;
  profile_id: string;
  day_key: string;
  starts_at: string;
  ends_at: string;
  created_at?: string;
};

type RelatedGameSummary = Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform'>;
type RelatedLobbyGameSummary = Pick<
  GameRecord,
  'id' | 'title' | 'genre' | 'platform' | 'player_count'
>;

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

const notifications = [
  { label: 'Invite', message: 'NovaHex invited you to a Helix Arena lobby.', age: '2m ago' },
  { label: 'Reminder', message: 'Deep Raid Warmup starts in 1 hour.', age: '58m ago' },
  { label: 'System', message: 'Discord sync is ready when you decide to connect it.', age: 'Today' },
];

const availabilityDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

const allowSignup = process.env.EXPO_PUBLIC_ALLOW_SIGNUP !== 'false';
const demoLabel = process.env.EXPO_PUBLIC_DEMO_LABEL?.trim() ?? '';
const discordClientId = process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID?.trim() ?? '';
const discordStateStorageKey = 'gameschedule-discord-oauth-state';

const profileSelectFields =
  'id, username, avatar_url, display_name, onboarding_complete, primary_community_id, discord_user_id, discord_username, discord_avatar_url, discord_connected_at';

const getWebBasePath = () => {
  if (Platform.OS !== 'web') {
    return '';
  }

  const pathname = globalThis.window?.location.pathname ?? '';
  return pathname.startsWith('/GameSchedule') ? '/GameSchedule' : '';
};

const getWebRedirectUrl = () => {
  if (Platform.OS !== 'web') {
    return undefined;
  }

  const currentLocation = globalThis.window?.location;
  if (!currentLocation) {
    return undefined;
  }

  return `${currentLocation.origin}${getWebBasePath()}/`;
};

const clearOAuthHashFromUrl = () => {
  if (Platform.OS !== 'web') {
    return;
  }

  const currentLocation = globalThis.window?.location;
  const currentHistory = globalThis.window?.history;
  if (!currentLocation?.hash || !currentHistory?.replaceState) {
    return;
  }

  const hasOAuthToken = /(?:^#|&)(access_token|refresh_token|provider_token|error|error_description)=/.test(
    currentLocation.hash,
  );

  if (!hasOAuthToken) {
    return;
  }

  currentHistory.replaceState(currentHistory.state, '', `${currentLocation.pathname}${currentLocation.search}`);
};

const getDiscordIdentityFromSession = (session: Session | null) => {
  const user = session?.user;
  if (!user) {
    return null;
  }

  const discordIdentity = user.identities?.find((identity) => identity.provider === 'discord');
  const identityData = discordIdentity?.identity_data as
    | {
        avatar_url?: string;
        full_name?: string;
        name?: string;
        preferred_username?: string;
        provider_id?: string;
        sub?: string;
        user_name?: string;
      }
    | undefined;

  const metadata = user.user_metadata as
    | {
        avatar_url?: string;
        full_name?: string;
        name?: string;
        preferred_username?: string;
        provider_id?: string;
        sub?: string;
        user_name?: string;
      }
    | undefined;

  const discordUserId =
    identityData?.provider_id ?? identityData?.sub ?? metadata?.provider_id ?? metadata?.sub ?? null;

  if (!discordUserId) {
    return null;
  }

  const discordUsername =
    identityData?.full_name ??
    identityData?.name ??
    identityData?.preferred_username ??
    identityData?.user_name ??
    metadata?.full_name ??
    metadata?.name ??
    metadata?.preferred_username ??
    metadata?.user_name ??
    'Discord user';

  return {
    discord_user_id: discordUserId,
    discord_username: discordUsername,
    discord_avatar_url: identityData?.avatar_url ?? metadata?.avatar_url ?? null,
    discord_connected_at: new Date().toISOString(),
  };
};

const unwrapRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const createDefaultLobbyStartDate = () => {
  const date = new Date();
  date.setHours(20, 0, 0, 0);
  return date;
};

const createDefaultLobbyEndDate = () => {
  const date = createDefaultLobbyStartDate();
  date.setHours(date.getHours() + 1);
  return date;
};

const getDefaultEndDate = (startDate: Date) => {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);
  return endDate;
};

const resolveAvatarUrl = (
  record: Pick<Profile, 'avatar_url' | 'discord_avatar_url'> | null | undefined,
) => {
  const directAvatarUrl = record?.avatar_url?.trim();
  if (directAvatarUrl) {
    return directAvatarUrl;
  }

  const discordAvatarUrl = record?.discord_avatar_url?.trim();
  return discordAvatarUrl || '';
};

const formatCalendarDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const formatEventTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatEventRange = (startDate: Date, endDate: Date) => {
  const dateLabel = formatCalendarDate(startDate);
  const startLabel = formatEventTime(startDate);
  const endLabel = formatEventTime(endDate);

  return `${dateLabel}, ${startLabel} - ${endLabel}`;
};

const setDatePart = (currentDate: Date, nextDate: Date) => {
  const updatedDate = new Date(currentDate);
  updatedDate.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
  return updatedDate;
};

const setTimePart = (currentDate: Date, nextHour: number, nextMinute: number) => {
  const updatedDate = new Date(currentDate);
  updatedDate.setHours(nextHour, nextMinute, 0, 0);
  return updatedDate;
};

const createTimeDate = (hours: number, minutes: number) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const parseDbTimeToDate = (timeValue: string, fallbackHours: number) => {
  const [hoursValue, minutesValue] = timeValue.split(':');
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  return createTimeDate(
    Number.isNaN(hours) ? fallbackHours : hours,
    Number.isNaN(minutes) ? 0 : minutes,
  );
};

const formatDbTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;

const formatAvailabilityRange = (startTime: string, endTime: string) =>
  `${formatEventTime(parseDbTimeToDate(startTime, 20))} - ${formatEventTime(parseDbTimeToDate(endTime, 21))}`;

const getLobbyEndDate = (lobby: Pick<LobbyRecord, 'scheduled_for' | 'scheduled_until'>) => {
  if (lobby.scheduled_until) {
    const explicitEnd = new Date(lobby.scheduled_until);
    if (!Number.isNaN(explicitEnd.getTime())) {
      return explicitEnd;
    }
  }

  if (lobby.scheduled_for) {
    const startDate = new Date(lobby.scheduled_for);
    if (!Number.isNaN(startDate.getTime())) {
      return getDefaultEndDate(startDate);
    }
  }

  return getDefaultEndDate(createDefaultLobbyStartDate());
};

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

function EventTimePicker({
  timeMode,
  startAt,
  endAt,
  onSetNow,
  onSetLater,
  onStartAtChange,
  onEndAtChange,
}: {
  timeMode: 'now' | 'later';
  startAt: Date;
  endAt: Date;
  onSetNow: () => void;
  onSetLater: () => void;
  onStartAtChange: (date: Date) => void;
  onEndAtChange: (date: Date) => void;
}) {
  const [timePickerTarget, setTimePickerTarget] = React.useState<'start' | 'end' | null>(null);
  const activeTimeDate = timePickerTarget === 'end' ? endAt : startAt;

  return (
    <Surface style={styles.eventTimePanel} elevation={1}>
      <View style={styles.eventTimeHeader}>
        <View>
          <Text variant="titleSmall" style={styles.eventTimeTitle}>
            Event time
          </Text>
          <Text style={styles.friendNote}>Pick a controlled calendar time. Events default to one hour.</Text>
        </View>
        <Chip icon="clock-outline" style={styles.statusChip}>
          {timeMode === 'now' ? 'Starts now' : formatEventRange(startAt, endAt)}
        </Chip>
      </View>
      <View style={styles.quickPath}>
        <Chip selected={timeMode === 'now'} onPress={onSetNow} testID="lobby-time-now-chip">
          Start now
        </Chip>
        <Chip selected={timeMode === 'later'} onPress={onSetLater} testID="lobby-time-later-chip">
          Schedule it
        </Chip>
      </View>
      {timeMode === 'later' ? (
        <View style={styles.pickerFieldGroup}>
          <DatePickerInput
            locale="en"
            label="Event date"
            value={startAt}
            onChange={(nextDate) => {
              if (nextDate) {
                onStartAtChange(setDatePart(startAt, nextDate));
                onEndAtChange(setDatePart(endAt, nextDate));
              }
            }}
            inputMode="start"
            mode="outlined"
            withModal
            style={styles.input}
            testID="lobby-date-picker-input"
          />
          <Button
            mode="outlined"
            icon="clock-outline"
            onPress={() => setTimePickerTarget('start')}
            testID="lobby-start-time-picker-button">
            Start: {formatEventTime(startAt)}
          </Button>
          <Button
            mode="outlined"
            icon="clock-end"
            onPress={() => setTimePickerTarget('end')}
            testID="lobby-end-time-picker-button">
            End: {formatEventTime(endAt)}
          </Button>
          <TimePickerModal
            visible={Boolean(timePickerTarget)}
            onDismiss={() => setTimePickerTarget(null)}
            onConfirm={({ hours, minutes }) => {
              if (timePickerTarget === 'end') {
                onEndAtChange(setTimePart(endAt, hours, minutes));
              } else {
                onStartAtChange(setTimePart(startAt, hours, minutes));
              }

              setTimePickerTarget(null);
            }}
            hours={activeTimeDate.getHours()}
            minutes={activeTimeDate.getMinutes()}
            label={timePickerTarget === 'end' ? 'Pick end time' : 'Pick start time'}
            cancelLabel="Cancel"
            confirmLabel="OK"
            locale="en"
            use24HourClock={false}
          />
          <View style={styles.pickerSummary}>
            <Text variant="titleSmall" style={styles.eventTimeTitle}>
              Selected event window
            </Text>
            <Text style={styles.friendNote}>{formatEventRange(startAt, endAt)}</Text>
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

function TimeRangePicker({
  startAt,
  endAt,
  onStartAtChange,
  onEndAtChange,
  startTestID,
  endTestID,
}: {
  startAt: Date;
  endAt: Date;
  onStartAtChange: (date: Date) => void;
  onEndAtChange: (date: Date) => void;
  startTestID: string;
  endTestID: string;
}) {
  const [timePickerTarget, setTimePickerTarget] = React.useState<'start' | 'end' | null>(null);
  const activeTimeDate = timePickerTarget === 'end' ? endAt : startAt;

  return (
    <>
      <View style={styles.timeRangeButtons}>
        <Button
          mode="outlined"
          icon="clock-outline"
          onPress={() => setTimePickerTarget('start')}
          testID={startTestID}>
          Start: {formatEventTime(startAt)}
        </Button>
        <Button
          mode="outlined"
          icon="clock-end"
          onPress={() => setTimePickerTarget('end')}
          testID={endTestID}>
          End: {formatEventTime(endAt)}
        </Button>
      </View>
      <TimePickerModal
        visible={Boolean(timePickerTarget)}
        onDismiss={() => setTimePickerTarget(null)}
        onConfirm={({ hours, minutes }) => {
          if (timePickerTarget === 'end') {
            onEndAtChange(setTimePart(endAt, hours, minutes));
          } else {
            onStartAtChange(setTimePart(startAt, hours, minutes));
          }

          setTimePickerTarget(null);
        }}
        hours={activeTimeDate.getHours()}
        minutes={activeTimeDate.getMinutes()}
        label={timePickerTarget === 'end' ? 'Pick end time' : 'Pick start time'}
        cancelLabel="Cancel"
        confirmLabel="OK"
        locale="en"
        use24HourClock={false}
      />
    </>
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
  const [discordBusy, setDiscordBusy] = React.useState(false);
  const [discordMessage, setDiscordMessage] = React.useState('');
  const [accountEmail, setAccountEmail] = React.useState('');
  const [accountBusy, setAccountBusy] = React.useState(false);
  const [accountError, setAccountError] = React.useState('');
  const [accountMessage, setAccountMessage] = React.useState('');
  const [passwordForm, setPasswordForm] = React.useState({
    nextPassword: '',
    confirmPassword: '',
  });
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
  const [currentCommunity, setCurrentCommunity] = React.useState<CommunityRecord | null>(null);
  const [communityMembers, setCommunityMembers] = React.useState<CommunityMemberRecord[]>([]);
  const [communityProfiles, setCommunityProfiles] = React.useState<Profile[]>([]);
  const [communityLoading, setCommunityLoading] = React.useState(false);
  const [communityBusy, setCommunityBusy] = React.useState(false);
  const [communityError, setCommunityError] = React.useState('');
  const [communityMessage, setCommunityMessage] = React.useState('');
  const [communityInviteCode, setCommunityInviteCode] = React.useState('');
  const [communityName, setCommunityName] = React.useState('');
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
  const [availabilityWindows, setAvailabilityWindows] = React.useState<AvailabilityWindow[]>([]);
  const [autoDeclineOutsideHours, setAutoDeclineOutsideHours] = React.useState(false);
  const [availabilityDraft, setAvailabilityDraft] = React.useState({
    dayKey: 'Mon',
    startsAt: createTimeDate(20, 0).toISOString(),
    endsAt: createTimeDate(22, 0).toISOString(),
  });
  const [editingLobbyId, setEditingLobbyId] = React.useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = React.useState({
    startAt: createDefaultLobbyStartDate().toISOString(),
    endAt: createDefaultLobbyEndDate().toISOString(),
  });
  const [lobbyForm, setLobbyForm] = React.useState({
    title: '',
    timeMode: 'later' as 'now' | 'later',
    startAt: createDefaultLobbyStartDate().toISOString(),
    endAt: createDefaultLobbyEndDate().toISOString(),
    scheduledFor: '',
    visibility: 'private' as 'private' | 'public',
  });
  const [section, setSection] = React.useState<SectionKey>('dashboard');
  const [friendFilter, setFriendFilter] = React.useState<'all' | 'favorites' | 'pending'>('all');

  React.useEffect(() => {
    if (!allowSignup && authMode === 'signup') {
      setAuthMode('signin');
    }
  }, [authMode]);

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
        clearOAuthHashFromUrl();
      }

      setAuthLoading(false);
    };

    bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      clearOAuthHashFromUrl();
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
      const discordIdentity = getDiscordIdentityFromSession(session);
      const fallbackName =
        discordIdentity?.discord_username ??
        user.user_metadata?.username ??
        user.user_metadata?.display_name ??
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'Player One';

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select(profileSelectFields)
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        setAuthError(fetchError.message);
        setProfileLoading(false);
        return;
      }

      if (existingProfile) {
        const hasDiscordAvatar = Boolean(discordIdentity?.discord_avatar_url);
        const hasDiscordUsername = Boolean(discordIdentity?.discord_username);
        const needsDiscordBackfill =
          Boolean(discordIdentity) &&
          (!existingProfile.discord_user_id ||
            (!existingProfile.discord_avatar_url && hasDiscordAvatar) ||
            (!existingProfile.avatar_url && hasDiscordAvatar) ||
            (!existingProfile.display_name && hasDiscordUsername));

        if (needsDiscordBackfill && discordIdentity) {
          const updatePayload: Partial<Profile> = {};

          if (!existingProfile.discord_user_id) {
            updatePayload.discord_user_id = discordIdentity.discord_user_id;
          }
          if (!existingProfile.discord_username && hasDiscordUsername) {
            updatePayload.discord_username = discordIdentity.discord_username;
          }
          if (!existingProfile.discord_avatar_url && hasDiscordAvatar) {
            updatePayload.discord_avatar_url = discordIdentity.discord_avatar_url;
          }
          if (!existingProfile.discord_connected_at) {
            updatePayload.discord_connected_at = discordIdentity.discord_connected_at;
          }
          if (!existingProfile.avatar_url && hasDiscordAvatar) {
            updatePayload.avatar_url = discordIdentity.discord_avatar_url;
          }
          if (!existingProfile.display_name && hasDiscordUsername) {
            updatePayload.display_name = discordIdentity.discord_username;
          }

          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id)
            .select(profileSelectFields)
            .single();

          if (updateError) {
            setAuthError(updateError.message);
            setProfile(existingProfile);
          } else {
            setProfile(updatedProfile);
          }
        } else {
          setProfile(existingProfile);
        }

        setProfileLoading(false);
        return;
      }

      const newProfile = {
        id: user.id,
        username: fallbackName,
        display_name: fallbackName,
        avatar_url: discordIdentity?.discord_avatar_url ?? null,
        onboarding_complete: Boolean(discordIdentity),
        primary_community_id: null,
        discord_user_id: discordIdentity?.discord_user_id ?? null,
        discord_username: discordIdentity?.discord_username ?? null,
        discord_avatar_url: discordIdentity?.discord_avatar_url ?? null,
        discord_connected_at: discordIdentity?.discord_connected_at ?? null,
      };

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select(profileSelectFields)
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
    setAccountEmail(session?.user.email ?? '');
  }, [session]);

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
        .select(profileSelectFields)
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
    if (!session?.user || !profile?.primary_community_id) {
      setCurrentCommunity(null);
      setCommunityMembers([]);
      setCommunityProfiles([]);
      setCommunityLoading(false);
      return;
    }

    const loadCommunityData = async () => {
      setCommunityLoading(true);
      setCommunityError('');

      const [{ data: communityData, error: communityErrorValue }, { data: membersData, error: membersError }] =
        await Promise.all([
          supabase
            .from('communities')
            .select('id, name, invite_code, discord_guild_id, created_by_profile_id, created_at')
            .eq('id', profile.primary_community_id)
            .maybeSingle(),
          supabase
            .from('community_members')
            .select('community_id, profile_id, role, created_at')
            .eq('community_id', profile.primary_community_id),
        ]);

      if (communityErrorValue || membersError) {
        setCommunityError(
          communityErrorValue?.message ?? membersError?.message ?? 'Unable to load your community.',
        );
        setCommunityLoading(false);
        return;
      }

      const nextCommunity = (communityData as CommunityRecord | null) ?? null;
      const nextMembers = (membersData as CommunityMemberRecord[] | null) ?? [];
      const memberProfileIds = nextMembers
        .map((member) => member.profile_id)
        .filter((memberId) => memberId && memberId !== session.user.id);

      setCurrentCommunity(nextCommunity);
      setCommunityMembers(nextMembers);

      if (memberProfileIds.length === 0) {
        setCommunityProfiles([]);
        setCommunityLoading(false);
        return;
      }

      const { data: communityProfilesData, error: communityProfilesError } = await supabase
        .from('profiles')
        .select(profileSelectFields)
        .in('id', memberProfileIds);

      if (communityProfilesError) {
        setCommunityError(communityProfilesError.message);
      } else {
        setCommunityProfiles((communityProfilesData as Profile[] | null) ?? []);
      }

      setCommunityLoading(false);
    };

    loadCommunityData();
  }, [profile?.primary_community_id, session?.user]);

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
        .select(profileSelectFields)
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
          'id, title, scheduled_for, scheduled_until, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
        )
        .order('created_at', { ascending: false });

      if (error) {
        setLobbiesError(error.message);
      } else {
        setLobbies(
          ((data ?? []) as (
            Omit<LobbyRecord, 'games'> & {
              games: RelatedLobbyGameSummary[] | RelatedLobbyGameSummary | null;
            }
          )[]).map((lobby) => ({
            ...lobby,
            games: unwrapRelation(lobby.games),
          })),
        );
      }

      setLobbiesLoading(false);
    };

    loadLobbies();
  }, [session]);

  React.useEffect(() => {
    if (!session?.user) {
      setAvailabilityWindows([]);
      setAutoDeclineOutsideHours(false);
      setAvailabilityLoading(false);
      return;
    }

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError('');

      const [{ data: settings, error: settingsError }, { data: windows, error: windowsError }] =
        await Promise.all([
          supabase
            .from('availability_settings')
            .select('profile_id, auto_decline_outside_hours')
            .eq('profile_id', session.user.id)
            .maybeSingle(),
          supabase
            .from('availability_windows')
            .select('id, profile_id, day_key, starts_at, ends_at, created_at')
            .eq('profile_id', session.user.id)
            .order('day_key', { ascending: true })
            .order('starts_at', { ascending: true }),
        ]);

      if (settingsError || windowsError) {
        setAvailabilityError(settingsError?.message ?? windowsError?.message ?? 'Unable to load availability.');
        setAvailabilityLoading(false);
        return;
      }

      setAvailabilityWindows((windows as AvailabilityWindow[] | null) ?? []);
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

  React.useEffect(() => {
    if (session?.user && profile && !profile.primary_community_id && section === 'dashboard') {
      setSection('friends');
    }
  }, [profile, section, session]);

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

  const suggestedFriends = React.useMemo(() => {
    const pendingIds = new Set(
      friendRequests
        .filter((request) => request.status === 'pending')
        .map((request) =>
          request.requester_profile_id === session?.user?.id
            ? request.addressee_profile_id
            : request.requester_profile_id,
        ),
    );
    const existingFriendIds = new Set(friendships.map((friendship) => friendship.friend_profile_id));
    const memberRoleByProfileId = communityMembers.reduce<Record<string, CommunityMemberRecord['role']>>(
      (accumulator, member) => {
        accumulator[member.profile_id] = member.role;
        return accumulator;
      },
      {},
    );

    return communityProfiles
      .filter(
        (candidate) =>
          Boolean(candidate.discord_user_id) &&
          candidate.id !== session?.user?.id &&
          !existingFriendIds.has(candidate.id) &&
          !pendingIds.has(candidate.id),
      )
      .map(
        (candidate): SuggestedFriendRecord => ({
          ...candidate,
          community_role: memberRoleByProfileId[candidate.id] ?? 'member',
        }),
      )
      .sort((left, right) => {
        const leftName = (left.display_name ?? left.username ?? '').toLowerCase();
        const rightName = (right.display_name ?? right.username ?? '').toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }, [communityMembers, communityProfiles, friendRequests, friendships, session]);

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

  const availabilityDraftStartAt = React.useMemo(() => {
    const parsedDate = new Date(availabilityDraft.startsAt);
    return Number.isNaN(parsedDate.getTime()) ? createTimeDate(20, 0) : parsedDate;
  }, [availabilityDraft.startsAt]);
  const availabilityDraftEndAt = React.useMemo(() => {
    const parsedDate = new Date(availabilityDraft.endsAt);
    return Number.isNaN(parsedDate.getTime()) ? createTimeDate(22, 0) : parsedDate;
  }, [availabilityDraft.endsAt]);
  const selectedLobbyStartAt = React.useMemo(() => {
    const parsedDate = new Date(lobbyForm.startAt);
    return Number.isNaN(parsedDate.getTime()) ? createDefaultLobbyStartDate() : parsedDate;
  }, [lobbyForm.startAt]);
  const selectedLobbyEndAt = React.useMemo(() => {
    const parsedDate = new Date(lobbyForm.endAt);
    return Number.isNaN(parsedDate.getTime()) ? getDefaultEndDate(selectedLobbyStartAt) : parsedDate;
  }, [lobbyForm.endAt, selectedLobbyStartAt]);
  const rescheduleStartAt = React.useMemo(() => {
    const parsedDate = new Date(rescheduleDraft.startAt);
    return Number.isNaN(parsedDate.getTime()) ? createDefaultLobbyStartDate() : parsedDate;
  }, [rescheduleDraft.startAt]);
  const rescheduleEndAt = React.useMemo(() => {
    const parsedDate = new Date(rescheduleDraft.endAt);
    return Number.isNaN(parsedDate.getTime()) ? getDefaultEndDate(rescheduleStartAt) : parsedDate;
  }, [rescheduleDraft.endAt, rescheduleStartAt]);

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
    let scheduledUntil: string | null = null;

    if (lobbyForm.timeMode === 'later') {
      const parsedDate = new Date(lobbyForm.startAt);
      const parsedEndDate = new Date(lobbyForm.endAt);

      if (Number.isNaN(parsedDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
        setLobbiesError('Pick a valid event date and time.');
        setLobbyMessage('');
        return;
      }

      if (parsedEndDate <= parsedDate) {
        setLobbiesError('Pick an end time after the start time.');
        setLobbyMessage('');
        return;
      }

      scheduledFor = parsedDate.toISOString();
      scheduledUntil = parsedEndDate.toISOString();
    } else {
      const now = new Date();
      scheduledFor = now.toISOString();
      scheduledUntil = getDefaultEndDate(now).toISOString();
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
        scheduled_until: scheduledUntil,
        is_private: lobbyForm.visibility === 'private',
        status: 'scheduled',
      })
      .select(
        'id, title, scheduled_for, scheduled_until, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
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

    const normalizedCreatedLobby: LobbyRecord = {
      ...(createdLobby as Omit<LobbyRecord, 'games'> & {
        games: RelatedLobbyGameSummary[] | RelatedLobbyGameSummary | null;
      }),
      games: unwrapRelation(
        (createdLobby as {
          games: RelatedLobbyGameSummary[] | RelatedLobbyGameSummary | null;
        }).games,
      ),
    };

    setLobbies((current) => [
      {
        ...normalizedCreatedLobby,
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
      timeMode: 'later',
      startAt: createDefaultLobbyStartDate().toISOString(),
      endAt: createDefaultLobbyEndDate().toISOString(),
      scheduledFor: '',
      visibility: 'private',
    });
    setSelectedLobbyInviteNames([]);
    setLobbyBusy(false);
  };

  const handleAddAvailabilityWindow = async () => {
    if (!session?.user) {
      return;
    }

    if (availabilityDraftEndAt <= availabilityDraftStartAt) {
      setAvailabilityError('Pick an availability end time after the start time.');
      setAvailabilityMessage('');
      return;
    }

    setAvailabilityBusy(true);
    setAvailabilityError('');
    setAvailabilityMessage('');

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

    const nextWindow = {
      profile_id: session.user.id,
      day_key: availabilityDraft.dayKey,
      starts_at: formatDbTime(availabilityDraftStartAt),
      ends_at: formatDbTime(availabilityDraftEndAt),
    };

    const { data, error: insertError } = await supabase
      .from('availability_windows')
      .insert(nextWindow)
      .select('id, profile_id, day_key, starts_at, ends_at, created_at')
      .single();

    if (insertError) {
      setAvailabilityError(insertError.message);
      setAvailabilityBusy(false);
      return;
    }

    setAvailabilityWindows((current) => [...current, (data as AvailabilityWindow | null) ?? nextWindow]);
    setAvailabilityMessage('Availability window added.');
    setAvailabilityBusy(false);
  };

  const handleDeleteAvailabilityWindow = async (window: AvailabilityWindow) => {
    if (!session?.user) {
      return;
    }

    setAvailabilityBusy(true);
    setAvailabilityError('');
    setAvailabilityMessage('');

    const deleteQuery = supabase
      .from('availability_windows')
      .delete()
      .eq('profile_id', session.user.id)
      .eq('day_key', window.day_key)
      .eq('starts_at', window.starts_at)
      .eq('ends_at', window.ends_at);

    const { error } = window.id ? await deleteQuery.eq('id', window.id) : await deleteQuery;

    if (error) {
      setAvailabilityError(error.message);
    } else {
      setAvailabilityWindows((current) =>
        current.filter((item) =>
          window.id
            ? item.id !== window.id
            : !(
                item.day_key === window.day_key &&
                item.starts_at === window.starts_at &&
                item.ends_at === window.ends_at
              ),
        ),
      );
      setAvailabilityMessage('Availability window removed.');
    }

    setAvailabilityBusy(false);
  };

  const handleSaveAvailabilitySettings = async () => {
    if (!session?.user) {
      return;
    }

    setAvailabilityBusy(true);
    setAvailabilityError('');
    setAvailabilityMessage('');

    const { error } = await supabase.from('availability_settings').upsert({
      profile_id: session.user.id,
      auto_decline_outside_hours: autoDeclineOutsideHours,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setAvailabilityError(error.message);
    } else {
      setAvailabilityMessage('Availability settings saved.');
    }

    setAvailabilityBusy(false);
  };

  const startLobbyReschedule = (lobby: LobbyRecord) => {
    const startDate = lobby.scheduled_for ? new Date(lobby.scheduled_for) : createDefaultLobbyStartDate();
    const safeStartDate = Number.isNaN(startDate.getTime()) ? createDefaultLobbyStartDate() : startDate;
    const endDate = getLobbyEndDate({
      scheduled_for: safeStartDate.toISOString(),
      scheduled_until: lobby.scheduled_until,
    });

    setEditingLobbyId(lobby.id);
    setRescheduleDraft({
      startAt: safeStartDate.toISOString(),
      endAt: endDate.toISOString(),
    });
    setLobbiesError('');
    setLobbyMessage('');
    setSection('schedule');
  };

  const handleSaveLobbyTime = async (lobby: LobbyRecord) => {
    if (!session?.user) {
      return;
    }

    if (rescheduleEndAt <= rescheduleStartAt) {
      setLobbiesError('Pick an end time after the start time.');
      setLobbyMessage('');
      return;
    }

    setLobbyBusy(true);
    setLobbiesError('');
    setLobbyMessage('');

    const { data, error } = await supabase
      .from('lobbies')
      .update({
        scheduled_for: rescheduleStartAt.toISOString(),
        scheduled_until: rescheduleEndAt.toISOString(),
      })
      .eq('id', lobby.id)
      .select(
        'id, title, scheduled_for, scheduled_until, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
      )
      .single();

    if (error) {
      setLobbiesError(error.message);
      setLobbyBusy(false);
      return;
    }

    const normalizedLobby: LobbyRecord = {
      ...(data as Omit<LobbyRecord, 'games'> & {
        games: RelatedLobbyGameSummary[] | RelatedLobbyGameSummary | null;
      }),
      games: unwrapRelation(
        (data as {
          games: RelatedLobbyGameSummary[] | RelatedLobbyGameSummary | null;
        }).games,
      ),
    };

    setLobbies((current) =>
      current.map((item) => (item.id === lobby.id ? { ...normalizedLobby, invite_count: item.invite_count } : item)),
    );
    setEditingLobbyId(null);
    setLobbyMessage('Lobby time updated.');
    setLobbyBusy(false);
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

    if (decision === 'accepted') {
      const { error: acceptError } = await supabase.rpc('accept_friend_request', {
        p_request_id: request.id,
      });

      if (acceptError) {
        setFriendError(acceptError.message);
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
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: decision })
        .eq('id', request.id);

      if (updateError) {
        setFriendError(updateError.message);
        setFriendActionBusyId(null);
        return;
      }

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

  const handleCreateCommunity = async () => {
    if (!session?.user) {
      return;
    }

    const trimmedName = communityName.trim();
    if (!trimmedName) {
      setCommunityError('Enter a squad name before creating a community.');
      setCommunityMessage('');
      return;
    }

    setCommunityBusy(true);
    setCommunityError('');
    setCommunityMessage('');

    const { data, error } = await supabase.rpc('create_community', {
      p_name: trimmedName,
    });

    if (error) {
      setCommunityError(error.message);
      setCommunityBusy(false);
      return;
    }

    const createdCommunity = unwrapRelation(data as CommunityRecord[] | CommunityRecord | null);

    if (createdCommunity) {
      setCurrentCommunity(createdCommunity);
      setCommunityMembers([
        {
          community_id: createdCommunity.id,
          profile_id: session.user.id,
          role: 'owner',
          created_at: new Date().toISOString(),
        },
      ]);
      setCommunityProfiles([]);
      setProfile((current) =>
        current
          ? {
              ...current,
              primary_community_id: createdCommunity.id,
            }
          : current,
      );
      setCommunityMessage(
        `Squad created. Share code ${createdCommunity.invite_code.toUpperCase()} with your Discord community.`,
      );
      setCommunityName('');
    }

    setCommunityBusy(false);
  };

  const handleJoinCommunity = async () => {
    if (!session?.user) {
      return;
    }

    const trimmedCode = communityInviteCode.trim();
    if (!trimmedCode) {
      setCommunityError('Enter a squad code before joining.');
      setCommunityMessage('');
      return;
    }

    setCommunityBusy(true);
    setCommunityError('');
    setCommunityMessage('');

    const { data, error } = await supabase.rpc('join_community_by_invite', {
      p_invite_code: trimmedCode,
    });

    if (error) {
      setCommunityError(error.message);
      setCommunityBusy(false);
      return;
    }

    const joinedCommunity = unwrapRelation(data as CommunityRecord[] | CommunityRecord | null);

    if (joinedCommunity) {
      setCurrentCommunity(joinedCommunity);
      setProfile((current) =>
        current
          ? {
              ...current,
              primary_community_id: joinedCommunity.id,
            }
          : current,
      );
      setCommunityMessage(`Joined ${joinedCommunity.name}. Discord-based squad suggestions are now ready.`);
      setCommunityInviteCode('');
    }

    setCommunityBusy(false);
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
        subtitle="Low-friction squad suggestions first, then requests, favorites, and manual search."
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
      {communityError ? (
        <HelperText type="error" visible>
          {communityError}
        </HelperText>
      ) : null}
      {communityMessage ? (
        <HelperText type="info" visible style={styles.successText}>
          {communityMessage}
        </HelperText>
      ) : null}

      {!profile?.primary_community_id ? (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">Join your squad</Text>
            <Text style={styles.friendNote}>
              Use a squad code from your Discord community or create one if you are the organizer.
            </Text>
            <TextInput
              mode="outlined"
              label="Squad code"
              placeholder="Enter invite code"
              value={communityInviteCode}
              onChangeText={setCommunityInviteCode}
              autoCapitalize="characters"
              style={styles.input}
              testID="community-invite-code-input"
            />
            <Button
              mode="contained"
              onPress={handleJoinCommunity}
              loading={communityBusy}
              disabled={communityBusy}
              testID="join-community-button">
              Join squad
            </Button>
            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={styles.eventTimeTitle}>
              Create a new squad
            </Text>
            <TextInput
              mode="outlined"
              label="Squad name"
              placeholder="Creator squad, guild night, or server name"
              value={communityName}
              onChangeText={setCommunityName}
              style={styles.input}
              testID="community-name-input"
            />
            <Button
              mode="outlined"
              onPress={handleCreateCommunity}
              loading={communityBusy}
              disabled={communityBusy}
              testID="create-community-button">
              Create squad
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleMedium">Suggested from your Discord community</Text>
            <Text style={styles.friendNote}>
              {currentCommunity
                ? `${currentCommunity.name} | Invite code ${currentCommunity.invite_code.toUpperCase()}`
                : 'Loading your community...'}
            </Text>
            {communityLoading ? <Text style={styles.friendNote}>Loading community suggestions...</Text> : null}
            {!communityLoading && suggestedFriends.map((candidate) => {
              const candidateName = candidate.display_name ?? candidate.username ?? 'Player';
              const resolvedAvatarUrl = resolveAvatarUrl(candidate);

              return (
                <View key={candidate.id} style={styles.friendRow}>
                  {resolvedAvatarUrl ? (
                    <Avatar.Image size={42} source={{ uri: resolvedAvatarUrl }} style={styles.avatar} />
                  ) : (
                    <Avatar.Text
                      size={42}
                      label={candidateName.slice(0, 2).toUpperCase()}
                      style={styles.avatar}
                    />
                  )}
                  <View style={styles.friendMeta}>
                    <Text variant="titleMedium">{candidateName}</Text>
                    <Text style={styles.friendNote}>
                      {candidate.username ? `@${candidate.username}` : 'No username yet'} |{' '}
                      {candidate.community_role === 'owner' ? 'Squad organizer' : 'Squad member'}
                    </Text>
                  </View>
                  <Button
                    mode="contained-tonal"
                    onPress={() => sendFriendRequest(candidate)}
                    loading={friendActionBusyId === `request:${candidate.id}`}
                    disabled={friendActionBusyId !== null}
                    testID={`suggested-friend-request-${candidate.id}`}>
                    Add friend
                  </Button>
                </View>
              );
            })}
            {!communityLoading && suggestedFriends.length === 0 ? (
              <Text style={styles.friendNote}>
                No new squad suggestions right now. Invite more people into the community or use manual search below.
              </Text>
            ) : null}
          </Card.Content>
        </Card>
      )}

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

      {visibleFriends.map((friend) => {
        const friendName = friend.display_name ?? friend.username ?? 'Player';
        const resolvedAvatarUrl = resolveAvatarUrl(friend);

        return (
          <Card key={friend.id} style={styles.panel}>
            <Card.Content style={styles.friendCard}>
              {resolvedAvatarUrl ? (
                <Avatar.Image size={46} source={{ uri: resolvedAvatarUrl }} style={styles.avatar} />
              ) : (
                <Avatar.Text
                  size={46}
                  label={friendName.slice(0, 2).toUpperCase()}
                  style={styles.avatar}
                />
              )}
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
            <Text style={styles.friendNote}>
              Use the squad suggestions above or search manually below.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Manual search</Text>
          <Text style={styles.friendNote}>
            Search by username or display name if someone is not showing up in your squad suggestions.
          </Text>
          <Searchbar
            placeholder="Search by username or display name"
            value={friendSearch}
            onChangeText={setFriendSearch}
            testID="friends-search-input"
          />
          {friendSearch.trim().length >= 2 ? (
            <>
              <Text style={styles.friendNote}>
                {friendSearchLoading ? 'Searching profiles...' : 'Send a request to bring someone into your lobby flow.'}
              </Text>
              {friendSearchResults.map((candidate) => {
                const status = getFriendSearchStatus(candidate.id);
                const candidateName = candidate.display_name ?? candidate.username ?? 'Player';
                const resolvedAvatarUrl = resolveAvatarUrl(candidate);

                return (
                  <View key={candidate.id} style={styles.friendRow}>
                    {resolvedAvatarUrl ? (
                      <Avatar.Image size={42} source={{ uri: resolvedAvatarUrl }} style={styles.avatar} />
                    ) : (
                      <Avatar.Text
                        size={42}
                        label={candidateName.slice(0, 2).toUpperCase()}
                        style={styles.avatar}
                      />
                    )}
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
            </>
          ) : (
            <Text style={styles.friendNote}>Type at least two characters to search profiles.</Text>
          )}
        </Card.Content>
      </Card>
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
        title="Schedule a game night"
        subtitle="Simple flow: choose a game, pick the event time, then invite your squad."
      />
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Create event</Text>
          <Text style={styles.friendNote}>
            This is the scheduling path we want users to feel immediately: game first, time second,
            people third.
          </Text>
          <View style={styles.schedulerStep}>
            <View style={styles.schedulerStepHeader}>
              <Text style={styles.stepBadge}>1</Text>
              <View style={styles.friendMeta}>
                <Text variant="titleSmall" style={styles.eventTimeTitle}>
                  Select a game
                </Text>
                <Text style={styles.friendNote}>Choose from the library or start from a game card.</Text>
              </View>
            </View>
            <View style={styles.gamePickGrid}>
              {libraryGames.slice(0, 6).map((game) => (
                <Surface
                  key={game.id}
                  style={[
                    styles.gamePickCard,
                    selectedLobbyGameId === game.id ? styles.gamePickCardSelected : null,
                  ]}
                  elevation={selectedLobbyGameId === game.id ? 2 : 0}>
                  <Text variant="titleSmall" style={styles.gamePickTitle}>
                    {game.title}
                  </Text>
                  <Text style={styles.friendNote}>
                    {game.genre} - {game.player_count}
                  </Text>
                  <Button
                    mode={selectedLobbyGameId === game.id ? 'contained' : 'outlined'}
                    compact
                    onPress={() => {
                      setSelectedLobbyGameId(game.id);
                      setLobbyForm((current) => ({
                        ...current,
                        title: `${game.title} Lobby`,
                      }));
                      setLobbyMessage('');
                    }}
                    testID={`lobby-game-${game.id}`}>
                    {selectedLobbyGameId === game.id ? 'Selected' : 'Pick game'}
                  </Button>
                </Surface>
              ))}
            </View>
          </View>
          <View style={styles.schedulerStep}>
            <View style={styles.schedulerStepHeader}>
              <Text style={styles.stepBadge}>2</Text>
              <View style={styles.friendMeta}>
                <Text variant="titleSmall" style={styles.eventTimeTitle}>
                  Pick the time
                </Text>
                <Text style={styles.friendNote}>No raw date strings. Tap the day and time block.</Text>
              </View>
            </View>
            <EventTimePicker
              timeMode={lobbyForm.timeMode}
              startAt={selectedLobbyStartAt}
              endAt={selectedLobbyEndAt}
              onSetNow={() =>
                setLobbyForm((current) => ({
                  ...current,
                  timeMode: 'now',
                }))
              }
              onSetLater={() =>
                setLobbyForm((current) => ({
                  ...current,
                  timeMode: 'later',
                }))
              }
              onStartAtChange={(startAt) => {
                const currentDurationMs = Math.max(
                  selectedLobbyEndAt.getTime() - selectedLobbyStartAt.getTime(),
                  60 * 60 * 1000,
                );
                const nextEndAt = new Date(startAt.getTime() + currentDurationMs);

                setLobbyForm((current) => ({
                  ...current,
                  startAt: startAt.toISOString(),
                  endAt: nextEndAt.toISOString(),
                  timeMode: 'later',
                }));
              }}
              onEndAtChange={(endAt) =>
                setLobbyForm((current) => ({
                  ...current,
                  endAt: endAt.toISOString(),
                  timeMode: 'later',
                }))
              }
            />
          </View>
          <View style={styles.schedulerStep}>
            <View style={styles.schedulerStepHeader}>
              <Text style={styles.stepBadge}>3</Text>
              <View style={styles.friendMeta}>
                <Text variant="titleSmall" style={styles.eventTimeTitle}>
                  Invite people
                </Text>
                <Text style={styles.friendNote}>
                  Pick friends for the invite draft. Persisted invite rows come next.
                </Text>
              </View>
            </View>
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
          </View>
          <TextInput
            mode="outlined"
            label="Event title"
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
            <Chip icon="clock-outline">
              {lobbyForm.timeMode === 'now'
                ? 'Starts now'
                : formatEventRange(selectedLobbyStartAt, selectedLobbyEndAt)}
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
                ? formatEventRange(new Date(lobby.scheduled_for), getLobbyEndDate(lobby))
                : 'Starts now'}
            </Text>
            {typeof lobby.invite_count === 'number' && lobby.invite_count > 0 ? (
              <Text style={styles.friendNote}>
                Invite draft prepared for {lobby.invite_count} friend{lobby.invite_count === 1 ? '' : 's'}.
              </Text>
            ) : null}
            <View style={styles.cardActions}>
              <Button mode="contained-tonal" onPress={() => startLobbyReschedule(lobby)}>
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
        subtitle="Reschedule game nights and manage recurring weekly availability windows."
      />
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Upcoming games</Text>
          <Text style={styles.friendNote}>
            Edit the start and end time for scheduled lobbies without rebuilding the event.
          </Text>
          {lobbies.length === 0 ? (
            <Text style={styles.friendNote}>No scheduled lobbies yet. Create one from the Lobbies tab.</Text>
          ) : null}
          {lobbies.map((lobby) => {
            const startDate = lobby.scheduled_for ? new Date(lobby.scheduled_for) : createDefaultLobbyStartDate();
            const safeStartDate = Number.isNaN(startDate.getTime()) ? createDefaultLobbyStartDate() : startDate;
            const endDate = getLobbyEndDate(lobby);
            const isEditing = editingLobbyId === lobby.id;

            return (
              <Surface key={`${lobby.id}-schedule`} style={styles.scheduleEventCard} elevation={1}>
                <View style={styles.eventTimeHeader}>
                  <View style={styles.friendMeta}>
                    <Text variant="titleMedium">{lobby.title}</Text>
                    <Text style={styles.friendNote}>
                      {lobby.games?.title ?? 'Game unavailable'} | {formatEventRange(safeStartDate, endDate)}
                    </Text>
                  </View>
                  <Button
                    mode={isEditing ? 'text' : 'contained-tonal'}
                    compact
                    onPress={() => (isEditing ? setEditingLobbyId(null) : startLobbyReschedule(lobby))}
                    testID={`schedule-edit-lobby-${lobby.id}`}>
                    {isEditing ? 'Cancel' : 'Edit time'}
                  </Button>
                </View>
                {isEditing ? (
                  <View style={styles.pickerFieldGroup}>
                    <DatePickerInput
                      locale="en"
                      label="Event date"
                      value={rescheduleStartAt}
                      onChange={(nextDate) => {
                        if (nextDate) {
                          setRescheduleDraft((current) => ({
                            startAt: setDatePart(rescheduleStartAt, nextDate).toISOString(),
                            endAt: setDatePart(rescheduleEndAt, nextDate).toISOString(),
                          }));
                        }
                      }}
                      inputMode="start"
                      mode="outlined"
                      withModal
                      style={styles.input}
                      testID={`schedule-lobby-date-${lobby.id}`}
                    />
                    <TimeRangePicker
                      startAt={rescheduleStartAt}
                      endAt={rescheduleEndAt}
                      onStartAtChange={(startAt) => {
                        const currentDurationMs = Math.max(
                          rescheduleEndAt.getTime() - rescheduleStartAt.getTime(),
                          60 * 60 * 1000,
                        );
                        const nextEndAt = new Date(startAt.getTime() + currentDurationMs);

                        setRescheduleDraft({
                          startAt: startAt.toISOString(),
                          endAt: nextEndAt.toISOString(),
                        });
                      }}
                      onEndAtChange={(endAt) =>
                        setRescheduleDraft((current) => ({
                          ...current,
                          endAt: endAt.toISOString(),
                        }))
                      }
                      startTestID={`schedule-lobby-start-${lobby.id}`}
                      endTestID={`schedule-lobby-end-${lobby.id}`}
                    />
                    <Button
                      mode="contained"
                      onPress={() => handleSaveLobbyTime(lobby)}
                      loading={lobbyBusy}
                      disabled={lobbyBusy}
                      testID={`schedule-save-lobby-${lobby.id}`}>
                      Save time
                    </Button>
                  </View>
                ) : null}
              </Surface>
            );
          })}
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
        </Card.Content>
      </Card>
      <Card style={styles.panel}>
        <Card.Content>
          <Text variant="titleMedium">Weekly availability</Text>
          <Text style={styles.friendNote}>
            Add recurring windows when friends are allowed to send game invites.
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
          <View style={styles.dayPicker}>
            {availabilityDays.map((day) => (
              <Chip
                key={day}
                selected={availabilityDraft.dayKey === day}
                onPress={() =>
                  setAvailabilityDraft((current) => ({
                    ...current,
                    dayKey: day,
                  }))
                }
                style={availabilityDraft.dayKey === day ? styles.selectedDayChip : styles.dayChip}
                testID={`availability-day-${day.toLowerCase()}`}>
                {day}
              </Chip>
            ))}
          </View>
          <TimeRangePicker
            startAt={availabilityDraftStartAt}
            endAt={availabilityDraftEndAt}
            onStartAtChange={(startsAt) => {
              const currentDurationMs = Math.max(
                availabilityDraftEndAt.getTime() - availabilityDraftStartAt.getTime(),
                60 * 60 * 1000,
              );
              const nextEndAt = new Date(startsAt.getTime() + currentDurationMs);

              setAvailabilityDraft((current) => ({
                ...current,
                startsAt: startsAt.toISOString(),
                endsAt: nextEndAt.toISOString(),
              }));
            }}
            onEndAtChange={(endsAt) =>
              setAvailabilityDraft((current) => ({
                ...current,
                endsAt: endsAt.toISOString(),
              }))
            }
            startTestID="availability-start-time-button"
            endTestID="availability-end-time-button"
          />
          <View style={styles.pickerSummary}>
            <Text variant="titleSmall" style={styles.eventTimeTitle}>
              New weekly window
            </Text>
            <Text style={styles.friendNote}>
              {availabilityDraft.dayKey}, {formatEventTime(availabilityDraftStartAt)} -{' '}
              {formatEventTime(availabilityDraftEndAt)}
            </Text>
          </View>
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
          <View style={styles.cardActions}>
            <Button
              mode="contained"
              onPress={handleAddAvailabilityWindow}
              loading={availabilityBusy}
              disabled={availabilityBusy}
              testID="add-availability-window-button">
              Add availability
            </Button>
            <Button
              mode="outlined"
              onPress={handleSaveAvailabilitySettings}
              loading={availabilityBusy}
              disabled={availabilityBusy}
              testID="save-availability-settings-button">
              Save settings
            </Button>
          </View>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.eventTimeTitle}>
            Saved windows
          </Text>
          {availabilityLoading ? <Text style={styles.friendNote}>Loading availability...</Text> : null}
          {!availabilityLoading && availabilityWindows.length === 0 ? (
            <Text style={styles.friendNote}>No availability windows yet.</Text>
          ) : null}
          {availabilityWindows.map((window, index) => (
            <Surface
              key={window.id ?? `${window.day_key}-${window.starts_at}-${window.ends_at}-${index}`}
              style={styles.availabilityWindowCard}
              elevation={1}>
              <View style={styles.eventTimeHeader}>
                <View>
                  <Text variant="titleSmall">{window.day_key}</Text>
                  <Text style={styles.friendNote}>
                    {formatAvailabilityRange(window.starts_at, window.ends_at)}
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  onPress={() => handleDeleteAvailabilityWindow(window)}
                  disabled={availabilityBusy}
                  testID={`delete-availability-window-${index}`}>
                  Delete
                </Button>
              </View>
            </Surface>
          ))}
        </Card.Content>
      </Card>
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

  const renderProfile = () => {
    const resolvedAvatarUrl = resolveAvatarUrl(profile);

    return (
      <>
      <SectionTitle
        title="Profile & settings"
        subtitle="Edit your profile, link Discord, update account security, and keep setup simple."
      />
      <Card style={styles.panel}>
        <Card.Content style={styles.profileHeader}>
          {resolvedAvatarUrl ? (
            <Avatar.Image size={68} source={{ uri: resolvedAvatarUrl }} style={styles.avatarLarge} />
          ) : (
            <Avatar.Text
              size={68}
              label={(profile?.display_name ?? profile?.username ?? 'MX').slice(0, 2).toUpperCase()}
              style={styles.avatarLarge}
            />
          )}
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
        <Card.Content style={styles.profileSummary}>
          <Text variant="titleMedium">Discord</Text>
          <Text style={styles.friendNote}>
            We are moving toward Discord-first identity so gamers do not have to rebuild a second social graph.
          </Text>
          <Chip icon="discord" style={styles.statusChip}>
            {profile?.discord_user_id
              ? `Connected as ${profile.discord_username ?? 'Discord account'}`
              : 'Not connected'}
          </Chip>
          <Text style={styles.friendNote}>
            {profile?.discord_user_id
              ? 'This linked identity will become the primary social layer for discovery, invites, and presence.'
              : 'Next step is wiring Discord OAuth so identity and discovery start with the account players already use.'}
          </Text>
          <View style={styles.cardActions}>
            {profile?.discord_user_id ? (
              <Button
                mode="outlined"
                onPress={handleDiscordDisconnect}
                loading={discordBusy}
                disabled={discordBusy}
                testID="discord-disconnect-button">
                Disconnect Discord
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleDiscordConnect}
                loading={discordBusy}
                disabled={discordBusy}
                testID="discord-connect-button">
                Connect Discord
              </Button>
            )}
          </View>
          {discordMessage ? (
            <HelperText type="info" visible style={styles.successText}>
              {discordMessage}
            </HelperText>
          ) : null}
        </Card.Content>
      </Card>
      <Card style={styles.panel}>
        <Card.Content style={styles.profileSummary}>
          <Text variant="titleMedium">Profile details</Text>
          <Text style={styles.friendNote}>
            Keep your name and username current so invites and lobbies stay recognizable.
          </Text>
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
            testID="profile-edit-username-input"
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
            testID="profile-edit-display-name-input"
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
            testID="profile-edit-avatar-url-input"
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
            testID="profile-edit-save-button">
            Save profile
          </Button>
        </Card.Content>
      </Card>
      <Card style={styles.panel}>
        <Card.Content style={styles.profileSummary}>
          <Text variant="titleMedium">Account & security</Text>
          <Text style={styles.friendNote}>
            Update your login email or set a new password for this account.
          </Text>
          <TextInput
            mode="outlined"
            label="Email"
            value={accountEmail}
            onChangeText={setAccountEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
            testID="account-email-input"
          />
          <Button
            mode="outlined"
            onPress={handleEmailUpdate}
            loading={accountBusy}
            disabled={accountBusy}
            testID="account-email-save-button">
            Update email
          </Button>
          <Divider style={styles.divider} />
          <TextInput
            mode="outlined"
            label="New password"
            value={passwordForm.nextPassword}
            onChangeText={(value) =>
              setPasswordForm((current) => ({
                ...current,
                nextPassword: value,
              }))
            }
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
            testID="account-password-input"
          />
          <TextInput
            mode="outlined"
            label="Confirm new password"
            value={passwordForm.confirmPassword}
            onChangeText={(value) =>
              setPasswordForm((current) => ({
                ...current,
                confirmPassword: value,
              }))
            }
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
            testID="account-password-confirm-input"
          />
          {accountError ? (
            <HelperText type="error" visible>
              {accountError}
            </HelperText>
          ) : null}
          {accountMessage ? (
            <HelperText type="info" visible style={styles.successText}>
              {accountMessage}
            </HelperText>
          ) : null}
          <Button
            mode="contained-tonal"
            onPress={handlePasswordUpdate}
            loading={accountBusy}
            disabled={accountBusy}
            testID="account-password-save-button">
            Change password
          </Button>
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
  };

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
        if (!allowSignup) {
          throw new Error('Signup is disabled for this demo. Use a provided account to sign in.');
        }

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

  const handleDiscordAuth = async () => {
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: getWebRedirectUrl(),
      },
    });

    if (error) {
      setAuthError(error.message);
      setAuthBusy(false);
      return;
    }

    setAuthMessage('Redirecting to Discord...');
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

  async function handleProfileSave() {
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
      .select(profileSelectFields)
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
  }

  async function handleDiscordConnect() {
    if (!profile) {
      return;
    }

    setDiscordBusy(true);
    setDiscordMessage('');

    if (!discordClientId) {
      setDiscordMessage(
        'Discord client setup is not configured yet. Add EXPO_PUBLIC_DISCORD_CLIENT_ID before wiring OAuth.',
      );
      setDiscordBusy(false);
      return;
    }

    if (Platform.OS !== 'web') {
      setDiscordMessage(
        'Discord linking is wired for the web flow first. Native phone linking will come next with the mobile callback setup.',
      );
      setDiscordBusy(false);
      return;
    }

    const currentLocation = globalThis.window?.location;
    if (!currentLocation) {
      setDiscordMessage('Unable to start Discord auth from this environment.');
      setDiscordBusy(false);
      return;
    }

    const basePath = currentLocation.pathname.startsWith('/GameSchedule') ? '/GameSchedule' : '';
    const redirectUri = `${currentLocation.origin}${basePath}/discord-oauth-callback`;
    const state = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    globalThis.window.sessionStorage?.setItem(discordStateStorageKey, state);

    const authorizeUrl = new URL('https://discord.com/oauth2/authorize');
    authorizeUrl.searchParams.set('response_type', 'token');
    authorizeUrl.searchParams.set('client_id', discordClientId);
    authorizeUrl.searchParams.set('scope', 'identify');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('prompt', 'consent');
    authorizeUrl.searchParams.set('state', state);

    globalThis.window.location.assign(authorizeUrl.toString());
    setDiscordBusy(false);
  }

  async function handleDiscordDisconnect() {
    if (!session?.user || !profile) {
      return;
    }

    setDiscordBusy(true);
    setDiscordMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        discord_user_id: null,
        discord_username: null,
        discord_avatar_url: null,
        discord_connected_at: null,
      })
      .eq('id', session.user.id)
      .select(profileSelectFields)
      .single();

    if (error) {
      setDiscordMessage(error.message);
    } else {
      setProfile(data);
      setDiscordMessage('Discord link removed.');
    }

    setDiscordBusy(false);
  }

  async function handleEmailUpdate() {
    if (!session?.user) {
      return;
    }

    const nextEmail = accountEmail.trim().toLowerCase();
    if (!nextEmail) {
      setAccountError('Email is required.');
      setAccountMessage('');
      return;
    }

    if (nextEmail === (session.user.email ?? '').toLowerCase()) {
      setAccountError('');
      setAccountMessage('Email is already up to date.');
      return;
    }

    setAccountBusy(true);
    setAccountError('');
    setAccountMessage('');

    const { error } = await supabase.auth.updateUser({
      email: nextEmail,
    });

    if (error) {
      setAccountError(error.message);
    } else {
      setAccountMessage('Email update requested. Check your inbox if Supabase email confirmation is enabled.');
    }

    setAccountBusy(false);
  }

  async function handlePasswordUpdate() {
    const nextPassword = passwordForm.nextPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!nextPassword || !confirmPassword) {
      setAccountError('Enter and confirm your new password.');
      setAccountMessage('');
      return;
    }

    if (nextPassword.length < 6) {
      setAccountError('Use a password with at least 6 characters.');
      setAccountMessage('');
      return;
    }

    if (nextPassword !== confirmPassword) {
      setAccountError('Passwords do not match.');
      setAccountMessage('');
      return;
    }

    setAccountBusy(true);
    setAccountError('');
    setAccountMessage('');

    const { error } = await supabase.auth.updateUser({
      password: nextPassword,
    });

    if (error) {
      setAccountError(error.message);
    } else {
      setPasswordForm({
        nextPassword: '',
        confirmPassword: '',
      });
      setAccountMessage('Password updated.');
    }

    setAccountBusy(false);
  }

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
          {demoLabel ? <Chip compact style={styles.demoChip}>{demoLabel}</Chip> : null}
          <Text style={styles.eyebrow}>Friend Management App</Text>
          <Text variant="headlineMedium" style={styles.loginTitle}>
            {authMode === 'signin' ? 'Sign in' : 'Create account'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {allowSignup
              ? 'Discord is the fastest way in for squad suggestions. Email/password stays as a fallback for testing.'
              : 'Public demo access is sign-in only. Use a shared demo account or one we provide for testing.'}
          </Text>

          <Button
            mode="contained"
            icon="discord"
            onPress={handleDiscordAuth}
            loading={authBusy}
            disabled={authBusy}
            style={styles.loginButton}
            testID="discord-login-button">
            Continue with Discord
          </Button>
          <Text style={styles.friendNote}>
            Recommended: use Discord first so the app can suggest people from your shared squad.
          </Text>

          <Divider style={styles.divider} />
          <Text style={styles.friendNote}>Fallback: use email/password if you are testing or not ready to link Discord.</Text>

          <SegmentedButtons
            value={authMode}
            onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')}
            buttons={[
              { value: 'signin', label: 'Sign in' },
              ...(allowSignup ? [{ value: 'signup', label: 'Sign up' }] : []),
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
            {allowSignup
              ? 'Use an existing Supabase user to sign in, or create one here for testing.'
              : 'Self-signup is disabled in this deployment to keep the demo backend under control.'}
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
  demoChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#252B49',
    marginBottom: 4,
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
  schedulerStep: {
    backgroundColor: '#10162A',
    borderColor: '#28335F',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    marginTop: 14,
    padding: 14,
  },
  schedulerStepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepBadge: {
    backgroundColor: '#7DFFB3',
    borderRadius: 999,
    color: '#07140F',
    fontSize: 16,
    fontWeight: '900',
    height: 34,
    lineHeight: 34,
    textAlign: 'center',
    width: 34,
  },
  gamePickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gamePickCard: {
    backgroundColor: '#171D35',
    borderColor: '#2C3560',
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: 8,
    minWidth: 150,
    padding: 12,
  },
  gamePickCardSelected: {
    backgroundColor: '#1E3143',
    borderColor: '#7DFFB3',
  },
  gamePickTitle: {
    color: '#F5F7FF',
    fontWeight: '800',
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
  availabilitySummaryCard: {
    alignItems: 'center',
    backgroundColor: '#10162A',
    borderColor: '#28335F',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 14,
  },
  availabilitySummaryValue: {
    color: '#F5F7FF',
    fontSize: 28,
    fontWeight: '800',
  },
  dayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dayChip: {
    backgroundColor: '#20263F',
  },
  selectedDayChip: {
    backgroundColor: '#32417E',
  },
  eventTimePanel: {
    backgroundColor: '#151B31',
    borderColor: '#2C3560',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  eventTimeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  eventTimeTitle: {
    color: '#F5F7FF',
    fontWeight: '800',
  },
  pickerFieldGroup: {
    gap: 12,
    marginTop: 4,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerSummary: {
    backgroundColor: '#10162A',
    borderColor: '#28335F',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  scheduleEventCard: {
    backgroundColor: '#10162A',
    borderColor: '#28335F',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    padding: 14,
  },
  availabilityWindowCard: {
    backgroundColor: '#10162A',
    borderColor: '#1F8F5F',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  timeBlockPanel: {
    backgroundColor: '#10162A',
    borderColor: '#2C3560',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginTop: 14,
    padding: 16,
  },
  timeBlockHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  timeBlockTitle: {
    color: '#F5F7FF',
    fontSize: 30,
    fontWeight: '900',
  },
  timeBlockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  availabilityWeekOverview: {
    backgroundColor: '#10162A',
    borderRadius: 18,
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  availabilityMiniRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  availabilityMiniDay: {
    color: '#F5F7FF',
    fontSize: 12,
    fontWeight: '800',
    width: 34,
  },
  availabilityMiniSlots: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  availabilityMiniOn: {
    backgroundColor: '#2BE38D',
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  availabilityMiniOff: {
    backgroundColor: '#B84A5A',
    borderRadius: 999,
    flex: 1,
    height: 8,
    opacity: 0.75,
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
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#252B49',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    backgroundColor: '#7C5CFF',
  },
});
