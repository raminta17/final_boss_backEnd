const express = require('express');
const router = express.Router();

const {validateRegister,
    validateLogin,
    validateToken,
    validatePassChange} = require('../validations/validations')
const {register,
    login,
    getUserInfo,
    updateImg,
    changePassword
   } = require('../controllers/mainControllers')


router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/getUserInfo', validateToken, getUserInfo);
router.post('/updateImg', validateToken, updateImg);
router.post('/changePassword', validateToken, validatePassChange, changePassword);


module.exports = router;