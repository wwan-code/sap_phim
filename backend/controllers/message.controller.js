import * as MessageService from '../services/message.service.js';

/**
 * @desc Tìm hoặc tạo hội thoại 1-1
 * @route POST /api/messages/conversations/private
 */
export const findOrCreatePrivateConversation = async (req, res, next) => {
  try {
    const userId1 = req.user.id;
    const { userId2 } = req.body;

    if (!userId2) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp userId2.' });
    }

    if (userId1 === parseInt(userId2)) {
      return res.status(400).json({ success: false, message: 'Không thể tạo hội thoại với chính mình.' });
    }

    const conversation = await MessageService.findOrCreatePrivateConversation(userId1, parseInt(userId2));
    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Tạo hội thoại nhóm
 * @route POST /api/messages/conversations/group
 */
export const createGroupConversation = async (req, res, next) => {
  try {
    const creatorId = req.user.id;
    const { participantIds, name, avatarUrl } = req.body;

    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }

    const conversation = await MessageService.createGroupConversation(
      creatorId,
      participantIds,
      name,
      avatarUrl
    );

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Lấy danh sách hội thoại
 * @route GET /api/messages/conversations
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, search } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
    };

    const result = await MessageService.getConversationsForUser(userId, options);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Lấy chi tiết hội thoại
 * @route GET /api/messages/conversations/:conversationId
 */
export const getConversationById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await MessageService.getConversationById(
      parseInt(conversationId),
      userId
    );

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Gửi tin nhắn
 * @route POST /api/messages/conversations/:conversationId/messages
 */
export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { conversationId } = req.params;
    const { content, type, mediaUrl, fileType, fileName, fileSize, thumbnailUrl, replyToMessageId } = req.body;

    const messageData = {
      conversationId: parseInt(conversationId),
      senderId,
      content,
      type: type || 'text',
      mediaUrl,
      fileType,
      fileName,
      fileSize,
      thumbnailUrl,
      replyToMessageId: replyToMessageId ? parseInt(replyToMessageId) : null,
    };

    const message = await MessageService.sendMessage(messageData);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Lấy tin nhắn trong hội thoại
 * @route GET /api/messages/conversations/:conversationId/messages
 */
export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { cursor, limit } = req.query;

    const options = {
      cursor: cursor ? parseInt(cursor) : null,
      limit: parseInt(limit) || 30,
    };

    const result = await MessageService.getMessagesInConversation(
      parseInt(conversationId),
      userId,
      options
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Đánh dấu tin nhắn đã xem
 * @route POST /api/messages/conversations/:conversationId/seen
 */
export const markMessagesAsSeen = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { lastMessageId } = req.body;

    if (!lastMessageId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lastMessageId.' });
    }

    const success = await MessageService.markMessagesAsSeen(
      parseInt(conversationId),
      userId,
      parseInt(lastMessageId)
    );

    if (!success) {
      return res.status(400).json({ success: false, message: 'Không thể đánh dấu đã xem.' });
    }

    res.status(200).json({ success: true, message: 'Đã đánh dấu tin nhắn đã xem.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Tìm kiếm tin nhắn
 * @route GET /api/messages/conversations/:conversationId/search
 */
export const searchMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { query, type, dateFrom, dateTo } = req.query;

    const options = { type, dateFrom, dateTo };
    const messages = await MessageService.searchMessages(
      parseInt(conversationId),
      userId,
      query,
      options
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Ghim hội thoại
 * @route POST /api/messages/conversations/:conversationId/pin
 */
export const pinConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const success = await MessageService.pinConversation(parseInt(conversationId), userId);

    if (!success) {
      return res.status(400).json({ success: false, message: 'Không thể ghim hội thoại.' });
    }

    res.status(200).json({ success: true, message: 'Đã ghim/bỏ ghim hội thoại.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Khóa hội thoại
 * @route POST /api/messages/conversations/:conversationId/lock
 */
export const lockConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu.' });
    }

    const success = await MessageService.lockConversation(
      parseInt(conversationId),
      userId,
      password
    );

    if (!success) {
      return res.status(400).json({ success: false, message: 'Không thể khóa hội thoại.' });
    }

    res.status(200).json({ success: true, message: 'Đã khóa hội thoại.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Ẩn hội thoại
 * @route POST /api/messages/conversations/:conversationId/hide
 */
export const hideConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const success = await MessageService.hideConversation(parseInt(conversationId), userId);

    if (!success) {
      return res.status(400).json({ success: false, message: 'Không thể ẩn hội thoại.' });
    }

    res.status(200).json({ success: true, message: 'Đã ẩn/hiện hội thoại.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Chặn người dùng
 * @route POST /api/messages/conversations/:conversationId/block
 */
export const blockUser = async (req, res, next) => {
  try {
    const blockerId = req.user.id;
    const { conversationId } = req.params;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp blockedId.' });
    }

    const success = await MessageService.blockUserInConversation(
      parseInt(conversationId),
      blockerId,
      parseInt(blockedId)
    );

    if (!success) {
      return res.status(400).json({ success: false, message: 'Không thể chặn người dùng.' });
    }

    res.status(200).json({ success: true, message: 'Đã chặn người dùng.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Xóa tin nhắn
 * @route DELETE /api/messages/:messageId
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const success = await MessageService.deleteMessage(parseInt(messageId), userId);

    if (!success) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tin nhắn.' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa tin nhắn.' });
  } catch (error) {
    next(error);
  }
};