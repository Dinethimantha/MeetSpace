
document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:5000";

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    const meetingInput = document.getElementById("meetingId");
    const connectBtn = document.getElementById("connectBtn");
    const connectionStatus = document.getElementById("connectionStatus");
    const boardMeetingLabel = document.getElementById("boardMeetingLabel");
    const canvas = document.getElementById("whiteboardCanvas");
    const placeholder = document.getElementById("canvasPlaceholder");
    const ctx = canvas.getContext("2d");

    const penTool = document.getElementById("penTool");
    const eraserTool = document.getElementById("eraserTool");
    const brushColor = document.getElementById("brushColor");
    const brushSize = document.getElementById("brushSize");
    const brushSizeValue = document.getElementById("brushSizeValue");
    const clearBoardBtn = document.getElementById("clearBoardBtn");

    let socket = null;
    let connected = false;
    let isDrawing = false;
    let currentTool = "pen";
    let currentColor = brushColor.value;
    let currentSize = Number(brushSize.value);
    let previousPoint = null;
    let currentMeetingId = "";

    if (!token || !user || !user._id) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("profileName").textContent = user.name || "User";
    document.getElementById("profileAvatar").textContent =
        (user.name || "U").charAt(0).toUpperCase();

    document.getElementById("logoutBtn").addEventListener("click", event => {
        event.preventDefault();

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "login.html";
    });

    function setStatus(message, status = "") {
        connectionStatus.className = "connection-status";

        if (status) {
            connectionStatus.classList.add(status);
        }

        connectionStatus.innerHTML = `<span></span>${message}`;
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;

        const oldCanvas = document.createElement("canvas");
        oldCanvas.width = canvas.width;
        oldCanvas.height = canvas.height;

        if (canvas.width && canvas.height) {
            oldCanvas.getContext("2d").drawImage(canvas, 0, 0);
        }

        canvas.width = Math.round(rect.width * pixelRatio);
        canvas.height = Math.round(rect.height * pixelRatio);

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (oldCanvas.width && oldCanvas.height) {
            ctx.drawImage(
                oldCanvas,
                0,
                0,
                oldCanvas.width,
                oldCanvas.height,
                0,
                0,
                rect.width,
                rect.height
            );
        }
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function getCanvasPoint(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            normalizedX: (event.clientX - rect.left) / rect.width,
            normalizedY: (event.clientY - rect.top) / rect.height
        };
    }

    function drawLine(startX, startY, endX, endY, color, size) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }

    function applyRemoteDrawing(data) {
        if (
            typeof data.x !== "number" ||
            typeof data.y !== "number" ||
            typeof data.previousX !== "number" ||
            typeof data.previousY !== "number"
        ) {
            return;
        }

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        drawLine(
            data.previousX * width,
            data.previousY * height,
            data.x * width,
            data.y * height,
            data.color || "#7965f5",
            Number(data.lineWidth) || 4
        );
    }

    function startDrawing(event) {
        if (!connected) return;

        isDrawing = true;
        previousPoint = getCanvasPoint(event);

        canvas.setPointerCapture(event.pointerId);
    }

    function continueDrawing(event) {
        if (!isDrawing || !connected || !previousPoint) return;

        const point = getCanvasPoint(event);

        const color = currentTool === "eraser"
            ? "#ffffff"
            : currentColor;

        drawLine(
            previousPoint.x,
            previousPoint.y,
            point.x,
            point.y,
            color,
            currentTool === "eraser" ? currentSize * 3 : currentSize
        );

        socket.emit("whiteboard-draw", {
            meetingId: currentMeetingId,
            previousX: previousPoint.normalizedX,
            previousY: previousPoint.normalizedY,
            x: point.normalizedX,
            y: point.normalizedY,
            color,
            lineWidth: currentTool === "eraser"
                ? currentSize * 3
                : currentSize
        });

        previousPoint = point;
    }

    function stopDrawing() {
        isDrawing = false;
        previousPoint = null;
    }

    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", continueDrawing);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);

    penTool.addEventListener("click", () => {
        currentTool = "pen";
        penTool.classList.add("active");
        eraserTool.classList.remove("active");
        canvas.style.cursor = "crosshair";
    });

    eraserTool.addEventListener("click", () => {
        currentTool = "eraser";
        eraserTool.classList.add("active");
        penTool.classList.remove("active");
        canvas.style.cursor = "cell";
    });

    brushColor.addEventListener("input", () => {
        currentColor = brushColor.value;
    });

    brushSize.addEventListener("input", () => {
        currentSize = Number(brushSize.value);
        brushSizeValue.textContent = `${currentSize}px`;
    });

    clearBoardBtn.addEventListener("click", async () => {
        if (!connected) {
            Swal.fire("Not connected", "Connect to a meeting first.", "warning");
            return;
        }

        const result = await Swal.fire({
            title: "Clear whiteboard?",
            text: "This will clear the board for everyone in this meeting.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Clear Board",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#ef5350"
        });

        if (!result.isConfirmed) return;

        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        socket.emit("whiteboard-clear", {
            meetingId: currentMeetingId
        });
    });

    function connectToMeeting() {
        const meetingId = meetingInput.value.trim().toUpperCase();

        if (!meetingId) {
            Swal.fire("Meeting ID required", "Enter a meeting ID first.", "warning");
            return;
        }

        if (socket) {
            socket.disconnect();
            socket = null;
        }

        connected = false;
        currentMeetingId = meetingId;
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

        setStatus("Connecting...");

        socket = io(API_URL, {
            transports: ["websocket", "polling"]
        });

        socket.on("connect", () => {
            socket.emit("join-meeting", {
                meetingId,
                userId: user._id,
                userName: user.name || "Participant"
            });
        });

        socket.on("meeting-joined", data => {
            if (!data.success) return;

            connected = true;
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fa-solid fa-check"></i> Connected';

            meetingInput.disabled = true;
            placeholder.classList.add("hidden");

            setStatus("Connected to meeting", "connected");
            boardMeetingLabel.textContent = `Meeting: ${currentMeetingId}`;
        });

        socket.on("meeting-error", data => {
            connected = false;
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fa-solid fa-link"></i> Connect';

            setStatus("Connection failed", "disconnected");

            Swal.fire(
                "Unable to join meeting",
                data.message || "Please check the meeting ID.",
                "error"
            );
        });

        socket.on("whiteboard-draw", data => {
            if (!connected) return;
            applyRemoteDrawing(data);
        });

        socket.on("whiteboard-clear", () => {
            ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        });

        socket.on("disconnect", () => {
            connected = false;
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fa-solid fa-link"></i> Connect';
            meetingInput.disabled = false;

            setStatus("Disconnected", "disconnected");
            boardMeetingLabel.textContent = "No meeting connected";
        });

        socket.on("connect_error", error => {
            connected = false;
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fa-solid fa-link"></i> Connect';

            setStatus("Server connection failed", "disconnected");

            Swal.fire(
                "Connection error",
                error.message || "Unable to connect to the server.",
                "error"
            );
        });
    }

    connectBtn.addEventListener("click", connectToMeeting);

    const urlParams = new URLSearchParams(window.location.search);
    const urlMeetingId = urlParams.get("meetingId");

    if (urlMeetingId) {
        meetingInput.value = urlMeetingId.toUpperCase();
    }

    window.addEventListener("beforeunload", () => {
        if (socket) {
            socket.emit("leave-meeting");
            socket.disconnect();
        }
    });
});
