const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema ({
    // roomId: {
    //     type: String,
    //     required: true
    // },
    users: {
        type: Array,
        required: true,
        default: []
    },
    messages: {
        type: Array,
        required: false,
        default: []
    }
})

const chat = mongoose.model('chats', chatSchema);

module.exports = chat;