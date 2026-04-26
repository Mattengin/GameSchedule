import * as React from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  FAB,
  HelperText,
  IconButton,
  Portal,
  Searchbar,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { DatePickerInput, en, registerTranslation } from 'react-native-paper-dates';
import {
  allowSignup,
  availabilityDays,
  demoLabel,
  discordClientId,
  discordStateStorageKey,
  notifications,
  profileSelectFields,
  sections,
} from '../features/home/homeConstants';
import { useAvailabilityState } from '../features/home/homeAvailabilityHooks';
import { useGamesState } from '../features/home/homeGameHooks';
import { useLobbyState } from '../features/home/homeLobbyHooks';
import { DashboardSection, GamesSection, InboxSection, RouletteSection } from '../features/home/homeSections';
import { LobbyGameCarousel } from '../features/home/LobbyGameCarousel';
import { useSocialState } from '../features/home/homeSocialHooks';
import { styles } from '../features/home/homeStyles';
import type {
  AvailabilityWindow,
  BusyBlock,
  FriendRequestRecord,
  GameRecord,
  IgdbSearchResult,
  LobbyInviteHistoryRecord,
  LobbyInviteStatus,
  LobbyMemberRecord,
  LobbyRecord,
  Profile,
  PublicProfileCard,
  SectionKey,
} from '../features/home/homeTypes';
import {
  createBirthdayDate,
  EventTimePicker,
  SectionTitle,
  TimeRangePicker,
  clearOAuthHashFromUrl,
  createDefaultLobbyEndDate,
  createDefaultLobbyStartDate,
  doesTimeRangeOverlap,
  formatAvailabilityRange,
  formatBirthdayLabel,
  formatBusyBlockNote,
  formatDbTime,
  formatEventRange,
  formatEventTime,
  formatLobbyScheduleLabel,
  formatReleaseDateLabel,
  getBusyFallbackEndDate,
  getBusyStatusLabel,
  getBirthdayDate,
  getDefaultEndDate,
  getDiscordCallbackPath,
  getDiscordIdentityFromSession,
  hasExplicitLobbyEnd,
  getLobbyEndDate,
  getSessionProviderToken,
  getWebBasePath,
  getWebRedirectUrl,
  isDiscordCallbackPath,
  readHashParams,
  resolveAvatarUrl,
  setDatePart,
} from '../features/home/homeUtils';
import { importIgdbGame, searchIgdbGames } from '../services/igdbFunctions';
import { supabase } from '../services/supabaseClient';

registerTranslation('en', en);

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
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
    birthday: undefined as Date | undefined,
    birthdayVisibility: 'private' as 'private' | 'public',
    busyVisibility: 'public' as 'private' | 'public',
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
  const [section, setSection] = React.useState<SectionKey>('dashboard');
  const [friendFilter, setFriendFilter] = React.useState<'all' | 'favorites' | 'pending'>('all');
  const [gamePendingRemoval, setGamePendingRemoval] = React.useState<GameRecord | null>(null);
  const handledDiscordCallbackTokenRef = React.useRef<string | null>(null);

  const {
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
    rouletteEntries,
    roulettePoolGames,
    setFavoriteGameIds,
    setGameActionBusyId,
    setGameActionError,
    setGameActionMessage,
    setGameSearch,
    setIgdbError,
    setIgdbHasSearched,
    setIgdbImportBusyId,
    setIgdbMessage,
    setIgdbResults,
    setIgdbSearchCooldownUntil,
    setIgdbSearchLoading,
    setIgdbSearchQuery,
    setLibraryGames,
    setRouletteEntries,
  } = useGamesState(session);

  const {
    acceptedFriends,
    friendActionBusyId,
    friendCodeInput,
    friendCodeLookupAttempted,
    friendCodeLookupLoading,
    friendCodeLookupResult,
    friendError,
    friendLoading,
    friendMessage,
    friendships,
    getFriendRequestLabel,
    getFriendSearchStatus,
    incomingFriendRequests,
    lookupFriendByCode,
    outgoingFriendRequests,
    setFriendActionBusyId,
    setFriendCodeInput,
    setFriendDirectory,
    setFriendError,
    setFriendMessage,
    setFriendRequests,
    setFriendships,
  } = useSocialState({
    session,
  });

  const {
    editingLobbyId,
    incomingLobbies,
    inviteBusyBlocks,
    inviteReadyFriends,
    loadLobbies,
    lobbyInviteHistory,
    lobbies,
    lobbiesError,
    lobbiesLoading,
    lobbyMembers,
    lobbyBusy,
    lobbyForm,
    lobbyMessage,
    lobbyProfileDirectory,
    hostedLobbies,
    rescheduleDraft,
    rescheduleEndAt,
    rescheduleStartAt,
    selectedLobbyEndAt,
    selectedLobbyGame,
    selectedLobbyGameId,
    selectedLobbyInviteProfileIds,
    selectedLobbyStartAt,
    setEditingLobbyId,
    setLobbiesError,
    setLobbyBusy,
    setLobbyForm,
    setLobbyMessage,
    setRescheduleDraft,
    setSelectedLobbyGameId,
    setSelectedLobbyInviteProfileIds,
  } = useLobbyState({
    acceptedFriends,
    libraryGames,
    session,
  });

  const {
    autoDeclineOutsideHours,
    availabilityBusy,
    availabilityDraft,
    availabilityDraftEndAt,
    availabilityDraftStartAt,
    availabilityError,
    availabilityLoading,
    availabilityMessage,
    availabilityWindows,
    setAutoDeclineOutsideHours,
    setAvailabilityBusy,
    setAvailabilityDraft,
    setAvailabilityError,
    setAvailabilityMessage,
    setAvailabilityWindows,
  } = useAvailabilityState(session);

  const [inviteResponseDrafts, setInviteResponseDrafts] = React.useState<
    Record<
      string,
      {
        decision: Exclude<LobbyInviteStatus, 'pending'>;
        comment: string;
        startAt: string;
        endAt: string;
      }
    >
  >({});
  const [acceptConflictAcknowledgementId, setAcceptConflictAcknowledgementId] = React.useState<string | null>(null);

  const syncDiscordIdentity = React.useCallback(
    async (
      providerToken: string,
      options?: {
        silent?: boolean;
        successMessage?: string;
      },
    ) => {
      if (!session?.user) {
        return null;
      }

      const shouldStaySilent = options?.silent ?? false;

      try {
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Unable to fetch the Discord account details.');
        }

        const discordUser = (await userResponse.json()) as {
          id: string;
          username?: string;
          global_name?: string | null;
          avatar?: string | null;
        };

        const discordDisplayName =
          discordUser.global_name?.trim() ||
          discordUser.username?.trim() ||
          profile?.display_name?.trim() ||
          profile?.username?.trim() ||
          'Discord user';
        const discordAvatarUrl = discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
          : null;

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            discord_user_id: discordUser.id,
            discord_username: discordDisplayName,
            discord_avatar_url: discordAvatarUrl,
            discord_connected_at: new Date().toISOString(),
            avatar_url: profile?.avatar_url ?? discordAvatarUrl,
            display_name: profile?.display_name ?? discordDisplayName,
          })
          .eq('id', session.user.id)
          .select(profileSelectFields)
          .single();

        if (updateError) {
          throw updateError;
        }

        setProfile(updatedProfile);

        if (!shouldStaySilent) {
          setDiscordMessage(options?.successMessage ?? 'Discord identity linked.');
        }

        return updatedProfile;
      } catch (error) {
        if (!shouldStaySilent) {
          setDiscordMessage(error instanceof Error ? error.message : 'Unable to sync Discord identity.');
        }

        return null;
      }
    },
    [profile, session],
  );

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
        if (!isDiscordCallbackPath()) {
          clearOAuthHashFromUrl();
        }
      }

      setAuthLoading(false);
    };

    bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!isDiscordCallbackPath()) {
        clearOAuthHashFromUrl();
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !session?.user || !isDiscordCallbackPath()) {
      return;
    }

    const hashParams = readHashParams();
    const accessToken = hashParams.get('access_token');
    const returnedState = hashParams.get('state');

    if (!accessToken || handledDiscordCallbackTokenRef.current === accessToken) {
      return;
    }

    const expectedState = globalThis.window?.sessionStorage?.getItem(discordStateStorageKey) ?? '';
    if (expectedState && returnedState && expectedState !== returnedState) {
      setDiscordMessage('Discord link could not be verified. Please try again.');
      globalThis.window?.history.replaceState(
        globalThis.window.history.state,
        '',
        `${getWebBasePath()}/`,
      );
      return;
    }

    handledDiscordCallbackTokenRef.current = accessToken;
    globalThis.window?.sessionStorage?.removeItem(discordStateStorageKey);
    setDiscordBusy(true);
    setDiscordMessage('');

    void (async () => {
      await syncDiscordIdentity(accessToken, {
        successMessage: 'Discord linked.',
      });

      globalThis.window?.history.replaceState(
        globalThis.window.history.state,
        '',
        `${getWebBasePath()}/`,
      );
      setSection('profile');
      setDiscordBusy(false);
    })();
  }, [session, syncDiscordIdentity]);

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
          Boolean(existingProfile.discord_user_id) &&
          ((!existingProfile.discord_avatar_url && hasDiscordAvatar) ||
            (!existingProfile.avatar_url && hasDiscordAvatar) ||
            (!existingProfile.display_name && hasDiscordUsername));

        if (needsDiscordBackfill && discordIdentity) {
          const updatePayload: Partial<Profile> = {};

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
        birthday: undefined,
        birthdayVisibility: 'private',
        busyVisibility: 'public',
      });
      return;
    }

    setProfileForm({
      username: profile.username ?? '',
      displayName: profile.display_name ?? '',
      avatarUrl: profile.avatar_url ?? '',
      birthday: getBirthdayDate(profile.birthday_month, profile.birthday_day),
      birthdayVisibility: profile.birthday_visibility ?? 'private',
      busyVisibility: profile.busy_visibility ?? 'public',
    });
  }, [profile]);

  React.useEffect(() => {
    setAccountEmail(session?.user.email ?? '');
  }, [session]);

  const visibleFriends = React.useMemo(() => {
    if (friendFilter === 'pending') {
      return [];
    }

    if (friendFilter === 'favorites') {
      return acceptedFriends.filter((friend) => friend.is_favorite);
    }

    return acceptedFriends;
  }, [acceptedFriends, friendFilter]);

  const lobbyMembersByLobbyId = React.useMemo(
    () =>
      lobbyMembers.reduce<Record<string, LobbyMemberRecord[]>>((accumulator, member) => {
        if (!accumulator[member.lobby_id]) {
          accumulator[member.lobby_id] = [];
        }

        accumulator[member.lobby_id].push(member);
        return accumulator;
      }, {}),
    [lobbyMembers],
  );

  const lobbyHistoryByMemberKey = React.useMemo(
    () =>
      lobbyInviteHistory.reduce<Record<string, LobbyInviteHistoryRecord[]>>((accumulator, entry) => {
        const key = `${entry.lobby_id}:${entry.profile_id}`;
        if (!accumulator[key]) {
          accumulator[key] = [];
        }

        accumulator[key].push(entry);
        return accumulator;
      }, {}),
    [lobbyInviteHistory],
  );

  const getLobbyProfile = React.useCallback(
    (profileId: string) => {
      if (profile?.id === profileId) {
        return profile;
      }

      return lobbyProfileDirectory[profileId] ?? null;
    },
    [lobbyProfileDirectory, profile],
  );

  const getLobbyProfileLabel = React.useCallback(
    (profileId: string) => {
      const linkedProfile = getLobbyProfile(profileId);
      return linkedProfile?.display_name ?? linkedProfile?.username ?? 'Player';
    },
    [getLobbyProfile],
  );

  const getLobbyProfileAvatarUrl = React.useCallback(
    (profileId: string) => resolveAvatarUrl(getLobbyProfile(profileId)),
    [getLobbyProfile],
  );

  const getPublicBirthdayLabel = React.useCallback(
    (candidate: Pick<PublicProfileCard, 'birthday_label'> | null | undefined) => candidate?.birthday_label ?? '',
    [],
  );

  const getMemberHistory = React.useCallback(
    (lobbyId: string, profileId: string) => lobbyHistoryByMemberKey[`${lobbyId}:${profileId}`] ?? [],
    [lobbyHistoryByMemberKey],
  );

  const getCurrentLobbyMembership = React.useCallback(
    (lobbyId: string) => lobbyMembers.find((member) => member.lobby_id === lobbyId && member.profile_id === session?.user?.id) ?? null,
    [lobbyMembers, session],
  );

  const prioritizeBusyBlock = React.useCallback(
    (left: BusyBlock, right: BusyBlock) => {
      if (left.busy_status !== right.busy_status) {
        return left.busy_status === 'busy' ? -1 : 1;
      }

      return left.starts_at.localeCompare(right.starts_at);
    },
    [],
  );

  const getLobbyBusyBlock = React.useCallback(
    (
      lobby: Pick<LobbyRecord, 'id' | 'scheduled_for' | 'scheduled_until'> & {
        games?: Pick<NonNullable<LobbyRecord['games']>, 'title'> | null;
      },
      profileId: string,
    ): BusyBlock | null => {
      if (!lobby.scheduled_for) {
        return null;
      }

      const startAt = new Date(lobby.scheduled_for);
      if (Number.isNaN(startAt.getTime())) {
        return null;
      }

      const explicitEnd = hasExplicitLobbyEnd(lobby);
      const endAt = explicitEnd && lobby.scheduled_until ? new Date(lobby.scheduled_until) : getBusyFallbackEndDate(startAt);
      if (Number.isNaN(endAt.getTime())) {
        return null;
      }

      return {
        profile_id: profileId,
        lobby_id: lobby.id,
        starts_at: startAt.toISOString(),
        ends_at: endAt.toISOString(),
        busy_status: explicitEnd ? 'busy' : 'maybe_busy',
        game_title: lobby.games?.title ?? null,
      };
    },
    [],
  );

  const inviteBusyBlockByProfileId = React.useMemo(
    () =>
      inviteBusyBlocks.reduce<Record<string, BusyBlock>>((accumulator, block) => {
        const existing = accumulator[block.profile_id];
        if (!existing || prioritizeBusyBlock(block, existing) < 0) {
          accumulator[block.profile_id] = block;
        }

        return accumulator;
      }, {}),
    [inviteBusyBlocks, prioritizeBusyBlock],
  );

  const getInviteBusyBlock = React.useCallback(
    (profileId: string) => inviteBusyBlockByProfileId[profileId] ?? null,
    [inviteBusyBlockByProfileId],
  );

  const getCurrentUserConflictBlock = React.useCallback(
    (targetLobby: LobbyRecord) => {
      if (!session?.user?.id) {
        return null;
      }

      const targetWindow = getLobbyBusyBlock(targetLobby, session.user.id);
      if (!targetWindow) {
        return null;
      }

      const overlappingBlocks = lobbies
        .filter((lobby) => lobby.id !== targetLobby.id && lobby.status !== 'closed')
        .map((lobby) => {
          const currentMembership = getCurrentLobbyMembership(lobby.id);
          const isCommitted = lobby.host_profile_id === session.user.id || currentMembership?.rsvp_status === 'accepted';
          if (!isCommitted) {
            return null;
          }

          const block = getLobbyBusyBlock(lobby, session.user.id);
          if (!block) {
            return null;
          }

          return doesTimeRangeOverlap(
            new Date(targetWindow.starts_at),
            new Date(targetWindow.ends_at),
            new Date(block.starts_at),
            new Date(block.ends_at),
          )
            ? block
            : null;
        })
        .filter((block): block is BusyBlock => Boolean(block))
        .sort(prioritizeBusyBlock);

      return overlappingBlocks[0] ?? null;
    },
    [getCurrentLobbyMembership, getLobbyBusyBlock, lobbies, prioritizeBusyBlock, session],
  );

  const createInviteResponseDraft = React.useCallback(
    (lobby: LobbyRecord, member: LobbyMemberRecord | null) => {
      const defaultStartAt =
        member?.suggested_start_at ??
        lobby.scheduled_for ??
        createDefaultLobbyStartDate().toISOString();
      const parsedStartAt = new Date(defaultStartAt);
      const safeStartAt = Number.isNaN(parsedStartAt.getTime()) ? createDefaultLobbyStartDate() : parsedStartAt;
      const defaultEndAt =
        member?.suggested_end_at ??
        lobby.scheduled_until ??
        getDefaultEndDate(safeStartAt).toISOString();
      const parsedEndAt = new Date(defaultEndAt);
      const safeEndAt = Number.isNaN(parsedEndAt.getTime()) ? getDefaultEndDate(safeStartAt) : parsedEndAt;

      return {
        decision:
          member?.rsvp_status === 'declined' || member?.rsvp_status === 'suggested_time'
            ? member.rsvp_status
            : 'accepted',
        comment: member?.response_comment ?? '',
        startAt: safeStartAt.toISOString(),
        endAt: safeEndAt.toISOString(),
      };
    },
    [],
  );

  const getInviteResponseDraft = React.useCallback(
    (lobby: LobbyRecord, member: LobbyMemberRecord | null) => inviteResponseDrafts[lobby.id] ?? createInviteResponseDraft(lobby, member),
    [createInviteResponseDraft, inviteResponseDrafts],
  );

  const updateInviteResponseDraft = React.useCallback(
    (
      lobby: LobbyRecord,
      member: LobbyMemberRecord | null,
      updater:
        | Partial<{
            decision: Exclude<LobbyInviteStatus, 'pending'>;
            comment: string;
            startAt: string;
            endAt: string;
          }>
        | ((current: {
            decision: Exclude<LobbyInviteStatus, 'pending'>;
            comment: string;
            startAt: string;
            endAt: string;
          }) => {
            decision: Exclude<LobbyInviteStatus, 'pending'>;
            comment: string;
            startAt: string;
            endAt: string;
          }),
    ) => {
      setInviteResponseDrafts((current) => {
        const existing = current[lobby.id] ?? createInviteResponseDraft(lobby, member);
        const nextValue = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };

        return {
          ...current,
          [lobby.id]: nextValue,
        };
      });
    },
    [createInviteResponseDraft],
  );

  const getLobbyStatusColors = React.useCallback((status: LobbyInviteStatus, isCurrent: boolean) => {
    if (!isCurrent) {
      return {
        chipStyle: styles.inviteHistoryMutedChip,
        textStyle: styles.inviteHistoryMutedText,
      };
    }

    if (status === 'accepted') {
      return {
        chipStyle: styles.inviteAcceptedChip,
        textStyle: styles.inviteAcceptedText,
      };
    }

    if (status === 'declined') {
      return {
        chipStyle: styles.inviteDeclinedChip,
        textStyle: styles.inviteDeclinedText,
      };
    }

    if (status === 'suggested_time') {
      return {
        chipStyle: styles.inviteSuggestedChip,
        textStyle: styles.inviteSuggestedText,
      };
    }

    return {
      chipStyle: styles.invitePendingChip,
      textStyle: styles.invitePendingText,
    };
  }, []);

  const formatInviteStatusLabel = React.useCallback((status: LobbyInviteStatus) => {
    if (status === 'suggested_time') {
      return 'Suggested time';
    }

    if (status === 'accepted') {
      return 'Accepted';
    }

    if (status === 'declined') {
      return 'Declined';
    }

    return 'Pending';
  }, []);

  const formatHistoryMessage = React.useCallback(
    (entry: LobbyInviteHistoryRecord) => {
      const actionLabel = formatInviteStatusLabel(entry.rsvp_status);
      if (entry.rsvp_status === 'suggested_time' && entry.suggested_start_at && entry.suggested_end_at) {
        return `${actionLabel} | ${formatEventRange(new Date(entry.suggested_start_at), new Date(entry.suggested_end_at))}`;
      }

      return actionLabel;
    },
    [formatInviteStatusLabel],
  );

  const getLobbyMeetupLabel = React.useCallback(
    (lobby: Pick<LobbyRecord, 'meetup_details' | 'discord_guild_name'>) =>
      lobby.meetup_details?.trim()
        ? `Meetup: ${lobby.meetup_details.trim()}`
        : lobby.discord_guild_name
          ? `Meet in Discord: ${lobby.discord_guild_name}`
          : null,
    [],
  );

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
        meetupDetails: '',
      }));
      setSelectedLobbyInviteProfileIds([]);
      setLobbyMessage('');
      setSection('lobbies');
    },
    [
      libraryGames,
      setLobbyForm,
      setLobbyMessage,
      setSection,
      setSelectedLobbyGameId,
      setSelectedLobbyInviteProfileIds,
    ],
  );

  const handleSearchIgdb = React.useCallback(async () => {
    const query = igdbSearchQuery.trim();
    const cooldownEnd = Date.now() + 2000;

    if (!query) {
      setIgdbError('Enter a game title before searching IGDB.');
      setIgdbMessage('');
      setIgdbResults([]);
      setIgdbHasSearched(false);
      return;
    }

    setIgdbSearchLoading(true);
    setIgdbSearchCooldownUntil(cooldownEnd);
    setIgdbError('');
    setIgdbMessage('');
    setIgdbHasSearched(true);

    try {
      const results = await searchIgdbGames(query);
      setIgdbResults(results);
    } catch (error) {
      setIgdbResults([]);
      setIgdbError(error instanceof Error ? error.message : 'Unable to search IGDB right now.');
    } finally {
      setIgdbSearchLoading(false);
    }
  }, [
    igdbSearchQuery,
    setIgdbError,
    setIgdbHasSearched,
    setIgdbSearchCooldownUntil,
    setIgdbMessage,
    setIgdbResults,
    setIgdbSearchLoading,
  ]);

  const handleClearIgdbSearchResults = React.useCallback(() => {
    setIgdbResults([]);
    setIgdbError('');
    setIgdbMessage('');
    setIgdbHasSearched(false);
  }, [setIgdbError, setIgdbHasSearched, setIgdbMessage, setIgdbResults]);

  const handleImportIgdbGame = React.useCallback(
    async (game: IgdbSearchResult, options?: { autoSelectForLobby?: boolean }) => {
      const wasAlreadyImported = importedIgdbIds.includes(game.igdb_id);

      setIgdbImportBusyId(game.igdb_id);
      setIgdbError('');
      setIgdbMessage('');
      setGameActionError('');

      try {
        const importedGame = await importIgdbGame(game);
        await loadGames();
        if (options?.autoSelectForLobby) {
          setSelectedLobbyGameId(importedGame.id);
          setLobbyForm((current) => ({
            ...current,
            title: `${importedGame.title} Lobby`,
            meetupDetails: current.meetupDetails,
          }));
          setSection('lobbies');
          setLobbyMessage(
            wasAlreadyImported
              ? `${importedGame.title} refreshed and selected for this lobby.`
              : `${importedGame.title} added to your library and selected for this lobby.`,
          );
        } else {
          setLobbyMessage('');
        }
        setIgdbMessage(
          options?.autoSelectForLobby
            ? ''
            : wasAlreadyImported
              ? `${importedGame.title} import refreshed.`
              : `${importedGame.title} imported into your library.`,
        );
      } catch (error) {
        setIgdbError(error instanceof Error ? error.message : 'Unable to import that game right now.');
      } finally {
        setIgdbImportBusyId(null);
      }
    },
    [
      importedIgdbIds,
      loadGames,
      setGameActionError,
      setIgdbError,
      setIgdbImportBusyId,
      setIgdbMessage,
      setLobbyForm,
      setLobbyMessage,
      setSection,
      setSelectedLobbyGameId,
    ],
  );

  const handleRequestRemoveGameFromLibrary = React.useCallback((game: GameRecord) => {
    setGameActionError('');
    setGameActionMessage('');
    setGamePendingRemoval(game);
  }, [setGameActionError, setGameActionMessage]);

  const handleConfirmRemoveGameFromLibrary = React.useCallback(async () => {
    if (!session?.user || !gamePendingRemoval) {
      setGamePendingRemoval(null);
      return;
    }

    const gameToRemove = gamePendingRemoval;

    setGameActionBusyId(`remove:${gameToRemove.id}`);
    setGameActionError('');
    setGameActionMessage('');

    const { error } = await supabase.rpc('remove_game_from_library', {
      p_game_id: gameToRemove.id,
    });

    if (error) {
      setGameActionError(error.message);
    } else {
      setLibraryGames((current) => current.filter((game) => game.id !== gameToRemove.id));
      setFavoriteGameIds((current) => current.filter((gameId) => gameId !== gameToRemove.id));
      setRouletteEntries((current) => current.filter((entry) => entry.game_id !== gameToRemove.id));
      setGameActionMessage(`${gameToRemove.title} removed from your library.`);
      setGamePendingRemoval(null);
    }

    setGameActionBusyId(null);
  }, [
    gamePendingRemoval,
    session,
    setFavoriteGameIds,
    setGameActionBusyId,
    setGameActionError,
    setGameActionMessage,
    setLibraryGames,
    setRouletteEntries,
  ]);

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
      if (Number.isNaN(parsedDate.getTime())) {
        setLobbiesError('Pick a valid event start time.');
        setLobbyMessage('');
        return;
      }

      if (lobbyForm.hasExplicitEnd) {
        const parsedEndDate = new Date(lobbyForm.endAt);

        if (Number.isNaN(parsedEndDate.getTime())) {
          setLobbiesError('Pick a valid event end time.');
          setLobbyMessage('');
          return;
        }

        if (parsedEndDate <= parsedDate) {
          setLobbiesError('Pick an end time after the start time.');
          setLobbyMessage('');
          return;
        }

        scheduledUntil = parsedEndDate.toISOString();
      }

      scheduledFor = parsedDate.toISOString();
    } else {
      const now = new Date();
      scheduledFor = now.toISOString();

      if (lobbyForm.hasExplicitEnd) {
        scheduledUntil = getDefaultEndDate(now).toISOString();
      }
    }

    setLobbyBusy(true);
    setLobbiesError('');
    setLobbyMessage('');

    const invitedProfileIds = Array.from(new Set(selectedLobbyInviteProfileIds));
    const { error: lobbyError } = await supabase.rpc('create_lobby_with_invites', {
      p_game_id: selectedLobbyGame.id,
      p_title: title,
      p_scheduled_for: scheduledFor,
      p_scheduled_until: scheduledUntil,
      p_meetup_details: lobbyForm.meetupDetails.trim() || null,
      p_is_private: lobbyForm.visibility === 'private',
      p_invited_profile_ids: invitedProfileIds,
    });

    if (lobbyError) {
      setLobbiesError(lobbyError.message);
      setLobbyBusy(false);
      return;
    }

    await loadLobbies();
    setLobbyMessage(
      invitedProfileIds.length > 0
        ? `Lobby created and ${invitedProfileIds.length} invite${invitedProfileIds.length === 1 ? '' : 's'} sent.`
        : 'Lobby created.',
    );
    setLobbyForm({
      title: `${selectedLobbyGame.title} Lobby`,
      timeMode: 'later',
      startAt: createDefaultLobbyStartDate().toISOString(),
      endAt: createDefaultLobbyEndDate().toISOString(),
      hasExplicitEnd: true,
      scheduledFor: '',
      meetupDetails: '',
      visibility: 'private',
    });
    setSelectedLobbyInviteProfileIds([]);
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
      hasExplicitEnd: hasExplicitLobbyEnd(lobby),
    });
    setLobbiesError('');
    setLobbyMessage('');
    setSection('schedule');
  };

  const handleSaveLobbyTime = async (lobby: LobbyRecord) => {
    if (!session?.user) {
      return;
    }

    if (rescheduleDraft.hasExplicitEnd && rescheduleEndAt <= rescheduleStartAt) {
      setLobbiesError('Pick an end time after the start time.');
      setLobbyMessage('');
      return;
    }

    setLobbyBusy(true);
    setLobbiesError('');
    setLobbyMessage('');

    const { error } = await supabase
      .from('lobbies')
      .update({
        scheduled_for: rescheduleStartAt.toISOString(),
        scheduled_until: rescheduleDraft.hasExplicitEnd ? rescheduleEndAt.toISOString() : null,
      })
      .eq('id', lobby.id);

    if (error) {
      setLobbiesError(error.message);
      setLobbyBusy(false);
      return;
    }

    await loadLobbies();
    setEditingLobbyId(null);
    setLobbyMessage('Lobby time updated.');
    setLobbyBusy(false);
  };

  const handleRespondToLobbyInvite = async (lobby: LobbyRecord, membership: LobbyMemberRecord) => {
    if (!session?.user) {
      return;
    }

    const responseDraft = getInviteResponseDraft(lobby, membership);
    let suggestedStartAt: string | null = null;
    let suggestedEndAt: string | null = null;

    if (responseDraft.decision === 'suggested_time') {
      const parsedStartAt = new Date(responseDraft.startAt);
      const parsedEndAt = new Date(responseDraft.endAt);

      if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
        setLobbiesError('Pick a valid suggested start and end time.');
        setLobbyMessage('');
        return;
      }

      if (parsedEndAt <= parsedStartAt) {
        setLobbiesError('Pick a suggested end time after the start time.');
        setLobbyMessage('');
        return;
      }

      suggestedStartAt = parsedStartAt.toISOString();
      suggestedEndAt = parsedEndAt.toISOString();
    }

    if (responseDraft.decision === 'accepted') {
      const conflictBlock = getCurrentUserConflictBlock(lobby);
      if (conflictBlock && acceptConflictAcknowledgementId !== lobby.id) {
        setLobbiesError('');
        setLobbyMessage(
          conflictBlock.busy_status === 'busy'
            ? `${conflictBlock.game_title ? `${conflictBlock.game_title} is already on your schedule` : 'You already have another game scheduled'} at this time. Tap Save accept again if keeping both is intentional.`
            : `${conflictBlock.game_title ? `${conflictBlock.game_title} may still be running` : 'You may already be busy'} around this time because that session has no set end. Tap Save accept again if you want to keep both.`,
        );
        setAcceptConflictAcknowledgementId(lobby.id);
        return;
      }
    } else if (acceptConflictAcknowledgementId === lobby.id) {
      setAcceptConflictAcknowledgementId(null);
    }

    setLobbyBusy(true);
    setLobbiesError('');
    setLobbyMessage('');

    const { error } = await supabase.rpc('respond_to_lobby_invite', {
      p_lobby_id: lobby.id,
      p_status: responseDraft.decision,
      p_comment: responseDraft.comment.trim() || null,
      p_suggested_start_at: suggestedStartAt,
      p_suggested_end_at: suggestedEndAt,
    });

    if (error) {
      setLobbiesError(error.message);
      setLobbyBusy(false);
      return;
    }

    setInviteResponseDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[lobby.id];
      return nextDrafts;
    });
    setAcceptConflictAcknowledgementId(null);
    await loadLobbies();
    setLobbyMessage(
      responseDraft.decision === 'accepted'
        ? 'Invite accepted.'
        : responseDraft.decision === 'declined'
          ? 'Invite declined.'
          : 'Suggested time sent to the host.',
    );
    setLobbyBusy(false);
  };

  const handleApplySuggestedTime = async (lobby: LobbyRecord, membership: LobbyMemberRecord) => {
    if (!session?.user) {
      return;
    }

    setLobbyBusy(true);
    setLobbiesError('');
    setLobbyMessage('');

    const { error } = await supabase.rpc('apply_lobby_time_suggestion', {
      p_lobby_id: lobby.id,
      p_profile_id: membership.profile_id,
    });

    if (error) {
      setLobbiesError(error.message);
      setLobbyBusy(false);
      return;
    }

    await loadLobbies();
    setLobbyMessage('Suggested time applied. Other invitees have been reset to pending and notified to respond again.');
    setLobbyBusy(false);
  };

  const sendFriendRequest = async (targetProfile: PublicProfileCard) => {
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

  const handleCopyFriendCode = React.useCallback(async () => {
    if (!profile?.friend_code) {
      return;
    }

    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(profile.friend_code);
        setFriendMessage('Friend code copied.');
        setFriendError('');
        return;
      }

      setFriendMessage(`Friend code ready to share: ${profile.friend_code}`);
      setFriendError('');
    } catch {
      setFriendMessage(`Friend code ready to share: ${profile.friend_code}`);
      setFriendError('');
    }
  }, [profile, setFriendError, setFriendMessage]);

  const handleRegenerateFriendCode = React.useCallback(async () => {
    if (!session?.user) {
      return;
    }

    setFriendActionBusyId('regenerate-friend-code');
    setFriendError('');
    setFriendMessage('');

    const { data, error } = await supabase.rpc('regenerate_friend_code');

    if (error) {
      setFriendError(error.message);
      setFriendActionBusyId(null);
      return;
    }

    const nextFriendCode = typeof data === 'string' ? data : null;
    if (nextFriendCode) {
      setProfile((current) => (current ? { ...current, friend_code: nextFriendCode } : current));
      setFriendMessage('Friend code regenerated.');
    }

    setFriendActionBusyId(null);
  }, [session, setFriendActionBusyId, setFriendError, setFriendMessage]);

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

  const getInviteChipTestId = React.useCallback(
    (profileId: string) => `lobby-invite-chip-${profileId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    [],
  );

  const formatHistoryTimestamp = React.useCallback((timestamp: string) => {
    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return 'Recently';
    }

    return parsedTimestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  const renderResponseHistoryCards = React.useCallback(
    (history: LobbyInviteHistoryRecord[]) =>
      history.map((entry, index) => {
        const isCurrent = index === 0;
        const { chipStyle, textStyle } = getLobbyStatusColors(entry.rsvp_status, isCurrent);

        return (
          <Surface
            key={entry.id}
            style={[styles.inviteHistoryCard, isCurrent ? styles.inviteHistoryCurrentCard : styles.inviteHistoryMutedCard]}
            elevation={0}>
            <View style={styles.inviteHistoryHeader}>
              <Chip compact style={chipStyle} textStyle={textStyle}>
                {formatHistoryMessage(entry)}
              </Chip>
              <Text style={styles.friendNote}>{formatHistoryTimestamp(entry.created_at)}</Text>
            </View>
            {entry.comment ? <Text style={styles.listText}>{entry.comment}</Text> : null}
          </Surface>
        );
      }),
    [formatHistoryMessage, formatHistoryTimestamp, getLobbyStatusColors],
  );

  const renderDashboard = () => (
    <DashboardSection
      libraryGames={libraryGames}
      lobbiesCount={lobbies.length}
      onManageFriends={() => setSection('friends')}
      onStartGroupSpin={() => setSection('roulette')}
      roulettePoolCount={roulettePoolGames.length}
      roulettePoolGames={roulettePoolGames}
    />
  );

  const renderFriends = () => {
    const renderLookupRow = (candidate: PublicProfileCard) => {
      const candidateName = candidate.display_name ?? candidate.username ?? 'Player';
      const resolvedAvatarUrl = resolveAvatarUrl(candidate);
      const status = getFriendSearchStatus(candidate.id);

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
              testID={`friend-code-request-${candidate.id}`}>
              Add friend
            </Button>
          ) : (
            <Chip>{status === 'friend' ? 'Already friends' : 'Pending'}</Chip>
          )}
        </View>
      );
    };

    const lookupCard = (
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopCardStretch : null]}>
        <Card.Content>
          <Text variant="titleMedium">Add by friend code</Text>
          <Text style={styles.friendNote}>
            Enter someone's code to preview their profile and send a request on purpose.
          </Text>
          <TextInput
            mode="outlined"
            label="Friend code"
            value={friendCodeInput}
            onChangeText={(value) => setFriendCodeInput(value.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            testID="friend-code-input"
          />
          <View style={styles.cardActions}>
            <Button
              mode="contained"
              onPress={() => {
                void lookupFriendByCode();
              }}
              loading={friendCodeLookupLoading}
              disabled={friendCodeLookupLoading}
              testID="friend-code-lookup-button">
              Find player
            </Button>
          </View>
          {friendCodeLookupLoading ? (
            <View style={styles.inlineLoadingRow}>
              <ActivityIndicator animating size="small" />
              <Text style={styles.friendNote}>Looking up that friend code...</Text>
            </View>
          ) : null}
          {friendCodeLookupResult ? renderLookupRow(friendCodeLookupResult) : null}
          {friendCodeLookupAttempted && !friendCodeLookupLoading && !friendCodeLookupResult ? (
            <Text style={styles.friendNote}>No player found for that friend code.</Text>
          ) : null}
        </Card.Content>
      </Card>
    );

    const pendingRequestsCard =
      friendFilter === 'pending' || incomingFriendRequests.length > 0 || outgoingFriendRequests.length > 0 ? (
        <Card style={[styles.panel, isDesktopWeb ? styles.desktopCardStretch : null]}>
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
      ) : null;

    const friendCards = visibleFriends.map((friend) => {
      const friendName = friend.display_name ?? friend.username ?? 'Player';
      const resolvedAvatarUrl = resolveAvatarUrl(friend);

      return (
        <Card key={friend.id} style={[styles.panel, isDesktopWeb ? styles.desktopFriendTile : null]}>
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
              {getPublicBirthdayLabel(friend) ? (
                <Text style={styles.friendNote}>Birthday: {getPublicBirthdayLabel(friend)}</Text>
              ) : null}
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
    });

    return (
      <View style={styles.sectionStack}>
        <SectionTitle
          title="Friends & contacts"
          subtitle="Share codes on purpose, keep requests intentional, and manage your current friends in one place."
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

        {isDesktopWeb ? (
          <View style={styles.desktopSplitLayout}>
            <View style={styles.desktopBalancedColumn}>{pendingRequestsCard}</View>
            <View style={styles.desktopBalancedColumn}>{lookupCard}</View>
          </View>
        ) : (
          <>
            {pendingRequestsCard}
            {lookupCard}
          </>
        )}

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

        {friendCards.length > 0 ? (
          <View style={isDesktopWeb ? styles.desktopFriendsGrid : styles.sectionStack}>{friendCards}</View>
        ) : null}
        {!friendLoading && visibleFriends.length === 0 && friendFilter !== 'pending' ? (
          <Card style={styles.panel}>
            <Card.Content>
              <Text variant="titleMedium">No friends yet.</Text>
              <Text style={styles.friendNote}>
                Enter a friend code from someone you trust to send the first request.
              </Text>
            </Card.Content>
          </Card>
        ) : null}
      </View>
    );
  };

  const renderGames = () => (
    <GamesSection
      favoriteGameIds={favoriteGameIds}
      filteredGames={filteredGames}
      gameActionBusyId={gameActionBusyId}
      gameActionError={gameActionError}
      gameActionMessage={gameActionMessage}
      gameSearch={gameSearch}
      gamesError={gamesError}
      gamesLoading={gamesLoading}
      igdbError={igdbError}
      igdbHasSearched={igdbHasSearched}
      igdbImportBusyId={igdbImportBusyId}
      igdbMessage={igdbMessage}
      igdbResults={igdbResults}
      igdbSearchCooldownSeconds={igdbSearchCooldownSeconds}
      igdbSearchLoading={igdbSearchLoading}
      igdbSearchQuery={igdbSearchQuery}
      importedIgdbIds={importedIgdbIds}
      libraryGamesCount={libraryGames.length}
      onChangeGameSearch={setGameSearch}
      onChangeIgdbSearchQuery={setIgdbSearchQuery}
      onClearIgdbSearchResults={handleClearIgdbSearchResults}
      onImportIgdbGame={handleImportIgdbGame}
      onPrepareLobbyDraft={prepareLobbyDraft}
      onRequestRemoveFromLibrary={handleRequestRemoveGameFromLibrary}
      onSearchIgdb={handleSearchIgdb}
      onToggleFavorite={toggleFavorite}
      onToggleRoulettePool={toggleRoulettePool}
      rouletteEntries={rouletteEntries}
    />
  );

  const renderRoulette = () => (
    <RouletteSection
      onInviteEveryone={prepareLobbyDraft}
      onOpenGames={() => setSection('games')}
      onSpinAgain={() => {}}
      roulettePoolGames={roulettePoolGames}
    />
  );

  const renderLobbies = () => (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Schedule a game night"
        subtitle="Create hosted sessions, review invite responses, and let invitees accept, decline, or suggest a better time."
      />
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
      <View style={isDesktopWeb ? styles.desktopPanelGrid : styles.sectionStack}>
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
        <Card.Content>
          <Text variant="titleMedium">Incoming invites</Text>
          <Text style={styles.friendNote}>
            Accept, decline, or suggest a better date and time with an optional note for the host.
          </Text>
          {lobbiesLoading ? <Text style={styles.friendNote}>Loading invite responses...</Text> : null}
          {!lobbiesLoading && incomingLobbies.length === 0 ? (
            <Text style={styles.friendNote}>No incoming invites right now.</Text>
          ) : null}
          {!lobbiesLoading &&
            incomingLobbies.map((lobby) => {
              const membership = getCurrentLobbyMembership(lobby.id);
              if (!membership) {
                return null;
              }

              const responseDraft = getInviteResponseDraft(lobby, membership);
              const conflictBlock = getCurrentUserConflictBlock(lobby);
              const history = getMemberHistory(lobby.id, membership.profile_id);
              const { chipStyle, textStyle } = getLobbyStatusColors(membership.rsvp_status, true);
              const parsedDraftStartAt = new Date(responseDraft.startAt);
              const safeDraftStartAt = Number.isNaN(parsedDraftStartAt.getTime())
                ? createDefaultLobbyStartDate()
                : parsedDraftStartAt;
              const parsedDraftEndAt = new Date(responseDraft.endAt);
              const safeDraftEndAt = Number.isNaN(parsedDraftEndAt.getTime())
                ? getDefaultEndDate(safeDraftStartAt)
                : parsedDraftEndAt;

              return (
                <Surface key={`incoming-${lobby.id}`} style={styles.inviteResponseCard} elevation={1}>
                  <View style={styles.inviteCardHeader}>
                    <View style={styles.friendMeta}>
                      <Text variant="titleMedium">{lobby.title}</Text>
                      <Text style={styles.friendNote}>
                        {lobby.games?.title ?? 'Game unavailable'} | {formatLobbyScheduleLabel(lobby)}
                      </Text>
                      <Text style={styles.friendNote}>Host: {getLobbyProfileLabel(lobby.host_profile_id)}</Text>
                      {getLobbyMeetupLabel(lobby) ? (
                        <Text style={styles.friendNote}>{getLobbyMeetupLabel(lobby)}</Text>
                      ) : null}
                    </View>
                    <Chip compact style={chipStyle} textStyle={textStyle}>
                      {formatInviteStatusLabel(membership.rsvp_status)}
                    </Chip>
                  </View>
                  {conflictBlock ? (
                    <View style={styles.inviteBusyMeta}>
                      <Chip
                        compact
                        style={conflictBlock.busy_status === 'busy' ? styles.friendBusyChip : styles.friendMaybeBusyChip}
                        textStyle={
                          conflictBlock.busy_status === 'busy' ? styles.friendBusyText : styles.friendMaybeBusyText
                        }>
                        {getBusyStatusLabel(conflictBlock.busy_status)}
                      </Chip>
                      <Text style={styles.friendNote}>{formatBusyBlockNote(conflictBlock)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.inviteDecisionRow}>
                    <Chip
                      selected={responseDraft.decision === 'accepted'}
                      onPress={() => updateInviteResponseDraft(lobby, membership, { decision: 'accepted' })}
                      testID={`lobby-response-accept-${lobby.id}`}>
                      Accept
                    </Chip>
                    <Chip
                      selected={responseDraft.decision === 'declined'}
                      onPress={() => updateInviteResponseDraft(lobby, membership, { decision: 'declined' })}
                      testID={`lobby-response-decline-${lobby.id}`}>
                      Decline
                    </Chip>
                    <Chip
                      selected={responseDraft.decision === 'suggested_time'}
                      onPress={() => updateInviteResponseDraft(lobby, membership, { decision: 'suggested_time' })}
                      testID={`lobby-response-suggest-${lobby.id}`}>
                      Suggest new time
                    </Chip>
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Comment (optional)"
                    multiline
                    value={responseDraft.comment}
                    onChangeText={(value) => updateInviteResponseDraft(lobby, membership, { comment: value })}
                    style={styles.input}
                    testID={`lobby-response-comment-${lobby.id}`}
                  />
                  {responseDraft.decision === 'suggested_time' ? (
                    <View style={styles.pickerFieldGroup}>
                      <DatePickerInput
                        locale="en"
                        label="Suggested date"
                        value={safeDraftStartAt}
                        onChange={(nextDate) => {
                          if (nextDate) {
                            updateInviteResponseDraft(lobby, membership, (current) => ({
                              ...current,
                              startAt: setDatePart(safeDraftStartAt, nextDate).toISOString(),
                              endAt: setDatePart(safeDraftEndAt, nextDate).toISOString(),
                            }));
                          }
                        }}
                        inputMode="start"
                        mode="outlined"
                        withModal
                        style={styles.input}
                        testID={`lobby-suggest-date-${lobby.id}`}
                      />
                      <TimeRangePicker
                        startAt={safeDraftStartAt}
                        endAt={safeDraftEndAt}
                        onStartAtChange={(startAt) => {
                          const currentDurationMs = Math.max(
                            safeDraftEndAt.getTime() - safeDraftStartAt.getTime(),
                            60 * 60 * 1000,
                          );
                          const nextEndAt = new Date(startAt.getTime() + currentDurationMs);

                          updateInviteResponseDraft(lobby, membership, {
                            startAt: startAt.toISOString(),
                            endAt: nextEndAt.toISOString(),
                          });
                        }}
                        onEndAtChange={(endAt) =>
                          updateInviteResponseDraft(lobby, membership, {
                            endAt: endAt.toISOString(),
                          })
                        }
                        startTestID={`lobby-suggest-start-${lobby.id}`}
                        endTestID={`lobby-suggest-end-${lobby.id}`}
                      />
                    </View>
                  ) : null}
                  <Button
                    mode="contained"
                    onPress={() => handleRespondToLobbyInvite(lobby, membership)}
                    loading={lobbyBusy}
                    disabled={lobbyBusy}
                    testID={`lobby-response-submit-${lobby.id}`}>
                    {responseDraft.decision === 'accepted'
                      ? 'Save accept'
                      : responseDraft.decision === 'declined'
                        ? 'Save decline'
                        : 'Send suggested time'}
                  </Button>
                  {history.length > 0 ? (
                    <View style={styles.inviteHistorySection}>
                      <Text variant="titleSmall" style={styles.eventTimeTitle}>
                        Your response history
                      </Text>
                      {renderResponseHistoryCards(history)}
                    </View>
                  ) : null}
                </Surface>
              );
            })}
        </Card.Content>
      </Card>
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopFullSpan : null]}>
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
            {gamesLoading && libraryGames.length === 0 ? (
              <Surface style={styles.inputShell} elevation={0}>
                <View style={styles.inlineLoadingRow}>
                  <ActivityIndicator animating size="small" />
                  <Text style={styles.friendNote}>Loading your library...</Text>
                </View>
              </Surface>
            ) : null}
            {!gamesLoading && libraryGames.length === 0 ? (
              <Surface style={styles.inputShell} elevation={0}>
                <Text style={styles.friendNote}>
                  Pick a game from your library to create a lobby.
                </Text>
                <Text style={styles.friendNote}>
                  If this is your first one, import a game here and we&apos;ll use it right away.
                </Text>
                <View style={styles.igdbSearchRow}>
                  <Searchbar
                    placeholder="Search IGDB by game title"
                    value={igdbSearchQuery}
                    onChangeText={setIgdbSearchQuery}
                    onSubmitEditing={() => {
                      handleSearchIgdb();
                    }}
                    style={styles.igdbSearchInputInline}
                    testID="lobby-igdb-search-input"
                  />
                  <Button
                    mode="contained"
                    onPress={handleSearchIgdb}
                    loading={igdbSearchLoading}
                    disabled={igdbSearchLoading || igdbSearchCooldownSeconds > 0 || igdbSearchQuery.trim().length < 2}
                    testID="lobby-igdb-search-button">
                    {igdbSearchCooldownSeconds > 0 ? `Search again in ${igdbSearchCooldownSeconds}s` : 'Search IGDB'}
                  </Button>
                </View>
                {igdbSearchQuery.trim().length > 0 && igdbSearchQuery.trim().length < 2 ? (
                  <HelperText type="info" visible testID="lobby-igdb-short-query-helper">
                    Start with at least 2 letters so we can find the right game.
                  </HelperText>
                ) : null}
                {igdbError ? (
                  <HelperText type="error" visible>
                    {igdbError}
                  </HelperText>
                ) : null}
                {igdbSearchCooldownSeconds > 0 ? (
                  <HelperText type="info" visible>
                    Give IGDB a second between searches so we stay under the live API rate limit.
                  </HelperText>
                ) : null}
                {igdbMessage ? (
                  <HelperText type="info" visible style={styles.successText}>
                    {igdbMessage}
                  </HelperText>
                ) : null}
                {!igdbSearchLoading && (igdbResults.length > 0 || Boolean(igdbError) || Boolean(igdbMessage) || igdbHasSearched) ? (
                  <View style={styles.igdbDismissRow}>
                    <IconButton
                      icon="close"
                      size={18}
                      onPress={handleClearIgdbSearchResults}
                      accessibilityLabel="Close IGDB search results"
                      testID="lobby-igdb-close-results-button"
                    />
                  </View>
                ) : null}
                {igdbResults.map((game) => {
                  const alreadyImported = importedIgdbIds.includes(game.igdb_id);

                  return (
                    <Card key={`lobby-igdb-${game.igdb_id}`} style={styles.igdbResultCard} testID={`lobby-igdb-result-${game.igdb_id}`}>
                      <Card.Content>
                        <View style={styles.igdbResultRow}>
                          {game.cover_url ? (
                            <Avatar.Image size={52} source={{ uri: game.cover_url }} style={styles.avatar} />
                          ) : (
                            <Surface style={styles.igdbCoverPlaceholder} elevation={0}>
                              <Text style={styles.igdbCoverPlaceholderText}>IGDB</Text>
                            </Surface>
                          )}
                          <View style={styles.igdbResultMeta}>
                            <Text variant="titleMedium">{game.title}</Text>
                            <Text style={styles.friendNote}>
                              {game.genre} | {game.platform}
                            </Text>
                            <View style={styles.quickPath}>
                              <Chip compact>{game.player_count}</Chip>
                              {game.release_date ? (
                                <Chip compact>Released {formatReleaseDateLabel(game.release_date)}</Chip>
                              ) : null}
                              {typeof game.rating === 'number' ? <Chip compact>Rating {Math.round(game.rating)}</Chip> : null}
                              {alreadyImported ? <Chip compact icon="check-circle">Imported</Chip> : null}
                            </View>
                            <Text style={styles.listText}>{game.description ?? 'No IGDB summary available yet.'}</Text>
                          </View>
                        </View>
                        <View style={styles.cardActions}>
                          <Button
                            mode="contained-tonal"
                            onPress={() => handleImportIgdbGame(game, { autoSelectForLobby: true })}
                            loading={igdbImportBusyId === game.igdb_id}
                            disabled={igdbImportBusyId !== null}
                            testID={`lobby-igdb-import-button-${game.igdb_id}`}>
                            {alreadyImported ? 'Refresh import' : 'Import and use'}
                          </Button>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
                {igdbHasSearched && !igdbSearchLoading && !igdbError && igdbResults.length === 0 ? (
                  <Text style={styles.friendNote} testID="lobby-igdb-empty-state">
                    No IGDB games matched that search yet.
                  </Text>
                ) : null}
              </Surface>
            ) : null}
            {libraryGames.length > 0 ? (
              <LobbyGameCarousel
                games={libraryGames}
                selectedGameId={selectedLobbyGameId}
                onSelectGame={(game) => {
                  setSelectedLobbyGameId(game.id);
                  setLobbyForm((current) => ({
                    ...current,
                    title: `${game.title} Lobby`,
                  }));
                  setLobbyMessage('');
                }}
              />
            ) : null}
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
              hasExplicitEnd={lobbyForm.hasExplicitEnd}
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
              onToggleHasExplicitEnd={(nextValue) =>
                setLobbyForm((current) => ({
                  ...current,
                  hasExplicitEnd: nextValue,
                  endAt:
                    nextValue && new Date(current.endAt) <= new Date(current.startAt)
                      ? getDefaultEndDate(new Date(current.startAt)).toISOString()
                      : current.endAt,
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
                  Invite accepted friends. Their responses will persist in `lobby_members`.
                </Text>
              </View>
            </View>
            {inviteReadyFriends.length > 0 ? (
              <View style={styles.quickPath}>
                {inviteReadyFriends.map((friend) => {
                  const busyBlock = getInviteBusyBlock(friend.id);

                  return (
                    <View key={friend.id} style={styles.inviteTargetGroup}>
                      <Chip
                        selected={selectedLobbyInviteProfileIds.includes(friend.id)}
                        onPress={() =>
                          setSelectedLobbyInviteProfileIds((current) =>
                            current.includes(friend.id)
                              ? current.filter((profileId) => profileId !== friend.id)
                              : [...current, friend.id],
                          )
                        }
                        testID={getInviteChipTestId(friend.id)}>
                        {friend.label}
                      </Chip>
                      {busyBlock ? (
                        <View style={styles.inviteBusyMeta}>
                          <Chip
                            compact
                            style={busyBlock.busy_status === 'busy' ? styles.friendBusyChip : styles.friendMaybeBusyChip}
                            textStyle={
                              busyBlock.busy_status === 'busy' ? styles.friendBusyText : styles.friendMaybeBusyText
                            }>
                            {getBusyStatusLabel(busyBlock.busy_status)}
                          </Chip>
                          <Text style={styles.friendNote}>{formatBusyBlockNote(busyBlock)}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.friendNote}>
                Invite availability starts once you have accepted friends in your list.
              </Text>
            )}
          </View>
          <View style={styles.schedulerStep}>
            <View style={styles.schedulerStepHeader}>
              <Text style={styles.stepBadge}>4</Text>
              <View style={styles.friendMeta}>
                <Text variant="titleSmall" style={styles.eventTimeTitle}>
                  Meetup details
                </Text>
                <Text style={styles.friendNote}>
                  Optional. Add a Discord room, party chat, stream room, or any meetup note.
                </Text>
              </View>
            </View>
            <TextInput
              mode="outlined"
              label="Meetup details (optional)"
              value={lobbyForm.meetupDetails}
              onChangeText={(value) =>
                setLobbyForm((current) => ({
                  ...current,
                  meetupDetails: value,
                }))
              }
              style={styles.input}
              testID="lobby-meetup-details-input"
            />
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
                ? lobbyForm.hasExplicitEnd
                  ? 'Starts now'
                  : 'Starts now · No set end time'
                : formatLobbyScheduleLabel({
                    scheduled_for: selectedLobbyStartAt.toISOString(),
                    scheduled_until: lobbyForm.hasExplicitEnd ? selectedLobbyEndAt.toISOString() : null,
                  })}
            </Chip>
            <Chip icon="account">
              Host: {profile?.display_name ?? profile?.username ?? 'You'}
            </Chip>
            {lobbyForm.meetupDetails.trim() ? (
              <Chip icon="map-marker">
                {lobbyForm.meetupDetails.trim()}
              </Chip>
            ) : null}
            {selectedLobbyInviteProfileIds.length > 0 ? (
              <Chip icon="account-multiple">
                {selectedLobbyInviteProfileIds.length} invite{selectedLobbyInviteProfileIds.length === 1 ? '' : 's'} ready
              </Chip>
            ) : null}
          </View>
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
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
        <Card.Content>
          <Text variant="titleMedium">Hosted lobbies</Text>
          <Text style={styles.friendNote}>
            Review invite status, read comments, and apply suggested times without leaving the lobby workflow.
          </Text>
          {lobbiesLoading ? <Text style={styles.friendNote}>Loading hosted lobby details...</Text> : null}
          {!lobbiesLoading && hostedLobbies.length === 0 ? (
            <Text style={styles.friendNote}>Create your first hosted session from a game or roulette pick.</Text>
          ) : null}
          {!lobbiesLoading &&
            hostedLobbies.map((lobby) => {
              const hostedMembers = (lobbyMembersByLobbyId[lobby.id] ?? []).filter((member) => member.role === 'member');

              return (
                <Surface key={`hosted-${lobby.id}`} style={styles.inviteResponseCard} elevation={1}>
                  <View style={styles.inviteCardHeader}>
                    <View style={styles.friendMeta}>
                      <Text variant="titleMedium">{lobby.title}</Text>
                      <Text style={styles.friendNote}>
                        {lobby.games?.title ?? 'Game unavailable'} | {formatLobbyScheduleLabel(lobby)}
                      </Text>
                      <Text style={styles.friendNote}>{lobby.is_private ? 'Private lobby' : 'Public lobby'}</Text>
                      {getLobbyMeetupLabel(lobby) ? (
                        <Text style={styles.friendNote}>{getLobbyMeetupLabel(lobby)}</Text>
                      ) : null}
                    </View>
                    <Chip compact style={styles.statusChip}>
                      {hostedMembers.length} invitee{hostedMembers.length === 1 ? '' : 's'}
                    </Chip>
                  </View>
                  <View style={styles.cardActions}>
                    <Button mode="contained-tonal" onPress={() => startLobbyReschedule(lobby)}>
                      Reschedule
                    </Button>
                    <Button mode="text" onPress={() => setSection('inbox')}>
                      Send reminder
                    </Button>
                  </View>
                  {hostedMembers.length === 0 ? (
                    <Text style={styles.friendNote}>No invitees on this lobby yet.</Text>
                  ) : (
                    (['pending', 'accepted', 'suggested_time', 'declined'] as LobbyInviteStatus[]).map((status) => {
                      const membersForStatus = hostedMembers.filter((member) => member.rsvp_status === status);
                      if (membersForStatus.length === 0) {
                        return null;
                      }

                      return (
                        <View key={`${lobby.id}-${status}`} style={styles.inviteGroupSection}>
                          <Text variant="titleSmall" style={styles.eventTimeTitle}>
                            {formatInviteStatusLabel(status)}
                          </Text>
                          {membersForStatus.map((member) => {
                            const history = getMemberHistory(lobby.id, member.profile_id);
                            const { chipStyle, textStyle } = getLobbyStatusColors(member.rsvp_status, true);
                            const avatarUrl = getLobbyProfileAvatarUrl(member.profile_id);
                            const memberLabel = getLobbyProfileLabel(member.profile_id);

                            return (
                              <Surface key={`${lobby.id}-${member.profile_id}`} style={styles.hostMemberCard} elevation={0}>
                                <View style={styles.friendRow}>
                                  {avatarUrl ? (
                                    <Avatar.Image size={42} source={{ uri: avatarUrl }} style={styles.avatar} />
                                  ) : (
                                    <Avatar.Text
                                      size={42}
                                      label={memberLabel.slice(0, 2).toUpperCase()}
                                      style={styles.avatar}
                                    />
                                  )}
                                  <View style={styles.friendMeta}>
                                    <Text variant="titleSmall">{memberLabel}</Text>
                                    {member.suggested_start_at && member.suggested_end_at ? (
                                      <Text style={styles.friendNote}>
                                        Suggested: {formatEventRange(new Date(member.suggested_start_at), new Date(member.suggested_end_at))}
                                      </Text>
                                    ) : null}
                                    {member.response_comment ? (
                                      <Text style={styles.listText}>{member.response_comment}</Text>
                                    ) : (
                                      <Text style={styles.friendNote}>No comment added.</Text>
                                    )}
                                  </View>
                                  <Chip compact style={chipStyle} textStyle={textStyle}>
                                    {formatInviteStatusLabel(member.rsvp_status)}
                                  </Chip>
                                </View>
                                {member.rsvp_status === 'suggested_time' ? (
                                  <Button
                                    mode="contained"
                                    onPress={() => handleApplySuggestedTime(lobby, member)}
                                    loading={lobbyBusy}
                                    disabled={lobbyBusy}
                                    testID={`apply-lobby-suggestion-${lobby.id}-${member.profile_id}`}>
                                    Apply suggested time
                                  </Button>
                                ) : null}
                                {history.length > 0 ? (
                                  <View style={styles.inviteHistorySection}>
                                    <Text variant="titleSmall" style={styles.eventTimeTitle}>
                                      Response history
                                    </Text>
                                    {renderResponseHistoryCards(history)}
                                  </View>
                                ) : null}
                              </Surface>
                            );
                          })}
                        </View>
                      );
                    })
                  )}
                </Surface>
              );
            })}
        </Card.Content>
      </Card>
      </View>
    </View>
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
            Hosted and accepted lobbies count as booked time. Sessions without a set end show as Maybe busy to friends.
          </Text>
          {lobbies.length === 0 ? (
            <Text style={styles.friendNote}>No scheduled lobbies yet. Create one from the Lobbies tab.</Text>
          ) : null}
          {lobbies.map((lobby) => {
            const isHost = lobby.host_profile_id === session?.user?.id;
            const currentMembership = getCurrentLobbyMembership(lobby.id);
            const isEditing = isHost && editingLobbyId === lobby.id;
            const membershipColors = currentMembership
              ? getLobbyStatusColors(currentMembership.rsvp_status, true)
              : null;

            return (
              <Surface key={`${lobby.id}-schedule`} style={styles.scheduleEventCard} elevation={1}>
                <View style={styles.eventTimeHeader}>
                  <View style={styles.friendMeta}>
                    <Text variant="titleMedium">{lobby.title}</Text>
                    <Text style={styles.friendNote}>
                      {lobby.games?.title ?? 'Game unavailable'} | {formatLobbyScheduleLabel(lobby)}
                    </Text>
                    {getLobbyMeetupLabel(lobby) ? (
                      <Text style={styles.friendNote}>{getLobbyMeetupLabel(lobby)}</Text>
                    ) : null}
                    {!isHost && currentMembership ? (
                      <Text style={styles.friendNote}>
                        Your current response: {formatInviteStatusLabel(currentMembership.rsvp_status)}
                      </Text>
                    ) : null}
                    {!hasExplicitLobbyEnd(lobby) ? (
                      <Text style={styles.friendNote}>
                        Friends will see this as Maybe busy because the session has no set end time.
                      </Text>
                    ) : null}
                  </View>
                  {isHost ? (
                    <Button
                      mode={isEditing ? 'text' : 'contained-tonal'}
                      compact
                      onPress={() => (isEditing ? setEditingLobbyId(null) : startLobbyReschedule(lobby))}
                      testID={`schedule-edit-lobby-${lobby.id}`}>
                      {isEditing ? 'Cancel' : 'Edit time'}
                    </Button>
                  ) : currentMembership && membershipColors ? (
                    <Chip compact style={membershipColors.chipStyle} textStyle={membershipColors.textStyle}>
                      {formatInviteStatusLabel(currentMembership.rsvp_status)}
                    </Chip>
                  ) : null}
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
                            hasExplicitEnd: current.hasExplicitEnd,
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
                      hasExplicitEnd={rescheduleDraft.hasExplicitEnd}
                      onToggleHasExplicitEnd={(nextValue) =>
                        setRescheduleDraft((current) => ({
                          ...current,
                          hasExplicitEnd: nextValue,
                          endAt:
                            nextValue && new Date(current.endAt) <= new Date(current.startAt)
                              ? getDefaultEndDate(new Date(current.startAt)).toISOString()
                              : current.endAt,
                        }))
                      }
                      onStartAtChange={(startAt) => {
                        const currentDurationMs = Math.max(
                          rescheduleEndAt.getTime() - rescheduleStartAt.getTime(),
                          60 * 60 * 1000,
                        );
                        const nextEndAt = new Date(startAt.getTime() + currentDurationMs);

                        setRescheduleDraft((current) => ({
                          ...current,
                          startAt: startAt.toISOString(),
                          endAt: nextEndAt.toISOString(),
                        }));
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
                {!isHost && currentMembership?.response_comment ? (
                  <Text style={styles.friendNote}>{currentMembership.response_comment}</Text>
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

  const renderInbox = () => <InboxSection notifications={notifications} />;

  const renderProfile = () => {
    const resolvedAvatarUrl = resolveAvatarUrl(profile);

    return (
      <View style={styles.sectionStack}>
        <SectionTitle
          title="Profile & settings"
          subtitle="Edit your profile, link Discord, update account security, and keep setup simple."
        />
        <View style={isDesktopWeb ? styles.desktopPanelGrid : styles.sectionStack}>
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
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
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
        <Card.Content style={styles.profileSummary}>
          <Text variant="titleMedium">Your friend code</Text>
          <Text style={styles.friendNote}>
            Share this only with people you want to hear from. You can regenerate it any time.
          </Text>
          <Surface style={styles.friendCodeSurface} elevation={0}>
            <Text selectable style={styles.friendCodeValue} testID="friend-code-value">
              {profile?.friend_code ?? 'Loading...'}
            </Text>
          </Surface>
          <View style={styles.cardActions}>
            <Button
              mode="contained-tonal"
              onPress={() => {
                void handleCopyFriendCode();
              }}
              disabled={!profile?.friend_code}
              testID="copy-friend-code-button">
              Copy code
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                void handleRegenerateFriendCode();
              }}
              loading={friendActionBusyId === 'regenerate-friend-code'}
              disabled={friendActionBusyId !== null}
              testID="regenerate-friend-code-button">
              Regenerate
            </Button>
          </View>
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
        </Card.Content>
      </Card>
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
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
              ? 'Discord is linked for identity, avatar fallback, and account continuity.'
              : 'Link Discord if you want your app identity to match the account you already use with friends.'}
          </Text>
          <Text style={styles.friendNote}>
            Birthday: {profile?.birthday_month && profile?.birthday_day
              ? `${formatBirthdayLabel(profile.birthday_month, profile.birthday_day)} | ${profile.birthday_visibility === 'public' ? 'Public' : 'Private'}`
              : 'Not set'}
          </Text>
          <Text style={styles.friendNote}>
            Busy status: {profile?.busy_visibility === 'private' ? 'Private' : 'Public'}
          </Text>
          <View style={styles.cardActions}>
            {profile?.discord_user_id ? (
              <>
                <Button
                  mode="contained-tonal"
                  onPress={handleDiscordConnect}
                  loading={discordBusy}
                  disabled={discordBusy}
                  testID="discord-refresh-servers-button">
                  Refresh Discord identity
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleDiscordDisconnect}
                  loading={discordBusy}
                  disabled={discordBusy}
                  testID="discord-disconnect-button">
                  Disconnect Discord
                </Button>
              </>
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
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
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
          <DatePickerInput
            locale="en"
            label="Birthday (optional)"
            value={profileForm.birthday}
            onChange={(nextDate) => {
              setProfileForm((current) => ({
                ...current,
                birthday: nextDate
                  ? createBirthdayDate(nextDate.getMonth() + 1, nextDate.getDate())
                  : undefined,
              }));
            }}
            inputMode="start"
            mode="outlined"
            withModal
            style={styles.input}
            testID="profile-birthday-picker-input"
          />
          <Text style={styles.friendNote}>
            Month and day only. The picker uses a full date, but we ignore the year for birthday gaming.
          </Text>
          <SegmentedButtons
            value={profileForm.birthdayVisibility}
            onValueChange={(value) =>
              setProfileForm((current) => ({
                ...current,
                birthdayVisibility: value as 'private' | 'public',
              }))
            }
            style={styles.segmented}
            buttons={[
              { value: 'private', label: 'Private' },
              { value: 'public', label: 'Public' },
            ]}
          />
          <Text style={styles.friendNote}>
            Public birthdays can show up on friend cards and community suggestions.
          </Text>
          <SegmentedButtons
            value={profileForm.busyVisibility}
            onValueChange={(value) =>
              setProfileForm((current) => ({
                ...current,
                busyVisibility: value as 'private' | 'public',
              }))
            }
            style={styles.segmented}
            buttons={[
              { value: 'private', label: 'Busy private' },
              { value: 'public', label: 'Busy public' },
            ]}
          />
          <Text style={styles.friendNote}>
            Public busy status lets friends see which game is blocking your time. Private keeps it to a simple busy warning.
          </Text>
          {profileForm.birthday ? (
            <Button
              mode="text"
              onPress={() =>
                setProfileForm((current) => ({
                  ...current,
                  birthday: undefined,
                  birthdayVisibility: 'private',
                }))
              }
              testID="profile-birthday-clear-button">
              Clear birthday
            </Button>
          ) : null}
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
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
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
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
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
      <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
        <Card.Content>
          <Text variant="titleMedium">Preferences</Text>
          <Text style={styles.listText}>Dark dashboard theme enabled</Text>
          <Text style={styles.listText}>Notifications ready for mobile and Discord</Text>
          <Text style={styles.listText}>Anonymous decline and do-not-invite lists pending backend</Text>
        </Card.Content>
      </Card>
      </View>
      </View>
    );
  };

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
        scopes: 'identify email',
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
    const birthdayMonth = profileForm.birthday ? profileForm.birthday.getMonth() + 1 : null;
    const birthdayDay = profileForm.birthday ? profileForm.birthday.getDate() : null;

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
        birthday_month: birthdayMonth,
        birthday_day: birthdayDay,
        birthday_visibility: birthdayMonth && birthdayDay ? profileForm.birthdayVisibility : 'private',
        busy_visibility: profileForm.busyVisibility,
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

    const providerToken = getSessionProviderToken(session);
    if (profile.discord_user_id && providerToken) {
      await syncDiscordIdentity(providerToken, {
        successMessage: 'Discord identity refreshed.',
      });
      setDiscordBusy(false);
      return;
    }

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

    const redirectUri = `${currentLocation.origin}${getDiscordCallbackPath()}`;
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
      setDiscordBusy(false);
      return;
    }

    const { error: cleanupError } = await supabase
      .from('profile_discord_guilds')
      .delete()
      .eq('profile_id', session.user.id);

    if (cleanupError) {
      setDiscordMessage(cleanupError.message);
      setDiscordBusy(false);
      return;
    }

    setProfile(data);
    setDiscordMessage('Discord link removed.');
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
    setGameActionError('');
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
      } else {
        setGameActionError(error.message);
      }
    } else {
      const { error } = await supabase.from('favorite_games').insert({
        profile_id: session.user.id,
        game_id: gameId,
      });

      if (!error) {
        setFavoriteGameIds((current) => [...current, gameId]);
        setGameActionMessage('Game added to favorites.');
      } else {
        setGameActionError(error.message);
      }
    }

    setGameActionBusyId(null);
  };

  const toggleRoulettePool = async (gameId: string) => {
    if (!session?.user) {
      return;
    }

    setGameActionBusyId(`pool:${gameId}`);
    setGameActionError('');
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
      } else {
        setGameActionError(error.message);
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
      } else if (error) {
        setGameActionError(error.message);
      }
    }

    setGameActionBusyId(null);
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

  const sectionNavigation = isDesktopWeb ? (
    <SegmentedButtons
      value={section}
      onValueChange={(value) => setSection(value as SectionKey)}
      density="small"
      style={styles.segmented}
      buttons={sections}
    />
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.mobileSectionNavScroller}
      contentContainerStyle={styles.mobileSectionNavRow}>
      {sections.map((item) => (
        <Button
          key={item.value}
          mode={section === item.value ? 'contained-tonal' : 'outlined'}
          compact
          onPress={() => setSection(item.value)}
          style={styles.mobileSectionNavButton}
          contentStyle={styles.mobileSectionNavButtonContent}
          testID={`section-nav-${item.value}`}>
          {item.label}
        </Button>
      ))}
    </ScrollView>
  );

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
              ? 'Discord is the fastest way in when you want your app profile to match the identity you already use. Email/password stays as a fallback for testing.'
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
            Recommended: use Discord first if you want connected identity and avatar fallback without rebuilding your profile by hand.
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
        <View style={styles.contentShell}>
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

          {sectionNavigation}

          {content}
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={Boolean(gamePendingRemoval)}
          onDismiss={() => {
            if (gameActionBusyId !== null) {
              return;
            }

            setGamePendingRemoval(null);
          }}>
          <Dialog.Title>Remove from library?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.friendNote}>
              {gamePendingRemoval
                ? `${gamePendingRemoval.title} will be removed from your library only. Favorites and roulette entries for this game will be cleared for you.`
                : 'This will remove the selected game from your library only.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setGamePendingRemoval(null)}
              disabled={gameActionBusyId !== null}
              testID="cancel-remove-game-button">
              Cancel
            </Button>
            <Button
              onPress={() => {
                void handleConfirmRemoveGameFromLibrary();
              }}
              loading={Boolean(gameActionBusyId?.startsWith('remove:'))}
              disabled={gameActionBusyId !== null}
              testID="confirm-remove-game-button">
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="account-plus" label="Add friend" style={styles.fab} onPress={() => {}} />
    </View>
  );
}

