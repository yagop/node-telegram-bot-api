# API Reference

**Note:** If you are looking for available [events](usage.md#events) or usage of api, please refer [`usage.md`](usage.md).

> Generated from `src/telegram.ts` by `scripts/api-doc.ts` - do not edit by hand.

<a name="TelegramBot"></a>

## TelegramBot

**Kind**: global class

**See**: https://core.telegram.org/bots/api

* [TelegramBot](#TelegramBot)
    * [new TelegramBot(token, [options])](#new_TelegramBot_new)
    * _instance_
        * [.on(event, listener)](#TelegramBot+on) ⇒ <code>Object</code>
        * [.startPolling([options])](#TelegramBot+startPolling) ⇒ <code>Promise</code>
        * [.stopPolling([options])](#TelegramBot+stopPolling) ⇒ <code>Promise</code>
        * [.isPolling()](#TelegramBot+isPolling) ⇒ <code>Boolean</code>
        * [.openWebHook()](#TelegramBot+openWebHook) ⇒ <code>Promise</code>
        * [.closeWebHook()](#TelegramBot+closeWebHook) ⇒ <code>Promise</code>
        * [.hasOpenWebHook()](#TelegramBot+hasOpenWebHook) ⇒ <code>Boolean</code>
        * [.onText(regexp, callback)](#TelegramBot+onText)
        * [.removeTextListener(regexp)](#TelegramBot+removeTextListener) ⇒ <code>Object</code>
        * [.clearTextListeners()](#TelegramBot+clearTextListeners)
        * [.onReplyToMessage(chatId, messageId, callback)](#TelegramBot+onReplyToMessage) ⇒ <code>Number</code>
        * [.removeReplyListener(replyListenerId)](#TelegramBot+removeReplyListener) ⇒ <code>Object</code>
        * [.clearReplyListeners()](#TelegramBot+clearReplyListeners) ⇒ <code>Array</code>
        * [.processUpdate(update)](#TelegramBot+processUpdate)
        * [.getFileLink(fileId, [options])](#TelegramBot+getFileLink) ⇒ <code>Promise</code>
        * [.getFileStream(fileId, [options])](#TelegramBot+getFileStream) ⇒ <code>stream.Readable</code>
        * [.downloadFile(fileId, downloadDir, [options])](#TelegramBot+downloadFile) ⇒ <code>Promise</code>
        * [.getUpdates([options])](#TelegramBot+getUpdates) ⇒ <code>Promise</code>
        * [.setWebhook(url, [options], [fileOptions])](#TelegramBot+setWebhook) ⇒ <code>Promise</code>
        * [.deleteWebhook([options])](#TelegramBot+deleteWebhook) ⇒ <code>Promise</code>
        * [.getWebhookInfo([options])](#TelegramBot+getWebhookInfo) ⇒ <code>Promise</code>
        * [~~.setWebHook(url, [options], [fileOptions])~~](#TelegramBot+setWebHook) ⇒ <code>Promise</code>
        * [~~.deleteWebHook([options])~~](#TelegramBot+deleteWebHook) ⇒ <code>Promise</code>
        * [~~.getWebHookInfo([options])~~](#TelegramBot+getWebHookInfo) ⇒ <code>Promise</code>
        * [.getMe([options])](#TelegramBot+getMe) ⇒ <code>Promise</code>
        * [.logOut([options])](#TelegramBot+logOut) ⇒ <code>Promise</code>
        * [.close([options])](#TelegramBot+close) ⇒ <code>Promise</code>
        * [.sendMessage(chatId, text, [options])](#TelegramBot+sendMessage) ⇒ <code>Promise</code>
        * [.forwardMessage(chatId, fromChatId, messageId, [options])](#TelegramBot+forwardMessage) ⇒ <code>Promise</code>
        * [.forwardMessages(chatId, fromChatId, messageIds, [options])](#TelegramBot+forwardMessages) ⇒ <code>Promise</code>
        * [.copyMessage(chatId, fromChatId, messageId, [options])](#TelegramBot+copyMessage) ⇒ <code>Promise</code>
        * [.copyMessages(chatId, fromChatId, messageIds, [options])](#TelegramBot+copyMessages) ⇒ <code>Promise</code>
        * [.sendPhoto(chatId, photo, [options], [fileOptions])](#TelegramBot+sendPhoto) ⇒ <code>Promise</code>
        * [.sendLivePhoto(chatId, livePhoto, photo, [options], [fileOptions])](#TelegramBot+sendLivePhoto) ⇒ <code>Promise</code>
        * [.sendAudio(chatId, audio, [options], [fileOptions])](#TelegramBot+sendAudio) ⇒ <code>Promise</code>
        * [.sendDocument(chatId, doc, [options], [fileOptions])](#TelegramBot+sendDocument) ⇒ <code>Promise</code>
        * [.sendVideo(chatId, video, [options], [fileOptions])](#TelegramBot+sendVideo) ⇒ <code>Promise</code>
        * [.sendAnimation(chatId, animation, [options], [fileOptions])](#TelegramBot+sendAnimation) ⇒ <code>Promise</code>
        * [.sendVoice(chatId, voice, [options], [fileOptions])](#TelegramBot+sendVoice) ⇒ <code>Promise</code>
        * [.sendVideoNote(chatId, videoNote, [options], [fileOptions])](#TelegramBot+sendVideoNote) ⇒ <code>Promise</code>
        * [.sendPaidMedia(chatId, starCount, media, [options])](#TelegramBot+sendPaidMedia) ⇒ <code>Promise</code>
        * [.sendMediaGroup(chatId, media, [options])](#TelegramBot+sendMediaGroup) ⇒ <code>Promise</code>
        * [.sendLocation(chatId, latitude, longitude, [options])](#TelegramBot+sendLocation) ⇒ <code>Promise</code>
        * [.sendVenue(chatId, latitude, longitude, title, address, [options])](#TelegramBot+sendVenue) ⇒ <code>Promise</code>
        * [.sendContact(chatId, phoneNumber, firstName, [options])](#TelegramBot+sendContact) ⇒ <code>Promise</code>
        * [.sendPoll(chatId, question, pollOptions, [options])](#TelegramBot+sendPoll) ⇒ <code>Promise</code>
        * [.sendChecklist(businessConnectionId, chatId, checklist, [options])](#TelegramBot+sendChecklist) ⇒ <code>Promise</code>
        * [.sendDice(chatId, [options])](#TelegramBot+sendDice) ⇒ <code>Promise</code>
        * [.sendMessageDraft(chatId, draftId, text, [options])](#TelegramBot+sendMessageDraft) ⇒ <code>Promise</code>
        * [.sendChatAction(chatId, action, [options])](#TelegramBot+sendChatAction) ⇒ <code>Promise</code>
        * [.setMessageReaction(chatId, messageId, [options])](#TelegramBot+setMessageReaction) ⇒ <code>Promise</code>
        * [.editMessageLiveLocation(latitude, longitude, [options])](#TelegramBot+editMessageLiveLocation) ⇒ <code>Promise</code>
        * [.stopMessageLiveLocation([options])](#TelegramBot+stopMessageLiveLocation) ⇒ <code>Promise</code>
        * [.getUserProfilePhotos(userId, [options])](#TelegramBot+getUserProfilePhotos) ⇒ <code>Promise</code>
        * [.getUserProfileAudios(userId, [options])](#TelegramBot+getUserProfileAudios) ⇒ <code>Promise</code>
        * [.setUserEmojiStatus(userId, [options])](#TelegramBot+setUserEmojiStatus) ⇒ <code>Promise</code>
        * [.getFile(fileId, [options])](#TelegramBot+getFile) ⇒ <code>Promise</code>
        * [.getUserPersonalChatMessages(userId, limit)](#TelegramBot+getUserPersonalChatMessages) ⇒ <code>Promise</code>
        * [.banChatMember(chatId, userId, [options])](#TelegramBot+banChatMember) ⇒ <code>Promise</code>
        * [.unbanChatMember(chatId, userId, [options])](#TelegramBot+unbanChatMember) ⇒ <code>Promise</code>
        * [.restrictChatMember(chatId, userId, permissions, [options])](#TelegramBot+restrictChatMember) ⇒ <code>Promise</code>
        * [.promoteChatMember(chatId, userId, [options])](#TelegramBot+promoteChatMember) ⇒ <code>Promise</code>
        * [.setChatAdministratorCustomTitle(chatId, userId, customTitle, [options])](#TelegramBot+setChatAdministratorCustomTitle) ⇒ <code>Promise</code>
        * [.setChatMemberTag(chatId, userId, [options])](#TelegramBot+setChatMemberTag) ⇒ <code>Promise</code>
        * [.banChatSenderChat(chatId, senderChatId, [options])](#TelegramBot+banChatSenderChat) ⇒ <code>Promise</code>
        * [.unbanChatSenderChat(chatId, senderChatId, [options])](#TelegramBot+unbanChatSenderChat) ⇒ <code>Promise</code>
        * [.setChatPermissions(chatId, permissions, [options])](#TelegramBot+setChatPermissions) ⇒ <code>Promise</code>
        * [.exportChatInviteLink(chatId, [options])](#TelegramBot+exportChatInviteLink) ⇒ <code>Promise</code>
        * [.createChatInviteLink(chatId, [options])](#TelegramBot+createChatInviteLink) ⇒ <code>Promise</code>
        * [.editChatInviteLink(chatId, inviteLink, [options])](#TelegramBot+editChatInviteLink) ⇒ <code>Promise</code>
        * [.createChatSubscriptionInviteLink(chatId, subscriptionPeriod, subscriptionPrice, [options])](#TelegramBot+createChatSubscriptionInviteLink) ⇒ <code>Promise</code>
        * [.editChatSubscriptionInviteLink(chatId, inviteLink, [options])](#TelegramBot+editChatSubscriptionInviteLink) ⇒ <code>Promise</code>
        * [.revokeChatInviteLink(chatId, inviteLink, [options])](#TelegramBot+revokeChatInviteLink) ⇒ <code>Promise</code>
        * [.approveChatJoinRequest(chatId, userId, [options])](#TelegramBot+approveChatJoinRequest) ⇒ <code>Promise</code>
        * [.declineChatJoinRequest(chatId, userId, [options])](#TelegramBot+declineChatJoinRequest) ⇒ <code>Promise</code>
        * [.setChatPhoto(chatId, photo, [options], [fileOptions])](#TelegramBot+setChatPhoto) ⇒ <code>Promise</code>
        * [.deleteChatPhoto(chatId, [options])](#TelegramBot+deleteChatPhoto) ⇒ <code>Promise</code>
        * [.setChatTitle(chatId, title, [options])](#TelegramBot+setChatTitle) ⇒ <code>Promise</code>
        * [.setChatDescription(chatId, description, [options])](#TelegramBot+setChatDescription) ⇒ <code>Promise</code>
        * [.pinChatMessage(chatId, messageId, [options])](#TelegramBot+pinChatMessage) ⇒ <code>Promise</code>
        * [.unpinChatMessage(chatId, [options])](#TelegramBot+unpinChatMessage) ⇒ <code>Promise</code>
        * [.unpinAllChatMessages(chatId, [options])](#TelegramBot+unpinAllChatMessages) ⇒ <code>Promise</code>
        * [.leaveChat(chatId, [options])](#TelegramBot+leaveChat) ⇒ <code>Promise</code>
        * [.getChat(chatId, [options])](#TelegramBot+getChat) ⇒ <code>Promise</code>
        * [.getChatAdministrators(chatId, [options])](#TelegramBot+getChatAdministrators) ⇒ <code>Promise</code>
        * [.getChatMemberCount(chatId, [options])](#TelegramBot+getChatMemberCount) ⇒ <code>Promise</code>
        * [.getChatMember(chatId, userId, [options])](#TelegramBot+getChatMember) ⇒ <code>Promise</code>
        * [.setChatStickerSet(chatId, stickerSetName, [options])](#TelegramBot+setChatStickerSet) ⇒ <code>Promise</code>
        * [.deleteChatStickerSet(chatId, [options])](#TelegramBot+deleteChatStickerSet) ⇒ <code>Promise</code>
        * [.getForumTopicIconStickers([options])](#TelegramBot+getForumTopicIconStickers) ⇒ <code>Promise</code>
        * [.createForumTopic(chatId, name, [options])](#TelegramBot+createForumTopic) ⇒ <code>Promise</code>
        * [.editForumTopic(chatId, messageThreadId, [options])](#TelegramBot+editForumTopic) ⇒ <code>Promise</code>
        * [.closeForumTopic(chatId, messageThreadId, [options])](#TelegramBot+closeForumTopic) ⇒ <code>Promise</code>
        * [.reopenForumTopic(chatId, messageThreadId, [options])](#TelegramBot+reopenForumTopic) ⇒ <code>Promise</code>
        * [.deleteForumTopic(chatId, messageThreadId, [options])](#TelegramBot+deleteForumTopic) ⇒ <code>Promise</code>
        * [.unpinAllForumTopicMessages(chatId, messageThreadId, [options])](#TelegramBot+unpinAllForumTopicMessages) ⇒ <code>Promise</code>
        * [.editGeneralForumTopic(chatId, name, [options])](#TelegramBot+editGeneralForumTopic) ⇒ <code>Promise</code>
        * [.closeGeneralForumTopic(chatId, [options])](#TelegramBot+closeGeneralForumTopic) ⇒ <code>Promise</code>
        * [.reopenGeneralForumTopic(chatId, [options])](#TelegramBot+reopenGeneralForumTopic) ⇒ <code>Promise</code>
        * [.hideGeneralForumTopic(chatId, [options])](#TelegramBot+hideGeneralForumTopic) ⇒ <code>Promise</code>
        * [.unhideGeneralForumTopic(chatId, [options])](#TelegramBot+unhideGeneralForumTopic) ⇒ <code>Promise</code>
        * [.unpinAllGeneralForumTopicMessages(chatId, [options])](#TelegramBot+unpinAllGeneralForumTopicMessages) ⇒ <code>Promise</code>
        * [.answerCallbackQuery(callbackQueryId, [options])](#TelegramBot+answerCallbackQuery) ⇒ <code>Promise</code>
        * [.answerGuestQuery(guestQueryId, result)](#TelegramBot+answerGuestQuery) ⇒ <code>Promise</code>
        * [.savePreparedInlineMessage(userId, result, [options])](#TelegramBot+savePreparedInlineMessage) ⇒ <code>Promise</code>
        * [.savePreparedKeyboardButton(userId, button, [options])](#TelegramBot+savePreparedKeyboardButton) ⇒ <code>Promise</code>
        * [.getUserChatBoosts(chatId, userId, [options])](#TelegramBot+getUserChatBoosts) ⇒ <code>Promise</code>
        * [.getBusinessConnection(businessConnectionId, [options])](#TelegramBot+getBusinessConnection) ⇒ <code>Promise</code>
        * [.getManagedBotToken(userId, [options])](#TelegramBot+getManagedBotToken) ⇒ <code>Promise</code>
        * [.replaceManagedBotToken(userId, [options])](#TelegramBot+replaceManagedBotToken) ⇒ <code>Promise</code>
        * [.getManagedBotAccessSettings(userId, [options])](#TelegramBot+getManagedBotAccessSettings) ⇒ <code>Promise</code>
        * [.setManagedBotAccessSettings(userId, isAccessRestricted, [options])](#TelegramBot+setManagedBotAccessSettings) ⇒ <code>Promise</code>
        * [.setMyCommands(commands, [options])](#TelegramBot+setMyCommands) ⇒ <code>Promise</code>
        * [.deleteMyCommands([options])](#TelegramBot+deleteMyCommands) ⇒ <code>Promise</code>
        * [.getMyCommands([options])](#TelegramBot+getMyCommands) ⇒ <code>Promise</code>
        * [.setMyName([options])](#TelegramBot+setMyName) ⇒ <code>Promise</code>
        * [.getMyName([options])](#TelegramBot+getMyName) ⇒ <code>Promise</code>
        * [.setMyDescription([options])](#TelegramBot+setMyDescription) ⇒ <code>Promise</code>
        * [.getMyDescription([options])](#TelegramBot+getMyDescription) ⇒ <code>Promise</code>
        * [.setMyShortDescription([options])](#TelegramBot+setMyShortDescription) ⇒ <code>Promise</code>
        * [.getMyShortDescription([options])](#TelegramBot+getMyShortDescription) ⇒ <code>Promise</code>
        * [.setMyProfilePhoto(photo, [options])](#TelegramBot+setMyProfilePhoto) ⇒ <code>Promise</code>
        * [.removeMyProfilePhoto([options])](#TelegramBot+removeMyProfilePhoto) ⇒ <code>Promise</code>
        * [.setChatMenuButton([options])](#TelegramBot+setChatMenuButton) ⇒ <code>Promise</code>
        * [.getChatMenuButton([options])](#TelegramBot+getChatMenuButton) ⇒ <code>Promise</code>
        * [.setMyDefaultAdministratorRights([options])](#TelegramBot+setMyDefaultAdministratorRights) ⇒ <code>Promise</code>
        * [.getMyDefaultAdministratorRights([options])](#TelegramBot+getMyDefaultAdministratorRights) ⇒ <code>Promise</code>
        * [.editMessageText(text, [options])](#TelegramBot+editMessageText) ⇒ <code>Promise</code>
        * [.editMessageCaption(caption, [options])](#TelegramBot+editMessageCaption) ⇒ <code>Promise</code>
        * [.editMessageMedia(media, [options])](#TelegramBot+editMessageMedia) ⇒ <code>Promise</code>
        * [.editMessageChecklist(businessConnectionId, chatId, messageId, checklist, [options])](#TelegramBot+editMessageChecklist) ⇒ <code>Promise</code>
        * [.editMessageReplyMarkup(replyMarkup, [options])](#TelegramBot+editMessageReplyMarkup) ⇒ <code>Promise</code>
        * [.stopPoll(chatId, pollId, [options])](#TelegramBot+stopPoll) ⇒ <code>Promise</code>
        * [.approveSuggestedPost(chatId, messageId, [options])](#TelegramBot+approveSuggestedPost) ⇒ <code>Promise</code>
        * [.declineSuggestedPost(chatId, messageId, [options])](#TelegramBot+declineSuggestedPost) ⇒ <code>Promise</code>
        * [.sendSticker(chatId, sticker, [options], [fileOptions])](#TelegramBot+sendSticker) ⇒ <code>Promise</code>
        * [.getStickerSet(name, [options])](#TelegramBot+getStickerSet) ⇒ <code>Promise</code>
        * [.getCustomEmojiStickers(customEmojiIds, [options])](#TelegramBot+getCustomEmojiStickers) ⇒ <code>Promise</code>
        * [.uploadStickerFile(userId, sticker, [stickerFormat], [options], [fileOptions])](#TelegramBot+uploadStickerFile) ⇒ <code>Promise</code>
        * [.createNewStickerSet(userId, name, title, pngSticker, emojis, [options], [fileOptions])](#TelegramBot+createNewStickerSet) ⇒ <code>Promise</code>
        * [.addStickerToSet(userId, name, sticker, emojis, [stickerType], [options], [fileOptions])](#TelegramBot+addStickerToSet) ⇒ <code>Promise</code>
        * [.setStickerPositionInSet(sticker, position, [options])](#TelegramBot+setStickerPositionInSet) ⇒ <code>Promise</code>
        * [.deleteStickerFromSet(sticker, [options])](#TelegramBot+deleteStickerFromSet) ⇒ <code>Promise</code>
        * [.replaceStickerInSet(userId, name, oldSticker, [options])](#TelegramBot+replaceStickerInSet) ⇒ <code>Promise</code>
        * [.setStickerEmojiList(sticker, emojiList, [options])](#TelegramBot+setStickerEmojiList) ⇒ <code>Promise</code>
        * [.setStickerKeywords(sticker, [options])](#TelegramBot+setStickerKeywords) ⇒ <code>Promise</code>
        * [.setStickerMaskPosition(sticker, [options])](#TelegramBot+setStickerMaskPosition) ⇒ <code>Promise</code>
        * [.setStickerSetTitle(name, title, [options])](#TelegramBot+setStickerSetTitle) ⇒ <code>Promise</code>
        * [.setStickerSetThumbnail(userId, name, thumbnail, [options], [fileOptions])](#TelegramBot+setStickerSetThumbnail) ⇒ <code>Promise</code>
        * [.setCustomEmojiStickerSetThumbnail(name, [options])](#TelegramBot+setCustomEmojiStickerSetThumbnail) ⇒ <code>Promise</code>
        * [.deleteStickerSet(name, [options])](#TelegramBot+deleteStickerSet) ⇒ <code>Promise</code>
        * [.answerInlineQuery(inlineQueryId, results, [options])](#TelegramBot+answerInlineQuery) ⇒ <code>Promise</code>
        * [.answerWebAppQuery(webAppQueryId, result, [options])](#TelegramBot+answerWebAppQuery) ⇒ <code>Promise</code>
        * [.sendInvoice(chatId, title, description, payload, providerToken, currency, prices, [options])](#TelegramBot+sendInvoice) ⇒ <code>Promise</code>
        * [.createInvoiceLink(title, description, payload, providerToken, currency, prices, [options])](#TelegramBot+createInvoiceLink) ⇒ <code>Promise</code>
        * [.answerShippingQuery(shippingQueryId, ok, [options])](#TelegramBot+answerShippingQuery) ⇒ <code>Promise</code>
        * [.answerPreCheckoutQuery(preCheckoutQueryId, ok, [options])](#TelegramBot+answerPreCheckoutQuery) ⇒ <code>Promise</code>
        * [.setPassportDataErrors(userId, errors, [options])](#TelegramBot+setPassportDataErrors) ⇒ <code>Promise</code>
        * [.getMyStarBalance([options])](#TelegramBot+getMyStarBalance) ⇒ <code>Promise</code>
        * [.getStarTransactions([options])](#TelegramBot+getStarTransactions) ⇒ <code>Promise</code>
        * [.refundStarPayment(userId, telegramPaymentChargeId, [options])](#TelegramBot+refundStarPayment) ⇒ <code>Promise</code>
        * [.editUserStarSubscription(userId, telegramPaymentChargeId, isCanceled, [options])](#TelegramBot+editUserStarSubscription) ⇒ <code>Promise</code>
        * [.sendGame(chatId, gameShortName, [options])](#TelegramBot+sendGame) ⇒ <code>Promise</code>
        * [.setGameScore(userId, score, [options])](#TelegramBot+setGameScore) ⇒ <code>Promise</code>
        * [.getGameHighScores(userId, [form])](#TelegramBot+getGameHighScores) ⇒ <code>Promise</code>
        * [.deleteMessage(chatId, messageId, [options])](#TelegramBot+deleteMessage) ⇒ <code>Promise</code>
        * [.deleteMessages(chatId, messageIds, [options])](#TelegramBot+deleteMessages) ⇒ <code>Promise</code>
        * [.deleteMessageReaction(chatId, messageId, [form])](#TelegramBot+deleteMessageReaction) ⇒ <code>Promise</code>
        * [.deleteAllMessageReactions(chatId, [form])](#TelegramBot+deleteAllMessageReactions) ⇒ <code>Promise</code>
        * [.getAvailableGifts([options])](#TelegramBot+getAvailableGifts) ⇒ <code>Promise</code>
        * [.sendGift(giftId, [options])](#TelegramBot+sendGift) ⇒ <code>Promise</code>
        * [.giftPremiumSubscription(userId, monthCount, starCount, [options])](#TelegramBot+giftPremiumSubscription) ⇒ <code>Promise</code>
        * [.verifyUser(userId, [options])](#TelegramBot+verifyUser) ⇒ <code>Promise</code>
        * [.verifyChat(chatId, [options])](#TelegramBot+verifyChat) ⇒ <code>Promise</code>
        * [.removeUserVerification(userId, [options])](#TelegramBot+removeUserVerification) ⇒ <code>Promise</code>
        * [.removeChatVerification(chatId, [options])](#TelegramBot+removeChatVerification) ⇒ <code>Promise</code>
        * [.readBusinessMessage(businessConnectionId, chatId, messageId, [options])](#TelegramBot+readBusinessMessage) ⇒ <code>Promise</code>
        * [.deleteBusinessMessages(businessConnectionId, messageIds, [options])](#TelegramBot+deleteBusinessMessages) ⇒ <code>Promise</code>
        * [.setBusinessAccountName(businessConnectionId, firstName, [options])](#TelegramBot+setBusinessAccountName) ⇒ <code>Promise</code>
        * [.setBusinessAccountUsername(businessConnectionId, [options])](#TelegramBot+setBusinessAccountUsername) ⇒ <code>Promise</code>
        * [.setBusinessAccountBio(businessConnectionId, [options])](#TelegramBot+setBusinessAccountBio) ⇒ <code>Promise</code>
        * [.setBusinessAccountProfilePhoto(businessConnectionId, photo, [options])](#TelegramBot+setBusinessAccountProfilePhoto) ⇒ <code>Promise</code>
        * [.removeBusinessAccountProfilePhoto(businessConnectionId, [options])](#TelegramBot+removeBusinessAccountProfilePhoto) ⇒ <code>Promise</code>
        * [.setBusinessAccountGiftSettings(businessConnectionId, showGiftButton, acceptedGiftTypes, [options])](#TelegramBot+setBusinessAccountGiftSettings) ⇒ <code>Promise</code>
        * [.getBusinessAccountStarBalance(businessConnectionId, [options])](#TelegramBot+getBusinessAccountStarBalance) ⇒ <code>Promise</code>
        * [.transferBusinessAccountStars(businessConnectionId, starCount, [options])](#TelegramBot+transferBusinessAccountStars) ⇒ <code>Promise</code>
        * [.getBusinessAccountGifts(businessConnectionId, [options])](#TelegramBot+getBusinessAccountGifts) ⇒ <code>Promise</code>
        * [.getUserGifts(userId, [options])](#TelegramBot+getUserGifts) ⇒ <code>Promise</code>
        * [.getChatGifts(chatId, [options])](#TelegramBot+getChatGifts) ⇒ <code>Promise</code>
        * [.convertGiftToStars(businessConnectionId, ownedGiftId, [options])](#TelegramBot+convertGiftToStars) ⇒ <code>Promise</code>
        * [.upgradeGift(businessConnectionId, ownedGiftId, [options])](#TelegramBot+upgradeGift) ⇒ <code>Promise</code>
        * [.transferGift(businessConnectionId, ownedGiftId, newOwnerChatId, [options])](#TelegramBot+transferGift) ⇒ <code>Promise</code>
        * [.postStory(businessConnectionId, content, activePeriod, [options])](#TelegramBot+postStory) ⇒ <code>Promise</code>
        * [.repostStory(businessConnectionId, fromChatId, fromStoryId, activePeriod, [options])](#TelegramBot+repostStory) ⇒ <code>Promise</code>
        * [.editStory(businessConnectionId, storyId, content, [options])](#TelegramBot+editStory) ⇒ <code>Promise</code>
        * [.deleteStory(businessConnectionId, storyId, [options])](#TelegramBot+deleteStory) ⇒ <code>Promise</code>
    * _static_
        * [.errors](#TelegramBot.errors) : <code>Object</code>
        * [.messageTypes](#TelegramBot.messageTypes) : <code>Array</code>

<a name="new_TelegramBot_new"></a>

### new TelegramBot(token, [options])

| Param | Type | Description |
| --- | --- | --- |
| token | <code>String</code> | Telegram Bot API token |
| [options] | <code>Object</code> | Constructor options (polling, webHook, baseApiUrl, ...) |

<a name="TelegramBot+on"></a>

### telegramBot.on(event, listener) ⇒ <code>Object</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Object</code>

| Param | Type | Description |
| --- | --- | --- |
| event | <code>String \| Object</code> |  |
| listener | <code>function</code> |  |

<a name="TelegramBot+startPolling"></a>

### telegramBot.startPolling([options]) ⇒ <code>Promise</code>
Start polling.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+stopPolling"></a>

### telegramBot.stopPolling([options]) ⇒ <code>Promise</code>
Stop polling.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+isPolling"></a>

### telegramBot.isPolling() ⇒ <code>Boolean</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Boolean</code>

<a name="TelegramBot+openWebHook"></a>

### telegramBot.openWebHook() ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

<a name="TelegramBot+closeWebHook"></a>

### telegramBot.closeWebHook() ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

<a name="TelegramBot+hasOpenWebHook"></a>

### telegramBot.hasOpenWebHook() ⇒ <code>Boolean</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Boolean</code>

<a name="TelegramBot+onText"></a>

### telegramBot.onText(regexp, callback)

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp \| String</code> |  |
| callback | <code>Object</code> |  |

<a name="TelegramBot+removeTextListener"></a>

### telegramBot.removeTextListener(regexp) ⇒ <code>Object</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Object</code>

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp \| String</code> |  |

<a name="TelegramBot+clearTextListeners"></a>

### telegramBot.clearTextListeners()

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

<a name="TelegramBot+onReplyToMessage"></a>

### telegramBot.onReplyToMessage(chatId, messageId, callback) ⇒ <code>Number</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Number</code>

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| callback | <code>Object</code> |  |

<a name="TelegramBot+removeReplyListener"></a>

### telegramBot.removeReplyListener(replyListenerId) ⇒ <code>Object</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Object</code>

| Param | Type | Description |
| --- | --- | --- |
| replyListenerId | <code>Number</code> |  |

<a name="TelegramBot+clearReplyListeners"></a>

### telegramBot.clearReplyListeners() ⇒ <code>Array</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Array</code>

<a name="TelegramBot+processUpdate"></a>

### telegramBot.processUpdate(update)
Dispatch a single Update. Use this if you obtain updates from a source other
than this library's polling/webhook (e.g. AWS Lambda, custom proxy, tests).

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

| Param | Type | Description |
| --- | --- | --- |
| update | <code>Object</code> |  |

<a name="TelegramBot+getFileLink"></a>

### telegramBot.getFileLink(fileId, [options]) ⇒ <code>Promise</code>
Resolve a file id to the public download URL on Telegram's servers.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getFileStream"></a>

### telegramBot.getFileStream(fileId, [options]) ⇒ <code>stream.Readable</code>
Stream the contents of a Telegram file. The returned stream emits an `info`
event with the resolved URI before the bytes start flowing.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>stream.Readable</code>

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+downloadFile"></a>

### telegramBot.downloadFile(fileId, downloadDir, [options]) ⇒ <code>Promise</code>
Download a Telegram file to a local directory and resolve to the resulting path.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> |  |
| downloadDir | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUpdates"></a>

### telegramBot.getUpdates([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getupdates

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setWebhook"></a>

### telegramBot.setWebhook(url, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setwebhook

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+deleteWebhook"></a>

### telegramBot.deleteWebhook([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletewebhook

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getWebhookInfo"></a>

### telegramBot.getWebhookInfo([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getwebhookinfo

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setWebHook"></a>

### telegramBot.setWebHook(url, [options], [fileOptions]) ⇒ <code>Promise</code>

***Deprecated***

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+deleteWebHook"></a>

### telegramBot.deleteWebHook([options]) ⇒ <code>Promise</code>

***Deprecated***

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getWebHookInfo"></a>

### telegramBot.getWebHookInfo([options]) ⇒ <code>Promise</code>

***Deprecated***

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMe"></a>

### telegramBot.getMe([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getme

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+logOut"></a>

### telegramBot.logOut([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#logout

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+close"></a>

### telegramBot.close([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#close

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendMessage"></a>

### telegramBot.sendMessage(chatId, text, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendmessage

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| text | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+forwardMessage"></a>

### telegramBot.forwardMessage(chatId, fromChatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#forwardmessage

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| fromChatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+forwardMessages"></a>

### telegramBot.forwardMessages(chatId, fromChatId, messageIds, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#forwardmessages

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| fromChatId | <code>Number \| String</code> |  |
| messageIds | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+copyMessage"></a>

### telegramBot.copyMessage(chatId, fromChatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#copymessage

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| fromChatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+copyMessages"></a>

### telegramBot.copyMessages(chatId, fromChatId, messageIds, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#copymessages

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| fromChatId | <code>Number \| String</code> |  |
| messageIds | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendPhoto"></a>

### telegramBot.sendPhoto(chatId, photo, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendphoto

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| photo | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendLivePhoto"></a>

### telegramBot.sendLivePhoto(chatId, livePhoto, photo, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| livePhoto | <code>String \| Stream \| Buffer</code> |  |
| photo | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendAudio"></a>

### telegramBot.sendAudio(chatId, audio, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendaudio

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| audio | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendDocument"></a>

### telegramBot.sendDocument(chatId, doc, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#senddocument

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| doc | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendVideo"></a>

### telegramBot.sendVideo(chatId, video, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendvideo

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| video | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendAnimation"></a>

### telegramBot.sendAnimation(chatId, animation, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendanimation

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| animation | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendVoice"></a>

### telegramBot.sendVoice(chatId, voice, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendvoice

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| voice | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendVideoNote"></a>

### telegramBot.sendVideoNote(chatId, videoNote, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendvideonote

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| videoNote | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+sendPaidMedia"></a>

### telegramBot.sendPaidMedia(chatId, starCount, media, [options]) ⇒ <code>Promise</code>
Send paid media. Each item's file fields are widened to accept uploads: the
primary `media` plus any `thumbnail` / `cover` (video) or `photo` (live photo)
may be a Buffer / stream / local path (uploaded as a multipart part) or a
file_id / URL string (passed through). {@link _buildMediaItems} resolves them.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendpaidmedia

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| starCount | <code>Number</code> |  |
| media | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendMediaGroup"></a>

### telegramBot.sendMediaGroup(chatId, media, [options]) ⇒ <code>Promise</code>
Send a group of photos / videos / etc as an album. Each item's file fields are
widened to accept uploads: the primary `media` plus any `thumbnail` / `cover`
(video) or `photo` (live photo) may be a Buffer / stream / local path (uploaded
as a multipart part) or a file_id / URL string (passed through).
{@link _buildMediaItems} resolves every file field of every item - unlike
{@link editMessageMedia}, whose secondary fields are string-only.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendmediagroup

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| media | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendLocation"></a>

### telegramBot.sendLocation(chatId, latitude, longitude, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendlocation

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| latitude | <code>Number</code> |  |
| longitude | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendVenue"></a>

### telegramBot.sendVenue(chatId, latitude, longitude, title, address, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendvenue

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| latitude | <code>Number</code> |  |
| longitude | <code>Number</code> |  |
| title | <code>String</code> |  |
| address | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendContact"></a>

### telegramBot.sendContact(chatId, phoneNumber, firstName, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendcontact

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| phoneNumber | <code>String</code> |  |
| firstName | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendPoll"></a>

### telegramBot.sendPoll(chatId, question, pollOptions, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendpoll

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| question | <code>String</code> |  |
| pollOptions | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendChecklist"></a>

### telegramBot.sendChecklist(businessConnectionId, chatId, checklist, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendchecklist

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| chatId | <code>Number \| String</code> |  |
| checklist | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendDice"></a>

### telegramBot.sendDice(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#senddice

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendMessageDraft"></a>

### telegramBot.sendMessageDraft(chatId, draftId, text, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendmessagedraft

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| draftId | <code>Number</code> |  |
| text | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendChatAction"></a>

### telegramBot.sendChatAction(chatId, action, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendchataction

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| action | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMessageReaction"></a>

### telegramBot.setMessageReaction(chatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmessagereaction

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageLiveLocation"></a>

### telegramBot.editMessageLiveLocation(latitude, longitude, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editmessagelivelocation

| Param | Type | Description |
| --- | --- | --- |
| latitude | <code>Number</code> |  |
| longitude | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+stopMessageLiveLocation"></a>

### telegramBot.stopMessageLiveLocation([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#stopmessagelivelocation

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUserProfilePhotos"></a>

### telegramBot.getUserProfilePhotos(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getuserprofilephotos

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUserProfileAudios"></a>

### telegramBot.getUserProfileAudios(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getuserprofileaudios

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setUserEmojiStatus"></a>

### telegramBot.setUserEmojiStatus(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setuseremojistatus

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getFile"></a>

### telegramBot.getFile(fileId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getfile

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUserPersonalChatMessages"></a>

### telegramBot.getUserPersonalChatMessages(userId, limit) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getuserpersonalchatmessages

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| limit | <code>Number</code> |  |

<a name="TelegramBot+banChatMember"></a>

### telegramBot.banChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#banchatmember

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unbanChatMember"></a>

### telegramBot.unbanChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unbanchatmember

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+restrictChatMember"></a>

### telegramBot.restrictChatMember(chatId, userId, permissions, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#restrictchatmember

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| permissions | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+promoteChatMember"></a>

### telegramBot.promoteChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#promotechatmember

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatAdministratorCustomTitle"></a>

### telegramBot.setChatAdministratorCustomTitle(chatId, userId, customTitle, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatadministratorcustomtitle

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| customTitle | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatMemberTag"></a>

### telegramBot.setChatMemberTag(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatmembertag

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+banChatSenderChat"></a>

### telegramBot.banChatSenderChat(chatId, senderChatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#banchatsenderchat

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| senderChatId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unbanChatSenderChat"></a>

### telegramBot.unbanChatSenderChat(chatId, senderChatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unbanchatsenderchat

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| senderChatId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatPermissions"></a>

### telegramBot.setChatPermissions(chatId, permissions, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatpermissions

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| permissions | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+exportChatInviteLink"></a>

### telegramBot.exportChatInviteLink(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#exportchatinvitelink

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+createChatInviteLink"></a>

### telegramBot.createChatInviteLink(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#createchatinvitelink

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editChatInviteLink"></a>

### telegramBot.editChatInviteLink(chatId, inviteLink, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editchatinvitelink

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| inviteLink | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+createChatSubscriptionInviteLink"></a>

### telegramBot.createChatSubscriptionInviteLink(chatId, subscriptionPeriod, subscriptionPrice, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#createchatsubscriptioninvitelink

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| subscriptionPeriod | <code>Number</code> |  |
| subscriptionPrice | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editChatSubscriptionInviteLink"></a>

### telegramBot.editChatSubscriptionInviteLink(chatId, inviteLink, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editchatsubscriptioninvitelink

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| inviteLink | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+revokeChatInviteLink"></a>

### telegramBot.revokeChatInviteLink(chatId, inviteLink, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#revokechatinvitelink

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| inviteLink | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+approveChatJoinRequest"></a>

### telegramBot.approveChatJoinRequest(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#approvechatjoinrequest

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+declineChatJoinRequest"></a>

### telegramBot.declineChatJoinRequest(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#declinechatjoinrequest

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatPhoto"></a>

### telegramBot.setChatPhoto(chatId, photo, [options], [fileOptions]) ⇒ <code>Promise</code>
Set the chat photo. The photo must be a JPEG: Telegram's chat-photo backend
silently stalls on a non-JPEG (e.g. a PNG) until the request times out
(EFATAL); no layer here validates or converts, so the caller must pass a JPEG.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatphoto

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| photo | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+deleteChatPhoto"></a>

### telegramBot.deleteChatPhoto(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletechatphoto

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatTitle"></a>

### telegramBot.setChatTitle(chatId, title, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchattitle

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| title | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatDescription"></a>

### telegramBot.setChatDescription(chatId, description, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatdescription

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| description | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+pinChatMessage"></a>

### telegramBot.pinChatMessage(chatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#pinchatmessage

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unpinChatMessage"></a>

### telegramBot.unpinChatMessage(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unpinchatmessage

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unpinAllChatMessages"></a>

### telegramBot.unpinAllChatMessages(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unpinallchatmessages

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+leaveChat"></a>

### telegramBot.leaveChat(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#leavechat

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChat"></a>

### telegramBot.getChat(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getchat

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatAdministrators"></a>

### telegramBot.getChatAdministrators(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getchatadministrators

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatMemberCount"></a>

### telegramBot.getChatMemberCount(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getchatmembercount

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatMember"></a>

### telegramBot.getChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getchatmember

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatStickerSet"></a>

### telegramBot.setChatStickerSet(chatId, stickerSetName, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatstickerset

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| stickerSetName | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteChatStickerSet"></a>

### telegramBot.deleteChatStickerSet(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletechatstickerset

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getForumTopicIconStickers"></a>

### telegramBot.getForumTopicIconStickers([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getforumtopiciconstickers

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+createForumTopic"></a>

### telegramBot.createForumTopic(chatId, name, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#createforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| name | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editForumTopic"></a>

### telegramBot.editForumTopic(chatId, messageThreadId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageThreadId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+closeForumTopic"></a>

### telegramBot.closeForumTopic(chatId, messageThreadId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#closeforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageThreadId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+reopenForumTopic"></a>

### telegramBot.reopenForumTopic(chatId, messageThreadId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#reopenforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageThreadId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteForumTopic"></a>

### telegramBot.deleteForumTopic(chatId, messageThreadId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deleteforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageThreadId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unpinAllForumTopicMessages"></a>

### telegramBot.unpinAllForumTopicMessages(chatId, messageThreadId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unpinallforumtopicmessages

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageThreadId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editGeneralForumTopic"></a>

### telegramBot.editGeneralForumTopic(chatId, name, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editgeneralforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| name | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+closeGeneralForumTopic"></a>

### telegramBot.closeGeneralForumTopic(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#closegeneralforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+reopenGeneralForumTopic"></a>

### telegramBot.reopenGeneralForumTopic(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#reopengeneralforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+hideGeneralForumTopic"></a>

### telegramBot.hideGeneralForumTopic(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#hidegeneralforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unhideGeneralForumTopic"></a>

### telegramBot.unhideGeneralForumTopic(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unhidegeneralforumtopic

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unpinAllGeneralForumTopicMessages"></a>

### telegramBot.unpinAllGeneralForumTopicMessages(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#unpinallgeneralforumtopicmessages

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerCallbackQuery"></a>

### telegramBot.answerCallbackQuery(callbackQueryId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#answercallbackquery

| Param | Type | Description |
| --- | --- | --- |
| callbackQueryId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerGuestQuery"></a>

### telegramBot.answerGuestQuery(guestQueryId, result) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#answerguestquery

| Param | Type | Description |
| --- | --- | --- |
| guestQueryId | <code>String</code> |  |
| result | <code>Object</code> |  |

<a name="TelegramBot+savePreparedInlineMessage"></a>

### telegramBot.savePreparedInlineMessage(userId, result, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#savepreparedinlinemessage

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| result | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+savePreparedKeyboardButton"></a>

### telegramBot.savePreparedKeyboardButton(userId, button, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#savepreparedkeyboardbutton

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| button | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUserChatBoosts"></a>

### telegramBot.getUserChatBoosts(chatId, userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getuserchatboosts

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getBusinessConnection"></a>

### telegramBot.getBusinessConnection(businessConnectionId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getbusinessconnection

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getManagedBotToken"></a>

### telegramBot.getManagedBotToken(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmanagedbottoken

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+replaceManagedBotToken"></a>

### telegramBot.replaceManagedBotToken(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#replacemanagedbottoken

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getManagedBotAccessSettings"></a>

### telegramBot.getManagedBotAccessSettings(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmanagedbotaccesssettings

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setManagedBotAccessSettings"></a>

### telegramBot.setManagedBotAccessSettings(userId, isAccessRestricted, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmanagedbotaccesssettings

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| isAccessRestricted | <code>Boolean</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMyCommands"></a>

### telegramBot.setMyCommands(commands, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmycommands

| Param | Type | Description |
| --- | --- | --- |
| commands | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteMyCommands"></a>

### telegramBot.deleteMyCommands([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletemycommands

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMyCommands"></a>

### telegramBot.getMyCommands([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmycommands

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMyName"></a>

### telegramBot.setMyName([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmyname

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMyName"></a>

### telegramBot.getMyName([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmyname

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMyDescription"></a>

### telegramBot.setMyDescription([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmydescription

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMyDescription"></a>

### telegramBot.getMyDescription([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmydescription

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMyShortDescription"></a>

### telegramBot.setMyShortDescription([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmyshortdescription

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMyShortDescription"></a>

### telegramBot.getMyShortDescription([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmyshortdescription

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMyProfilePhoto"></a>

### telegramBot.setMyProfilePhoto(photo, [options]) ⇒ <code>Promise</code>
Set the bot's profile photo.

⚠️ A `static` photo **must be a JPEG**. Telegram's backend
(`photos.uploadProfilePhoto`) only accepts JPEG and no layer in the stack
— this library, the Bot API server, or TDLib — validates or converts the
format, so the raw bytes are forwarded as-is. A non-JPEG (e.g. PNG) is not
rejected cleanly: the upstream call typically returns `504 Gateway Timeout`
(an `ETELEGRAM` error) or stalls until the request times out. Convert to
JPEG before calling.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| photo | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+removeMyProfilePhoto"></a>

### telegramBot.removeMyProfilePhoto([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#removemyprofilephoto

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatMenuButton"></a>

### telegramBot.setChatMenuButton([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setchatmenubutton

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatMenuButton"></a>

### telegramBot.getChatMenuButton([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getchatmenubutton

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setMyDefaultAdministratorRights"></a>

### telegramBot.setMyDefaultAdministratorRights([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setmydefaultadministratorrights

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMyDefaultAdministratorRights"></a>

### telegramBot.getMyDefaultAdministratorRights([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmydefaultadministratorrights

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageText"></a>

### telegramBot.editMessageText(text, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editmessagetext

| Param | Type | Description |
| --- | --- | --- |
| text | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageCaption"></a>

### telegramBot.editMessageCaption(caption, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editmessagecaption

| Param | Type | Description |
| --- | --- | --- |
| caption | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageMedia"></a>

### telegramBot.editMessageMedia(media, [options]) ⇒ <code>Promise</code>
Edit a message's media. Unlike {@link sendMediaGroup} / {@link sendPaidMedia},
the `media` argument is the docs-faithful `InputMedia`, so every file field is
typed `string` and NOT widened to accept uploads:
  - Secondary fields (`thumbnail` / `cover` / `photo`) must be file_id / URL
    strings; they pass through untouched. Uploading a *new* secondary file is
    not supported here (the method attaches only the single primary part).
  - The primary `media` is uploaded only when given as `attach://<local-path>`;
    a plain file_id / URL is sent as-is.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editmessagemedia

| Param | Type | Description |
| --- | --- | --- |
| media | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageChecklist"></a>

### telegramBot.editMessageChecklist(businessConnectionId, chatId, messageId, checklist, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editmessagechecklist

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| chatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| checklist | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageReplyMarkup"></a>

### telegramBot.editMessageReplyMarkup(replyMarkup, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editmessagereplymarkup

| Param | Type | Description |
| --- | --- | --- |
| replyMarkup | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+stopPoll"></a>

### telegramBot.stopPoll(chatId, pollId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#stoppoll

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| pollId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+approveSuggestedPost"></a>

### telegramBot.approveSuggestedPost(chatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#approvesuggestedpost

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+declineSuggestedPost"></a>

### telegramBot.declineSuggestedPost(chatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#declinesuggestedpost

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendSticker"></a>

### telegramBot.sendSticker(chatId, sticker, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendsticker

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| sticker | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+getStickerSet"></a>

### telegramBot.getStickerSet(name, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getstickerset

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getCustomEmojiStickers"></a>

### telegramBot.getCustomEmojiStickers(customEmojiIds, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getcustomemojistickers

| Param | Type | Description |
| --- | --- | --- |
| customEmojiIds | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+uploadStickerFile"></a>

### telegramBot.uploadStickerFile(userId, sticker, [stickerFormat], [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#uploadstickerfile

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| sticker | <code>String \| Stream \| Buffer</code> |  |
| [stickerFormat] | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+createNewStickerSet"></a>

### telegramBot.createNewStickerSet(userId, name, title, pngSticker, emojis, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#createnewstickerset

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| name | <code>String</code> |  |
| title | <code>String</code> |  |
| pngSticker | <code>String \| Stream \| Buffer</code> |  |
| emojis | <code>String</code> |  |
| [options] | <code>Object</code> |  |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+addStickerToSet"></a>

### telegramBot.addStickerToSet(userId, name, sticker, emojis, [stickerType], [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#addstickertoset

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| name | <code>String</code> |  |
| sticker | <code>String \| Stream \| Buffer</code> |  |
| emojis | <code>String</code> |  |
| [stickerType] | <code>Object</code> |  |
| [options] | <code>Object</code> |  |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+setStickerPositionInSet"></a>

### telegramBot.setStickerPositionInSet(sticker, position, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setstickerpositioninset

| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> |  |
| position | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteStickerFromSet"></a>

### telegramBot.deleteStickerFromSet(sticker, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletestickerfromset

| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+replaceStickerInSet"></a>

### telegramBot.replaceStickerInSet(userId, name, oldSticker, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#replacestickerinset

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| name | <code>String</code> |  |
| oldSticker | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setStickerEmojiList"></a>

### telegramBot.setStickerEmojiList(sticker, emojiList, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setstickeremojilist

| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> |  |
| emojiList | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setStickerKeywords"></a>

### telegramBot.setStickerKeywords(sticker, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setstickerkeywords

| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setStickerMaskPosition"></a>

### telegramBot.setStickerMaskPosition(sticker, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setstickermaskposition

| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setStickerSetTitle"></a>

### telegramBot.setStickerSetTitle(name, title, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setstickersettitle

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> |  |
| title | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setStickerSetThumbnail"></a>

### telegramBot.setStickerSetThumbnail(userId, name, thumbnail, [options], [fileOptions]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setstickersetthumbnail

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| name | <code>String</code> |  |
| thumbnail | <code>String \| Stream \| Buffer</code> |  |
| [options] | <code>Object</code> |  |
| [fileOptions] | <code>Object</code> | Additional file options |

<a name="TelegramBot+setCustomEmojiStickerSetThumbnail"></a>

### telegramBot.setCustomEmojiStickerSetThumbnail(name, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setcustomemojistickersetthumbnail

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteStickerSet"></a>

### telegramBot.deleteStickerSet(name, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletestickerset

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerInlineQuery"></a>

### telegramBot.answerInlineQuery(inlineQueryId, results, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#answerinlinequery

| Param | Type | Description |
| --- | --- | --- |
| inlineQueryId | <code>String</code> |  |
| results | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerWebAppQuery"></a>

### telegramBot.answerWebAppQuery(webAppQueryId, result, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#answerwebappquery

| Param | Type | Description |
| --- | --- | --- |
| webAppQueryId | <code>String</code> |  |
| result | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendInvoice"></a>

### telegramBot.sendInvoice(chatId, title, description, payload, providerToken, currency, prices, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendinvoice

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| title | <code>String</code> |  |
| description | <code>String</code> |  |
| payload | <code>String</code> |  |
| providerToken | <code>String</code> |  |
| currency | <code>String</code> |  |
| prices | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+createInvoiceLink"></a>

### telegramBot.createInvoiceLink(title, description, payload, providerToken, currency, prices, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#createinvoicelink

| Param | Type | Description |
| --- | --- | --- |
| title | <code>String</code> |  |
| description | <code>String</code> |  |
| payload | <code>String</code> |  |
| providerToken | <code>String</code> |  |
| currency | <code>String</code> |  |
| prices | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerShippingQuery"></a>

### telegramBot.answerShippingQuery(shippingQueryId, ok, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#answershippingquery

| Param | Type | Description |
| --- | --- | --- |
| shippingQueryId | <code>String</code> |  |
| ok | <code>Boolean</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerPreCheckoutQuery"></a>

### telegramBot.answerPreCheckoutQuery(preCheckoutQueryId, ok, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#answerprecheckoutquery

| Param | Type | Description |
| --- | --- | --- |
| preCheckoutQueryId | <code>String</code> |  |
| ok | <code>Boolean</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setPassportDataErrors"></a>

### telegramBot.setPassportDataErrors(userId, errors, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setpassportdataerrors

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| errors | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getMyStarBalance"></a>

### telegramBot.getMyStarBalance([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getmystarbalance

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getStarTransactions"></a>

### telegramBot.getStarTransactions([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getstartransactions

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+refundStarPayment"></a>

### telegramBot.refundStarPayment(userId, telegramPaymentChargeId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#refundstarpayment

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| telegramPaymentChargeId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editUserStarSubscription"></a>

### telegramBot.editUserStarSubscription(userId, telegramPaymentChargeId, isCanceled, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#edituserstarsubscription

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| telegramPaymentChargeId | <code>String</code> |  |
| isCanceled | <code>Boolean</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendGame"></a>

### telegramBot.sendGame(chatId, gameShortName, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendgame

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| gameShortName | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setGameScore"></a>

### telegramBot.setGameScore(userId, score, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setgamescore

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| score | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getGameHighScores"></a>

### telegramBot.getGameHighScores(userId, [form]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getgamehighscores

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [form] | <code>Object</code> |  |

<a name="TelegramBot+deleteMessage"></a>

### telegramBot.deleteMessage(chatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletemessage

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteMessages"></a>

### telegramBot.deleteMessages(chatId, messageIds, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletemessages

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageIds | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteMessageReaction"></a>

### telegramBot.deleteMessageReaction(chatId, messageId, [form]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletemessagereaction

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| messageId | <code>Number</code> |  |
| [form] | <code>Object</code> |  |

<a name="TelegramBot+deleteAllMessageReactions"></a>

### telegramBot.deleteAllMessageReactions(chatId, [form]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deleteallmessagereactions

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [form] | <code>Object</code> |  |

<a name="TelegramBot+getAvailableGifts"></a>

### telegramBot.getAvailableGifts([options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getavailablegifts

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendGift"></a>

### telegramBot.sendGift(giftId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#sendgift

| Param | Type | Description |
| --- | --- | --- |
| giftId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+giftPremiumSubscription"></a>

### telegramBot.giftPremiumSubscription(userId, monthCount, starCount, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#giftpremiumsubscription

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| monthCount | <code>Number</code> |  |
| starCount | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+verifyUser"></a>

### telegramBot.verifyUser(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#verifyuser

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+verifyChat"></a>

### telegramBot.verifyChat(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#verifychat

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+removeUserVerification"></a>

### telegramBot.removeUserVerification(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#removeuserverification

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+removeChatVerification"></a>

### telegramBot.removeChatVerification(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#removechatverification

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+readBusinessMessage"></a>

### telegramBot.readBusinessMessage(businessConnectionId, chatId, messageId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#readbusinessmessage

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| chatId | <code>Number</code> |  |
| messageId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteBusinessMessages"></a>

### telegramBot.deleteBusinessMessages(businessConnectionId, messageIds, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletebusinessmessages

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| messageIds | <code>Array</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setBusinessAccountName"></a>

### telegramBot.setBusinessAccountName(businessConnectionId, firstName, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setbusinessaccountname

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| firstName | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setBusinessAccountUsername"></a>

### telegramBot.setBusinessAccountUsername(businessConnectionId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setbusinessaccountusername

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setBusinessAccountBio"></a>

### telegramBot.setBusinessAccountBio(businessConnectionId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setbusinessaccountbio

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setBusinessAccountProfilePhoto"></a>

### telegramBot.setBusinessAccountProfilePhoto(businessConnectionId, photo, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| photo | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+removeBusinessAccountProfilePhoto"></a>

### telegramBot.removeBusinessAccountProfilePhoto(businessConnectionId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#removebusinessaccountprofilephoto

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setBusinessAccountGiftSettings"></a>

### telegramBot.setBusinessAccountGiftSettings(businessConnectionId, showGiftButton, acceptedGiftTypes, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#setbusinessaccountgiftsettings

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| showGiftButton | <code>Boolean</code> |  |
| acceptedGiftTypes | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getBusinessAccountStarBalance"></a>

### telegramBot.getBusinessAccountStarBalance(businessConnectionId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getbusinessaccountstarbalance

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+transferBusinessAccountStars"></a>

### telegramBot.transferBusinessAccountStars(businessConnectionId, starCount, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#transferbusinessaccountstars

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| starCount | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getBusinessAccountGifts"></a>

### telegramBot.getBusinessAccountGifts(businessConnectionId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getbusinessaccountgifts

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUserGifts"></a>

### telegramBot.getUserGifts(userId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getusergifts

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatGifts"></a>

### telegramBot.getChatGifts(chatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#getchatgifts

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number \| String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+convertGiftToStars"></a>

### telegramBot.convertGiftToStars(businessConnectionId, ownedGiftId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#convertgifttostars

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| ownedGiftId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+upgradeGift"></a>

### telegramBot.upgradeGift(businessConnectionId, ownedGiftId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#upgradegift

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| ownedGiftId | <code>String</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+transferGift"></a>

### telegramBot.transferGift(businessConnectionId, ownedGiftId, newOwnerChatId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#transfergift

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| ownedGiftId | <code>String</code> |  |
| newOwnerChatId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+postStory"></a>

### telegramBot.postStory(businessConnectionId, content, activePeriod, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#poststory

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| content | <code>Object</code> |  |
| activePeriod | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+repostStory"></a>

### telegramBot.repostStory(businessConnectionId, fromChatId, fromStoryId, activePeriod, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#repoststory

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| fromChatId | <code>Number</code> |  |
| fromStoryId | <code>Number</code> |  |
| activePeriod | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editStory"></a>

### telegramBot.editStory(businessConnectionId, storyId, content, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#editstory

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| storyId | <code>Number</code> |  |
| content | <code>Object</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteStory"></a>

### telegramBot.deleteStory(businessConnectionId, storyId, [options]) ⇒ <code>Promise</code>

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)

**Returns**: <code>Promise</code>

**See**: https://core.telegram.org/bots/api#deletestory

| Param | Type | Description |
| --- | --- | --- |
| businessConnectionId | <code>String</code> |  |
| storyId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

* * *
