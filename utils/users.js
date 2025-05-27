const users = {};

const getUsers = () => users;

const setUser = (userId, socketId) => {
  users[userId] = socketId;
};

const removeUser = (userId) => {
  delete users[userId];
};

module.exports = { getUsers, setUser, removeUser };