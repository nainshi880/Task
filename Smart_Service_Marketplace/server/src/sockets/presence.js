/** userId -> Set<socketId> — shared presence for Socket.IO + services */
const onlineUsers = new Map();

export function addOnline(userId, socketId) {
  const key = userId.toString();
  if (!onlineUsers.has(key)) onlineUsers.set(key, new Set());
  onlineUsers.get(key).add(socketId);
}

/** @returns {boolean} true if user is now fully offline */
export function removeOnline(userId, socketId) {
  const key = userId.toString();
  const set = onlineUsers.get(key);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(key);
    return true;
  }
  return false;
}

export function isUserOnline(userId) {
  if (!userId) return false;
  return onlineUsers.has(userId.toString());
}

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

export default {
  addOnline,
  removeOnline,
  isUserOnline,
  getOnlineUserIds,
};
