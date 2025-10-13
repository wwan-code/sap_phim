export default (db) => {
    const { User, Role, RefreshToken, Friendship, Genre, Country, Category,
            Movie, Episode, Series, Section, AiLog, WatchHistory, Favorite, Comment, Notification } = db;
  
    // User - Friendship
    User.hasMany(Friendship, { foreignKey: 'senderId', as: 'sentFriendRequests' });
    User.hasMany(Friendship, { foreignKey: 'receiverId', as: 'receivedFriendRequests' });
    Friendship.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
    Friendship.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
  
    // User - Role (n-n)
    User.belongsToMany(Role, { through: 'user_roles', as: 'roles', foreignKey: 'userId' });
    Role.belongsToMany(User, { through: 'user_roles', as: 'users', foreignKey: 'roleId' });
  
    // User - RefreshToken (1-n)
    User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
    RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
    // Genre – Movie (n-n)
    Genre.belongsToMany(Movie, { through: 'movie_genres', as: 'movies' });
    Movie.belongsToMany(Genre, { through: 'movie_genres', as: 'genres' });
  
    // Country – Movie (1-n)
    Country.hasMany(Movie, { foreignKey: 'countryId', as: 'movies' });
    Movie.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });
  
    // Category – Movie (1-n)
    Category.hasMany(Movie, { foreignKey: 'categoryId', as: 'movies' });
    Movie.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  
    // Movie – Episode (1-n)
    Movie.hasMany(Episode, { foreignKey: 'movieId', as: 'episodes' });
    Episode.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });
  
    // Movie – Section (1-1)
    Movie.hasOne(Section, { foreignKey: 'movieId', as: 'section' });
    Section.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });
  
    // Series – Movie (1-n)
    Series.hasMany(Movie, { foreignKey: 'seriesId', as: 'movies' });
    Movie.belongsTo(Series, { foreignKey: 'seriesId', as: 'series' });
  
    // User - AiLog (1-n)
    User.hasMany(AiLog, { foreignKey: 'userId', as: 'aiLogs' });
    AiLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
    // WatchHistory (User/Movie/Episode)
    User.hasMany(WatchHistory, { foreignKey: 'userId', as: 'watchHistories' });
    Movie.hasMany(WatchHistory, { foreignKey: 'movieId', as: 'watchHistories' });
    Episode.hasMany(WatchHistory, { foreignKey: 'episodeId', as: 'watchHistories' });
    WatchHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    WatchHistory.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });
    WatchHistory.belongsTo(Episode, { foreignKey: 'episodeId', as: 'episode' });
  
    // User - Movie (n-n) qua Favorite
    User.belongsToMany(Movie, { through: Favorite, as: 'favoriteMovies', foreignKey: 'userId' });
    Movie.belongsToMany(User, { through: Favorite, as: 'favoritedByUsers', foreignKey: 'movieId' });
    Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Favorite.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });
  
    // Comment (self-relation)
    User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
    Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentId', onDelete: 'CASCADE' });
    Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parentId' });

    // User - Notification (1-n)
    User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
    User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
    Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  };
  