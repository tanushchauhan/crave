# Crave (Expo app)

React Native + Expo Router app inside the CRAVE monorepo (`crave-app/`).

## Setup

```bash
cd crave-app
npm install
```

## iOS Simulator

```bash
npx expo run:ios -d "iPhone 16"
```

Use **Xcode → Open Developer Tool → Simulator** first if the CLI fails to focus the Simulator (some environments block `osascript` automation).

After the first successful `expo run:ios`, native folders `ios/` and `android/` are generated (gitignored here).

## Web

```bash
npx expo start --web
```

## Naming

- Package name: `crave-app`
- Expo slug: `crave-app`
- Deep link scheme: `crave://`
- Display name: **Crave**
