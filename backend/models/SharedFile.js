
const mongoose = require("mongoose");

const sharedFileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    storedName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    meeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meeting",
        required: true
    },
    meetingId: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("SharedFile", sharedFileSchema);
