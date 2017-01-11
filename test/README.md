Running the tests:

```bash
# Token to be used
export TEST_TELEGRAM_TOKEN=<YOUR_BOT_TOKEN>

# User Id which you want to send the messages.
export TEST_USER_ID=<USER_ID>

# Group Id which to use in some of the tests, e.g. for TelegramBot#getChat()
export TEST_GROUP_ID=<GROUP_ID>

# Game short name which to use in some of the tests, e.g. TelegramBot#sendGame()
export TEST_GAME_SHORT_NAME=<GAME_SHORT_NAME>

# Run ALL tests
npm run test

# Run individual tests
npm run eslint              # static-analysis
npm run mocha               # mocha tests
```
