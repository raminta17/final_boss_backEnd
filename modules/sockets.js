const {Server} = require('socket.io');
const jwt = require('jsonwebtoken');
const userDb = require('../schemas/userSchema');
const users = [];

module.exports = (server) => {
    const io = new Server(server, {
        cors: {
            origin: 'http://localhost:3000'
        }
    });

    io.on('connection', async (socket) => {
        console.log('user connected');
        const token = socket.handshake.auth.token;
        try {
            const data = await jwt.verify(token, process.env.JWT_SECRET);
            console.log('data from token;', data);
            let existingPlayer = users.find(user => user.username === data.username);
            if (existingPlayer) {
                io.to(existingPlayer.socketId).emit('logout', 'you need to log out');
                existingPlayer.isOnline = true;
                existingPlayer.socketId = socket.id;
                // existingPlayer.roomsJoined.map(roomJoined => socket.join(roomJoined));
            } else {
                let newUser = await userDb.findOne({_id: data.id}, {password: 0});
                users.push(newUser);
            }
            console.log(' all connected users', users);
            io.emit('msg', 'msg');
            io.emit('sendingAllUsers', users);
        } catch (err) {
            console.log('verification error in sockets', err);
        }
        socket.on('userConnected', async () => {
            console.log('userConnected, will start validation')
        });
        socket.on('getAllUsers', () => {
            io.emit('sendingAllUsers', users);
        })
        socket.on('disconnect', () => {
            console.log('user disconnected')
        })
    })

}
