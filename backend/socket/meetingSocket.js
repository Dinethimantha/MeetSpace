
const Meeting = require("../models/Meeting");

const meetingSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join-meeting", async (data = {}) => {
            try {
                const meetingId = String(data.meetingId || "").trim().toUpperCase();
                const userId = String(data.userId || "").trim();
                const userName = String(data.userName || "Participant").trim();

                if (!meetingId || !userId) {
                    socket.emit("meeting-error", {
                        message: "Meeting ID and participant ID are required"
                    });
                    return;
                }

                if (
                    socket.data.meetingId === meetingId &&
                    socket.data.userId === userId
                ) {
                    const currentParticipants = await io.in(meetingId).fetchSockets();

                    socket.emit("meeting-joined", {
                        success: true,
                        meetingId,
                        socketId: socket.id,
                        participants: currentParticipants
                            .filter(item => item.id !== socket.id)
                            .map(item => ({
                                socketId: item.id,
                                userId: item.data.userId,
                                userName: item.data.userName || "Participant"
                            }))
                    });

                    return;
                }

                const meeting = await Meeting.findOne({ meetingId });

                if (!meeting || !meeting.isActive) {
                    socket.emit("meeting-error", {
                        message: "Meeting not found or has ended"
                    });
                    return;
                }

                if (socket.data.meetingId) {
                    leaveMeeting(socket);
                }

                const existingSockets = await io.in(meetingId).fetchSockets();

                const participants = existingSockets
                    .filter(item => item.id !== socket.id && item.data.userId)
                    .map(item => ({
                        socketId: item.id,
                        userId: item.data.userId,
                        userName: item.data.userName || "Participant"
                    }));

                await socket.join(meetingId);

                socket.data.meetingId = meetingId;
                socket.data.userId = userId;
                socket.data.userName = userName;

                socket.emit("meeting-joined", {
                    success: true,
                    meetingId,
                    socketId: socket.id,
                    participants
                });

                socket.to(meetingId).emit("user-joined", {
                    socketId: socket.id,
                    userId,
                    userName
                });

                console.log(
                    `User ${userName} joined ${meetingId}. Total: ${participants.length + 1}`
                );

            } catch (error) {
                console.error("Join meeting error:", error);

                socket.emit("meeting-error", {
                    message: "Failed to join meeting room"
                });
            }
        });

        socket.on("chat-message", (data = {}) => {
            const meetingId = String(data.meetingId || "").trim().toUpperCase();
            const message = String(data.message || "").trim();

            if (
                !socket.data.meetingId ||
                socket.data.meetingId !== meetingId ||
                !socket.rooms.has(meetingId) ||
                !message ||
                message.length > 1000
            ) {
                return;
            }

            io.to(meetingId).emit("receive-message", {
                senderId: socket.data.userId,
                senderName: socket.data.userName || "Participant",
                message,
                timestamp: new Date()
            });
        });

        socket.on("whiteboard-draw", (data = {}) => {
            const meetingId = String(data.meetingId || "").trim().toUpperCase();

            if (
                !meetingId ||
                socket.data.meetingId !== meetingId ||
                !socket.rooms.has(meetingId) ||
                !data.x ||
                !data.y
            ) {
                return;
            }

            socket.to(meetingId).emit("whiteboard-draw", {
                userId: socket.data.userId,
                x: data.x,
                y: data.y,
                previousX: data.previousX,
                previousY: data.previousY,
                color: data.color,
                lineWidth: data.lineWidth
            });
        });

        socket.on("whiteboard-clear", (data = {}) => {
            const meetingId = String(data.meetingId || "").trim().toUpperCase();

            if (
                !meetingId ||
                socket.data.meetingId !== meetingId ||
                !socket.rooms.has(meetingId)
            ) {
                return;
            }

            socket.to(meetingId).emit("whiteboard-clear", {
                userId: socket.data.userId
            });
        });

        socket.on("leave-meeting", () => {
            leaveMeeting(socket);
        });

        socket.on("webrtc-offer", data => {
            forwardToParticipant(socket, data, "webrtc-offer", {
                offer: data.offer,
                sender: socket.id
            });
        });

        socket.on("webrtc-answer", data => {
            forwardToParticipant(socket, data, "webrtc-answer", {
                answer: data.answer,
                sender: socket.id
            });
        });

        socket.on("webrtc-ice-candidate", data => {
            forwardToParticipant(socket, data, "webrtc-ice-candidate", {
                candidate: data.candidate,
                sender: socket.id
            });
        });

        function forwardToParticipant(currentSocket, data = {}, eventName, payload) {
            const meetingId = currentSocket.data.meetingId;
            const target = data.target;

            if (
                !meetingId ||
                !currentSocket.rooms.has(meetingId) ||
                !target
            ) {
                return;
            }

            const targetSocket = io.sockets.sockets.get(target);

            if (
                !targetSocket ||
                targetSocket.data.meetingId !== meetingId
            ) {
                console.log("WebRTC target unavailable:", target);
                return;
            }

            targetSocket.emit(eventName, payload);
        }

        function leaveMeeting(currentSocket) {
            const meetingId = currentSocket.data.meetingId;
            const userId = currentSocket.data.userId;

            if (!meetingId) return;

            currentSocket.to(meetingId).emit("user-left", {
                socketId: currentSocket.id,
                userId
            });

            currentSocket.leave(meetingId);

            currentSocket.data.meetingId = null;
            currentSocket.data.userId = null;
            currentSocket.data.userName = null;

            console.log(`User ${userId} left meeting ${meetingId}`);
        }

        socket.on("disconnect", reason => {
            console.log("Disconnect reason:", reason);
            leaveMeeting(socket);
            console.log("User disconnected:", socket.id);
        });
    });
};

module.exports = meetingSocket;
