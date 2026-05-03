import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  AcceptedFriend,
  FriendCodeLookupResult,
  FriendGroupMembershipRecord,
  FriendGroupRecord,
  FriendRequestRecord,
  FriendshipRecord,
  PublicProfileCard,
} from './homeTypes';
import { normalizeFriendCodeLookupInput } from './homeUtils';
import { supabase } from '../../services/supabaseClient';

export function useSocialState({
  session,
}: {
  session: Session | null;
}) {
  const [friendCodeInput, setFriendCodeInput] = React.useState('');
  const [friendCodeLookupAttempted, setFriendCodeLookupAttempted] = React.useState(false);
  const [friendCodeLookupLoading, setFriendCodeLookupLoading] = React.useState(false);
  const [friendCodeLookupResult, setFriendCodeLookupResult] = React.useState<FriendCodeLookupResult | null>(null);
  const [friendLoading, setFriendLoading] = React.useState(false);
  const [friendError, setFriendError] = React.useState('');
  const [friendMessage, setFriendMessage] = React.useState('');
  const [friendActionBusyId, setFriendActionBusyId] = React.useState<string | null>(null);
  const [friendships, setFriendships] = React.useState<FriendshipRecord[]>([]);
  const [friendGroups, setFriendGroups] = React.useState<FriendGroupRecord[]>([]);
  const [friendGroupMemberships, setFriendGroupMemberships] = React.useState<FriendGroupMembershipRecord[]>([]);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequestRecord[]>([]);
  const [friendDirectory, setFriendDirectory] = React.useState<Record<string, PublicProfileCard>>({});

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

  React.useEffect(() => {
    if (!session?.user) {
      setFriendCodeInput('');
      setFriendCodeLookupAttempted(false);
      setFriendCodeLookupLoading(false);
      setFriendCodeLookupResult(null);
      setFriendships([]);
      setFriendGroups([]);
      setFriendGroupMemberships([]);
      setFriendRequests([]);
      setFriendDirectory({});
      return;
    }

    const loadFriendsData = async () => {
      setFriendLoading(true);
      setFriendError('');

      const [
        { data: friendshipsData, error: friendshipsError },
        { data: groupsData, error: groupsError },
        { data: membershipsData, error: membershipsError },
        { data: requestsData, error: requestsError },
      ] =
        await Promise.all([
          supabase
            .from('friends')
            .select('profile_id, friend_profile_id, is_favorite')
            .eq('profile_id', session.user.id),
          supabase
            .from('friend_groups')
            .select('id, profile_id, name, created_at')
            .eq('profile_id', session.user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('friend_group_members')
            .select('group_id, profile_id, friend_profile_id, created_at')
            .eq('profile_id', session.user.id),
          supabase
            .from('friend_requests')
            .select('id, requester_profile_id, addressee_profile_id, status, created_at')
            .or(`requester_profile_id.eq.${session.user.id},addressee_profile_id.eq.${session.user.id}`)
            .order('created_at', { ascending: false }),
        ]);

      if (friendshipsError || groupsError || membershipsError || requestsError) {
        setFriendError(
          friendshipsError?.message ??
            groupsError?.message ??
            membershipsError?.message ??
            requestsError?.message ??
            'Unable to load friends.',
        );
        setFriendLoading(false);
        return;
      }

      const nextFriendships = (friendshipsData as FriendshipRecord[] | null) ?? [];
      const nextFriendGroups = (groupsData as FriendGroupRecord[] | null) ?? [];
      const nextFriendGroupMemberships = (membershipsData as FriendGroupMembershipRecord[] | null) ?? [];
      const nextRequests = (requestsData as FriendRequestRecord[] | null) ?? [];
      const profileIds = Array.from(
        new Set(
          [
            ...nextFriendships.map((friendship) => friendship.friend_profile_id),
            ...nextRequests.map((request) =>
              request.requester_profile_id === session.user.id
                ? request.addressee_profile_id
                : request.requester_profile_id,
            ),
          ].filter(Boolean),
        ),
      );

      setFriendships(nextFriendships);
      setFriendGroups(nextFriendGroups);
      setFriendGroupMemberships(nextFriendGroupMemberships);
      setFriendRequests(nextRequests);

      if (profileIds.length === 0) {
        setFriendDirectory({});
        setFriendLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await loadVisibleProfiles(profileIds);

      if (profilesError) {
        setFriendError(profilesError.message);
      } else {
        const nextDirectory = profilesData.reduce<Record<string, PublicProfileCard>>(
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

    void loadFriendsData();
  }, [loadVisibleProfiles, session]);

  React.useEffect(() => {
    setFriendCodeLookupAttempted(false);
    setFriendCodeLookupResult(null);
  }, [friendCodeInput]);

  const lookupFriendByCode = React.useCallback(async () => {
    if (!session?.user) {
      return;
    }

    const trimmedInput = friendCodeInput.trim();
    if (!trimmedInput) {
      setFriendError('Enter a friend code first.');
      setFriendCodeLookupAttempted(false);
      setFriendCodeLookupResult(null);
      return;
    }

    const normalizedCode = normalizeFriendCodeLookupInput(trimmedInput);
    if (!normalizedCode) {
      setFriendError('Use a valid friend code like GS-ABCD-EFGH.');
      setFriendCodeLookupAttempted(false);
      setFriendCodeLookupResult(null);
      return;
    }

    setFriendCodeLookupLoading(true);
    setFriendError('');
    setFriendMessage('');

    const { data, error } = await supabase.rpc('lookup_friend_code', {
      p_code: normalizedCode,
    });

    if (error) {
      setFriendError(error.message);
      setFriendCodeLookupResult(null);
    } else {
      const matchedProfile = ((data as FriendCodeLookupResult[] | null) ?? [])[0] ?? null;
      setFriendCodeLookupResult(matchedProfile);
    }

    setFriendCodeLookupAttempted(true);
    setFriendCodeLookupLoading(false);
  }, [friendCodeInput, session]);

  const acceptedFriends = React.useMemo<AcceptedFriend[]>(
    () =>
      friendships
        .map((friendship) => {
          const linkedProfile = friendDirectory[friendship.friend_profile_id];

          if (!linkedProfile) {
            return null;
          }

          const linkedGroups = friendGroupMemberships
            .filter((membership) => membership.friend_profile_id === friendship.friend_profile_id)
            .map((membership) => friendGroups.find((group) => group.id === membership.group_id) ?? null)
            .filter((group): group is FriendGroupRecord => Boolean(group))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
            .map((group) => ({
              id: group.id,
              name: group.name,
            }));

          return {
            ...linkedProfile,
            groups: linkedGroups,
          };
        })
        .filter((friend): friend is AcceptedFriend => Boolean(friend)),
    [friendDirectory, friendGroupMemberships, friendGroups, friendships],
  );

  const incomingFriendRequests = React.useMemo(
    () =>
      friendRequests.filter(
        (request) => request.status === 'pending' && request.addressee_profile_id === session?.user?.id,
      ),
    [friendRequests, session],
  );

  const outgoingFriendRequests = React.useMemo(
    () =>
      friendRequests.filter(
        (request) => request.status === 'pending' && request.requester_profile_id === session?.user?.id,
      ),
    [friendRequests, session],
  );

  const getFriendRequestLabel = React.useCallback(
    (request: FriendRequestRecord) => {
      const otherProfileId =
        request.requester_profile_id === session?.user?.id
          ? request.addressee_profile_id
          : request.requester_profile_id;
      const otherProfile = friendDirectory[otherProfileId];

      return otherProfile?.display_name ?? otherProfile?.username ?? 'Player';
    },
    [friendDirectory, session],
  );

  const getFriendSearchStatus = React.useCallback(
    (candidateId: string) => {
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
    },
    [friendRequests, friendships, session],
  );

  return {
    acceptedFriends,
    friendActionBusyId,
    friendCodeInput,
    friendCodeLookupAttempted,
    friendCodeLookupLoading,
    friendCodeLookupResult,
    friendDirectory,
    friendError,
    friendGroupMemberships,
    friendGroups,
    friendLoading,
    friendMessage,
    friendRequests,
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
    setFriendGroupMemberships,
    setFriendGroups,
    setFriendMessage,
    setFriendRequests,
    setFriendships,
  };
}
