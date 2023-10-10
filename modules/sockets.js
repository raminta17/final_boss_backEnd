const {Server} = require('socket.io');
const jwt = require('jsonwebtoken');
const userDb = require('../schemas/userSchema');
const postDb = require('../schemas/postSchema');
const chatDb = require('../schemas/chatSchema');
let users = [];
let connectedUsers = [];

function socketLog(socketId, message, data) {
    console.log('[', new Date(), '] [id:', socketId, '] ', message, data === undefined ? '' : data);
}

module.exports = (server) => {
    const io = new Server(server, {
        cors: {
            origin: 'http://localhost:3000'
        }
    });

    io.on('connection', async (socket) => {
        socketLog(socket.id, 'user connected');
        const token = socket.handshake.auth.token;
        try {
            const data = await jwt.verify(token, process.env.JWT_SECRET);
            let connectedUser = await userDb.findOneAndUpdate({_id: data.id},
                {$set: {isOnline: true}},
                {new: true});
            connectedUsers.push({userId: connectedUser._id, socketId: socket.id, username: connectedUser.username})
            socketLog(socket.id, 'all connected users list', connectedUsers);
            const allDbUsers = await userDb.find({}, {password: 0});
            socketLog(socket.id, 'all users from db', allDbUsers);
            io.emit('sendingAllUsers', allDbUsers);
        } catch (err) {
            socketLog(socket.id, 'verification error in sockets', err);
        }
        socket.on('creatingNewPost', async newPost => {
            socketLog(socket.id, 'socekt id who send post', socket.id)
            socketLog(socket.id, 'newPost', newPost);
            const post = new postDb({
                ...newPost,
                time: Date.now()
            });
            socketLog(socket.id, 'post object with time', post);
            post.save().then(async () => {
                socketLog(socket.id, 'post added to Db');
                const allPosts = await postDb.find();
                io.emit('sending new post', allPosts, post);
            }).catch(e => {
                socketLog(socket.id, 'error while saving post to Db', e);
            })

        });
        socket.on('handleLike', async (postId, userWhoLikedId) => {
            socketLog(socket.id, 'getting like request: post id', postId);
            socketLog(socket.id, 'user who liked post id', userWhoLikedId);
            let likedPost = await postDb.findOne({_id: postId});
            if (likedPost.likes.includes(userWhoLikedId)) {
                likedPost = await postDb.findOneAndUpdate({_id: postId},
                    {$pull: {likes: userWhoLikedId}},
                    {new: true})
                socketLog(socket.id, 'updated unliked post', likedPost);
            } else {
                likedPost = await postDb.findOneAndUpdate({_id: postId},
                    {$push: {likes: userWhoLikedId}},
                    {new: true})
                socketLog(socket.id, 'updated liked post', likedPost);
            }
            const allPosts = await postDb.find();
            socketLog(socket.id, 'all posts after update single one', allPosts);
            io.emit('updatingPost', allPosts, likedPost);
        });
        socket.on('sendComment', async (comment, postId, commentatorId) => {
            socketLog(socket.id, 'komentaras', comment);
            socketLog(socket.id, 'post id that was commented on', postId);
            socketLog(socket.id, 'commentator ID ', commentatorId);
            const commentator = await userDb.findOne({_id: commentatorId});
            const postCommented = await postDb.findOneAndUpdate({_id: postId},
                {$push: {comments: {username: commentator.username, message: comment}}},
                {new: true})
            socketLog(socket.id, 'commented post after update ', postCommented);
            const allPosts = await postDb.find();
            socketLog(socket.id, 'all posts after update single one', allPosts);
            io.emit('updatingPost', allPosts, postCommented);
        });
        socket.on('sendingMessage', async (message, receiverUsername, conversationId) => {
            socketLog(socket.id, 'sending new message', message);
            socketLog(socket.id, 'message sent to user id : ', receiverUsername);
            socketLog(socket.id, 'message sent to this conversation id ', conversationId);
            socketLog(socket.id, 'all connected users back end list ', connectedUsers);
            let userWhoSentAMessage = connectedUsers.find(user => user.socketId === socket.id);
            if (userWhoSentAMessage) userWhoSentAMessage = await userDb.findOne({_id: userWhoSentAMessage.userId});
            let receiver = await userDb.findOne({username: receiverUsername});
            let currentdate = new Date();
            let datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth() + 1) + " "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes()
            const newMessage = {
                username: userWhoSentAMessage.username,
                message: message,
                time: datetime
            }
            const connectedReceiver = connectedUsers.find(user => user.username === receiver.username);
            socketLog(socket.id, 'connected receiver', connectedReceiver);
            let allConversations = await chatDb.find();
            let findConversation = allConversations.find(conversation => conversation.users.includes(receiver.username) && conversation.users.includes(userWhoSentAMessage.username))
            socketLog(socket.id, 'conversation found in db: ', findConversation);
            if (findConversation) {
                findConversation = await chatDb.findOneAndUpdate({_id: findConversation._id},
                    {$push: {messages: newMessage}},
                    {new: true})
                socketLog(socket.id, 'updated conversation in db: ', findConversation);
                connectedReceiver ? io.to(socket.id).to(connectedReceiver.socketId).emit('new message in existing conversation', findConversation._id, newMessage) :
                    io.to(socket.id).emit('sending new message', findConversation._id, newMessage);
            } else {
                const newConversation = new chatDb({
                    users: [receiver.username, userWhoSentAMessage.username],
                    messages: [newMessage],
                });
                socketLog(socket.id, 'conversation in db', newConversation);
                newConversation.save().then(async () => {
                    socketLog(socket.id, 'conversation added to Db');
                    allConversations = await chatDb.find();
                    socketLog(socket.id, 'all conversations from Db', allConversations);
                    connectedReceiver ? io.to(socket.id).to(connectedReceiver.socketId).emit('sending new conversation', newConversation, newMessage) :
                        io.to(socket.id).emit('sending new conversation', newConversation, newMessage);
                }).catch(e => {
                    socketLog(socket.id, 'error while saving conversation to Db', e);
                })
            }
        });
        socket.on('openConversation', async conversationId => {
            const findConversation = await chatDb.findOne({_id: conversationId});
            socketLog(socket.id, 'conversation from db that was requested in front end', findConversation);
            io.to(socket.id).emit('sendingSelectedConversation', findConversation);
        });
        socket.on('disconnect', async () => {
            socketLog(socket.id, 'user disconnected');
            let disconnectedUser = connectedUsers.find(user => user.socketId === socket.id);
            disconnectedUser = await userDb.findOneAndUpdate({_id: disconnectedUser.userId},
                {$set: {isOnline: false}},
                {new: true});
            socketLog(socket.id, 'disconnectedUser after update', disconnectedUser);
            connectedUsers = connectedUsers.filter(user => user.socketId !== socket.id);
            users = await userDb.find({}, {password: 0});
            io.emit('sendingAllUsers', users);
        });
    });

}
