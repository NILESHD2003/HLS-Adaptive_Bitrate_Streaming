const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    url: {
        type: String,
    },
    orgVideoUrl: {
        type: String,
    },
    slug: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true,
        default: 'Pending Upload'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7 * 24 * 60 * 60,
    }
});

const Video = mongoose.model('Video', videoSchema);
module.exports = Video;
