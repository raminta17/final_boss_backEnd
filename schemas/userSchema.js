const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema ({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profileImg: {
        type: String,
        required: true,
        default: 'https://thumbs.dreamstime.com/b/default-avatar-profile-trendy-style-social-media-user-icon-187599373.jpg'
    },
    isOnline: {
        type: Boolean,
        required: false,
        default: false
    }
})

const user = mongoose.model('users', userSchema);

module.exports = user;