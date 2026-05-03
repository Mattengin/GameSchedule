import { ScrollView, View } from 'react-native';
import { Card, Divider, Text } from 'react-native-paper';
import { SUPPORT_EMAIL } from '../features/home/homeConstants';
import { styles } from '../features/home/homeStyles';

const sections = [
  {
    title: 'What this app stores',
    body: [
      'We store the account and profile information needed to run the app, including your username, display name, avatar URL, optional birthday settings, busy-visibility settings, and friend code.',
      'If you sign in or link with Discord, we store the Discord identity details needed for sign-in continuity and profile matching, such as your Discord user ID, Discord username, avatar URL, and OAuth-linked account context.',
    ],
  },
  {
    title: 'Social, library, and schedule data',
    body: [
      'We store friend requests, friendships, private Groups, game library entries, favorites, roulette pool data, lobbies, lobby responses, recurring lobby series, availability windows, and related scheduling data so the core product can work.',
      'Hosted and invited lobby participation is tied to your account so invites, schedule views, and cancellation history stay accurate for the people involved.',
    ],
  },
  {
    title: 'What Discord is and is not used for',
    body: [
      'Discord is optional. When connected, it is used for sign-in continuity, linked identity, avatar and profile matching, and auth email handling through the OAuth flow.',
      'The app does not sync Discord servers, does not read Discord messages or presence, and does not build a Discord-based friend graph.',
    ],
  },
  {
    title: 'Support and communications',
    body: [
      `If you contact support, we may use the information you send us to troubleshoot the issue, respond to you, and document the request. Support email: ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    title: 'Deletion and retention',
    body: [
      'You can delete your account from inside the app. Deleting the account removes the auth user and the profile-owned data that cascades from it, including social, library, lobby-participation, and availability data.',
      'Some operational records are intentionally short-lived. For example, canceled one-off lobbies stay visible in the app for 7 days, closed one-off lobbies are pruned after 30 days, recurring occurrence rows are pruned after 30 days, and short-term lobby response history is kept only for the product behavior that depends on it.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contentShell}>
          <Card style={styles.panel}>
            <Card.Content style={styles.sectionStack}>
              <Text style={styles.eyebrow}>Privacy policy</Text>
              <Text variant="headlineMedium" style={styles.pageTitle}>
                How account and Discord data are handled
              </Text>
              <Text style={styles.pageSubtitle}>Last updated: May 2, 2026</Text>
              <Text style={styles.friendNote}>
                This app is built to coordinate friends, games, lobbies, and schedules with as little
                extra data movement as possible.
              </Text>

              {sections.map((section, index) => (
                <View key={section.title} style={styles.sectionStack}>
                  {index > 0 ? <Divider style={styles.divider} /> : null}
                  <Text variant="titleMedium">{section.title}</Text>
                  {section.body.map((paragraph) => (
                    <Text key={paragraph} style={styles.supportingText}>
                      {paragraph}
                    </Text>
                  ))}
                </View>
              ))}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
