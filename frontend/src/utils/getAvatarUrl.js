export const getAvatarUrl = (user) => {
    if (!user) return "https://ui-avatars.com/api/?name=?&background=20c997&color=fff&size=40";
    return user.avatarUrl ? user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}` : `https://ui-avatars.com/api/?name=${user.username?.split(' ').map(word => word[0]).join('').toUpperCase()}&background=e8c26e&color=000&size=40`;
};

export const getImageUrl = (url) => `${import.meta.env.VITE_SERVER_URL}${url}`;