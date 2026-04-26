import * as React from 'react';
import { Image, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button, IconButton, Surface, Text } from 'react-native-paper';
import { styles } from './homeStyles';
import type { GameRecord } from './homeTypes';

type LobbyGameCarouselProps = {
  games: GameRecord[];
  selectedGameId: string | null;
  onSelectGame: (game: GameRecord) => void;
};

const DESKTOP_PAGE_SIZE = 4;
const MOBILE_CARD_GAP = 12;

function LobbyGamePickerCard({
  game,
  selected,
  onSelect,
  cardStyle,
}: {
  game: GameRecord;
  selected: boolean;
  onSelect: () => void;
  cardStyle?: StyleProp<ViewStyle>;
}) {
  const coverFallbackLabel =
    game.title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'GG';

  return (
    <Surface
      style={[
        styles.gamePickCard,
        cardStyle,
        selected ? styles.gamePickCardSelected : null,
      ]}
      elevation={selected ? 2 : 0}>
      {game.cover_url ? (
        <Image
          source={{ uri: game.cover_url }}
          style={styles.lobbyGameCoverImage}
          resizeMode="cover"
          testID={`lobby-game-cover-${game.id}`}
        />
      ) : (
        <Surface
          style={styles.lobbyGameCoverPlaceholder}
          elevation={0}
          testID={`lobby-game-cover-placeholder-${game.id}`}>
          <Text style={styles.lobbyGameCoverPlaceholderText}>{coverFallbackLabel}</Text>
          <Text style={styles.lobbyGameCoverPlaceholderSubtext}>Lobby</Text>
        </Surface>
      )}
      <View style={styles.lobbyGameCardMeta}>
      <Text variant="titleSmall" style={styles.gamePickTitle}>
        {game.title}
      </Text>
      <Text style={styles.friendNote}>
        {game.genre} - {game.player_count}
      </Text>
      </View>
      <Button
        mode={selected ? 'contained' : 'outlined'}
        compact
        onPress={onSelect}
        testID={`lobby-game-${game.id}`}>
        {selected ? 'Selected' : 'Pick game'}
      </Button>
    </Surface>
  );
}

export function LobbyGameCarousel({
  games,
  selectedGameId,
  onSelectGame,
}: LobbyGameCarouselProps) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const [desktopPageIndex, setDesktopPageIndex] = React.useState(0);

  const desktopPageCount = Math.max(1, Math.ceil(games.length / DESKTOP_PAGE_SIZE));
  const desktopPageStart = desktopPageIndex * DESKTOP_PAGE_SIZE;
  const desktopPageEnd = Math.min(games.length, desktopPageStart + DESKTOP_PAGE_SIZE);
  const visibleDesktopGames = games.slice(desktopPageStart, desktopPageEnd);
  const showDesktopPager = isDesktopWeb && games.length > DESKTOP_PAGE_SIZE;
  const mobileCardWidth = Math.max(240, Math.min(Math.round(width * 0.82), 320));
  const mobileSnapInterval = mobileCardWidth + MOBILE_CARD_GAP;

  React.useEffect(() => {
    const maxPageIndex = Math.max(0, desktopPageCount - 1);
    setDesktopPageIndex((current) => Math.min(current, maxPageIndex));
  }, [desktopPageCount]);

  React.useEffect(() => {
    if (!isDesktopWeb || !selectedGameId) {
      return;
    }

    const selectedIndex = games.findIndex((game) => game.id === selectedGameId);
    if (selectedIndex === -1) {
      return;
    }

    setDesktopPageIndex(Math.floor(selectedIndex / DESKTOP_PAGE_SIZE));
  }, [games, isDesktopWeb, selectedGameId]);

  if (isDesktopWeb) {
    return (
      <View style={styles.lobbyGameCarousel} testID="lobby-game-carousel">
        {showDesktopPager ? (
          <View style={styles.lobbyGameCarouselHeader}>
            <Text style={styles.lobbyGameCarouselStatus} testID="lobby-game-carousel-status">
              {desktopPageStart + 1}-{desktopPageEnd} of {games.length}
            </Text>
            <View style={styles.lobbyGameCarouselControls}>
              <IconButton
                icon="chevron-left"
                mode="contained-tonal"
                size={18}
                disabled={desktopPageIndex === 0}
                onPress={() => setDesktopPageIndex((current) => Math.max(0, current - 1))}
                accessibilityLabel="Previous lobby games"
                testID="lobby-game-carousel-prev"
              />
              <IconButton
                icon="chevron-right"
                mode="contained-tonal"
                size={18}
                disabled={desktopPageIndex >= desktopPageCount - 1}
                onPress={() =>
                  setDesktopPageIndex((current) => Math.min(desktopPageCount - 1, current + 1))
                }
                accessibilityLabel="Next lobby games"
                testID="lobby-game-carousel-next"
              />
            </View>
          </View>
        ) : null}
        <View style={styles.lobbyGameCarouselDesktopTrack}>
          {visibleDesktopGames.map((game) => (
            <LobbyGamePickerCard
              key={game.id}
              game={game}
              selected={selectedGameId === game.id}
              onSelect={() => onSelectGame(game)}
              cardStyle={styles.lobbyGameCarouselDesktopCard}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.lobbyGameCarousel} testID="lobby-game-carousel">
      <ScrollView
        horizontal
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        snapToInterval={mobileSnapInterval}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lobbyGameCarouselMobileTrack}
        keyboardShouldPersistTaps="handled"
        testID="lobby-game-carousel-scroll">
        {games.map((game, index) => (
          <LobbyGamePickerCard
            key={game.id}
            game={game}
            selected={selectedGameId === game.id}
            onSelect={() => onSelectGame(game)}
            cardStyle={[
              styles.lobbyGameCarouselMobileCard,
              {
                width: mobileCardWidth,
                marginRight: index === games.length - 1 ? 0 : MOBILE_CARD_GAP,
              },
            ]}
          />
        ))}
      </ScrollView>
    </View>
  );
}
