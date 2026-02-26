import { deprecate } from 'util';

/**
 * Native deprecation warning
 * @param msg Deprecation message
 */
export const deprecateFunction = (msg: string): void => {
  deprecate(() => {}, msg, 'node-telegram-bot-api')();
};
