import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  BusyBlock,
  DiscordGuildRecord,
  GameRecord,
  LobbyInviteHistoryRecord,
  LobbyMemberRecord,
  LobbyRecord,
  PublicProfileCard,
  RelatedLobbyGameSummary,
} from './homeTypes';
import {
  getBusyFallbackEndDate,
  createDefaultLobbyEndDate,
  createDefaultLobbyStartDate,
  getDefaultEndDate,
  unwrapRelation,
} from './homeUtils';
import { supabase } from '../../services/supabaseClient';

type AcceptedFriend = PublicProfileCard & {
  is_favorite: boolean;
};

export function useLobbyState({
  acceptedFriends,
  libraryGames,
  session,
}: {
  acceptedFriends: AcceptedFriend[];
  libraryGames: GameRecord[];
  session: Session | null;
}) {
  const [lobbiesLoading, setLobbiesLoading] = React.useState(false);
  const [lobbiesError, setLobbiesError] = React.useState('');
  const [lobbyBusy, setLobbyBusy] = React.useState(false);
  const [lobbyMessage, setLobbyMessage] = React.useState('');
  const [lobbies, setLobbies] = React.useState<LobbyRecord[]>([]);
  const [discordGuilds, setDiscordGuilds] = React.useState<DiscordGuildRecord[]>([]);
  const [inviteBusyBlocks, setInviteBusyBlocks] = React.useState<BusyBlock[]>([]);
  const [lobbyMembers, setLobbyMembers] = React.useState<LobbyMemberRecord[]>([]);
  const [lobbyInviteHistory, setLobbyInviteHistory] = React.useState<LobbyInviteHistoryRecord[]>([]);
  const [lobbyProfileDirectory, setLobbyProfileDirectory] = React.useState<Record<string, PublicProfileCard>>({});
  const [selectedLobbyGameId, setSelectedLobbyGameId] = React.useState('');
  const [selectedLobbyInviteProfileIds, setSelectedLobbyInviteProfileIds] = React.useState<string[]>([]);
  const [editingLobbyId, setEditingLobbyId] = React.useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = React.useState({
    startAt: createDefaultLobbyStartDate().toISOString(),
    endAt: createDefaultLobbyEndDate().toISOString(),
    hasExplicitEnd: true,
  });
  const [lobbyForm, setLobbyForm] = React.useState({
    title: '',
    timeMode: 'later' as 'now' | 'later',
    startAt: createDefaultLobbyStartDate().toISOString(),
    endAt: createDefaultLobbyEndDate().toISOString(),
    hasExplicitEnd: true,
    scheduledFor: '',
    discordGuildId: '',
    visibility: 'private' as 'private' | 'public',
  });

  const loadVisibleProfiles = React.useCallback(async (profileIds: string[]) => {
    if (profileIds.length === 0) {
      return {
        data: [] as PublicProfileCard[],
        error: null,
      };
    }

    const { data, error } = await supabase.rpc('get_visible_profiles', {
      p_profile_ids: profileIds,
    });

    return {
      data: (data as PublicProfileCard[] | null) ?? [],
      error,
    };
  }, []);

  const loadDiscordGuilds = React.useCallback(async () => {
    if (!session?.user) {
      setDiscordGuilds([]);
      return;
    }

    const { data, error } = await supabase
      .from('profile_discord_guilds')
      .select('profile_id, discord_guild_id, name, icon_url, is_owner, synced_at')
      .eq('profile_id', session.user.id)
      .order('name', { ascending: true });

    if (error) {
      setDiscordGuilds([]);
      return;
    }

    setDiscordGuilds((data as DiscordGuildRecord[] | null) ?? []);
  }, [session]);

  const loadLobbies = React.useCallback(async () => {
    if (!session?.user) {
      setLobbies([]);
      setDiscordGuilds([]);
      setLobbyMembers([]);
      setLobbyInviteHistory([]);
      setLobbyProfileDirectory({});
      setLobbiesLoading(false);
      return;
    }

    setLobbiesLoading(true);
    setLobbiesError('');

    const { data, error } = await supabase
      .from('lobbies')
      .select(
        'id, title, scheduled_for, scheduled_until, discord_guild_id, discord_guild_name, discord_guild_icon_url, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
      )
      .order('created_at', { ascending: false });

    if (error) {
      setLobbies([]);
      setLobbyMembers([]);
      setLobbyInviteHistory([]);
      setLobbyProfileDirectory({});
      setLobbiesError(error.message);
      setLobbiesLoading(false);
      return;
    }

    const nextLobbies = ((data ?? []) as (
      Omit<LobbyRecord, 'games'> & {
        games: RelatedLobbyGameSummary[] | RelatedLobbyGameSummary | null;
      }
    )[]).map((lobby) => ({
      ...lobby,
      games: unwrapRelation(lobby.games),
    }));

    setLobbies(nextLobbies);

    const lobbyIds = nextLobbies.map((lobby) => lobby.id);
    if (lobbyIds.length === 0) {
      setLobbyMembers([]);
      setLobbyInviteHistory([]);
      setLobbyProfileDirectory({});
      setLobbiesLoading(false);
      return;
    }

    const [
      { data: membersData, error: membersError },
      { data: historyData, error: historyError },
    ] = await Promise.all([
      supabase
        .from('lobby_members')
        .select(
          'lobby_id, profile_id, role, rsvp_status, response_comment, suggested_start_at, suggested_end_at, responded_at, invited_at, created_at',
        )
        .in('lobby_id', lobbyIds)
        .order('invited_at', { ascending: true }),
      supabase
        .from('lobby_member_response_history')
        .select(
          'id, lobby_id, profile_id, actor_profile_id, rsvp_status, comment, suggested_start_at, suggested_end_at, origin, created_at',
        )
        .in('lobby_id', lobbyIds)
        .order('created_at', { ascending: false }),
    ]);

    if (membersError || historyError) {
      setLobbyMembers([]);
      setLobbyInviteHistory([]);
      setLobbyProfileDirectory({});
      setLobbiesError(membersError?.message ?? historyError?.message ?? 'Unable to load lobby invite details.');
      setLobbiesLoading(false);
      return;
    }

    const nextMembers = (membersData as LobbyMemberRecord[] | null) ?? [];
    const nextHistory = (historyData as LobbyInviteHistoryRecord[] | null) ?? [];
    const profileIds = Array.from(
      new Set(
        [
          ...nextLobbies.map((lobby) => lobby.host_profile_id),
          ...nextMembers.map((member) => member.profile_id),
        ].filter(Boolean),
      ),
    );

    setLobbyMembers(nextMembers);
    setLobbyInviteHistory(nextHistory);

    if (profileIds.length === 0) {
      setLobbyProfileDirectory({});
      setLobbiesLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await loadVisibleProfiles(profileIds);

    if (profilesError) {
      setLobbyProfileDirectory({});
      setLobbiesError(profilesError.message);
      setLobbiesLoading(false);
      return;
    }

    const nextDirectory = profilesData.reduce<Record<string, PublicProfileCard>>(
      (accumulator, currentProfile) => {
        accumulator[currentProfile.id] = currentProfile;
        return accumulator;
      },
      {},
    );

    setLobbyProfileDirectory(nextDirectory);
    setLobbiesLoading(false);
  }, [loadVisibleProfiles, session]);

  React.useEffect(() => {
    void loadLobbies();
  }, [loadLobbies]);

  React.useEffect(() => {
    void loadDiscordGuilds();
  }, [loadDiscordGuilds]);

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
    if (!selectedLobbyGameId) {
      return;
    }

    const selectedGameStillExists = libraryGames.some((game) => game.id === selectedLobbyGameId);
    if (selectedGameStillExists) {
      return;
    }

    const nextGame = libraryGames[0] ?? null;
    setSelectedLobbyGameId(nextGame?.id ?? '');
    setLobbyForm((current) => ({
      ...current,
      title: nextGame ? `${nextGame.title} Lobby` : '',
    }));
  }, [libraryGames, selectedLobbyGameId]);

  const selectedLobbyGame = React.useMemo(
    () => libraryGames.find((game) => game.id === selectedLobbyGameId) ?? null,
    [libraryGames, selectedLobbyGameId],
  );

  const inviteReadyFriends = React.useMemo(() => {
    return [...acceptedFriends]
      .sort((left, right) => {
        if (left.is_favorite === right.is_favorite) {
          const leftName = (left.display_name ?? left.username ?? '').toLowerCase();
          const rightName = (right.display_name ?? right.username ?? '').toLowerCase();
          return leftName.localeCompare(rightName);
        }

        return left.is_favorite ? -1 : 1;
      })
      .map((friend) => ({
        id: friend.id,
        label: friend.display_name ?? friend.username ?? 'Player',
        is_favorite: friend.is_favorite,
      }));
  }, [acceptedFriends]);

  const hostedLobbies = React.useMemo(
    () => lobbies.filter((lobby) => lobby.host_profile_id === session?.user?.id),
    [lobbies, session],
  );

  const incomingLobbies = React.useMemo(() => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return [];
    }

    const joinedLobbyIds = new Set(
      lobbyMembers
        .filter((member) => member.profile_id === currentUserId && member.role === 'member')
        .map((member) => member.lobby_id),
    );

    return lobbies.filter((lobby) => joinedLobbyIds.has(lobby.id));
  }, [lobbies, lobbyMembers, session]);

  const selectedLobbyStartAt = React.useMemo(() => {
    const parsedDate = new Date(lobbyForm.startAt);
    return Number.isNaN(parsedDate.getTime()) ? createDefaultLobbyStartDate() : parsedDate;
  }, [lobbyForm.startAt]);

  const selectedLobbyEndAt = React.useMemo(() => {
    const parsedDate = new Date(lobbyForm.endAt);
    return Number.isNaN(parsedDate.getTime()) ? getDefaultEndDate(selectedLobbyStartAt) : parsedDate;
  }, [lobbyForm.endAt, selectedLobbyStartAt]);

  const selectedLobbyBusyWindowStartAt = React.useMemo(() => {
    if (lobbyForm.timeMode === 'now') {
      return new Date();
    }

    return selectedLobbyStartAt;
  }, [lobbyForm.timeMode, selectedLobbyStartAt]);

  const selectedLobbyBusyWindowEndAt = React.useMemo(() => {
    if (lobbyForm.hasExplicitEnd) {
      return lobbyForm.timeMode === 'now' ? getDefaultEndDate(selectedLobbyBusyWindowStartAt) : selectedLobbyEndAt;
    }

    return getBusyFallbackEndDate(selectedLobbyBusyWindowStartAt);
  }, [lobbyForm.hasExplicitEnd, lobbyForm.timeMode, selectedLobbyBusyWindowStartAt, selectedLobbyEndAt]);

  const rescheduleStartAt = React.useMemo(() => {
    const parsedDate = new Date(rescheduleDraft.startAt);
    return Number.isNaN(parsedDate.getTime()) ? createDefaultLobbyStartDate() : parsedDate;
  }, [rescheduleDraft.startAt]);

  const rescheduleEndAt = React.useMemo(() => {
    const parsedDate = new Date(rescheduleDraft.endAt);
    return Number.isNaN(parsedDate.getTime()) ? getDefaultEndDate(rescheduleStartAt) : parsedDate;
  }, [rescheduleDraft.endAt, rescheduleStartAt]);

  React.useEffect(() => {
    const inviteeIds = inviteReadyFriends.map((friend) => friend.id);

    if (!session?.user || inviteeIds.length === 0) {
      setInviteBusyBlocks([]);
      return;
    }

    let isActive = true;

    const loadInviteBusyBlocks = async () => {
      const { data, error } = await supabase.rpc('get_profile_busy_blocks', {
        p_profile_ids: inviteeIds,
        p_window_start: selectedLobbyBusyWindowStartAt.toISOString(),
        p_window_end: selectedLobbyBusyWindowEndAt.toISOString(),
      });

      if (!isActive) {
        return;
      }

      if (error) {
        setInviteBusyBlocks([]);
        return;
      }

      setInviteBusyBlocks((data as BusyBlock[] | null) ?? []);
    };

    void loadInviteBusyBlocks();

    return () => {
      isActive = false;
    };
  }, [inviteReadyFriends, selectedLobbyBusyWindowEndAt, selectedLobbyBusyWindowStartAt, session]);

  return {
    discordGuilds,
    editingLobbyId,
    incomingLobbies,
    inviteReadyFriends,
    inviteBusyBlocks,
    loadDiscordGuilds,
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
    selectedLobbyBusyWindowEndAt,
    selectedLobbyBusyWindowStartAt,
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
  };
}
