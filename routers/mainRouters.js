const express = require('express');
const router = express.Router();

const {validateRegister,
    validateLogin,
    validateToken,
    validatePassChange} = require('../validations/validations')
const {register,
    login,
    getUserInfo,
    changePassword,
    getAllPosts,
    getPostAuthor
   } = require('../controllers/mainControllers')

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/getUserInfo', validateToken, getUserInfo);
router.post('/changePassword', validateToken, validatePassChange, changePassword);
router.get('/getAllPosts', getAllPosts);
router.get('/getPostAuthor/:id', getPostAuthor);

module.exports = router;