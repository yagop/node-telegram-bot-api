# Help Information

* [Common Pitfalls](#pitfalls)
* [FAQs](#faqs)


* * *


<a name="pitfalls"></a>
## Common Pitfalls

1. [Failing to receive reply with `ReplyToMessage`](#reply-to-message)


---


<a name="reply-to-message"></a>
**Failing to receive reply with `ReplyToMessage`**

The user has to **manually reply** to your message, by tapping on the
bot's message and select *Reply*.

Sources:

  * Issue #113: https://github.com/yagop/node-telegram-bot-api/issues/113


* * *


<a name="faqs"></a>
## Frequently Asked Questions

> Check out [all questions ever asked][questions] on our Github Issues.

[questions]:https://github.com/yagop/node-telegram-bot-api/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Aquestion%20

1. [How do I send GIFs?](#gifs)
1. [Why and When do I need a certificate when using WebHooks?](#webhook-cert)
1. [How do I know when a user leaves a chat?](#leave-chat)
1. [What does this error mean?](#error-meanings)
1. [How do I know the selected option in reply keyboard?](#reply-keyboard)
1. [How do I send multiple message in correct sequence?](#ordered-sending)
1. [How do I run my bot behind a proxy?](#proxy)
1. [Can you add feature X to the library?](#new-feature)
1. [Is this scalable?](#scalable)


---

<a name="gifs"></a>
**How do I send GIFs?**

You might be trying to send your animated GIFs using *TelegramBot#sendPhoto()*.
The method mostly supports static images. As noted by the community,
it seems you need to send them as documents, using *TelegramBot#sendDocument()*.


```js
bot.sendDocument(chatId, "cat.gif");
```

Sources:

  * Issue #11: https://github.com/yagop/node-telegram-bot-api/issues/11


---


<a name="webhook-cert"></a>
**Why and When do I need a certificate when using WebHooks?**

*Not Done. Send PR please!*

Sources:

  * Issue #63: https://github.com/yagop/node-telegram-bot-api/issues/63
  * Issue #125: https://github.com/yagop/node-telegram-bot-api/issues/125


---

<a name="leave-chat"></a>
**How do I know when a user leaves a chat?**

*Not Done. Send PR please!*

Sources:

  * Issue #248: https://github.com/yagop/node-telegram-bot-api/issues/248


---


<a name="error-meanings"></a>
**What does this error mean?**

*Not Done. Send PR please!*

Sources:

  * Issue #73: https://github.com/yagop/node-telegram-bot-api/issues/73
  * Issue #99: https://github.com/yagop/node-telegram-bot-api/issues/99
  * Issue #101: https://github.com/yagop/node-telegram-bot-api/issues/101
  * Issue #107: https://github.com/yagop/node-telegram-bot-api/issues/107
  * Issue #156: https://github.com/yagop/node-telegram-bot-api/issues/156
  * Issue #170: https://github.com/yagop/node-telegram-bot-api/issues/170
  * Issue #244: https://github.com/yagop/node-telegram-bot-api/issues/244


---


<a name="reply-keyboard"></a>
**How do I know the selected option in reply keyboard?**

*Not Done. Send PR please!*

Sources:

  * Issue #108: https://github.com/yagop/node-telegram-bot-api/issues/108


---


<a name="ordered-sending"></a>
**How do I send multiple message in correct sequence?**

*Not Done. Send PR please!*

Sources:

  * Issue #240: https://github.com/yagop/node-telegram-bot-api/issues/240


---


<a name="proxy"></a>
**How do I run my bot behind a proxy?**

*Not Done. Send PR please!*

Sources:

  * Issue #122: https://github.com/yagop/node-telegram-bot-api/issues/122
  * Issue #253: https://github.com/yagop/node-telegram-bot-api/issues/253


---


<a name="new-feature"></a>
**Can you add feature X to the library?**

*Not Done. Send PR please!*

Sources:

  * Issue #238: https://github.com/yagop/node-telegram-bot-api/issues/238


---

<a name="scalable"></a>
**Is this scalable?**

*Not Done. Send PR please!*

---
