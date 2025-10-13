import api from './api';

const getFriends = () => {
  return api.get('/friends');
};

const getPendingRequests = () => {
  return api.get('/friends/pending');
};

const getSentRequests = () => {
  return api.get('/friends/sent');
};

const sendRequest = (userId) => {
  return api.post(`/friends/invite/${userId}`);
};

const acceptRequest = (inviteId) => {
  return api.post(`/friends/accept/${inviteId}`);
};

const rejectRequest = (inviteId) => {
  return api.post(`/friends/reject/${inviteId}`);
};

const removeFriend = (friendId) => {
  return api.delete(`/friends/remove/${friendId}`);
};

const searchUsers = (query) => {
  return api.get(`/friends/search?query=${query}`);
};

const friendService = {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  searchUsers,
};

export default friendService;
