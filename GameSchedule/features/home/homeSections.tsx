import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  HelperText,
  IconButton,
  Portal,
  Searchbar,
  Surface,
  Text,
} from 'react-native-paper';
import { styles } from './homeStyles';
import type {
  AcceptedFriend,
  DashboardUpcomingEvent,
  DashboardUpcomingEventStatus,
  FriendGroupRecord,
  GameRecord,
  IgdbSearchResult,
  PublicProfileCard,
} from './homeTypes';
import {
  SectionTitle,
  formatCalendarDate,
  formatEventTime,
  formatReleaseDateLabel,
  getLobbyEndDate,
  hasExplicitLobbyEnd,
} from './homeUtils';

type DashboardSectionProps = {
  onboardingIncomplete: boolean;
  pendingFriendRequestCount: number;
  pendingLobbyInviteCount: number;
  upcomingEvents: DashboardUpcomingEvent[];
  onCompleteSetup: () => void;
  onCreateLobby: () => void;
  onManageFriends: () => void;
  onOpenFriendRequests: () => void;
  onOpenLobbyInvites: () => void;
  onOpenSchedule: () => void;
  onStartGroupSpin: () => void;
};

function HomeActionCard({
  accent,
  label,
  pulse,
  reducedMotionEnabled,
  testID,
  value,
  onPress,
}: {
  accent: string;
  label: string;
  pulse?: boolean;
  reducedMotionEnabled: boolean;
  testID: string;
  value: string;
  onPress: () => void;
}) {
  const animationValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    animationValue.stopAnimation();

    if (!pulse || reducedMotionEnabled) {
      animationValue.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [animationValue, pulse, reducedMotionEnabled]);

  const animatedScale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });
  const animatedOpacity = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.homeActionCardWrap,
        pulse ? { transform: [{ scale: animatedScale }], opacity: animatedOpacity } : null,
      ]}>
      <Card
        style={[
          styles.homeActionCard,
          { borderColor: accent },
          pulse ? styles.homeActionCardActive : null,
        ]}
        onPress={onPress}
        testID={testID}>
        <Card.Content style={styles.homeActionCardContent}>
          <Text style={styles.homeActionValue}>{value}</Text>
          <Text style={styles.homeActionLabel}>{label}</Text>
        </Card.Content>
      </Card>
    </Animated.View>
  );
}

export function DashboardSection({
  onboardingIncomplete,
  pendingFriendRequestCount,
  pendingLobbyInviteCount,
  upcomingEvents,
  onCompleteSetup,
  onCreateLobby,
  onManageFriends,
  onOpenFriendRequests,
  onOpenLobbyInvites,
  onOpenSchedule,
  onStartGroupSpin,
}: DashboardSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const [reducedMotionEnabled, setReducedMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    let isActive = true;

    const loadReducedMotionPreference = async () => {
      try {
        const nextValue = await AccessibilityInfo.isReduceMotionEnabled();
        if (isActive) {
          setReducedMotionEnabled(Boolean(nextValue));
        }
      } catch {
        if (isActive) {
          setReducedMotionEnabled(false);
        }
      }
    };

    void loadReducedMotionPreference();

    return () => {
      isActive = false;
    };
  }, []);

  const groupedUpcomingEvents = React.useMemo(() => {
    const groupedItems = upcomingEvents.reduce<
      {
        dayKey: string;
        dayLabel: string;
        items: DashboardUpcomingEvent[];
      }[]
    >((accumulator, event) => {
      const eventDate = new Date(event.scheduled_for);
      if (Number.isNaN(eventDate.getTime())) {
        return accumulator;
      }

      const dayKey = eventDate.toISOString().slice(0, 10);
      const existingGroup = accumulator.find((group) => group.dayKey === dayKey);
      if (existingGroup) {
        existingGroup.items.push(event);
        return accumulator;
      }

      accumulator.push({
        dayKey,
        dayLabel: formatCalendarDate(eventDate),
        items: [event],
      });
      return accumulator;
    }, []);

    return groupedItems;
  }, [upcomingEvents]);

  const getUpcomingEventStatusMeta = React.useCallback(
    (status: DashboardUpcomingEventStatus) => {
      if (status === 'hosting') {
        return {
          chipStyle: styles.dashboardHostingChip,
          textStyle: styles.dashboardHostingChipText,
          label: 'Hosting',
        };
      }

      if (status === 'accepted') {
        return {
          chipStyle: styles.inviteAcceptedChip,
          textStyle: styles.inviteAcceptedText,
          label: 'Accepted',
        };
      }

      if (status === 'suggested_time') {
        return {
          chipStyle: styles.inviteSuggestedChip,
          textStyle: styles.inviteSuggestedText,
          label: 'Suggested time',
        };
      }

      return {
        chipStyle: styles.invitePendingChip,
        textStyle: styles.invitePendingText,
        label: 'Pending invite',
      };
    },
    [],
  );

  const agendaCard = (
    <Surface style={[styles.heroCard, styles.dashboardAgendaCard]} elevation={2}>
      <View style={styles.dashboardAgendaHeaderRow}>
        <View style={styles.dashboardAgendaHeaderCopy}>
          <Chip icon="calendar-clock" style={styles.liveChip}>
            Next 7 days
          </Chip>
          <Text variant="displaySmall" style={styles.heroTitle}>
            Play together, faster.
          </Text>
          <Text style={styles.heroCopy}>
            Hosted and accepted game nights from the week ahead, grouped by day so tonight is easy to scan.
          </Text>
        </View>
        <Button mode="outlined" onPress={onOpenSchedule} testID="dashboard-open-schedule-button">
          Open schedule
        </Button>
      </View>
      {groupedUpcomingEvents.length > 0 ? (
        <View style={styles.dashboardAgendaGroups} testID="dashboard-upcoming-events">
          {groupedUpcomingEvents.map((group) => (
            <View key={group.dayKey} style={styles.dashboardAgendaDayGroup}>
              <Text style={styles.dashboardAgendaDayLabel}>{group.dayLabel}</Text>
              <View style={styles.dashboardAgendaDayItems}>
                {group.items.map((event) => {
                  const startAt = new Date(event.scheduled_for);
                  const endAt = getLobbyEndDate({
                    scheduled_for: event.scheduled_for,
                    scheduled_until: event.scheduled_until,
                  });
                  const statusMeta = getUpcomingEventStatusMeta(event.status);
                  const hasExplicitEnd = hasExplicitLobbyEnd({ scheduled_until: event.scheduled_until });
                  const timeLabel = hasExplicitEnd
                    ? `${formatEventTime(startAt)} - ${formatEventTime(endAt)}`
                    : `${formatEventTime(startAt)} start · Flexible end`;
                  const detailLabel =
                    event.game_title && event.game_title !== event.title ? event.game_title : 'Scheduled lobby';

                  return (
                    <Surface
                      key={event.id}
                      style={styles.dashboardAgendaEventCard}
                      elevation={0}
                      testID={`dashboard-event-${event.id}`}>
                      <View style={styles.dashboardAgendaEventHeader}>
                        <View style={styles.dashboardAgendaEventMeta}>
                          <Text variant="titleMedium">{event.title}</Text>
                          <Text style={styles.friendNote}>{detailLabel}</Text>
                        </View>
                        <Chip compact style={statusMeta.chipStyle} textStyle={statusMeta.textStyle}>
                          {statusMeta.label}
                        </Chip>
                      </View>
                      <Text style={styles.dashboardAgendaEventTime}>{timeLabel}</Text>
                    </Surface>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Card style={styles.dashboardAgendaEmptyCard} testID="dashboard-empty-upcoming-events">
          <Card.Content>
            <SectionTitle
              title="Nothing scheduled yet"
              subtitle="If the week is open, start with a fresh lobby or spin a game to get tonight moving."
            />
            <View style={styles.cardActions}>
              <Button mode="contained" onPress={onCreateLobby}>
                Create lobby
              </Button>
              <Button mode="outlined" onPress={onStartGroupSpin}>
                Spin game
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </Surface>
  );

  const actionRow = (
    <View style={styles.statRow}>
      <HomeActionCard
        accent="#7C5CFF"
        label="Upcoming events"
        value={String(upcomingEvents.length)}
        reducedMotionEnabled={reducedMotionEnabled}
        onPress={onOpenSchedule}
        testID="dashboard-card-upcoming-events"
      />
      <HomeActionCard
        accent="#33D1FF"
        label="Lobby invites"
        value={String(pendingLobbyInviteCount)}
        pulse={pendingLobbyInviteCount > 0}
        reducedMotionEnabled={reducedMotionEnabled}
        onPress={onOpenLobbyInvites}
        testID="dashboard-card-lobby-invites"
      />
      <HomeActionCard
        accent="#7DFFB3"
        label="Friend requests"
        value={String(pendingFriendRequestCount)}
        pulse={pendingFriendRequestCount > 0}
        reducedMotionEnabled={reducedMotionEnabled}
        onPress={onOpenFriendRequests}
        testID="dashboard-card-friend-requests"
      />
    </View>
  );

  const quickActionsCard = (
    <Card style={[styles.panel, isDesktopWeb ? styles.desktopPanelTile : null]}>
      <Card.Content>
        <SectionTitle
          title="Start tonight"
          subtitle="Jump straight into the next useful action instead of hunting through tabs."
        />
        <View style={styles.heroActions}>
          <Button mode="contained" onPress={onStartGroupSpin} testID="dashboard-spin-game-button">
            Spin game
          </Button>
          <Button mode="outlined" onPress={onCreateLobby} testID="dashboard-create-lobby-button">
            Create lobby
          </Button>
          <Button mode="outlined" onPress={onManageFriends} testID="dashboard-manage-friends-button">
            Manage friends
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const onboardingNotice = onboardingIncomplete ? (
    <Card style={styles.panel} testID="home-onboarding-notice">
      <Card.Content style={styles.profileSummary}>
        <SectionTitle
          title="Finish setup in Profile"
          subtitle="Add your core account details there before friends, lobbies, and scheduling start depending on them."
        />
        <View style={styles.cardActions}>
          <Button mode="contained-tonal" onPress={onCompleteSetup} testID="home-complete-setup-button">
            Complete setup
          </Button>
        </View>
      </Card.Content>
    </Card>
  ) : null;

  return (
    <View style={styles.sectionStack}>
      {onboardingNotice}
      {agendaCard}
      {actionRow}
      {quickActionsCard}
    </View>
  );
}

type GamesSectionProps = {
  favoriteGameIds: string[];
  filteredGames: GameRecord[];
  libraryGamesCount: number;
  gameActionBusyId: string | null;
  gameActionError: string;
  gameActionMessage: string;
  gameSearch: string;
  gamesError: string;
  gamesLoading: boolean;
  igdbError: string;
  igdbHasSearched: boolean;
  igdbImportBusyId: number | null;
  igdbMessage: string;
  igdbResults: IgdbSearchResult[];
  igdbSearchCooldownSeconds: number;
  igdbSearchLoading: boolean;
  igdbSearchQuery: string;
  importedIgdbIds: number[];
  onChangeGameSearch: (value: string) => void;
  onChangeIgdbSearchQuery: (value: string) => void;
  onClearIgdbSearchResults: () => void;
  onImportIgdbGame: (game: IgdbSearchResult) => void;
  onPrepareLobbyDraft: (gameId: string) => void;
  onRequestRemoveFromLibrary: (game: GameRecord) => void;
  onSearchIgdb: () => void;
  onToggleFavorite: (gameId: string) => void;
};

export function GamesSection({
  favoriteGameIds,
  filteredGames,
  libraryGamesCount,
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
  onChangeGameSearch,
  onChangeIgdbSearchQuery,
  onClearIgdbSearchResults,
  onImportIgdbGame,
  onPrepareLobbyDraft,
  onRequestRemoveFromLibrary,
  onSearchIgdb,
  onToggleFavorite,
}: GamesSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const isCompactLibraryCard = width < 700;
  const normalizedIgdbSearchQuery = igdbSearchQuery.trim();
  const isIgdbSearchQueryTooShort = normalizedIgdbSearchQuery.length > 0 && normalizedIgdbSearchQuery.length < 2;
  const hasLibraryGames = libraryGamesCount > 0;
  const canDismissIgdbSearchOutput =
    !igdbSearchLoading && (igdbResults.length > 0 || Boolean(igdbError) || Boolean(igdbMessage) || igdbHasSearched);

  const igdbImportCard = (
    <Card style={[styles.panel, isDesktopWeb ? styles.desktopCardStretch : null]}>
      <Card.Content>
        <SectionTitle
          title="Import from IGDB"
          subtitle="Search the live IGDB catalog, then import the games you want into your local library."
        />
        <View style={styles.igdbSearchStack}>
          <Searchbar
            placeholder="Search IGDB by game title"
            value={igdbSearchQuery}
            onChangeText={onChangeIgdbSearchQuery}
            onSubmitEditing={() => {
              onSearchIgdb();
            }}
            style={styles.igdbSearchInputStacked}
            testID="igdb-search-input"
          />
          <Button
            mode="contained"
            onPress={onSearchIgdb}
            loading={igdbSearchLoading}
            disabled={igdbSearchLoading || igdbSearchCooldownSeconds > 0 || normalizedIgdbSearchQuery.length < 2}
            style={styles.igdbSearchButton}
            testID="igdb-search-button">
            {igdbSearchCooldownSeconds > 0 ? `Search again in ${igdbSearchCooldownSeconds}s` : 'Search IGDB'}
          </Button>
        </View>
        {isIgdbSearchQueryTooShort ? (
          <HelperText type="info" visible testID="igdb-short-query-helper">
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
        {canDismissIgdbSearchOutput ? (
          <View style={styles.igdbDismissRow}>
            <IconButton
              icon="close"
              size={18}
              onPress={onClearIgdbSearchResults}
              accessibilityLabel="Close IGDB search results"
              testID="igdb-close-results-button"
            />
          </View>
        ) : null}
        {igdbResults.map((game) => {
          const alreadyImported = importedIgdbIds.includes(game.igdb_id);

          return (
            <Card key={game.igdb_id} style={styles.igdbResultCard} testID={`igdb-result-${game.igdb_id}`}>
              <Card.Content>
                <View style={styles.igdbResultRow}>
                  {game.cover_url ? (
                    <Image
                      source={{ uri: game.cover_url }}
                      style={styles.igdbCoverImage}
                      resizeMode="cover"
                    />
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
                      {typeof game.rating === 'number' ? (
                        <Chip compact>Rating {Math.round(game.rating)}</Chip>
                      ) : null}
                      {alreadyImported ? <Chip compact icon="check-circle">Imported</Chip> : null}
                    </View>
                    <Text style={styles.listText}>{game.description ?? 'No IGDB summary available yet.'}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Button
                    mode="contained-tonal"
                    onPress={() => onImportIgdbGame(game)}
                    loading={igdbImportBusyId === game.igdb_id}
                    disabled={igdbImportBusyId !== null}
                    testID={`igdb-import-button-${game.igdb_id}`}>
                    {alreadyImported ? 'Refresh import' : 'Import game'}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        })}
        {igdbHasSearched && !igdbSearchLoading && !igdbError && igdbResults.length === 0 ? (
          <Text style={styles.friendNote} testID="igdb-empty-state">
            No IGDB games matched that search yet.
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );

  const libraryColumn = (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Game library"
        subtitle="Your personal library. Import what you want to keep, then use it for favorites, roulette, and lobbies."
      />
      <Searchbar
        placeholder="Search title, genre, or platform"
        value={gameSearch}
        onChangeText={onChangeGameSearch}
        testID="games-search-input"
      />
      <View style={styles.quickPath}>
        <Chip icon="filter-variant">Genre</Chip>
        <Chip icon="devices">Platform</Chip>
        <Chip icon="star-outline">{gamesLoading ? 'Loading' : `${filteredGames.length} results`}</Chip>
      </View>
      {gamesError ? (
        <HelperText type="info" visible style={styles.helperText}>
          Unable to refresh your library right now: {gamesError}
        </HelperText>
      ) : null}
      {gameActionMessage ? (
        <HelperText type="info" visible style={styles.successText}>
          {gameActionMessage}
        </HelperText>
      ) : null}
      {gameActionError ? (
        <HelperText type="error" visible>
          {gameActionError}
        </HelperText>
      ) : null}
      {filteredGames.map((game) => {
        const isFavorite = favoriteGameIds.includes(game.id);
        const coverFallbackLabel =
          game.title
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || 'GG';

        return (
          <Card key={game.id} style={styles.panel} testID={`game-library-card-${game.id}`}>
            <Card.Content>
              <View style={styles.gameLibraryCardRow}>
                {game.cover_url ? (
                  <Image
                    source={{ uri: game.cover_url }}
                    style={[
                      styles.gameLibraryCoverImage,
                      isCompactLibraryCard ? styles.gameLibraryCoverImageCompact : null,
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <Surface
                    style={[
                      styles.gameLibraryCoverPlaceholder,
                      isCompactLibraryCard ? styles.gameLibraryCoverImageCompact : null,
                    ]}
                    elevation={0}>
                    <Text style={styles.gameLibraryCoverPlaceholderText}>{coverFallbackLabel}</Text>
                    <Text style={styles.gameLibraryCoverPlaceholderSubtext}>Library</Text>
                  </Surface>
                )}
                <View style={styles.gameLibraryMeta}>
                  <Text variant="titleLarge">{game.title}</Text>
                  <Text style={styles.supportingText}>{game.genre}</Text>
                  <Text style={styles.friendNote}>
                    {game.platform} | {game.player_count}
                  </Text>
                  <Text style={styles.listText}>{game.description ?? 'Description coming soon.'}</Text>
                </View>
              </View>
              <View style={styles.quickPath}>
                {isFavorite ? (
                  <Chip icon="star" selected>
                    Favorite
                  </Chip>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <Button
                  mode="contained-tonal"
                  onPress={() => onPrepareLobbyDraft(game.id)}
                  testID={`game-library-create-lobby-${game.id}`}>
                  Create lobby
                </Button>
                <Button
                  mode="text"
                  onPress={() => onToggleFavorite(game.id)}
                  loading={gameActionBusyId === `favorite:${game.id}`}
                  disabled={gameActionBusyId !== null}
                  testID={`game-library-favorite-${game.id}`}>
                  {isFavorite ? 'Unfavorite' : 'Favorite'}
                </Button>
                <Button
                  mode="text"
                  onPress={() => onRequestRemoveFromLibrary(game)}
                  loading={gameActionBusyId === `remove:${game.id}`}
                  disabled={gameActionBusyId !== null}
                  testID={`game-library-remove-${game.id}`}>
                  Remove from library
                </Button>
              </View>
            </Card.Content>
          </Card>
        );
      })}
      {!gamesLoading && !hasLibraryGames ? (
        <Card style={styles.panel} testID="games-empty-library-state">
          <Card.Content>
            <Text variant="titleMedium">Add games to library</Text>
            <Text style={styles.friendNote}>
              Use the IGDB search alongside this library to import the games you actually want to keep.
            </Text>
          </Card.Content>
        </Card>
      ) : null}
      {!gamesLoading && hasLibraryGames && filteredGames.length === 0 ? (
        <Card style={styles.panel} testID="games-empty-state">
          <Card.Content>
            <Text variant="titleMedium">No games matched your search.</Text>
            <Text style={styles.friendNote}>Try a title, genre, or platform keyword.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );

  return (
    isDesktopWeb ? (
      <View style={styles.desktopSplitLayout}>
        <View style={styles.desktopMainColumn}>{libraryColumn}</View>
        <View style={styles.desktopSideColumn}>{igdbImportCard}</View>
      </View>
    ) : (
      <View style={styles.sectionStack}>
        {libraryColumn}
        {igdbImportCard}
      </View>
    )
  );
}

type RouletteSectionProps = {
  acceptedFriends: AcceptedFriend[];
  friendGroups: FriendGroupRecord[];
  libraryGames: GameRecord[];
  onOpenGames: () => void;
  onUseForLobby: (gameId: string, inviteeProfileIds?: string[]) => void;
};

const confettiPalette = ['#7C5CFF', '#33D1FF', '#7DFFB3', '#FFB347', '#FF6B81', '#FFE08A'];
const confettiPieces = Array.from({ length: 14 }, (_, index) => {
  const horizontalDirection = index % 2 === 0 ? -1 : 1;
  const horizontalMultiplier = 18 + (index % 4) * 10;

  return {
    id: index,
    color: confettiPalette[index % confettiPalette.length],
    x: horizontalDirection * horizontalMultiplier,
    y: -55 - (index % 5) * 24,
    rotate: horizontalDirection * (120 + index * 18),
  };
});

const getGamePlaceholderLabel = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'GG';

const getProfileLabel = (profile: Pick<PublicProfileCard, 'display_name' | 'username'>) =>
  profile.display_name ?? profile.username ?? 'Player';

const pickRandomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const shuffleItems = <T,>(items: T[]) => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = nextItems[index];
    nextItems[index] = nextItems[swapIndex];
    nextItems[swapIndex] = currentItem;
  }

  return nextItems;
};

function RouletteConfettiBurst({ token }: { token: number }) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (token === 0) {
      return;
    }

    opacity.setValue(1);
    progress.setValue(0);

    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 1150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(750),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [opacity, progress, token]);

  return (
    <View pointerEvents="none" style={styles.rouletteConfettiOverlay}>
      {confettiPieces.map((piece) => {
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.x],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.y],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${piece.rotate}deg`],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.18, 1],
          outputRange: [0.5, 1, 0.8],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.rouletteConfettiPiece,
              {
                backgroundColor: piece.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function RouletteSection({
  acceptedFriends,
  friendGroups,
  libraryGames,
  onOpenGames,
  onUseForLobby,
}: RouletteSectionProps) {
  const [scopeDialogVisible, setScopeDialogVisible] = React.useState(false);
  const [selectedScopeGameIds, setSelectedScopeGameIds] = React.useState<string[]>([]);
  const [scopeTouched, setScopeTouched] = React.useState(false);
  const [displayGameId, setDisplayGameId] = React.useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);
  const [isSpinningGame, setIsSpinningGame] = React.useState(false);
  const [selectedFriendGroupId, setSelectedFriendGroupId] = React.useState<string | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([]);
  const [friendSpinCount, setFriendSpinCount] = React.useState(0);
  const [isPickingFriends, setIsPickingFriends] = React.useState(false);
  const [confettiToken, setConfettiToken] = React.useState(0);
  const [reducedMotionEnabled, setReducedMotionEnabled] = React.useState(false);
  const spinTimeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const libraryGameIds = React.useMemo(() => libraryGames.map((game) => game.id), [libraryGames]);

  React.useEffect(() => {
    let isActive = true;

    const loadReducedMotionPreference = async () => {
      try {
        const nextValue = await AccessibilityInfo.isReduceMotionEnabled();
        if (isActive) {
          setReducedMotionEnabled(Boolean(nextValue));
        }
      } catch {
        if (isActive) {
          setReducedMotionEnabled(false);
        }
      }
    };

    void loadReducedMotionPreference();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      spinTimeoutsRef.current.forEach((timeoutHandle) => clearTimeout(timeoutHandle));
      spinTimeoutsRef.current = [];
    };
  }, []);

  React.useEffect(() => {
    setSelectedScopeGameIds((current) => {
      if (libraryGameIds.length === 0) {
        return [];
      }

      if (!scopeTouched) {
        return libraryGameIds;
      }

      return current.filter((gameId) => libraryGameIds.includes(gameId));
    });
  }, [libraryGameIds, scopeTouched]);

  React.useEffect(() => {
    if (!selectedFriendGroupId) {
      return;
    }

    if (!friendGroups.some((group) => group.id === selectedFriendGroupId)) {
      setSelectedFriendGroupId(null);
    }
  }, [friendGroups, selectedFriendGroupId]);

  const friendSpinPool = React.useMemo(
    () =>
      [...acceptedFriends]
        .filter((friend) =>
          selectedFriendGroupId
            ? friend.groups.some((group) => group.id === selectedFriendGroupId)
            : true,
        )
        .sort((left, right) => getProfileLabel(left).localeCompare(getProfileLabel(right))),
    [acceptedFriends, selectedFriendGroupId],
  );

  const maxFriendSpinCount = Math.min(6, friendSpinPool.length);

  React.useEffect(() => {
    setFriendSpinCount((current) => {
      if (maxFriendSpinCount === 0) {
        return 0;
      }

      if (current < 1) {
        return Math.min(maxFriendSpinCount, friendSpinPool.length >= 2 ? 2 : 1);
      }

      return Math.min(current, maxFriendSpinCount);
    });
  }, [friendSpinPool.length, maxFriendSpinCount]);

  const scopedGames = React.useMemo(
    () => libraryGames.filter((game) => selectedScopeGameIds.includes(game.id)),
    [libraryGames, selectedScopeGameIds],
  );

  const selectedGame = React.useMemo(
    () => libraryGames.find((game) => game.id === selectedGameId) ?? null,
    [libraryGames, selectedGameId],
  );

  const displayedGame = React.useMemo(() => {
    if (displayGameId) {
      return libraryGames.find((game) => game.id === displayGameId) ?? null;
    }

    if (selectedGame) {
      return selectedGame;
    }

    return scopedGames[0] ?? libraryGames[0] ?? null;
  }, [displayGameId, libraryGames, scopedGames, selectedGame]);

  const selectedFriends = React.useMemo(
    () => acceptedFriends.filter((friend) => selectedFriendIds.includes(friend.id)),
    [acceptedFriends, selectedFriendIds],
  );

  React.useEffect(() => {
    if (selectedGameId && !selectedScopeGameIds.includes(selectedGameId)) {
      setSelectedGameId(null);
    }
  }, [selectedGameId, selectedScopeGameIds]);

  React.useEffect(() => {
    if (!isSpinningGame && displayGameId && !selectedScopeGameIds.includes(displayGameId)) {
      setDisplayGameId(null);
    }
  }, [displayGameId, isSpinningGame, selectedScopeGameIds]);

  React.useEffect(() => {
    if (friendSpinPool.length === 0) {
      setSelectedFriendIds([]);
      return;
    }

    const acceptedFriendIds = new Set(friendSpinPool.map((friend) => friend.id));
    setSelectedFriendIds((current) => current.filter((friendId) => acceptedFriendIds.has(friendId)));
  }, [friendSpinPool]);

  const handleToggleScopeGame = React.useCallback((gameId: string) => {
    setScopeTouched(true);
    setSelectedScopeGameIds((current) =>
      current.includes(gameId) ? current.filter((currentGameId) => currentGameId !== gameId) : [...current, gameId],
    );
  }, []);

  const handleSelectAllGames = React.useCallback(() => {
    setScopeTouched(false);
    setSelectedScopeGameIds(libraryGameIds);
  }, [libraryGameIds]);

  const handleClearScopedGames = React.useCallback(() => {
    setScopeTouched(true);
    setSelectedScopeGameIds([]);
  }, []);

  const handleSpinGame = React.useCallback(() => {
    if (isSpinningGame || scopedGames.length === 0) {
      return;
    }

    spinTimeoutsRef.current.forEach((timeoutHandle) => clearTimeout(timeoutHandle));
    spinTimeoutsRef.current = [];

    const winningGame = pickRandomItem(scopedGames);
    const nextTimeouts: ReturnType<typeof setTimeout>[] = [];
    const stepCount = reducedMotionEnabled ? 10 : 24;
    let elapsedMs = 0;

    setIsSpinningGame(true);
    setSelectedGameId(null);

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const progress = stepIndex / Math.max(stepCount - 1, 1);
      const delayMs = reducedMotionEnabled ? 70 + stepIndex * 20 : 42 + Math.round(progress * progress * 175);
      elapsedMs += delayMs;

      const nextGame =
        stepIndex === stepCount - 1
          ? winningGame
          : scopedGames.length === 1
            ? winningGame
            : pickRandomItem(scopedGames);

      nextTimeouts.push(
        setTimeout(() => {
          setDisplayGameId(nextGame.id);
        }, elapsedMs),
      );
    }

    nextTimeouts.push(
      setTimeout(() => {
        setDisplayGameId(winningGame.id);
        setSelectedGameId(winningGame.id);
        setIsSpinningGame(false);

        if (!reducedMotionEnabled) {
          setConfettiToken((current) => current + 1);
        }
      }, elapsedMs + 16),
    );

    spinTimeoutsRef.current = nextTimeouts;
  }, [isSpinningGame, reducedMotionEnabled, scopedGames]);

  const handleSpinFriends = React.useCallback(() => {
    if (isPickingFriends || maxFriendSpinCount === 0 || friendSpinCount === 0) {
      return;
    }

    setIsPickingFriends(true);
    const randomizedFriends = shuffleItems(friendSpinPool)
      .slice(0, friendSpinCount)
      .map((friend) => friend.id);

    const delayMs = reducedMotionEnabled ? 120 : 520;
    setTimeout(() => {
      setSelectedFriendIds(randomizedFriends);
      setIsPickingFriends(false);
    }, delayMs);
  }, [friendSpinCount, friendSpinPool, isPickingFriends, maxFriendSpinCount, reducedMotionEnabled]);

  const handleUseForLobby = React.useCallback(() => {
    if (!selectedGameId) {
      return;
    }

    onUseForLobby(selectedGameId, selectedFriendIds);
  }, [onUseForLobby, selectedFriendIds, selectedGameId]);

  return (
    <>
      <SectionTitle
        title="Game roulette"
        subtitle="Spin your library, narrow the scope only when you want to, and carry the winner straight into a lobby."
      />
      <Surface style={styles.rouletteHero} elevation={2}>
        <View style={styles.rouletteStage}>
          {displayedGame?.cover_url ? (
            <Image source={{ uri: displayedGame.cover_url }} style={styles.rouletteCoverImage} resizeMode="cover" />
          ) : displayedGame ? (
            <Surface style={styles.rouletteCoverPlaceholder} elevation={0}>
              <Text style={styles.rouletteCoverPlaceholderText}>{getGamePlaceholderLabel(displayedGame.title)}</Text>
              <Text style={styles.rouletteCoverPlaceholderSubtext}>Roulette</Text>
            </Surface>
          ) : (
            <Surface style={styles.rouletteCoverPlaceholder} elevation={0}>
              <Text style={styles.rouletteCoverPlaceholderText}>SPIN</Text>
              <Text style={styles.rouletteCoverPlaceholderSubtext}>Ready</Text>
            </Surface>
          )}
          {!reducedMotionEnabled ? <RouletteConfettiBurst token={confettiToken} /> : null}
        </View>
        <Text variant="headlineMedium" style={styles.rouletteValue} testID="roulette-current-game-title">
          {isSpinningGame ? displayedGame?.title ?? 'Spinning your library...' : selectedGame?.title ?? displayedGame?.title ?? 'Ready to spin'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {libraryGames.length === 0
            ? 'Your library is empty. Add a game from the Games tab first, then come back here to spin.'
            : selectedScopeGameIds.length === 0
              ? 'Choose at least one game in scope before you spin.'
              : isSpinningGame
                ? "Flickering through your scoped games now. We'll slow it down and settle on one winner."
                : selectedGame
                  ? `${selectedGame.genre} | ${selectedGame.platform} | ${selectedGame.player_count}`
                  : `${selectedScopeGameIds.length} of ${libraryGames.length} library game${libraryGames.length === 1 ? '' : 's'} ready for tonight.`}
        </Text>
        <View style={styles.quickPath}>
          <Chip icon="cards-outline" compact testID="roulette-scope-selected-count">
            {selectedScopeGameIds.length === libraryGames.length && libraryGames.length > 0
              ? 'All library games'
              : `${selectedScopeGameIds.length} selected`}
          </Chip>
          {selectedGame ? (
            <Chip icon="trophy" compact>
              Winner locked
            </Chip>
          ) : null}
          {selectedFriends.length > 0 ? (
            <Chip icon="account-multiple" compact>
              {selectedFriends.length} friend{selectedFriends.length === 1 ? '' : 's'} picked
            </Chip>
          ) : null}
        </View>
        <View style={styles.heroActions}>
          <Button
            mode="outlined"
            icon="filter-variant"
            onPress={() => setScopeDialogVisible(true)}
            disabled={libraryGames.length === 0 || isSpinningGame}
            testID="roulette-scope-button">
            Filter
          </Button>
          <Button
            mode="contained"
            onPress={libraryGames.length === 0 ? onOpenGames : handleSpinGame}
            disabled={isSpinningGame || (libraryGames.length > 0 && selectedScopeGameIds.length === 0)}
            testID="roulette-spin-button">
            {libraryGames.length === 0 ? 'Open Games' : selectedGame ? 'Spin again' : 'Spin game'}
          </Button>
          {selectedGame ? (
            <Button mode="contained-tonal" onPress={handleUseForLobby} testID="roulette-use-for-lobby-button">
              Use for lobby
            </Button>
          ) : null}
        </View>
        {selectedScopeGameIds.length === 0 && libraryGames.length > 0 ? (
          <HelperText type="info" visible testID="roulette-scope-empty-state">
            Clear scopes are allowed, but you'll need to add at least one game back before Roulette can spin.
          </HelperText>
        ) : null}
      </Surface>

      <Card style={styles.panel}>
        <Card.Content>
          <SectionTitle
            title="Optional friend spin"
            subtitle="Pick a few accepted friends at random, then carry those invites into the lobby with the winning game."
          />
          {friendGroups.length > 0 ? (
            <View style={styles.friendGroupFilterRow}>
              <Chip
                selected={selectedFriendGroupId === null}
                onPress={() => setSelectedFriendGroupId(null)}
                testID="roulette-friend-group-all">
                All friends
              </Chip>
              {friendGroups.map((group) => (
                <Chip
                  key={`roulette-friend-group-${group.id}`}
                  selected={selectedFriendGroupId === group.id}
                  onPress={() => setSelectedFriendGroupId(group.id)}
                  testID={`roulette-friend-group-${group.id}`}>
                  {group.name}
                </Chip>
              ))}
            </View>
          ) : null}
          {maxFriendSpinCount === 0 ? (
            <Text style={styles.friendNote}>
              Add accepted friends first if you want Roulette to randomize tonight's invite list too.
            </Text>
          ) : (
            <>
              <Text style={styles.friendNote}>Choose how many friends Roulette should pull in this round.</Text>
              <View style={styles.quickPath}>
                {Array.from({ length: maxFriendSpinCount }, (_, index) => {
                  const count = index + 1;
                  return (
                    <Chip
                      key={count}
                      selected={friendSpinCount === count}
                      onPress={() => setFriendSpinCount(count)}
                      testID={`roulette-friend-count-${count}`}>
                      {count}
                    </Chip>
                  );
                })}
              </View>
              <View style={styles.cardActions}>
                <Button
                  mode="contained-tonal"
                  onPress={handleSpinFriends}
                  loading={isPickingFriends}
                  disabled={isPickingFriends}
                  testID="roulette-spin-friends-button">
                  {selectedFriends.length > 0 ? 'Spin friends again' : 'Pick friends'}
                </Button>
                {selectedFriends.length > 0 ? (
                  <Button mode="text" onPress={() => setSelectedFriendIds([])}>
                    Clear picks
                  </Button>
                ) : null}
              </View>
              {selectedFriends.length > 0 ? (
                <View style={styles.quickPath}>
                  {selectedFriends.map((friend) => (
                    <Chip key={friend.id} icon="account" testID={`roulette-selected-friend-${friend.id}`}>
                      {getProfileLabel(friend)}
                    </Chip>
                  ))}
                </View>
              ) : (
                <Text style={styles.friendNote}>No random friend picks yet. Spin whenever you want them included.</Text>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog
          visible={scopeDialogVisible}
          onDismiss={() => setScopeDialogVisible(false)}
          style={styles.rouletteScopeDialog}
          testID="roulette-scope-dialog">
          <Dialog.Title>Filter games</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.friendNote}>
              Start from your full library, then narrow the spin only when tonight needs a shorter list.
            </Text>
            <View style={styles.cardActions}>
              <Button mode="text" onPress={handleSelectAllGames} disabled={libraryGames.length === 0}>
                Select all
              </Button>
              <Button mode="text" onPress={handleClearScopedGames} disabled={libraryGames.length === 0}>
                Clear all
              </Button>
            </View>
          </Dialog.Content>
          <View style={styles.rouletteScopeDialogScrollShell}>
            <ScrollView style={styles.rouletteScopeDialogScrollArea} contentContainerStyle={styles.rouletteScopeDialogContent}>
              {libraryGames.map((game) => {
                const isSelected = selectedScopeGameIds.includes(game.id);

                return (
                  <Card
                    key={game.id}
                    style={[styles.rouletteScopeGameRow, isSelected ? styles.rouletteScopeGameRowSelected : null]}
                    onPress={() => handleToggleScopeGame(game.id)}
                    testID={`roulette-scope-game-${game.id}`}>
                    <Card.Content style={styles.rouletteScopeGameRowContent}>
                      {game.cover_url ? (
                        <Image source={{ uri: game.cover_url }} style={styles.rouletteScopeGameThumb} resizeMode="cover" />
                      ) : (
                        <Surface style={styles.rouletteScopeGameThumbPlaceholder} elevation={0}>
                          <Text style={styles.rouletteScopeGameThumbPlaceholderText}>{getGamePlaceholderLabel(game.title)}</Text>
                        </Surface>
                      )}
                      <View style={styles.rouletteScopeGameMeta}>
                        <Text variant="titleMedium">{game.title}</Text>
                        <Text style={styles.friendNote}>
                          {game.genre} | {game.platform}
                        </Text>
                      </View>
                      <Chip compact icon={isSelected ? 'check-circle' : 'circle-outline'}>
                        {isSelected ? 'Included' : 'Skipped'}
                      </Chip>
                    </Card.Content>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
          <Dialog.Actions>
            <Button onPress={() => setScopeDialogVisible(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

