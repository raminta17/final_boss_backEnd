const resSend = (res, error, data, message) => {
    res.send({error, data, message})
}
const userDb = require('../schemas/userSchema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const passRegex = /(?=.*[A-Z])/;

module.exports = {
    validateRegister: async (req,res,next) => {
        if(!req.body.username) return resSend(res, true, null, 'Note: username cannot be empty');
        if (req.body.username.length <4 || req.body.username.length >20) return resSend(res, true, null, 'Note: username should be between 4 and 20 characters long.')
        if(!req.body.pass1) return resSend(res, true, null, 'Note: password cannot be empty');
        if (req.body.pass1.length <4 || req.body.pass1.length >20) return resSend(res, true, null, 'Note: password should be between 4 and 20 characters long.')
        if(!passRegex.test(req.body.pass1)) return resSend(res, true, null, 'Note: password should have at least one upper case letter.')
        if(req.body.pass1 !== req.body.pass2) return resSend(res, true, null, 'Note: passwords should match.');
        const searchForUsername = await userDb.findOne({username: req.body.username});
        if(searchForUsername) return resSend(res, true, null, 'Note: username is taken.');
        next();
    },
    validateLogin: async (req,res, next) => {
        const {username, password} = req.body;
        if(!username) return resSend(res, true, null, 'Note: username cannot be empty');
        if(!password) return resSend(res, true, null, 'Note: password cannot be empty');
        const findUser = await userDb.findOne({username});
        if(!findUser) return resSend(res, true, null, 'Note: user not found.');
        const isMatch = await bcrypt.compare(password, findUser.password);
        if(!isMatch) return resSend(res, true, null, 'Note: incorrect password.');
        next()
    },
    validateToken: (req,res,next) => {
        const token = req.headers.authorization;
        jwt.verify(token, process.env.JWT_SECRET, async (err, data) => {
            if(err) {
                console.log('verification error in middleware', err);
                return resSend(res, true, null, 'User verification failed');
            }
            req.user = data
        })
        next();
    },
    validatePassChange: async (req,res,next) => {
        const {username} = req.user;
        const {oldPass, newPass, repeatNewPass} = req.body;
        if(!oldPass) return resSend(res, true, null, 'Note: password cannot be empty');
        if(!newPass) return resSend(res, true, null, 'Note: password cannot be empty');
        if (newPass.length <4 || newPass.length >20) return resSend(res, true, null, 'Note: password should be between 4 and 20 characters long.')
        if(!passRegex.test(newPass)) return resSend(res, true, null, 'Note: password should have at least one upper case letter.')
        if(newPass !== repeatNewPass) return resSend(res, true, null, 'Note: passwords should match.');
        const findUser = await userDb.findOne({username});
        if(!findUser) return resSend(res, true, null, 'Note: user not found.');
        const isMatch = await bcrypt.compare(oldPass, findUser.password);
        if(!isMatch) return resSend(res, true, null, 'Note: incorrect password.');
        next();
    }
}