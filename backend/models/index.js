import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';
import applyAssociations from './associations.js';

// ==================== IMPORT MODELS ====================
// Core User & Auth Models
import User from './User.js';
import Role from './Role.js';
import RefreshToken from './RefreshToken.js';
import LoginHistory from './LoginHistory.js';

// Social & Relationship Models
import Friendship from './Friendship.js';

// Content Models
import Genre from './Genre.js';
import Country from './Country.js';
import Category from './Category.js';
import Movie from './Movie.js';
import Episode from './Episode.js';
import Series from './Series.js';
import Section from './Section.js';
// User Activity Models
import WatchHistory from './WatchHistory.js';
import Favorite from './Favorite.js';
import Comment from './Comment.js';
import AiLog from './AiLog.js';
// Reels Models
import Reel from './Reel.js';
import ReelComment from './ReelComment.js';
import ReelLike from './ReelLike.js';
import FollowReel from './FollowReel.js';

// Notification Models
import Notification from './Notification.js';

// Chat/Messaging Models
import Conversation from './Conversation.js';
import ConversationParticipant from './ConversationParticipant.js';
import Message from './Message.js';
import MessageStatus from './MessageStatus.js';

// ==================== DATABASE OBJECT ====================
const db = {
  // Sequelize instances
  Sequelize,
  sequelize,
  
  // Core User & Auth Models
  User,
  Role,
  RefreshToken,
  LoginHistory,
  
  // Social & Relationship Models
  Friendship,
  
  // Content Models
  Genre,
  Country,
  Category,
  Movie,
  Episode,
  Series,
  Section,
  // User Activity Models
  WatchHistory,
  Favorite,
  Comment,
  AiLog,
  // Reels
  Reel,
  ReelComment,
  ReelLike,
  FollowReel,
  
  // Notification Models
  Notification,
  
  // Chat/Messaging Models
  Conversation,
  ConversationParticipant,
  Message,
  MessageStatus,
};
// ==================== APPLY ASSOCIATIONS ====================
try {
  applyAssociations(db);
  console.log('✓ Model associations applied successfully');
} catch (error) {
  console.error('✗ Failed to apply model associations:', error.message);
  throw error;
}

// ==================== DATABASE INITIALIZATION ====================
/**
 * Initialize default roles in the database
 * @returns {Promise<void>}
 */
const initializeDefaultRoles = async () => {
  try {
    const roles = ['user', 'editor', 'admin'];
    const results = [];
    
    for (const roleName of roles) {
      const [role, created] = await db.Role.findOrCreate({
        where: { name: roleName },
        defaults: { name: roleName },
      });
      
      if (created) {
        results.push(roleName);
        console.log(`✓ Role '${role.name}' created`);
      }
    }
    
    if (results.length === 0) {
      console.log('✓ All default roles already exist');
    }
  } catch (error) {
    console.error('✗ Failed to initialize default roles:', error.message);
    throw error;
  }
};

/**
 * Synchronize database with models
 * Environment-aware sync strategy:
 * - development: alter tables to match models
 * - production: no auto-sync (use migrations)
 * - test: force recreate tables
 */
const syncDatabase = async () => {
  const env = process.env.NODE_ENV || 'development';
  
  try {
    let syncOptions = { force: false, alter: false };
    
    switch (env) {
      case 'development':
        syncOptions = { force: false, alter: false };
        console.log('🔧 Development mode: Sync disabled (use migrations)');
        break;
      case 'test':
        syncOptions = { force: true, alter: false };
        console.log('🧪 Test mode: Using force sync');
        break;
      case 'production':
        syncOptions = { force: false, alter: false };
        console.log('🚀 Production mode: Skipping auto-sync (use migrations)');
        // In production, we should not auto-sync
        console.log('✓ Database connection verified');
        await db.sequelize.authenticate();
        return;
      default:
        console.log('⚙️  Unknown environment, using safe defaults');
    }
    
    await db.sequelize.sync(syncOptions);
    console.log('✓ Database synchronized successfully');
    
    // Initialize default data only in non-production
    if (env !== 'production') {
      await initializeDefaultRoles();
    }
  } catch (error) {
    console.error('✗ Database synchronization failed:', {
      message: error.message,
      stack: error.stack,
      environment: env
    });
    throw error;
  }
};

// Execute database sync
syncDatabase().catch(error => {
  console.error('✗ Fatal error during database initialization:', error);
  // In production, we might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export default db;
