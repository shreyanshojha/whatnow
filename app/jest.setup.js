/* Jest setup: mock AsyncStorage with the official in-memory mock so
 * lib/feedback.ts and lib/locationHistory.ts (both AsyncStorage-backed,
 * on-device-only stores) can be unit tested without a native module. */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
