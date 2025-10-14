import { body, param, query } from 'express-validator';

/**
 * @desc Middleware validation cho lời mời kết bạn
 */
export const validateSendFriendRequest = [
  param('userId')
    .isInt({ gt: 0 }).withMessage('ID người nhận phải là số nguyên dương.')
    .toInt(),
];

/**
 * @desc Middleware validation cho chấp nhận/từ chối lời mời kết bạn
 */
export const validateFriendshipAction = [
  param('inviteId')
    .isInt({ gt: 0 }).withMessage('ID lời mời phải là số nguyên dương.')
    .toInt(),
];

/**
 * @desc Middleware validation cho hủy kết bạn
 */
export const validateRemoveFriend = [
  param('friendId')
    .isInt({ gt: 0 }).withMessage('ID người bạn phải là số nguyên dương.')
    .toInt(),
];

/**
 * @desc Middleware validation cho tìm kiếm người dùng
 */
export const validateSearchUsers = [
  query('query')
    .trim()
    .notEmpty().withMessage('Tham số tìm kiếm không được để trống.')
    .isLength({ min: 1, max: 100 }).withMessage('Chuỗi tìm kiếm phải có từ 1 đến 100 ký tự.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Invalid offset')
    .toInt(),
];
