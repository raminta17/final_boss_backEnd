const resSend = (res, error, data, message) => {
    res.send({error, data, message})
}

const userDb = require('../schemas/userSchema');
const postDb = require('../schemas/postSchema');
const chatDb = require('../schemas/chatSchema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


module.exports = {
    register: async (req, res) => {
        const newUser = req.body;
        const hash = await bcrypt.hash(newUser.pass1, 13);
        const user = new userDb({
            username: newUser.username,
            password: hash
        });
        user.save().then(() => {
            console.log('player added to Db');
            resSend(res, false, null, 'registration success');
        }).catch(e => {
            console.log('error while saving player to Db', e);
        })


    },
    login: async (req, res) => {
        const {username} = req.body;
        const findUser = await userDb.findOne({username}, {password: 0});
        const user = {
            id: findUser._id,
            username,
            monster: findUser.monster
        }
        const token = jwt.sign(user, process.env.JWT_SECRET);
        resSend(res, false, {token, findUser}, 'login success');
    },
    getUserInfo: async (req, res) => {
        const {username} = req.user;
        const findUser = await userDb.findOne({username}, {password: 0});
        resSend(res, false, findUser, 'fetching user info');
    },
    // updateImg: async (req, res) => {
    //     const {username} = req.user;
    //     const {newImg} = req.body;
    //     const updateUser = await userDb.findOneAndUpdate(
    //         {username},
    //         {$set: {profileImg: newImg}},
    //         {new: true}
    //     )
    //     resSend(res, false, updateUser.profileImg, 'updating photo');
    // },
    changePassword: async (req, res) => {
        const {username} = req.user;
        const {newPass} = req.body;
        const hash = await bcrypt.hash(newPass, 13);
        const updateUser = await userDb.findOneAndUpdate({username},
            {$set: {password: hash}},
            {new: true}
        )
        resSend(res, false, null, 'Password changed successfully.');
    },
    getAllPosts: async (req,res) => {
        let allPosts = await postDb.find();
        allPosts = allPosts.slice().sort((post1,post2) => (post2.time - post1.time));
        resSend(res, false, allPosts, 'Sending all posts from fetch');
    },
    getPostAuthor: async (req,res) => {
        const {id} = req.params;
        const author = await userDb.findOne({_id: id}, {password:0, socketId:0})
        console.log('author', author);
        resSend(res, false, author, 'Sending post author info through fetch');
    },
    getAllConversations: async (req,res) => {
        console.log('should be logged user db username',req.params);
        const {username} = req.params;
        let allConversations = await chatDb.find({users: username});
        console.log('allConversations found with user', allConversations);
        allConversations = await Promise.all(allConversations.map(async (conversation) => {
            let name = conversation.users.filter(user => user !== username)[0];
            console.log('found other user name in conversation',name);
            const searchUser = await userDb.findOne({username: name});
            console.log('user found from user db',searchUser);
            const conversationObj = {
                username: name,
                profileImg: searchUser.profileImg,
                isOnline: searchUser.isOnline,
                conversationId: conversation._id
            }
            console.log('conversationObj', conversationObj);
            return conversationObj;
        }))
        console.log('allConversations after filter should be array of objects', allConversations)
        resSend(res, false, allConversations, 'Sending all conversations');
    }
}