# Contributing

> If you are willing to contribute, first you should know that
> I will love you and so will the Telegram Bot community.

Before proceeding any further, read the following documents:

1. [Code of Conduct][coc]
1. [License][license]

## General Information

### Updating API Reference i.e. generating `doc/api.md`

Run:

```bash
$ npm run gen-doc
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
