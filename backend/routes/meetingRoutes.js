
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    createMeeting,
    joinMeeting,
    getMeeting,
    endMeeting,
    getMyMeetings
} = require("../controllers/meetingController");

router.post("/create", protect, createMeeting);
router.post("/join", protect, joinMeeting);
router.get("/my", protect, getMyMeetings);
router.get("/:meetingId", protect, getMeeting);
router.put("/:meetingId/end", protect, endMeeting);

module.exports = router;
