import * as React from 'react';
import { Image, View } from 'react-native';
import { Button, Card, Chip, Divider, HelperText, IconButton, ProgressBar, Searchbar, Surface, Text } from 'react-native-paper';
import { styles } from './homeStyles';
import type { GameRecord, IgdbSearchResult, RouletteEntry } from './homeTypes';
import { SectionTitle, StatCard, formatReleaseDateLabel } from './homeUtils';

type NotificationItem = {
  age: string;
  label: string;
  message: string;
};

type DashboardSectionProps = {
  libraryGames: GameRecord[];
  lobbiesCount: number;
  onManageFriends: () => void;
  onStartGroupSpin: () => void;
  roulettePoolCount: number;
  roulettePoolGames: Pick<GameRecord, 'id' | 'title'>[];
};

export function DashboardSection({
  libraryGames,
  lobbiesCount,
  onManageFriends,
  onStartGroupSpin,
  roulettePoolCount,
  roulettePoolGames,
}: DashboardSectionProps) {
  return (
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
          <Button mode="contained" onPress={onStartGroupSpin}>
            Start group spin
          </Button>
          <Button mode="outlined" onPress={onManageFriends}>
            Manage friends
          </Button>
        </View>
      </Surface>

      <View style={styles.statRow}>
        <StatCard label="Friends online" value="12" accent="#7C5CFF" />
        <StatCard label="Open lobbies" value={String(lobbiesCount)} accent="#33D1FF" />
        <StatCard label="Pool games" value={String(roulettePoolCount)} accent="#7DFFB3" />
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
            subtitle="Pulled from the games you already chose to keep in your library."
          />
          <View style={styles.quickPath}>
            {libraryGames
              .filter((game) => game.is_featured)
              .slice(0, 3)
              .map((game) => (
                <Chip key={game.id}>{game.title}</Chip>
              ))}
            {libraryGames.length === 0 ? (
              <Text style={styles.friendNote}>Add games to library to start building your personal list.</Text>
            ) : null}
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
  onToggleRoulettePool: (gameId: string) => void;
  rouletteEntries: RouletteEntry[];
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
  onToggleRoulettePool,
  rouletteEntries,
}: GamesSectionProps) {
  const normalizedIgdbSearchQuery = igdbSearchQuery.trim();
  const isIgdbSearchQueryTooShort = normalizedIgdbSearchQuery.length > 0 && normalizedIgdbSearchQuery.length < 2;
  const hasLibraryGames = libraryGamesCount > 0;
  const canDismissIgdbSearchOutput =
    !igdbSearchLoading && (igdbResults.length > 0 || Boolean(igdbError) || Boolean(igdbMessage) || igdbHasSearched);

  return (
    <>
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
      <Card style={styles.panel}>
        <Card.Content>
          <SectionTitle
            title="Import from IGDB"
            subtitle="Search the live IGDB catalog, then import the games you want into your local library."
          />
          <View style={styles.igdbSearchRow}>
            <Searchbar
              placeholder="Search IGDB by game title"
              value={igdbSearchQuery}
              onChangeText={onChangeIgdbSearchQuery}
              onSubmitEditing={() => {
                onSearchIgdb();
              }}
              style={styles.igdbSearchInput}
              testID="igdb-search-input"
            />
            <Button
              mode="contained"
              onPress={onSearchIgdb}
              loading={igdbSearchLoading}
              disabled={igdbSearchLoading || igdbSearchCooldownSeconds > 0 || normalizedIgdbSearchQuery.length < 2}
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
        const inRoulettePool = rouletteEntries.some((entry) => entry.game_id === game.id);

        return (
          <Card key={game.id} style={styles.panel} testID={`game-library-card-${game.id}`}>
            <Card.Content>
              <Text variant="titleLarge">{game.title}</Text>
              <Text style={styles.supportingText}>{game.genre}</Text>
              <Text style={styles.friendNote}>
                {game.platform} | {game.player_count}
              </Text>
              <Text style={styles.listText}>{game.description ?? 'Description coming soon.'}</Text>
              <View style={styles.quickPath}>
                {isFavorite ? (
                  <Chip icon="star" selected>
                    Favorite
                  </Chip>
                ) : null}
                {inRoulettePool ? <Chip icon="dice-multiple">In roulette pool</Chip> : null}
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
                  onPress={() => onToggleRoulettePool(game.id)}
                  loading={gameActionBusyId === `pool:${game.id}`}
                  disabled={gameActionBusyId !== null}
                  testID={`game-library-pool-${game.id}`}>
                  {inRoulettePool ? 'Remove from pool' : 'Add to pool'}
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
              Use the IGDB search above to import the games you actually want to keep.
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
    </>
  );
}

type RouletteSectionProps = {
  onInviteEveryone: (gameId: string) => void;
  onOpenGames: () => void;
  onSpinAgain: () => void;
  roulettePoolGames: Pick<GameRecord, 'genre' | 'id' | 'platform' | 'title'>[];
};

export function RouletteSection({
  onInviteEveryone,
  onOpenGames,
  onSpinAgain,
  roulettePoolGames,
}: RouletteSectionProps) {
  const featuredGame = roulettePoolGames[0] ?? null;

  return (
    <>
      <SectionTitle
        title="Game roulette"
        subtitle="Pick from your saved pool before building a lobby."
      />
      <Surface style={styles.rouletteHero} elevation={2}>
        <Text variant="headlineMedium" style={styles.rouletteValue}>
          {featuredGame?.title ?? 'Add games to spin'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {roulettePoolGames.length > 0
            ? `You currently have ${roulettePoolGames.length} game${roulettePoolGames.length === 1 ? '' : 's'} in your pool.`
            : 'Your pool is empty. Add games from the library first.'}
        </Text>
        <View style={styles.heroActions}>
          <Button
            mode="contained"
            onPress={() => (featuredGame ? onInviteEveryone(featuredGame.id) : onOpenGames())}>
            Invite everyone
          </Button>
          <Button mode="outlined" onPress={onSpinAgain}>
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
}

type InboxSectionProps = {
  notifications: NotificationItem[];
};

export function InboxSection({ notifications }: InboxSectionProps) {
  return (
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
}
