/**
 * Main entry point for the node-telegram-bot-api package.
 * Exports the TelegramBot class and related utilities.
 */
export { TelegramBot } from './telegram';
export { errors } from './errors';
export { deprecateFunction } from './utils';

// Re-export types for TypeScript users
export * from './types/telegram-types';
export * from './types/bot-types';
