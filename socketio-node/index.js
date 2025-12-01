const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');

const io = new Server(http, {
  cors: {
    origin: "*",   // allow all origins
    methods: ["GET", "POST"]
  },
});

// basic route
app.get('/', (req, res) => {
  res.send('Socket.IO server is running 🚀');
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('join', (room) => {
    console.log('join', room);
    socket.join(room);

    socket.on('remoteData', (data) => {
      socket.broadcast.to(room).emit('remoteData', data.data);
    });

    socket.on('disconnect', (reason) => {
      console.log('user disconnected:', reason);
      socket.broadcast.to(room).emit('disconnected');
    });
  });

  socket.on('remoteData', (data) => {
    socket.broadcast.to(data.room).emit('remoteData', data.data);
  });
});

// Use Render's port or fallback to 3000 for local dev
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
