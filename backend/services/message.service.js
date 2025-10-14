import db from '../models/index.js';
import { getIo } from '../config/socket.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import * as NotificationService from './notification.service.js';
import { generateNotificationContent } from '../utils/notification.utils.js';

const { Conversation, ConversationParticipant, Message, MessageStatus, User, Friendship } = db;

/**
 * @desc Tìm hoặc tạo hội thoại 1-1 giữa hai người dùng
 * @param {number} userId1 - ID người dùng thứ nhất
 * @param {number} userId2 - ID người dùng thứ hai
 * @returns {Promise<object>} - Đối tượng conversation
 */
export const findOrCreatePrivateConversation = async (userId1, userId2) => {
  try {
    // Kiểm tra xem hai người có phải là bạn bè không
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { senderId: userId1, receiverId: userId2, status: 'accepted' },
          { senderId: userId2, receiverId: userId1, status: 'accepted' },
        ],
      },
    });

    if (!friendship) {
      throw new Error('Hai người dùng phải là bạn bè để bắt đầu cuộc trò chuyện.');
    }

    // Tìm hội thoại đã tồn tại bằng cách tìm conversation có cả 2 user
    const conversationIds = await ConversationParticipant.findAll({
      where: {
        userId: { [Op.in]: [userId1, userId2] },
      },
      attributes: ['conversationId'],
      group: ['conversationId'],
      having: sequelize.literal('COUNT(DISTINCT userId) = 2'),
      raw: true,
    });

    let existingConversation = null;
    if (conversationIds.length > 0) {
      // Kiểm tra xem conversation có phải là private và chỉ có 2 participants không
      for (const convId of conversationIds) {
        const conv = await Conversation.findOne({
          where: { 
            id: convId.conversationId, 
            type: 'private' 
          },
          include: [
            {
              model: User,
              as: 'participants',
              through: { attributes: [] },
              attributes: ['id'],
            },
          ],
        });

        if (conv && conv.participants.length === 2) {
          existingConversation = conv;
          break;
        }
      }
    }

    if (existingConversation) {
      // Lấy thông tin đầy đủ của conversation
      return await getConversationById(existingConversation.id, userId1);
    }

    // Tạo conversation mới
    const newConversation = await Conversation.create({
      type: 'private',
    });

    // Thêm participants
    await ConversationParticipant.bulkCreate([
      { conversationId: newConversation.id, userId: userId1, role: 'member' },
      { conversationId: newConversation.id, userId: userId2, role: 'member' },
    ]);

    return await getConversationById(newConversation.id, userId1);
  } catch (error) {
    console.error('MessageService: Lỗi khi tìm/tạo conversation:', error);
    throw error;
  }
};

/**
 * @desc Tạo hội thoại nhóm
 * @param {number} creatorId - ID người tạo nhóm
 * @param {number[]} participantIds - Mảng ID các thành viên
 * @param {string} name - Tên nhóm
 * @param {string} [avatarUrl] - URL avatar nhóm
 * @returns {Promise<object>} - Đối tượng conversation
 */
export const createGroupConversation = async (creatorId, participantIds, name, avatarUrl = null) => {
  try {
    if (!name || !participantIds || participantIds.length < 2) {
      throw new Error('Nhóm phải có tên và ít nhất 2 thành viên khác.');
    }

    // Tạo conversation
    const newConversation = await Conversation.create({
      type: 'group',
      name,
      avatarUrl,
    });

    // Thêm creator làm owner
    const participants = [
      { conversationId: newConversation.id, userId: creatorId, role: 'owner' },
    ];

    // Thêm các thành viên khác
    participantIds.forEach((userId) => {
      if (userId !== creatorId) {
        participants.push({
          conversationId: newConversation.id,
          userId,
          role: 'member',
        });
      }
    });

    await ConversationParticipant.bulkCreate(participants);

    // Tạo tin nhắn hệ thống
    await Message.create({
      conversationId: newConversation.id,
      senderId: creatorId,
      type: 'system',
      content: `Nhóm "${name}" đã được tạo.`,
    });

    return await getConversationById(newConversation.id, creatorId);
  } catch (error) {
    console.error('MessageService: Lỗi khi tạo nhóm:', error);
    throw error;
  }
};

/**
 * @desc Lấy chi tiết conversation
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @returns {Promise<object>} - Conversation với thông tin đầy đủ
 */
export const getConversationById = async (conversationId, userId) => {
  try {
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
          through: {
            attributes: ['role', 'isMuted', 'isBlocked', 'isArchived'],
          },
        },
        {
          model: Message,
          as: 'lastMessage',
          attributes: ['id', 'content', 'type', 'createdAt', 'senderId'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'avatarUrl'],
            },
          ],
        },
      ],
    });

    if (!conversation) {
      throw new Error('Hội thoại không tồn tại.');
    }

    // Kiểm tra user có phải participant không
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new Error('Bạn không có quyền truy cập hội thoại này.');
    }

    // Đếm số tin nhắn chưa đọc
    const unreadCount = await getUnreadMessageCount(conversationId, userId);

    return {
      ...conversation.toJSON(),
      unreadCount,
      userParticipant: participant.toJSON(),
    };
  } catch (error) {
    console.error('MessageService: Lỗi khi lấy conversation:', error);
    throw error;
  }
};

/**
 * @desc Lấy danh sách hội thoại của người dùng
 * @param {number} userId - ID người dùng
 * @param {object} options - Options (page, limit, search)
 * @returns {Promise<object>} - Danh sách conversations
 */
export const getConversationsForUser = async (userId, options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;

  try {
    // Lấy danh sách conversationIds mà user tham gia
    const participations = await ConversationParticipant.findAll({
      where: {
        userId,
        isArchived: false,
      },
      attributes: ['conversationId', 'lastSeenMessageId', 'isMuted', 'isBlocked'],
    });

    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, hasMore: false } };
    }

    // Query conversations
    const whereCondition = { id: { [Op.in]: conversationIds } };

    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Conversation.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
          through: { attributes: [] },
        },
        {
          model: Message,
          as: 'lastMessage',
          attributes: ['id', 'content', 'type', 'createdAt', 'senderId'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username'],
            },
          ],
        },
      ],
      order: [
        [sequelize.literal('CASE WHEN lastMessageId IS NULL THEN 0 ELSE 1 END'), 'DESC'],
        ['updatedAt', 'DESC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Thêm unreadCount cho mỗi conversation
    const conversationsWithUnread = await Promise.all(
      rows.map(async (conv) => {
        const unreadCount = await getUnreadMessageCount(conv.id, userId);
        const userParticipant = participations.find((p) => p.conversationId === conv.id);
        return {
          ...conv.toJSON(),
          unreadCount,
          userParticipant: userParticipant ? userParticipant.toJSON() : null,
        };
      })
    );

    return {
      data: conversationsWithUnread,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        hasMore: offset + rows.length < count,
      },
    };
  } catch (error) {
    console.error('MessageService: Lỗi khi lấy conversations:', error);
    throw error;
  }
};

/**
 * @desc Gửi tin nhắn
 * @param {object} messageData - Dữ liệu tin nhắn
 * @returns {Promise<object>} - Tin nhắn đã tạo
 */
export const sendMessage = async (messageData) => {
  const { conversationId, senderId, content, type = 'text', mediaUrl, fileType, fileName, fileSize, thumbnailUrl, replyToMessageId } = messageData;

  try {
    // Kiểm tra quyền truy cập
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId: senderId },
    });

    if (!participant) {
      throw new Error('Bạn không phải thành viên của hội thoại này.');
    }

    if (participant.isBlocked) {
      throw new Error('Bạn đã bị chặn trong hội thoại này.');
    }

    // Tạo tin nhắn
    const newMessage = await Message.create({
      conversationId,
      senderId,
      type,
      content,
      mediaUrl,
      fileType,
      fileName,
      fileSize,
      thumbnailUrl,
      replyToMessageId,
    });

    // Cập nhật lastMessageId của conversation
    await Conversation.update(
      { lastMessageId: newMessage.id },
      { where: { id: conversationId } }
    );

    // Lấy thông tin đầy đủ
    const fullMessage = await Message.findByPk(newMessage.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'uuid', 'username', 'avatarUrl'],
        },
        {
          model: Message,
          as: 'replyToMessage',
          attributes: ['id', 'content', 'type', 'senderId'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username'],
            },
          ],
        },
      ],
    });

    // Tạo message status cho người gửi
    await MessageStatus.create({
      messageId: newMessage.id,
      userId: senderId,
      status: 'sent',
    });

    // Lấy danh sách participants khác
    const otherParticipants = await ConversationParticipant.findAll({
      where: {
        conversationId,
        userId: { [Op.ne]: senderId },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'uuid', 'username', 'online'],
        },
      ],
    });

    // Emit socket cho participants
    const io = getIo();
    otherParticipants.forEach(async (p) => {
      const recipientRoom = `user_${p.userId}`;
      io.to(recipientRoom).emit('message:receive', {
        conversationId,
        message: fullMessage.toJSON(),
      });

      // Tạo thông báo nếu user offline hoặc muted
      if (!p.user.online || p.isMuted) {
        const notificationContent = generateNotificationContent('new_message', {
          senderName: fullMessage.sender.username,
          messagePreview: content ? content.substring(0, 50) : '[Media]',
        });

        await NotificationService.createNotification({
          userId: p.userId,
          senderId,
          type: 'new_message',
          title: notificationContent.title,
          body: notificationContent.body,
          link: `/chat?conversationId=${conversationId}`,
          metadata: {
            conversationId,
            messageId: newMessage.id,
          },
        });
      }
    });

    return fullMessage;
  } catch (error) {
    console.error('MessageService: Lỗi khi gửi tin nhắn:', error);
    throw error;
  }
};

/**
 * @desc Lấy tin nhắn trong hội thoại (cursor pagination)
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @param {object} options - Options (cursor, limit)
 * @returns {Promise<object>} - Danh sách tin nhắn
 */
export const getMessagesInConversation = async (conversationId, userId, options = {}) => {
  const { cursor, limit = 30 } = options;

  try {
    // Kiểm tra quyền truy cập
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new Error('Bạn không có quyền truy cập hội thoại này.');
    }

    const whereCondition = {
      conversationId,
      isDeleted: false,
    };

    // Cursor pagination
    if (cursor) {
      whereCondition.id = { [Op.lt]: cursor };
    }

    const messages = await Message.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'uuid', 'username', 'avatarUrl'],
        },
        {
          model: Message,
          as: 'replyToMessage',
          attributes: ['id', 'content', 'type', 'senderId'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username'],
            },
          ],
        },
        {
          model: MessageStatus,
          as: 'statuses',
          attributes: ['userId', 'status', 'timestamp'],
        },
      ],
      order: [['id', 'DESC']],
      limit: parseInt(limit) + 1,
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      data: data.reverse(), // Đảo ngược để hiển thị từ cũ đến mới
      meta: {
        nextCursor,
        hasMore,
        limit: parseInt(limit),
      },
    };
  } catch (error) {
    console.error('MessageService: Lỗi khi lấy tin nhắn:', error);
    throw error;
  }
};

/**
 * @desc Đánh dấu tin nhắn đã nhận (delivered)
 * @param {number} messageId - ID tin nhắn
 * @param {number} userId - ID người dùng
 * @returns {Promise<boolean>}
 */
export const markMessageAsDelivered = async (messageId, userId) => {
  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      return false;
    }

    // Kiểm tra user có phải participant không
    const participant = await ConversationParticipant.findOne({
      where: { conversationId: message.conversationId, userId },
    });

    if (!participant || message.senderId === userId) {
      return false;
    }

    // Tạo hoặc cập nhật status
    const [status, created] = await MessageStatus.findOrCreate({
      where: { messageId, userId },
      defaults: { status: 'delivered' },
    });

    if (!created && status.status === 'sent') {
      await status.update({ status: 'delivered' });
    }

    // Emit socket cho người gửi
    const io = getIo();
    io.to(`user_${message.senderId}`).emit('message:status_update', {
      messageId,
      userId,
      status: 'delivered',
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi đánh dấu delivered:', error);
    throw error;
  }
};

/**
 * @desc Đánh dấu tất cả tin nhắn đã xem (seen)
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @param {number} lastMessageId - ID tin nhắn cuối cùng đã xem
 * @returns {Promise<boolean>}
 */
export const markMessagesAsSeen = async (conversationId, userId, lastMessageId) => {
  try {
    // Kiểm tra quyền truy cập
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      return false;
    }

    // Cập nhật lastSeenMessageId
    await participant.update({ lastSeenMessageId });

    // Lấy tất cả tin nhắn chưa seen từ người khác
    const messages = await Message.findAll({
      where: {
        conversationId,
        senderId: { [Op.ne]: userId },
        id: { [Op.lte]: lastMessageId },
      },
      attributes: ['id', 'senderId'],
    });

    if (messages.length === 0) {
      return true;
    }

    // Cập nhật status cho tất cả tin nhắn
    const io = getIo();
    const senderIds = new Set();

    await Promise.all(
      messages.map(async (message) => {
        const [status, created] = await MessageStatus.findOrCreate({
          where: { messageId: message.id, userId },
          defaults: { status: 'seen' },
        });

        if (!created && status.status !== 'seen') {
          await status.update({ status: 'seen' });
        }

        senderIds.add(message.senderId);
      })
    );

    // Emit socket cho tất cả người gửi
    senderIds.forEach((senderId) => {
      io.to(`user_${senderId}`).emit('message:status_update', {
        conversationId,
        userId,
        status: 'seen',
        lastMessageId,
      });
    });

    // Xóa notification tin nhắn trong conversation này
    await db.Notification.destroy({
      where: {
        userId,
        type: 'new_message',
        metadata: {
          conversationId: conversationId,
        },
      },
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi đánh dấu seen:', error);
    throw error;
  }
};

/**
 * @desc Đếm số tin nhắn chưa đọc trong hội thoại
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @returns {Promise<number>}
 */
export const getUnreadMessageCount = async (conversationId, userId) => {
  try {
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
      attributes: ['lastSeenMessageId'],
    });

    if (!participant) {
      return 0;
    }

    const whereCondition = {
      conversationId,
      senderId: { [Op.ne]: userId },
      isDeleted: false,
    };

    if (participant.lastSeenMessageId) {
      whereCondition.id = { [Op.gt]: participant.lastSeenMessageId };
    }

    return await Message.count({ where: whereCondition });
  } catch (error) {
    console.error('MessageService: Lỗi khi đếm unread:', error);
    return 0;
  }
};

/**
 * @desc Tìm kiếm tin nhắn trong hội thoại
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @param {string} query - Từ khóa tìm kiếm
 * @param {object} options - Options (type, dateFrom, dateTo)
 * @returns {Promise<array>}
 */
export const searchMessages = async (conversationId, userId, query, options = {}) => {
  const { type, dateFrom, dateTo } = options;

  try {
    // Kiểm tra quyền truy cập
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new Error('Bạn không có quyền truy cập hội thoại này.');
    }

    const whereCondition = {
      conversationId,
      isDeleted: false,
    };

    if (query) {
      whereCondition.content = { [Op.like]: `%${query}%` };
    }

    if (type) {
      whereCondition.type = type;
    }

    if (dateFrom || dateTo) {
      whereCondition.createdAt = {};
      if (dateFrom) {
        whereCondition.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereCondition.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    const messages = await Message.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatarUrl'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return messages;
  } catch (error) {
    console.error('MessageService: Lỗi khi tìm kiếm:', error);
    throw error;
  }
};

/**
 * @desc Ghim hội thoại
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @returns {Promise<boolean>}
 */
export const pinConversation = async (conversationId, userId) => {
  try {
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      return false;
    }

    // Toggle pin
    await participant.update({ isPinned: !participant.isPinned });

    const io = getIo();
    io.to(`user_${userId}`).emit('conversation:update', {
      conversationId,
      patch: { isPinned: !participant.isPinned },
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi ghim conversation:', error);
    throw error;
  }
};

/**
 * @desc Khóa hội thoại bằng mật khẩu
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @param {string} password - Mật khẩu
 * @returns {Promise<boolean>}
 */
export const lockConversation = async (conversationId, userId, password) => {
  const bcrypt = await import('bcrypt');
  
  try {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return false;
    }

    // Kiểm tra quyền (chỉ owner/admin)
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant || (participant.role !== 'owner' && participant.role !== 'admin')) {
      throw new Error('Bạn không có quyền khóa hội thoại này.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await conversation.update({ isLocked: true, passwordHash });

    const io = getIo();
    // Emit cho tất cả participants
    const participants = await ConversationParticipant.findAll({
      where: { conversationId },
      attributes: ['userId'],
    });

    participants.forEach((p) => {
      io.to(`user_${p.userId}`).emit('conversation:update', {
        conversationId,
        patch: { isLocked: true },
      });
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi khóa conversation:', error);
    throw error;
  }
};

/**
 * @desc Ẩn hội thoại
 * @param {number} conversationId - ID hội thoại
 * @param {number} userId - ID người dùng
 * @returns {Promise<boolean>}
 */
export const hideConversation = async (conversationId, userId) => {
  try {
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      return false;
    }

    await participant.update({ isArchived: !participant.isArchived });

    const io = getIo();
    io.to(`user_${userId}`).emit('conversation:update', {
      conversationId,
      patch: { isArchived: !participant.isArchived },
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi ẩn conversation:', error);
    throw error;
  }
};

/**
 * @desc Chặn người dùng trong hội thoại
 * @param {number} conversationId - ID hội thoại
 * @param {number} blockerId - ID người chặn
 * @param {number} blockedId - ID người bị chặn
 * @returns {Promise<boolean>}
 */
export const blockUserInConversation = async (conversationId, blockerId, blockedId) => {
  try {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation || conversation.type !== 'private') {
      throw new Error('Chỉ có thể chặn trong hội thoại riêng tư.');
    }

    const blockerParticipant = await ConversationParticipant.findOne({
      where: { conversationId, userId: blockerId },
    });

    if (!blockerParticipant) {
      return false;
    }

    await blockerParticipant.update({ isBlocked: true });

    const io = getIo();
    io.to(`user_${blockerId}`).emit('conversation:update', {
      conversationId,
      patch: { isBlocked: true },
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi chặn user:', error);
    throw error;
  }
};

/**
 * @desc Xóa tin nhắn (soft delete)
 * @param {number} messageId - ID tin nhắn
 * @param {number} userId - ID người dùng
 * @returns {Promise<boolean>}
 */
export const deleteMessage = async (messageId, userId) => {
  try {
    const message = await Message.findByPk(messageId);
    if (!message || message.senderId !== userId) {
      throw new Error('Bạn chỉ có thể xóa tin nhắn của mình.');
    }

    await message.update({ isDeleted: true, content: 'Tin nhắn đã bị xóa' });

    // Emit socket
    const io = getIo();
    const participants = await ConversationParticipant.findAll({
      where: { conversationId: message.conversationId },
      attributes: ['userId'],
    });

    participants.forEach((p) => {
      io.to(`user_${p.userId}`).emit('message:delete', {
        conversationId: message.conversationId,
        messageId,
      });
    });

    return true;
  } catch (error) {
    console.error('MessageService: Lỗi khi xóa tin nhắn:', error);
    throw error;
  }
};