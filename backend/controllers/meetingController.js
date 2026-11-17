
const Meeting = require("../models/Meeting");
const crypto = require("crypto");

exports.createMeeting = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Meeting title is required"
            });
        }

        const meetingId = crypto.randomBytes(4).toString("hex").toUpperCase();

        const meeting = await Meeting.create({
            meetingId,
            title: title.trim(),
            host: req.user._id,
            participants: [req.user._id]
        });

        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting
        });

    } catch (error) {
        console.error("Create meeting error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create meeting"
        });
    }
};

exports.joinMeeting = async (req, res) => {
    try {
        const { meetingId } = req.body;

        if (!meetingId) {
            return res.status(400).json({
                success: false,
                message: "Meeting ID is required"
            });
        }

        const meeting = await Meeting.findOne({
            meetingId: meetingId.trim().toUpperCase()
        });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found"
            });
        }

        if (!meeting.isActive) {
            return res.status(400).json({
                success: false,
                message: "This meeting has ended"
            });
        }

        meeting.participants.addToSet(req.user._id);
        await meeting.save();

        res.status(200).json({
            success: true,
            message: "Joined meeting successfully",
            meeting
        });

    } catch (error) {
        console.error("Join meeting error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to join meeting"
        });
    }
};

exports.getMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findOne({
            meetingId: req.params.meetingId.trim().toUpperCase()
        })
            .populate("host", "name email")
            .populate("participants", "name email");

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found"
            });
        }

        res.status(200).json({
            success: true,
            meeting
        });

    } catch (error) {
        console.error("Get meeting error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get meeting details"
        });
    }
};

exports.endMeeting = async (req, res) => {
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

        if (meeting.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the host can end this meeting"
            });
        }

        if (!meeting.isActive) {
            return res.status(400).json({
                success: false,
                message: "Meeting has already ended"
            });
        }

        meeting.isActive = false;
        meeting.endedAt = new Date();

        await meeting.save();

        res.status(200).json({
            success: true,
            message: "Meeting ended successfully",
            meeting
        });

    } catch (error) {
        console.error("End meeting error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to end meeting"
        });
    }
};

exports.getMyMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({
            $or: [
                { host: req.user._id },
                { participants: req.user._id }
            ]
        })
            .populate("host", "name email")
            .populate("participants", "name email")
            .sort({ startedAt: -1 });

        const formattedMeetings = meetings.map(meeting => {
            const endTime = meeting.endedAt || new Date();

            const duration = Math.max(
                0,
                Math.floor((endTime - meeting.startedAt) / 1000)
            );

            return {
                _id: meeting._id,
                meetingId: meeting.meetingId,
                title: meeting.title,
                host: meeting.host,
                participants: meeting.participants,
                isActive: meeting.isActive,
                startedAt: meeting.startedAt,
                endedAt: meeting.endedAt,
                duration
            };
        });

        res.status(200).json({
            success: true,
            count: formattedMeetings.length,
            meetings: formattedMeetings
        });

    } catch (error) {
        console.error("Get meetings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get your meetings"
        });
    }
};
