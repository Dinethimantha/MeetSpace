
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const sharedFileRoutes = require("./routes/sharedFileRoutes");
const meetingSocket = require("./socket/meetingSocket");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/shared-files", sharedFileRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MeetSpace API is running successfully!"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "Online",
        database: "Connected"
    });
});

meetingSocket(io);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        server.on("error", error => {
            if (error.code === "EADDRINUSE") {
                console.error(`Port ${PORT} is already in use.`);
                process.exit(1);
            }

            console.error("Server error:", error);
            process.exit(1);
        });

        server.listen(PORT, () => {
            console.log(`MeetSpace server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
