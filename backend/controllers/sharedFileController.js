
const SharedFile = require("../models/SharedFile");
const Meeting = require("../models/Meeting");
const fs = require("fs");
const path = require("path");

const isMeetingMember = (meeting, userId) => {
    return meeting.host.toString() === userId.toString() ||
        meeting.participants.some(
            participant => participant.toString() === userId.toString()
        );
};

exports.uploadFile = async (req, res) => {
    try {
        const { meetingId } = req.body;

        if (!meetingId) {
            return res.status(400).json({
                success: false,
                message: "Meeting ID is required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a file"
            });
        }

        const meeting = await Meeting.findOne({
            meetingId: meetingId.trim().toUpperCase()
        });

        if (!meeting) {
            fs.unlinkSync(req.file.path);

            return res.status(404).json({
                success: false,
                message: "Meeting not found"
            });
        }

        if (!isMeetingMember(meeting, req.user._id)) {
            fs.unlinkSync(req.file.path);

            return res.status(403).json({
                success: false,
                message: "You are not a member of this meeting"
            });
        }

        if (!meeting.isActive) {
            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                success: false,
                message: "Files cannot be uploaded to an ended meeting"
            });
        }

        const sharedFile = await SharedFile.create({
            originalName: req.file.originalname,
            storedName: req.file.filename,
            filePath: req.file.path,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            meeting: meeting._id,
            meetingId: meeting.meetingId,
            uploadedBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            file: sharedFile
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error("Upload file error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to upload file"
        });
    }
};

exports.getMeetingFiles = async (req, res) => {
    try {
        const meeting = await Meeting.findOne({
            meetingId: req.params.meetingId.trim().toUpperCase()
        });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found"
            });
        }

        if (!isMeetingMember(meeting, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view these files"
            });
        }

        const files = await SharedFile.find({
            meeting: meeting._id
        })
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: files.length,
            files
        });

    } catch (error) {
        console.error("Get meeting files error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get shared files"
        });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const file = await SharedFile.findById(req.params.fileId);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        const meeting = await Meeting.findById(file.meeting);

        if (!meeting || !isMeetingMember(meeting, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to download this file"
            });
        }

        if (!fs.existsSync(file.filePath)) {
            return res.status(404).json({
                success: false,
                message: "Stored file is unavailable"
            });
        }

        res.download(file.filePath, file.originalName);

    } catch (error) {
        console.error("Download file error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to download file"
        });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const file = await SharedFile.findById(req.params.fileId);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        if (file.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the uploader can delete this file"
            });
        }

        const meeting = await Meeting.findById(file.meeting);

        if (!meeting || !isMeetingMember(meeting, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to delete this file"
            });
        }

        if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
        }

        await SharedFile.findByIdAndDelete(file._id);

        res.status(200).json({
            success: true,
            message: "File deleted successfully"
        });

    } catch (error) {
        console.error("Delete file error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete file"
        });
    }
};
