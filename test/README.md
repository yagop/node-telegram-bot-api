Running the tests:

```bash
# Token to be used
export TEST_TELEGRAM_TOKEN='5919747862:AAH9HvgGwQpj5yAGGJh8mZ4161DqHVzhQAE'

# User Id which you want to send the messages.
export TEST_USER_ID=5668418433

# Group Id which to use in some of the tests, e.g. for TelegramBot#getChat()
export TEST_GROUP_ID='-992795244'

# Game short name to use in some tests, e.g. TelegramBot#sendGame()
# Defaults to "medusalab_test".
export TEST_GAME_SHORT_NAME=<GAME_SHORT_NAME>

# Sticker set name to use in some tests, e.g. TelegramBot#getStickerSet()
# Defaults to "pusheen".
export TEST_STICKER_SET_NAME=<STICKER_SET_NAME>

# Payment provider token to be used
export TEST_PROVIDER_TOKEN=<YOUR_PROVIDER_TOKEN>

# Run ALL tests
npm run test

# Run individual tests
npm run eslint              # static-analysis
npm run mocha               # mocha tests
```
Note: The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.