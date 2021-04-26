# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).
## [0.52.1][0.52.1] - 2021-04-26

Added:

1. Support Bot API v5.2:(@danielperez9430)

   * Add support for new messageTypes:
     * *voice_chat_scheduled*

## [0.52.0][0.52.0] - 2021-03-20

Added:

1. Support Bot API v5.1: (by @danielperez9430)
   
   * Add method *createChatInviteLink()*
   * Add method *editChatInviteLink()*
   * Add method *revokeChatInviteLink()*
   * Add support for new messageTypes:
     * *voice_chat_started*
     * *voice_chat_ended*
     * *voice_chat_participants_invited*
     * *message_auto_delete_timer_changed*
     * *chat_invite_link*
     * *chat_member_updated*
   * Add support for new updates:
     * *my_chat_member*
     * *chat_member*
   
   New Test: (by @danielperez9430)
   
   * createChatInviteLink
   * editChatInviteLink
   * revokeChatInviteLink

## [0.51.0][0.51.0] - 2020-11-04

Added:

1. Support Bot API v5.0: (by @danielperez9430)
   
   * Add method *copyMessage()*
   * Add method *unpinAllChatMessages()*
   * Add method *close()*
   * Add method *logOut()*
   
   Changed: (by @danielperez9430)
   
   * Remove trailing-spaces
   * Fix Bugs in Test
   
   New Test: (by @danielperez9430)
   
   * copyMessage
   * unpinAllChatMessages

## [0.50.0][0.50.0] - 2020-05-2020

Added:

1. Support Bot API v4.8: (by @danielperez9430)
   * Add methods: *sendDice()*
2. Support Bot API v4.7: (by @danielperez9430)
   * Add methods: *getMyCommands()*,*setMyCommands()*
3. Support Bot API v4.5: (by @danielperez9430)
   * Add methods: *setChatAdministratorCustomTitle()*
4. Support Bot API v4.4: (by @danielperez9430)
   * Add methods: *setChatPermissions()*
5. Support for poll_answer (by @JieJiSS)
6. Add request options in file stream (by @zhangpanyi )

Changed: (by @danielperez9430)

* New message type: *dice*
* Fix Bugs in tests
* Fix regex compare (by @ledamint)
* Fix listening for error events when downloading files (by @Kraigo)

New Test: (by @danielperez9430)

* sendDice
* getMyCommands
* setMyCommands
* setChatAdministratorCustomTitle
* setChatPermissions

## [0.40.0][0.40.0] - 2019-05-04

Added:

1. Support Bot API v4.2: (by @kamikazechaser)
   * Add methods: *TelegramBot#sendPoll()*, *TelegramBot#stopPoll()*
   * Support events: *poll*
2. Support Bot API v4.0: (by @kamikazechaser)
   * Add methods: *TelegramBot#editMessageMedia()*, *TelegramBot#sendAnimation()*
   * Support new message types: *passport_data*, *animation*

* * *

## [0.30.0][0.30.0] - 2017-12-21

Added:

1. Support Bot API v3.5: (by @GochoMugo)
   * Allow `provider_data` parameter in *TelegramBot#sendInvoice*
   * Add method *TelegramBot#sendMediaGroup()*
2. Support Bot API v3.4: (by @kamikazechaser)
   * Add methods *TelegramBot#editMessageLiveLocation*, *TelegramBot#stopMessageLiveLocation* (#439)
   * Add methods *TelegramBot#setChatStickerSet*, *TelegramBot#deleteChatStickerSet* (#440)
3. Add methods:
   * *TelegramBot#getFileStream* (#442) (by @GochoMugo, requested-by @Xaqron)
4. Add options to *TelegramBot#stopPolling()* (by @GochoMugo)
5. Add `metadata` argument in `message` event (and friends e.g. `text`, `audio`, etc.) (#409) (by @jlsjonas, @GochoMugo)
6. Add forward-compatibility i.e. support future additional Telegram options (by @GochoMugo)
7. Add support for Node.js v9 (by @GochoMugo)
8. Document *TelegramBot.errors*, *TelegramBot.messageTypes* (by @GochoMugo)

Changed:

1. Update *TelegramBot#answerCallbackQuery()* signature (by @GochoMugo)
2. Improve default error logging of `polling_error` and `webhook_error` (#377)
3. Update dependencies

Deprecated:

1. Sending files: *(See [usage guide][usage-sending-files])* (by @hufan-akari, @GochoMugo)
   * Error will **not** be thrown if `Buffer` is used and file-type could **not** be detected.
   * Filename will **not** be set to `data.${ext}` if `Buffer` is used
   * Content type will **not** default to `null` or `undefined`

Fixed:

1. Fix the offset infinite loop bug (#265, #36) (by @GochoMugo)
2. Fix game example (#449, #418) (by @MCSH)

* * *

## [0.29.0][0.29.0] - 2017-10-22

Added:

1. Add Bot API v3.2 methods:
   * (#429) *TelegramBot#getStickerSet* (by @CapacitorSet, @LibertyLocked)
   * (#430) *TelegramBot#uploadStickerFile* (by @CapacitorSet)
   * *TelegramBot#createNewStickerSet*, *TelegramBot#addStickerToSet*, *TelegramBot#setStickerPositionInSet*, *TelegramBot#deleteStickerFromSet* (by @GochoMugo)
2. Supports API v3.3

Deprecated:

1. Auto-enabling Promise cancellation (#319) (by @GochoMugo)

* * *

## [0.28.0][0.28.0] - 2017-08-06

Added:

1. (#361) Support Bot API v3.1 (by @Lord-Protector, @kamikazechaser)
2. (#332) Support Bot API v3.0 (by @kamikazechaser, @GochoMugo)
3. Add *TelegramBot#removeTextListener()* (by @GochoMugo)
4. (#342) Add game example (by @MCSH)
5. (#315) List 'bot-brother' project in community section in README (by @saeedhei)

Changed:

1. (#367) Update *TelegramBot#answerCallbackQuery()* signature (by @mnb3000)

Fixed:

1. (#325) Fix global regexp state reset (by @Sirius-A)
2. (#363) Fix download file path on windows (by @kucherenkovova)
3. (#346) Fix anchor webhook link in docs (by @Coac)

* * *

## [0.27.1][0.27.1] - 2017-04-07

Added:

1. (#287) Add Express WebHook example (by @kamikazechaser)

Fixed:

1. (#291) Improve docs (by @preco21)
2. (#298) Fix running on Node v5 (by @jehy)
3. (#307) Fix badge links in README (by @JaakkoLipsanen)
4. Fix defaulting value of `options.polling.params.timeout` (by @GochoMugo)
5. Fix typos in Github issue template (by @GochoMugo, requested-by @GingerPlusPlus)

* * *

## [0.27.0][0.27.0] - 2017-02-10

Added:

1. Add constructor options:
   * (#243) `options.polling.params` (by @GochoMugo, requested-by @sidelux)
2. Add methods:
   * (#74) *TelegramBot#removeReplyListener()* (by @githugger)
3. (#283) Add proper error handling (by @GochoMugo)
4. (#272) Add health-check endpoint (by @mironov)
   * `options.webHook.healthEndpoint`
5. (#152) Add test for TelegramBot#sendDocument() using 'fileOpts'
   param (by @evolun)
6. Document `options.webHook.host` (by @GochoMugo)
7. (#264) Add Bot API version to README (by @kamikazechaser)
8. Add examples:
   - (#271) WebHook on Heroku (by @TheBeastOfCaerbannog)
   - (#274) WebHook on Zeit Now (by @Ferrari)

Changed:

1. (#147) Use *String#indexOf()*, instead of *RegExp#test()*, to
   find token in webhook request (by @AVVS)

Fixed:

* Fix bug:
  - (#275, #280) fix es6 syntax error on Node.js v4.x (by @crazyabdul)
  - (#276) promise.warning from `request-promise` (by @GochoMugo,
    reported-by @preco21)
  - (#281) fix handling error during polling (by @GochoMugo,
    reported-by @dimawebmaker)
  - (#284) fix error during deletion of already-set webhook, during
    polling (by @GochoMugo, reported-by @dcparga)
1. Fix links in documentation (by @Ni2c2k)

* * *

## [0.26.0][0.26.0] - 2017-01-20

Added:

1. Add *TelegramBot* constructor options:
   * `options.https`
   * `options.baseApiUrl`
   * `options.filepath`
2. Add methods:
   * *TelegramBot#stopPolling()*
   * *TelegramBot#isPolling()*
   * *TelegramBot#openWebHook()*
   * *TelegramBot#closeWebHook()*
   * *TelegramBot#hasOpenWebHook()*
   * *TelegramBot#deleteWebHook()*
   * *TelegramBot#getWebHookInfo()*

Changed:

1. Use POST requests by default
2. Ensure all relevant methods return Promises
3. Document auto-deletion of webhook during polling
4. Deprecate support for Node.js v0.12
5. Fix consistency of methods signatures
6. Rename *TelegramBot#initPolling()* to *TelegramBot#startPolling()*
   * Deprecate *TelegramBot#initPolling()*

Fixed:

1. Handle error during formatting `formData`
2. Fix ES6 syntax

*Credits/Blames: Unless explicitly stated otherwise, above work was
done by @GochoMugo*

* * *

## [0.25.0][0.25.0] - 2016-12-21

Added:

1. Supports the API v2.3 updates (by @kamikazechaser)
2. Add *TelegramBot* constructor option:
   * `options.request`: proxy extra request options (by @tarmolov)
   * `options.onlyFirstMatch` (by @GingerPlusPlus)
3. Add methods:
   * *TelegramBot#sendVenue()* (by Tketa)
   * *TelegramBot#sendContact()* (by @GochoMugo)
   * *TelegramBot#getGameHighScores()* (by @jishnu7)

Fixed:

1. Fix request performance issue (by @preco21)
2. Fix typos (by oflisback)

[usage-sending-files]:https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files-options

[0.25.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.25.0
[0.26.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.26.0
[0.27.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.27.0
[0.27.1]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.27.1
[0.28.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.28.0
[0.29.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.29.0
[0.30.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.30.0
[Unreleased]:https://github.com/yagop/node-telegram-bot-api/compare/v0.30.0...master
