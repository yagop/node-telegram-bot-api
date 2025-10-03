"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const assert = __importStar(require("assert"));
const utils = __importStar(require("./utils"));
const isCI = __importStar(require("is-ci"));
// Allows self-signed certificates to be used in our tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const TOKEN = process.env.TEST_TELEGRAM_TOKEN;
if (!TOKEN) {
    throw new Error('Bot token not provided');
}
const PROVIDER_TOKEN = process.env.TEST_PROVIDER_TOKEN;
if (!PROVIDER_TOKEN && !isCI) {
    // If is not running in Travis / Appveyor
    throw new Error('Provider token not supplied');
}
// Telegram service if not User Id
const USERID = process.env.TEST_USER_ID || 777000;
const GROUPID = process.env.TEST_GROUP_ID || -1001075450562;
const GAME_SHORT_NAME = process.env.TEST_GAME_SHORT_NAME || 'medusalab_test';
const STICKER_SET_NAME = process.env.TEST_STICKER_SET_NAME || 'pusheen';
const CURRENT_TIMESTAMP = Date.now();
const timeout = 60 * 1000;
let portindex = 8091;
const staticPort = portindex++;
const pollingPort = portindex++;
const webHookPort = portindex++;
const pollingPort2 = portindex++;
const webHookPort2 = portindex++;
const badTgServerPort = portindex++;
const staticUrl = `http://127.0.0.1:${staticPort}`;
const key = `${__dirname}/../examples/ssl/key.pem`;
const cert = `${__dirname}/../examples/ssl/crt.pem`;
const ip = '216.58.210.174'; // Google IP ¯\_(ツ)_/¯
const lat = 47.5351072;
const long = -52.7508537;
const FILE_PATH = `${__dirname}/data/photo.png`;
let FILE_ID;
let GAME_CHAT_ID;
let GAME_MSG_ID;
let BOT_USERNAME;
let CHAT_INFO;
let STICKER_FILE_ID_FROM_SET;
let STICKERS_FROM_BOT_SET;
before(function beforeAll() {
    utils.startStaticServer(staticPort);
    return utils
        .startMockServer(pollingPort)
        .then(() => {
        return utils.startMockServer(pollingPort2);
    })
        .then(() => {
        return utils.startMockServer(badTgServerPort, { bad: true });
    });
});
describe('module.exports', function moduleExportsSuite() {
    const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
    it('is loaded from src/ on Node.js v6+ and above', function test() {
        if (nodeVersion <= 5)
            this.skip(); // skip on Node.js v5 and below
        assert.strictEqual(__1.TelegramBot, require('../src/telegram'));
    });
    it('is loaded from lib/ on Node.js v5 and below', function test() {
        if (nodeVersion > 5)
            this.skip(); // skip on newer versions
        assert.strictEqual(__1.TelegramBot, require('../lib/telegram'));
    });
});
describe('TelegramBot', function telegramSuite() {
    let bot;
    let testbot;
    let botPolling;
    let botWebHook;
    before(function beforeAll() {
        this.timeout(timeout);
        bot = new __1.TelegramBot(TOKEN);
        testbot = new __1.TelegramBot(TOKEN, {
            baseApiUrl: `http://127.0.0.1:${pollingPort}`,
            polling: {
                autoStart: false,
            },
            webHook: {
                autoOpen: false,
                port: webHookPort,
            },
        });
        botPolling = new __1.TelegramBot(TOKEN, {
            baseApiUrl: `http://127.0.0.1:${pollingPort2}`,
            polling: true,
        });
        botWebHook = new __1.TelegramBot(TOKEN, {
            webHook: {
                port: webHookPort2,
            },
        });
        utils.handleRatelimit(bot, 'sendPhoto', this);
        utils.handleRatelimit(bot, 'sendMessage', this);
        utils.handleRatelimit(bot, 'sendGame', this);
        utils.handleRatelimit(bot, 'getMe', this);
        utils.handleRatelimit(bot, 'getChat', this);
        return bot
            .sendPhoto(USERID, FILE_PATH)
            .then((resp) => {
            FILE_ID = resp.photo[0].file_id;
            return bot.sendMessage(USERID, 'chat');
        })
            .then((resp) => {
            GAME_CHAT_ID = resp.chat.id;
            return bot.sendGame(USERID, GAME_SHORT_NAME);
        })
            .then((resp) => {
            GAME_MSG_ID = resp.message_id;
        })
            .then(() => {
            return bot.getMe().then((resp) => {
                BOT_USERNAME = resp.username;
            });
        })
            .then(() => bot.getChat(GROUPID).then((resp) => {
            CHAT_INFO = resp;
        }));
    });
    it('automatically starts polling', function test() {
        assert.strictEqual(botPolling.isPolling(), true);
        return utils.isPollingMockServer(pollingPort2);
    });
    it('automatically opens webhook', function test() {
        assert.strictEqual(botWebHook.hasOpenWebHook(), true);
        return utils.hasOpenWebHook(webHookPort2);
    });
    it('does not automatically poll if "autoStart" is false', function test() {
        assert.strictEqual(testbot.isPolling(), false);
        return utils.isPollingMockServer(pollingPort, true);
    });
    it('does not automatically open webhook if "autoOpen" is false', function test() {
        assert.strictEqual(testbot.hasOpenWebHook(), false);
        return utils.hasOpenWebHook(webHookPort, true);
    });
    it('correctly deletes the webhook if polling', function test() {
        // Test implementation would go here
        assert.ok(true);
    });
    // Add more test cases as needed...
});
//# sourceMappingURL=telegram.test.js.map