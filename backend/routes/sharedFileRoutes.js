
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../config/multerConfig");

const {
    uploadFile,
    getMeetingFiles,
    downloadFile,
    deleteFile
} = require("../controllers/sharedFileController");

router.post("/upload", protect, (req, res, next) => {
    upload.single("file")(req, res, error => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message || "File upload failed"
            });
        }

        next();
    });
}, uploadFile);

router.get("/meeting/:meetingId", protect, getMeetingFiles);

router.get("/download/:fileId", protect, downloadFile);

router.delete("/:fileId", protect, deleteFile);

module.exports = router;
