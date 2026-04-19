import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Surface, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../services/supabaseClient';

const discordStateStorageKey = 'gameschedule-discord-oauth-state';

type DiscordOauthMeResponse = {
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };
};

function getBasePath(pathname: string) {
  return pathname.startsWith('/GameSchedule') ? '/GameSchedule' : '';
}

export default function DiscordOauthCallbackScreen() {
  const [status, setStatus] = React.useState<'working' | 'error' | 'success'>('working');
  const [message, setMessage] = React.useState('Finishing Discord link...');

  React.useEffect(() => {
    const finishDiscordLink = async () => {
      if (Platform.OS !== 'web') {
        setStatus('error');
        setMessage('Discord callback is currently configured for the web demo only.');
        return;
      }

      const currentLocation = globalThis.window?.location;
      if (!currentLocation) {
        setStatus('error');
        setMessage('Unable to inspect the current browser location.');
        return;
      }

      const fragment = currentLocation.hash.startsWith('#')
        ? currentLocation.hash.slice(1)
        : currentLocation.hash;
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const returnedState = params.get('state');
      const error = params.get('error');
      const savedState = globalThis.window.sessionStorage?.getItem(discordStateStorageKey) ?? '';

      if (error) {
        setStatus('error');
        setMessage('Discord authorization was canceled or failed.');
        return;
      }

      if (!accessToken) {
        setStatus('error');
        setMessage('Discord did not return an access token.');
        return;
      }

      if (!returnedState || !savedState || returnedState !== savedState) {
        setStatus('error');
        setMessage('Discord state verification failed. Please try connecting again.');
        return;
      }

      globalThis.window.sessionStorage?.removeItem(discordStateStorageKey);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setStatus('error');
        setMessage('Sign in to GameSchedule before linking Discord.');
        return;
      }

      const response = await fetch('https://discord.com/api/v10/oauth2/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setStatus('error');
        setMessage('Discord user lookup failed.');
        return;
      }

      const oauthData = (await response.json()) as DiscordOauthMeResponse;
      const discordUser = oauthData.user;

      if (!discordUser?.id || !discordUser.username) {
        setStatus('error');
        setMessage('Discord did not return enough user information.');
        return;
      }

      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          discord_user_id: discordUser.id,
          discord_username: discordUser.global_name ?? discordUser.username,
          discord_avatar_url: avatarUrl,
          discord_connected_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) {
        setStatus('error');
        setMessage(updateError.message);
        return;
      }

      setStatus('success');
      setMessage('Discord linked successfully. Returning you to the app...');

      const basePath = getBasePath(currentLocation.pathname);
      globalThis.window.setTimeout(() => {
        globalThis.window.location.replace(`${currentLocation.origin}${basePath}/`);
      }, 1200);
    };

    finishDiscordLink();
  }, []);

  return (
    <View style={styles.screen}>
      <Surface style={styles.card} elevation={3}>
        {status === 'working' ? <ActivityIndicator animating size="large" /> : null}
        <Text variant="headlineSmall" style={styles.title}>
          Discord link
        </Text>
        <Text style={styles.copy}>{message}</Text>
        {status === 'error' ? (
          <Button mode="contained" onPress={() => router.replace('/')}>
            Back to app
          </Button>
        ) : null}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1020',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: '#151A2D',
    borderColor: '#2C3560',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 12,
  },
  title: {
    color: '#F5F7FF',
    fontWeight: '800',
  },
  copy: {
    color: '#A7B0D6',
    fontSize: 15,
    lineHeight: 22,
  },
});
