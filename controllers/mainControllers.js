const resSend = (res, error, data, message) => {
    res.send({error, data, message})
}

const userDb = require('../schemas/userSchema');
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
    updateImg: async (req, res) => {
        const {username} = req.user;
        const {newImg} = req.body;
        const updateUser = await userDb.findOneAndUpdate(
            {username},
            {$set: {profileImg: newImg}},
            {new: true}
        )
        resSend(res, false, updateUser.profileImg, 'updating photo');
    },
    changePassword: async (req, res) => {
        const {username} = req.user;
        const {newPass} = req.body;
        const hash = await bcrypt.hash(newPass, 13);
        const updateUser = await userDb.findOneAndUpdate({username},
            {$set: {password: hash}},
            {new: true}
        )
        resSend(res, false, null, 'Password changed successfully.');
    }
}