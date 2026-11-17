 MeetSpace – Real-Time Video Conferencing & Collaboration Platform

MeetSpace is a web-based video conferencing and collaboration platform designed to make online communication and teamwork easier. Users can create and join meetings, communicate in real time, share files, and collaborate through an interactive whiteboard.

 Features

- **User Authentication** – Secure user registration and login.
- **Create Meetings** – Create online meetings with unique meeting IDs.
- **Join Meetings** – Join existing meetings using a meeting ID.
- **Video & Audio Calling** – Communicate with other participants in real time.
- **Screen Sharing** – Share your screen during meetings.
- **Real-Time Chat** – Exchange messages with meeting participants.
- **Meeting History** – View previously created and attended meetings.
- **My Meetings** – Manage your meeting records.
- **Shared Files** – Upload, download, and delete files within meetings.
- **Collaborative Whiteboard** – Draw and collaborate with other participants in real time.

 Technologies Used

 Frontend
- HTML5
- CSS3
- JavaScript
- Font Awesome
- SweetAlert2

 Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- Multer
- JWT Authentication

 Real-Time Communication
- WebRTC
- Socket.IO

 Project Structure

text
MeetSpace/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── socket/
│   ├── uploads/
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── dashboard.html
│   ├── login.html
│   ├── register.html
│   ├── meeting.html
│   ├── shared-files.html
│   └── whiteboard.html
│
├── .gitignore
└── README.md


 Installation and Setup

 1. Clone the Repository

bash
git clone https://github.com/YOUR-USERNAME/MeetSpace.git
cd MeetSpace


 2. Install Backend Dependencies
`bash
cd backend
npm install


 3. Configure Environment Variables

Create a `.env` file inside the backend folder.

env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key


Replace the placeholder values with your own configuration.

4. Start the Backend Server`bash
node server.js


The backend server will run at:

`http://localhost:5000`

 5. Run the Frontend

Open the `frontend` folder using VS Code Live Server and access the application through your browser.

 Future Improvements

- Meeting scheduling and calendar integration
- Advanced meeting notifications
- Improved meeting security
- Enhanced mobile responsiveness

 Author

Dineth Imantha Nupehewa

Software Engineering Graduate | Full Stack Developer

- GitHub: [github.com/Dinethimantha](https://github.com/Dinethimantha)
- LinkedIn: [LinkedIn Profile](https://www.linkedin.com/in/dineth-nupehewa-258987355/)