# Missing integration test cases

The suite has 92 untested method/param targets: 17 are READY to write now with the standard `TOKEN`/`TEST_GROUP_ID`/`TEST_USER_ID` env (4 brand-new method tests plus 13 param top-ups and rejection-path checks), 67 NEEDS_FIXTURE items blocked on a business connection, payment/game/gift/story context, a forum or special chat type, or extra env, and 8 are intentionally skipped because they are irreversible. The quick wins below cover everything addable today; the rest are grouped by the fixture they need.

## 1. Quick wins — ready to write now

| Method | What to test | Notes (from testSketch) |
|---|---|---|
| createInvoiceLink | New method: with `XTR` currency + empty `provider_token`, returns a real `https://t.me/` invoice URL | `bot.createInvoiceLink("title","desc","payload-${TIMESTAMP}","","XTR",[{label:"Item",amount:1}])`; `assert.match(link, /^https:\/\/t\.me\//)`. Pure read-style, no chat state created. |
| getChatGifts | New method: read-only against `TEST_GROUP_ID` | Assert it resolves to an object/array **or** rejects with `err.code==='ETELEGRAM'`; read-only, no restore. |
| unbanChatMember | New method: unban a non-banned member is a safe no-op | `bot.unbanChatMember(GROUP_ID, USER_ID,{only_if_banned:true})`, assert `result===true`; `only_if_banned` keeps it a no-op, no restore. |
| declineSuggestedPost | New method (reject path): bogus `message_id` against `GROUP_ID` | `assert.rejects(bot.declineSuggestedPost(Number(GROUP_ID),999999,{comment:"no"}), e=>e.code==='ETELEGRAM')`; nothing mutated. |
| deleteForumTopic | Reject path: non-forum `GROUP_ID` rejects | `assert.rejects(bot.deleteForumTopic(GROUP_ID,999999), e=>e.code==='ETELEGRAM')`; no state created. |
| editChatSubscriptionInviteLink | Reject path: bogus/non-subscription `invite_link` | `assert.rejects(bot.editChatSubscriptionInviteLink(GROUP_ID,"https://t.me/+invalid",{name:`sub-${TIMESTAMP}`}), TelegramError)`; no link created, no revoke. |
| editUserStarSubscription | Reject path: non-existent `telegram_payment_charge_id` | `bot.editUserStarSubscription(USER_ID,'nonexistent_charge',true)`, assert `err.code==='ETELEGRAM'`; nothing touched. |
| getBusinessAccountGifts | Reject path: invalid `business_connection_id` | `bot.getBusinessAccountGifts('invalid_bcid')`, assert `err.code==='ETELEGRAM'`; read-only. |
| getBusinessAccountStarBalance | Reject path: invalid `business_connection_id` | `bot.getBusinessAccountStarBalance('invalid_bcid')`, assert `err.code==='ETELEGRAM'`; read-only. |
| getBusinessConnection | Reject path: invalid `business_connection_id` | `bot.getBusinessConnection('invalid_bcid')`, assert `err.code==='ETELEGRAM'`; read-only. |
| getGameHighScores | Reject path: no real game message | `bot.getGameHighScores(USER_ID,{chat_id:GROUP_ID,message_id:1})`, assert `err.code==='ETELEGRAM'`; read-only. |
| getManagedBotAccessSettings | Reject path: bot not in managed-bot relationship | `bot.getManagedBotAccessSettings(USER_ID)`, assert `err.code==='ETELEGRAM'`; read-only. |
| setMyName | Param top-up: `language_code` round-trips through `getMyName` | `setMyName({name:`NTBA ${Date.now()%100000}`,language_code:'es'})`, assert `getMyName({language_code:'es'}).name` matches; save original in `before()`, restore (empty name clears) in `after()`. |
| promoteChatMember | Param top-up: all remaining boolean admin-right flags + `is_anonymous` | Add `is_anonymous, can_manage_chat, can_delete_messages, can_manage_video_chats, can_restrict_members, can_promote_members, can_invite_users, can_post_messages, can_edit_messages, can_post_stories, can_edit_stories, can_delete_stories, can_manage_topics, can_manage_direct_messages, can_manage_tags` to the options; owner can't be promoted so `assert.rejects(..., TelegramError)`, no mutation. |
| sendPoll | Param top-up: `country_codes` + `hide_results_until_closes` | `sendPoll(GROUP_ID,'q?',[{text:'a'},{text:'b'}],{country_codes:['US','GB'],hide_results_until_closes:true,open_period:60})`, assert `res.poll` present; `open_period` auto-closes, no cleanup. |
| copyMessage | Param top-up: `caption_entities`, `reply_parameters`, `video_start_timestamp` | Copy a caption-bearing source with `caption_entities:[{type:'bold',offset:0,length:6}]`; copy with `reply_parameters:{message_id:source.message_id}`; `sendVideo` then copy with `video_start_timestamp:1`. Assert `typeof message_id==='number'`; throwaway copies, no cleanup. |
| stopMessageLiveLocation | Param top-up: `reply_markup` on the existing live-location test | Pass `reply_markup:{inline_keyboard:[[{text:'done',callback_data:'done'}]]}` to `stopMessageLiveLocation({chat_id:GROUP_ID,message_id})`; assert result truthy; message ephemeral, no restore. |

## 2. Needs fixtures or extra env

### Business connection
A `TEST_BUSINESS_CONNECTION_ID` from a Premium user connecting their account to the bot.

- **deleteBusinessMessages** — connection + a message sent on behalf of the connected account.
- **readBusinessMessage** — connection + a received business message (chat_id/message_id).
- **getManagedBotToken** — managed-bot connection; assert returned `BusinessConnection.id`.
- **setManagedBotAccessSettings** — managed-account fixture user; read, set, restore prior settings.
- **setBusinessAccountBio** — connection; mutates connected account bio.
- **setBusinessAccountName** — connection; read name, set, restore in `after`.
- **setBusinessAccountUsername** — connection + a free/owned spare username; restore prior.
- **setBusinessAccountProfilePhoto** — connection + jpeg buffer; restore via `removeBusinessAccountProfilePhoto`.
- **removeBusinessAccountProfilePhoto** — connection (reject path on bogus id otherwise).
- **setBusinessAccountGiftSettings** — connection; mutates gift settings.
- **transferBusinessAccountStars** — connection + star balance.
- **sendChecklist** — connection (Business-only feature).
- **editMessageChecklist** — connection + a prior `sendChecklist` message.
- **editMessageText / editMessageCaption / editMessageReplyMarkup / editMessageMedia / editMessageLiveLocation** — `business_connection_id` param (the only untested one each); needs an active connection.
- **pinChatMessage / unpinChatMessage / stopPoll / sendChatAction** — `business_connection_id` param; needs an active connection.

### Payments / invoices
A `TEST_PROVIDER_TOKEN` (or live payment-flow update ids).

- **sendInvoice** — `TEST_PROVIDER_TOKEN`; assert `message_id`, then `deleteMessage`.
- **answerPreCheckoutQuery** — live `pre_checkout_query_id` from a real checkout update.
- **answerShippingQuery** — live `shipping_query_id` from a flexible-shipping flow.
- **refundStarPayment** — real `telegram_payment_charge_id` (reject path on bogus id otherwise: `CHARGE_NOT_FOUND`).
- **sendPaidMedia** — a paid-media-enabled channel + funded Stars balance (charges real Stars).

### Games
A `TEST_GAME_SHORT_NAME` registered via BotFather.

- **sendGame** — assert `result.message_id` is a number, then `deleteMessage`.
- **setGameScore** — registered game + sent game message; `setGameScore(userId,score,{chat_id,message_id,force:true})`.

### Gifts & Stars
A funded Stars balance and/or owned `owned_gift_id` (most also need a business connection).

- **sendGift** — valid `gift_id` from `getAvailableGifts` + funded balance (irreversible paid debit).
- **giftPremiumSubscription** — *(also irreversible; see §3)*.
- **convertGiftToStars** — business connection + owned convertible `owned_gift_id`.
- **transferGift** — business connection + `owned_gift_id` + owner chat (irreversible move).
- **upgradeGift** — business connection + upgrade-eligible `owned_gift_id` (irreversible).
- **getUserGifts** — a user with visible owned gifts (else tolerate `ETELEGRAM`).

### Stories
A business connection plus story content/ids.

- **postStory** — connection + `InputStoryContent` photo; assert returned `Story.id`.
- **editStory** — connection + owned `story_id` + `InputStoryContent`.
- **deleteStory** — connection + posted `story_id`.
- **repostStory** — connection + source `from_chat_id`/`from_story_id` (reject path on bogus id otherwise).

### Forum / supergroup & special chat types
A forum-enabled supergroup (`TEST_FORUM_GROUP_ID`), a channel direct-messages/monoforum chat, or a sender-chat id.

- **createForumTopic** — forum supergroup; assert `icon_color`/`icon_custom_emoji_id` on the created `ForumTopic`, then `deleteForumTopic` to restore.
- **editForumTopic** — forum supergroup + live topic + `getForumTopicIconStickers` id for `icon_custom_emoji_id`.
- **approveSuggestedPost** — channel direct-messages chat with a pending suggested post.
- **setChatMemberTag** — direct-messages-enabled channel; set `tag`, then clear to restore.
- **unbanChatSenderChat** — a banned sender channel id.
- **copyMessages / forwardMessages** — `message_thread_id` (forum topic) and/or `direct_messages_topic_id` (monoforum).
- **forwardMessage** — `message_thread_id`, `direct_messages_topic_id`+`suggested_post_parameters`, `message_effect_id` (private), `video_start_timestamp` (video source).
- **sendMessage / sendContact / sendDice / sendLocation / sendVenue / sendMediaGroup** — `message_thread_id` (forum), `direct_messages_topic_id`+`suggested_post_parameters` (monoforum), `message_effect_id` (private), `allow_paid_broadcast` (paid-broadcast-eligible).
- **sendPoll** (remaining params) — `message_thread_id` (forum), `members_only` (member-restricted supergroup), `media`/`explanation_media` (quiz `InputPollMedia` upload), `allow_paid_broadcast`.
- **deleteAllMessageReactions / deleteMessageReaction** — `actor_chat_id` (a chat-actor/anonymous-channel reaction).
- **setChatMenuButton** — private-chat `chat_id` (group id is rejected); save/set/restore the button.

### Other (Mini App, inline, verification)
- **answerInlineQuery** — inline mode enabled in BotFather + a live `inline_query_id`.
- **answerWebAppQuery** — a configured Web App + live `web_app_query_id`.
- **answerGuestQuery** — a captured live `guest_query_id` + `InlineQueryResult`.
- **savePreparedInlineMessage / savePreparedKeyboardButton** — a Mini App user who authorized sharing (reject path otherwise).
- **setUserEmojiStatus** — user consent via `requestEmojiStatusAccess` + `TEST_CUSTOM_EMOJI_ID`; set then clear.
- **getUserPersonalChatMessages** — a user with a populated personal channel the bot may read.
- **verifyChat / removeChatVerification / verifyUser / removeUserVerification** — a verification-authorized organization bot (reject path otherwise).
- **sendMessageDraft** — a pre-existing numeric `draft_id` (no way to create one in standard env).

## 3. Intentionally skipped

- **close** — shuts the bot instance down on the Telegram server; in the irreversible-skip list with `logOut`.
- **logOut** — logs the bot out of the Telegram cloud API server irreversibly.
- **setWebHook** — irreversibly mutates update-delivery config and disables polling (the suite's update source).
- **deleteWebHook** — mutates the global webhook config irreversibly and conflicts with polling.
- **leaveChat** — removes the bot from `TEST_GROUP_ID`, destroying shared chat state the suite depends on.
- **giftPremiumSubscription** — spends real Stars to grant Premium; irreversible balance debit with no safe assertion.
- **replaceManagedBotToken** — irreversibly invalidates the existing token; account-config mutation with no safe restore.
- **setPassportDataErrors** — flags a real user's submitted Passport data; only meaningful on received encrypted data, no reversible assertion.
