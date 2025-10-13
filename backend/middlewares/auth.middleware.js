import { verifyAccessToken } from '../utils/jwt.js';
import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, Role } = db;

const verifyToken = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = verifyAccessToken(token);

      // Attach user and roles to the request
      req.user = await User.findByPk(decoded.id, {
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] } // Don't include the join table attributes
        }]
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Người dùng không tồn tại.' });
      }

      next();
    } catch (error) {
      console.error('Lỗi xác thực token:', error);
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Không có token, không được ủy quyền.' });
  }
};

const verifyTokenOptional = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // Không có token, vẫn cho qua nhưng không có req.userId
    return next();
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user and roles to the request
    req.user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] } // Don't include the join table attributes
      }]
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại.' });
    }

    next();
  } catch (error) {
    console.error('Lỗi xác thực token:', error);
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Không có quyền truy cập.' });
    }
    const userRoles = req.user.roles.map(role => role.name);
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (hasPermission) {
      next();
    } else {
      res.status(403).json({ message: 'Bạn không có quyền truy cập tài nguyên này.' });
    }
  };
};

export { verifyToken, authorizeRoles, verifyTokenOptional };
