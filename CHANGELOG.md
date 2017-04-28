# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][Unreleased]

Added:

1. (#315) List 'bot-brother' project in community section in README (by @saeedhei)


* * *

## [0.27.1][0.27.1] - 2017-04-07

Added:

1. (#287) Add Express WebHook example (by @kamikazechaser)


Fixed:

1. (#291) Improve docs (by @preco21)
1. (#298) Fix running on Node v5 (by @jehy)
1. (#307) Fix badge links in README (by @JaakkoLipsanen)
1. Fix defaulting value of `options.polling.params.timeout` (by @GochoMugo)
1. Fix typos in Github issue template (by @GochoMugo, requested-by @GingerPlusPlus)


* * *

## [0.27.0][0.27.0] - 2017-02-10

Added:

1. Add constructor options:
  * (#243) `options.polling.params` (by @GochoMugo, requested-by @sidelux)
1. Add methods:
  * (#74) *TelegramBot#removeReplyListener()* (by @githugger)
1. (#283) Add proper error handling (by @GochoMugo)
1. (#272) Add health-check endpoint (by @mironov)
  * `options.webHook.healthEndpoint`
1. (#152) Add test for TelegramBot#sendDocument() using 'fileOpts'
   param (by @evolun)
1. Document `options.webHook.host` (by @GochoMugo)
1. (#264) Add Bot API version to README (by @kamikazechaser)
1. Add examples:
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
[0.27.0]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.27.0
[0.27.1]:https://github.com/yagop/node-telegram-bot-api/releases/tag/v0.27.1
[Unreleased]:https://github.com/yagop/node-telegram-bot-api/compare/v0.27.1...master
