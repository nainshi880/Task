/** Shared Socket.IO instance for services (assignment, chat, notifications). */
let io = null;

export function setIO(instance) {
  io = instance;
}

export function getIO() {
  return io;
}

export default { setIO, getIO };
