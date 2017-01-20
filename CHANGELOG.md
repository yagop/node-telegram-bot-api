# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][Unreleased]



* * *

## [0.26.0][0.26.0] - 2016-01-20

Added:

1. Add *TelegramBot* constructor options:
  * `options.https`
  * `options.baseApiUrl`
  * `options.filepath`
1. Add methods:
  * *TelegramBot#stopPolling()*
  * *TelegramBot#isPolling()*
  * *TelegramBot#openWebHook()*
  * *TelegramBot#closeWebHook()*
  * *TelegramBot#hasOpenWebHook()*
  * *TelegramBot#deleteWebHook()*
  * *TelegramBot#getWebHookInfo()*

Changed:

1. Use POST requests by default
1. Ensure all relevant methods return Promises
1. Document auto-deletion of webhook during polling
1. Deprecate support for Node.js v0.12
1. Fix consistency of methods signatures
1. Rename *TelegramBot#initPolling()* to *TelegramBot#startPolling()*
  * Deprecate *TelegramBot#initPolling()*

Fixed:

1. Handle error during formatting `formData`
1. Fix ES6 syntax

*Credits/Blames: Unless explicitly stated otherwise, above work was
done by @GochoMugo*

* * *

## [0.25.0][0.25.0] - 2016-12-21

Added:

1. Supports the API v2.3 updates (by @kamikazechaser)
1. Add *TelegramBot* constructor option:
  * `options.request`: proxy extra request options (by @tarmolov)
  * `options.onlyFirstMatch` (by @GingerPlusPlus)
1. Add methods:
  * *TelegramBot#sendVenue()* (by Tketa)
  * *TelegramBot#sendContact()* (by @GochoMugo)
  * *TelegramBot#getGameHighScores()* (by @jishnu7)

Fixed:

1. Fix request performance issue (by @preco21)
1. Fix typos (by oflisback)


[0.25.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.25.0
[0.26.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.26.0
[Unreleased]:https://github.com/yagop/node-telegram-bot-api/compare/v0.26.0...master
