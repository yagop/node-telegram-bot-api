Running the tests:

```bash
export TEST_TELEGRAM_TOKEN=<YOUR_BOT_TOKEN>
# User Id which you want to send the messages.
export TEST_USER_ID=<USER_ID>
# Group Id which to use in some of the tests, e.g. for TelegramBot#getChat()
export TEST_GROUP_ID=<GROUP_ID>
npm run test
```
