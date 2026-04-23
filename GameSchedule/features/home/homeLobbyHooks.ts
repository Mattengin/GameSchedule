import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import { profileSelectFields } from './homeConstants';
import type {
  GameRecord,
  LobbyInviteHistoryRecord,
  LobbyMemberRecord,
  LobbyRecord,
  Profile,
  RelatedLobbyGameSummary,
} from './homeTypes';
import {
  createDefaultLobbyEndDate,
  createDefaultLobbyStartDate,
  getDefaultEndDate,
  unwrapRelation,
} from './homeUtils';
import { supabase } from '../../services/supabaseClient';

type AcceptedFriend = Profile & {
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
  const [lobbyMembers, setLobbyMembers] = React.useState<LobbyMemberRecord[]>([]);
  const [lobbyInviteHistory, setLobbyInviteHistory] = React.useState<LobbyInviteHistoryRecord[]>([]);
  const [lobbyProfileDirectory, setLobbyProfileDirectory] = React.useState<Record<string, Profile>>({});
  const [selectedLobbyGameId, setSelectedLobbyGameId] = React.useState('');
  const [selectedLobbyInviteProfileIds, setSelectedLobbyInviteProfileIds] = React.useState<string[]>([]);
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

  const loadLobbies = React.useCallback(async () => {
    if (!session?.user) {
      setLobbies([]);
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
        'id, title, scheduled_for, scheduled_until, is_private, status, game_id, host_profile_id, games(id, title, genre, platform, player_count)',
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

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select(profileSelectFields)
      .in('id', profileIds);

    if (profilesError) {
      setLobbyProfileDirectory({});
      setLobbiesError(profilesError.message);
      setLobbiesLoading(false);
      return;
    }

    const nextDirectory = ((profilesData as Profile[] | null) ?? []).reduce<Record<string, Profile>>(
      (accumulator, currentProfile) => {
        accumulator[currentProfile.id] = currentProfile;
        return accumulator;
      },
      {},
    );

    setLobbyProfileDirectory(nextDirectory);
    setLobbiesLoading(false);
  }, [session]);

  React.useEffect(() => {
    void loadLobbies();
  }, [loadLobbies]);

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

  const rescheduleStartAt = React.useMemo(() => {
    const parsedDate = new Date(rescheduleDraft.startAt);
    return Number.isNaN(parsedDate.getTime()) ? createDefaultLobbyStartDate() : parsedDate;
  }, [rescheduleDraft.startAt]);

  const rescheduleEndAt = React.useMemo(() => {
    const parsedDate = new Date(rescheduleDraft.endAt);
    return Number.isNaN(parsedDate.getTime()) ? getDefaultEndDate(rescheduleStartAt) : parsedDate;
  }, [rescheduleDraft.endAt, rescheduleStartAt]);

  return {
    editingLobbyId,
    incomingLobbies,
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
  };
}
