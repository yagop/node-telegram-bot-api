# Contributing

> If you are willing to contribute, first you should know that
> I will love you and so will the Telegram Bot community.

Before proceeding any further, read the following documents:

1. [Code of Conduct][coc]
1. [License][license]

## General Information

### Creating a Github issue:

1. Ensure that your issue does **not** already exist. [Do a search](https://github.com/yagop/node-telegram-bot-api/issues).
2. Browse through [StackOverflow](https://stackoverflow.com/search?q=telegram+nodejs) and other similar platforms.
3. Should you open your issue, ensure you use the English language for
   the wider target audience.
4. Be patient please.


### Updating API Reference i.e. generating `doc/api.md`

Run:

```bash
$ npm run doc
```


### Running tests

Please read `test/README.md` for more information.


### Transpiling ES2015 for older Node.js versions

We use babel to transpile the code:

```bash
$ npm run build
```

[coc]:https://github.com/yagop/node-telegram-bot-api/blob/master/CODE_OF_CONDUCT.md
[license]:https://github.com/yagop/node-telegram-bot-api/blob/master/LICENSE.md
