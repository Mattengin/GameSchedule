import * as React from 'react';
import { Platform, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { Button, Chip, Surface, Text } from 'react-native-paper';
import { DatePickerInput, TimePickerModal } from 'react-native-paper-dates';
import { styles } from './homeStyles';
import type { BusyBlock, LobbyRecord, Profile } from './homeTypes';

export const getWebBasePath = () => {
  if (Platform.OS !== 'web') {
    return '';
  }

  const pathname = globalThis.window?.location.pathname ?? '';
  return pathname.startsWith('/GameSchedule') ? '/GameSchedule' : '';
};

export const getWebRedirectUrl = () => {
  if (Platform.OS !== 'web') {
    return undefined;
  }

  const currentLocation = globalThis.window?.location;
  if (!currentLocation) {
    return undefined;
  }

  return `${currentLocation.origin}${getWebBasePath()}/`;
};

export const getDiscordCallbackPath = () => `${getWebBasePath()}/discord-oauth-callback`;

export const isDiscordCallbackPath = () => {
  if (Platform.OS !== 'web') {
    return false;
  }

  const currentPath = globalThis.window?.location.pathname ?? '';
  return currentPath === getDiscordCallbackPath();
};

export const clearOAuthHashFromUrl = () => {
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

export const getSessionProviderToken = (session: Session | null) => {
  const providerToken = (session as Session & { provider_token?: string | null } | null)?.provider_token;
  return typeof providerToken === 'string' && providerToken.trim() ? providerToken : null;
};

export const readHashParams = () => {
  if (Platform.OS !== 'web') {
    return new URLSearchParams();
  }

  const currentHash = globalThis.window?.location.hash ?? '';
  return new URLSearchParams(currentHash.startsWith('#') ? currentHash.slice(1) : currentHash);
};

export const buildDiscordGuildIconUrl = (guildId: string, iconHash: string | null | undefined) => {
  if (!guildId || !iconHash) {
    return null;
  }

  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=128`;
};

export const getDiscordIdentityFromSession = (session: Session | null) => {
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

export const unwrapRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

export const createDefaultLobbyStartDate = () => {
  const date = new Date();
  date.setHours(20, 0, 0, 0);
  return date;
};

export const createDefaultLobbyEndDate = () => {
  const date = createDefaultLobbyStartDate();
  date.setHours(date.getHours() + 1);
  return date;
};

export const createBirthdayDate = (month: number, day: number) => {
  const date = new Date(2000, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
};

export const getBirthdayDate = (month: number | null | undefined, day: number | null | undefined) => {
  if (!month || !day) {
    return undefined;
  }

  return createBirthdayDate(month, day);
};

export const formatBirthdayLabel = (month: number | null | undefined, day: number | null | undefined) => {
  const birthdayDate = getBirthdayDate(month, day);
  if (!birthdayDate) {
    return '';
  }

  return birthdayDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
};

export const formatReleaseDateLabel = (releaseDate: string | null | undefined) => {
  if (!releaseDate) {
    return '';
  }

  const parsedDate = new Date(releaseDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getDefaultEndDate = (startDate: Date) => {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);
  return endDate;
};

export const getBusyFallbackEndDate = (startDate: Date) => {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 2);
  return endDate;
};

export const resolveAvatarUrl = (
  record: Pick<Profile, 'avatar_url' | 'discord_avatar_url'> | null | undefined,
) => {
  const directAvatarUrl = record?.avatar_url?.trim();
  if (directAvatarUrl) {
    return directAvatarUrl;
  }

  const discordAvatarUrl = record?.discord_avatar_url?.trim();
  return discordAvatarUrl || '';
};

export const formatCalendarDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

export const formatEventTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatEventRange = (startDate: Date, endDate: Date) => {
  const dateLabel = formatCalendarDate(startDate);
  const startLabel = formatEventTime(startDate);
  const endLabel = formatEventTime(endDate);

  return `${dateLabel}, ${startLabel} - ${endLabel}`;
};

export const setDatePart = (currentDate: Date, nextDate: Date) => {
  const updatedDate = new Date(currentDate);
  updatedDate.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
  return updatedDate;
};

export const setTimePart = (currentDate: Date, nextHour: number, nextMinute: number) => {
  const updatedDate = new Date(currentDate);
  updatedDate.setHours(nextHour, nextMinute, 0, 0);
  return updatedDate;
};

export const createTimeDate = (hours: number, minutes: number) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const parseDbTimeToDate = (timeValue: string, fallbackHours: number) => {
  const [hoursValue, minutesValue] = timeValue.split(':');
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  return createTimeDate(
    Number.isNaN(hours) ? fallbackHours : hours,
    Number.isNaN(minutes) ? 0 : minutes,
  );
};

export const formatDbTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;

export const formatAvailabilityRange = (startTime: string, endTime: string) =>
  `${formatEventTime(parseDbTimeToDate(startTime, 20))} - ${formatEventTime(parseDbTimeToDate(endTime, 21))}`;

export const hasExplicitLobbyEnd = (lobby: Pick<LobbyRecord, 'scheduled_until'>) => {
  if (!lobby.scheduled_until) {
    return false;
  }

  const explicitEnd = new Date(lobby.scheduled_until);
  return !Number.isNaN(explicitEnd.getTime());
};

export const getLobbyEndDate = (lobby: Pick<LobbyRecord, 'scheduled_for' | 'scheduled_until'>) => {
  if (lobby.scheduled_until) {
    const explicitEnd = new Date(lobby.scheduled_until);
    if (!Number.isNaN(explicitEnd.getTime())) {
      return explicitEnd;
    }
  }

  if (lobby.scheduled_for) {
    const startDate = new Date(lobby.scheduled_for);
    if (!Number.isNaN(startDate.getTime())) {
      return getBusyFallbackEndDate(startDate);
    }
  }

  return getDefaultEndDate(createDefaultLobbyStartDate());
};

export const formatLobbyScheduleLabel = (lobby: Pick<LobbyRecord, 'scheduled_for' | 'scheduled_until'>) => {
  if (!lobby.scheduled_for) {
    return 'Starts now';
  }

  const startDate = new Date(lobby.scheduled_for);
  if (Number.isNaN(startDate.getTime())) {
    return 'Starts now';
  }

  if (hasExplicitLobbyEnd(lobby)) {
    return formatEventRange(startDate, new Date(lobby.scheduled_until!));
  }

  return `${formatCalendarDate(startDate)}, ${formatEventTime(startDate)} · No set end time`;
};

export const doesTimeRangeOverlap = (
  firstStartAt: Date,
  firstEndAt: Date,
  secondStartAt: Date,
  secondEndAt: Date,
) => firstStartAt < secondEndAt && secondStartAt < firstEndAt;

export const getBusyStatusLabel = (status: BusyBlock['busy_status']) =>
  status === 'maybe_busy' ? 'Maybe busy' : 'Busy';

export const formatBusyBlockNote = (block: BusyBlock) => {
  const startDate = new Date(block.starts_at);
  if (Number.isNaN(startDate.getTime())) {
    return block.game_title
      ? `Playing ${block.game_title}`
      : block.busy_status === 'maybe_busy'
        ? 'Has a flexible session around this time'
        : 'Already booked at this time';
  }

  const timeLabel = formatEventTime(startDate);
  if (block.busy_status === 'maybe_busy') {
    return block.game_title
      ? `Playing ${block.game_title} around ${timeLabel}`
      : `Busy around ${timeLabel}`;
  }

  return block.game_title
    ? `Playing ${block.game_title} during this window`
    : 'Already booked at this time';
};

export function StatCard({
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

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function EventTimePicker({
  timeMode,
  startAt,
  endAt,
  hasExplicitEnd,
  onSetNow,
  onSetLater,
  onToggleHasExplicitEnd,
  onStartAtChange,
  onEndAtChange,
}: {
  timeMode: 'now' | 'later';
  startAt: Date;
  endAt: Date;
  hasExplicitEnd: boolean;
  onSetNow: () => void;
  onSetLater: () => void;
  onToggleHasExplicitEnd: (nextValue: boolean) => void;
  onStartAtChange: (date: Date) => void;
  onEndAtChange: (date: Date) => void;
}) {
  const [timePickerTarget, setTimePickerTarget] = React.useState<'start' | 'end' | null>(null);
  const activeTimeDate = timePickerTarget === 'end' ? endAt : startAt;
  const timeSummary =
    timeMode === 'now'
      ? hasExplicitEnd
        ? 'Starts now'
        : 'Starts now · No set end time'
      : hasExplicitEnd
        ? formatEventRange(startAt, endAt)
        : `${formatCalendarDate(startAt)}, ${formatEventTime(startAt)} · No set end time`;

  return (
    <Surface style={styles.eventTimePanel} elevation={1}>
      <View style={styles.eventTimeHeader}>
        <View>
          <Text variant="titleSmall" style={styles.eventTimeTitle}>
            Event time
          </Text>
          <Text style={styles.friendNote}>Pick a controlled start time. End time is optional for looser sessions.</Text>
        </View>
        <Chip icon="clock-outline" style={styles.statusChip}>
          {timeSummary}
        </Chip>
      </View>
      <View style={styles.quickPath}>
        <Chip selected={timeMode === 'now'} onPress={onSetNow} testID="lobby-time-now-chip">
          Start now
        </Chip>
        <Chip selected={timeMode === 'later'} onPress={onSetLater} testID="lobby-time-later-chip">
          Schedule it
        </Chip>
        <Chip selected={hasExplicitEnd} onPress={() => onToggleHasExplicitEnd(!hasExplicitEnd)} testID="lobby-toggle-end-time-chip">
          {hasExplicitEnd ? 'End time on' : 'No end time'}
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
          {hasExplicitEnd ? (
            <Button
              mode="outlined"
              icon="clock-end"
              onPress={() => setTimePickerTarget('end')}
              testID="lobby-end-time-picker-button">
              End: {formatEventTime(endAt)}
            </Button>
          ) : (
            <Text style={styles.friendNote}>Friends will see this as Maybe busy around the start time.</Text>
          )}
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
              Selected event time
            </Text>
            <Text style={styles.friendNote}>{timeSummary}</Text>
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

export function TimeRangePicker({
  startAt,
  endAt,
  hasExplicitEnd = true,
  onToggleHasExplicitEnd,
  onStartAtChange,
  onEndAtChange,
  startTestID,
  endTestID,
}: {
  startAt: Date;
  endAt: Date;
  hasExplicitEnd?: boolean;
  onToggleHasExplicitEnd?: (nextValue: boolean) => void;
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
        {hasExplicitEnd ? (
          <Button
            mode="outlined"
            icon="clock-end"
            onPress={() => setTimePickerTarget('end')}
            testID={endTestID}>
            End: {formatEventTime(endAt)}
          </Button>
        ) : null}
      </View>
      {onToggleHasExplicitEnd ? (
        <View style={styles.quickPath}>
          <Chip selected={hasExplicitEnd} onPress={() => onToggleHasExplicitEnd(!hasExplicitEnd)} testID={`${startTestID}-toggle-end-time`}>
            {hasExplicitEnd ? 'End time on' : 'No end time'}
          </Chip>
        </View>
      ) : null}
      {!hasExplicitEnd ? <Text style={styles.friendNote}>This session can run open-ended.</Text> : null}
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
