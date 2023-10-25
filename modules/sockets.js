const {Server} = require('socket.io');
const jwt = require('jsonwebtoken');
const userDb = require('../schemas/userSchema');
const postDb = require('../schemas/postSchema');
const chatDb = require('../schemas/chatSchema');

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
            let connectedUser = await userDb.findOne({_id:data.id}, {password:0});
            connectedUsers.push({userId: connectedUser._id, socketId: socket.id, username: connectedUser.username})
           let allUsers = await userDb.find({}, {password: 0});
            allUsers = allUsers.map(dbUser => {
                let isOnline;
                if (connectedUsers.some(user => user.username === dbUser.username)) {
                    isOnline = true;
                } else {
                    isOnline = false;
                }
                const updatedUser = {...dbUser._doc, isOnline: isOnline};
                return updatedUser;
            });
            console.log('allUsers on connection', allUsers);
            connectedUser = allUsers.find(user => user.username === connectedUser.username);
            allUsers = allUsers.sort((user1,user2) => user2.isOnline - user1.isOnline);
            io.to(socket.id).emit('sendingAllUsers', allUsers);
            socket.broadcast.emit('sendingUserUpdate', connectedUser);
            let allConversations = await chatDb.find({users: connectedUser.username});
            allConversations = await Promise.all(allConversations.map(async (conversation) => {
                let name = conversation.users.filter(singleUser => singleUser !== connectedUser.username)[0];
                const searchUser = await userDb.findOne({username: name});
                const conversationObj = {
                    username: name,
                    profileImg: searchUser.profileImg,
                    isOnline: connectedUsers.find(user=>user.username === name) ? true : false,
                    conversationId: conversation._id,
                    seen: conversation.messages.some(message => message?.seen === true) ? true : false
                }
                return conversationObj;
            }));
            io.to(socket.id).emit('sendingConversations', allConversations);
        } catch (err) {
            socketLog(socket.id, 'verification error in sockets', err);
        };
        socket.on('updatePhoto', async img => {
            let user = connectedUsers.find(user => user.socketId === socket.id);
            user = await userDb.findOneAndUpdate(
                {_id: user.userId},
                {$set: {profileImg: img}},
                {new: true});
          try {
              user = await userDb.findOne({_id: user._id}, {password:0})
              let isOnline;
              if (user && connectedUsers.some(fUser => fUser.username === user.username)) {
                  isOnline = true;
              } else {
                  isOnline = false;
              }
              console.log('user', user);
              const updatedUser = {...user._doc, isOnline: isOnline};
              socket.broadcast.emit('sendingUserUpdate', updatedUser);
          }  catch (err) {
              socketLog(socket.id, 'error updating user', err);
          };
        });
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
                + currentdate.getMinutes().toString().padStart(2, '0');
            const newMessage = {
                username: userWhoSentAMessage.username,
                message: message,
                time: datetime,
                seen: false
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
                    io.to(socket.id).emit('new message in existing conversation', findConversation._id, newMessage);
            } else {
                const newConversation = new chatDb({
                    users: [receiver.username, userWhoSentAMessage.username],
                    messages: [newMessage],
                });
                socketLog(socket.id, 'conversation in db', newConversation);
                newConversation.save().then( () => {
                    socketLog(socket.id, 'conversation added to Db');
                    const conversationObj = {
                        username: receiver.username,
                        profileImg: receiver.profileImg,
                        isOnline: connectedUsers.find(user=>user.username === receiver.username) ? true : false,
                        conversationId: newConversation._id,
                        seen: true
                    }
                    const conversationObjToReceiver = {
                        username: userWhoSentAMessage.username,
                        profileImg: userWhoSentAMessage.profileImg,
                        isOnline: connectedUsers.find(user=>user.username === userWhoSentAMessage.username) ? true : false,
                        conversationId: newConversation._id,
                        seen: false
                    }
                    connectedReceiver && io.to(connectedReceiver.socketId).emit('sending new conversation', conversationObjToReceiver);
                        io.to(socket.id).emit('sending new conversation', conversationObj);
                }).catch(e => {
                    socketLog(socket.id, 'error while saving conversation to Db', e);
                })
            }
        });
        socket.on('startConversation', async conversationId => {
            const findConversation = await chatDb.findOne({_id: conversationId});
            socketLog(socket.id, 'conversation from db that was requested in front end', findConversation);
            io.to(socket.id).emit('sendingSelectedConversation', findConversation);
        });
        socket.on('disconnect', async () => {
            socketLog(socket.id, 'user disconnected');
            let disconnectedUser = connectedUsers.find(user => user.socketId === socket.id);
            disconnectedUser = await userDb.findOne({_id: disconnectedUser.userId},{password: 0});
            disconnectedUser = {...disconnectedUser._doc, isOnline: false};
            socketLog(socket.id, 'disconnectedUser after update', disconnectedUser);
            connectedUsers = connectedUsers.filter(user => user.socketId !== socket.id);
            // disconnectedUser = await userDb.findOne({_id: disconnectedUser._id}, {password:0});
            io.emit('sendingUserUpdate', disconnectedUser);
        });
    });

}
