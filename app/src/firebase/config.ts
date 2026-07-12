// With @react-native-firebase, the Firebase app initialises itself natively from
// the GoogleService-Info.plist (iOS) / google-services.json (Android) you drop in
// at build time — there's no JS apiKey config to fill here.
//
// The one value the JS side needs is the OAuth *Web client ID* for Google Sign-In
// (Firebase Console → Authentication → Google → Web SDK configuration, or the
// "Web client" auto-created in Google Cloud credentials). Put it in the app's env:
//
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
//
// (see app/.env.example)
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
