# Smoke suite

Signed-out smoke flows for comparing builds across Expo SDK upgrades. Each flow
cold-starts the app with cleared state, so it runs as a signed-out user. No
flow signs in or submits anything.

| Flow | Checks |
| --- | --- |
| `01-launch.yml` | Gets past the Lottie splash; the signed-out tab bar shows (no Chat tab); no crash dialog |
| `02-tabs.yml` | Feed, Library, My Apps and Profile each render; one screenshot per tab (Feed's News section is a soft check) |
| `03-library.yml` | A search round-trip keeps the screen up (empty state soft-checked); erasing it brings the list back; scrolling loads page 2 (index 12) |
| `04-signin-entry.yml` | Profile's Sign In hands off to the system auth session (auth session sheet on iOS, Custom Tab on Android); cancelling returns to the signed-out screen |
| `05-offline.yml` | Android only: airplane mode shows the "No internet connection" toast (NetInfo); turning it off clears it. A no-op on iOS |

`common/launch-signed-out.yml` and `common/tap-tab.yml` are subflows. They
sit in a subfolder so running the folder does not run them on their own.

## Running

Build a release app first (no Metro needed), from `frontend/`:

```bash
# Android (emulator up, adb on PATH)
npx expo prebuild --platform android --clean
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a)
adb install -r android/app/build/outputs/apk/release/app-release.apk

# iOS (simulator booted)
npx expo prebuild --platform ios --clean
npx expo run:ios --configuration Release --no-bundler --device "iPhone 16e"
```

Then run the suite. `takeScreenshot` writes into the current directory
(Maestro 1.41), so run from the folder that should hold the output:

```bash
# Parse .env with dotenv, as app.config.ts does (strips quotes and comments)
APP_ID=$(cd "$FRONTEND" && node -p "require('dotenv').config({ quiet: true }).parsed.BUNDLE_IDENTIFIER")
mkdir -p "$OUT" && cd "$OUT"
maestro --device <emulator-5554 | simulator UDID> test \
  -e BUNDLE_IDENTIFIER="$APP_ID" \
  --format junit --output report.xml --debug-output debug \
  "$FRONTEND/.maestro/smoke"
```

On iOS, tabs are matched by their SF Symbol icon id (`newspaper`,
`books.vertical`, `square.grid.3x3`, `person.crop.circle`,
`bubble.left.and.bubble.right`): NativeTabs sets no testID, and text
selectors stall Maestro 1.41 there. Android tabs use PNG icons with no id
Maestro reads, so Android matches the tab label (`Feed`, `Library`, ...).
`common/tap-tab.yml` picks the right selector per platform.

On iOS 26 and 27 the sign-in flow taps the auth sheet's X by position, which
depends on the device. It defaults to iPhone 17e (38,84). For iPhone Duo add
`-e AUTH_SHEET_CLOSE_POINT=411,199`.

Run one device at a time. The Android package must equal
`BUNDLE_IDENTIFIER` (it does in the current `.env`); otherwise pass the
`ANDROID_PACKAGE` value when running on Android.

The flows read live production content (feed, library), so they need network.

## Known noise

- A freshly created AVD updates Google Play services in the background for
  its first several minutes, and the update kills running apps (including the
  app under test and the Maestro driver). Let a new emulator settle before a
  baseline run.
- Android `05-offline.yml` toggles airplane mode; `onFlowComplete` turns it
  back off, but check it if a run is interrupted.
- The library empty state did not show for a nonsense query on the SDK 54
  baseline (2026-11-17), so `03-library.yml` only soft-checks it.
