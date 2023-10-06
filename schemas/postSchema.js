const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema ({
    authorId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    likes: {
        type: Array,
        required: false,
        default: []
    },
    comments: {
        type: Array,
        required:false,
        default: []
    },
    time: {
        type: Number,
        required: true
    }

})

const post = mongoose.model('posts', postSchema);

module.exports = post;