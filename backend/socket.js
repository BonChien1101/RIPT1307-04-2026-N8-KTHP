// socket.js - Socket.io setup and event manager
let io = null;

const init = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

const getIo = () => io;

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

// Emit to all clients
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = { init, getIo, emitToUser, emitToAll };
