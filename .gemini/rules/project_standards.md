# Wavely Project Standards & Agent Rules

## Architecture & Code Guidelines
1. **Language & Types**:
   - Strictly TypeScript. No `any` types where preventable.
   - Run `npm run typecheck` before finishing tasks.

2. **Internationalization (i18n)**:
   - All user-facing strings must be localized in `src/constants/i18n.ts` for both Turkish (`tr`) and English (`en`).
   - Never hardcode raw user-facing text strings in components.

3. **Audio Playback & Lock Screen**:
   - Native audio playback is handled by `expo-audio` with `enableBackgroundPlayback: true`.
   - Android requires `setActiveForLockScreen(true, ...)` with `doNotMix` interruption mode for continuous background streaming.
   - Handle Expo Go environment guards via `canUseLockScreen` so testing in Expo Go does not crash on native Android services.

4. **Testing**:
   - Maintain unit tests in `__tests__/` with Jest.
   - Keep Jest preset aligned with React Native version.
   - Run `npm test` to ensure all test suites pass.

5. **Code Style & Documentation**:
   - Keep code comments and docstrings strictly in English.
   - User interactions and explanations in conversational Turkish as requested by the user.
