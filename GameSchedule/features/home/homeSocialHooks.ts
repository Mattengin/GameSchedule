import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import { profileSelectFields } from './homeConstants';
import type {
  CommunityMemberRecord,
  CommunityRecord,
  FriendRequestRecord,
  FriendshipRecord,
  Profile,
  SuggestedFriendRecord,
} from './homeTypes';
import { supabase } from '../../services/supabaseClient';

type AcceptedFriend = Profile & {
  is_favorite: boolean;
};

export function useSocialState({
  primaryCommunityId,
  session,
}: {
  primaryCommunityId: string | null | undefined;
  session: Session | null;
}) {
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
    if (!session?.user || !primaryCommunityId) {
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
            .eq('id', primaryCommunityId)
            .maybeSingle(),
          supabase
            .from('community_members')
            .select('community_id, profile_id, role, created_at')
            .eq('community_id', primaryCommunityId),
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
  }, [primaryCommunityId, session]);

  React.useEffect(() => {
    if (!session?.user || friendSearch.trim().length < 2) {
      setFriendSearchResults([]);
      setFriendSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setFriendSearchLoading(true);

      const query = friendSearch.trim();
      const { data, error } = await supabase.rpc('search_profiles', {
        p_query: query,
        p_limit: 6,
      });

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

  const acceptedFriends = React.useMemo<AcceptedFriend[]>(
    () =>
      friendships
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
        .filter((friend): friend is AcceptedFriend => Boolean(friend)),
    [friendDirectory, friendships],
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
    communityBusy,
    communityError,
    communityInviteCode,
    communityLoading,
    communityMembers,
    communityMessage,
    communityName,
    communityProfiles,
    currentCommunity,
    friendActionBusyId,
    friendDirectory,
    friendError,
    friendLoading,
    friendMessage,
    friendRequests,
    friendSearch,
    friendSearchLoading,
    friendSearchResults,
    friendships,
    getFriendRequestLabel,
    getFriendSearchStatus,
    incomingFriendRequests,
    outgoingFriendRequests,
    setCommunityBusy,
    setCommunityError,
    setCommunityInviteCode,
    setCommunityMembers,
    setCommunityMessage,
    setCommunityName,
    setCommunityProfiles,
    setCurrentCommunity,
    setFriendActionBusyId,
    setFriendDirectory,
    setFriendError,
    setFriendMessage,
    setFriendRequests,
    setFriendSearch,
    setFriendships,
    suggestedFriends,
  };
}
