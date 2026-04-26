import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  FriendCodeLookupResult,
  FriendRequestRecord,
  FriendshipRecord,
  PublicProfileCard,
} from './homeTypes';
import { supabase } from '../../services/supabaseClient';

type AcceptedFriend = PublicProfileCard & {
  is_favorite: boolean;
};

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
      setFriendRequests([]);
      setFriendDirectory({});
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
              request.requester_profile_id === session.user.id
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

    const normalizedCode = friendCodeInput.trim();
    if (!normalizedCode) {
      setFriendError('Enter a friend code first.');
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
    setFriendMessage,
    setFriendRequests,
    setFriendships,
  };
}
