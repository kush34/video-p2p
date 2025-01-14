# Video-P2P: Peer-to-Peer Video Conferencing Application

Video-P2P is a lightweight, browser-based video conferencing application designed to facilitate seamless peer-to-peer communication. The application utilizes WebRTC technology for real-time audio, video, and data exchange directly between users without relying on a centralized server for media streaming.

## Features

- **High-Quality Video and Audio**: Real-time, low-latency communication using WebRTC.
- **Secure Connections**: End-to-end encrypted communication to protect user privacy.
- **Room-Based Meetings**: Users can create or join unique rooms for private conversations.
- **Screen Sharing**: Share your screen with other participants during meetings.
- **Chat Functionality**: Integrated text chat for sharing messages alongside video calls.
- **Cross-Browser Compatibility**: Works on modern browsers like Chrome, Firefox, and Edge.

## Technologies Used

- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express
- **Signaling Server**: Socket.IO for WebRTC signaling
- **WebRTC**: For peer-to-peer media and data exchange

## Getting Started

### Prerequisites

- **Node.js**: Install [Node.js](https://nodejs.org/) (v14 or higher).
- **npm** or **yarn**: Comes with Node.js or install [Yarn](https://yarnpkg.com/).
- A modern web browser (preferably Chrome or Firefox).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/video-p2p.git
   cd video-p2p
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the `backend` folder with the following:
     ```env
     PORT=5000
     ```
   - (Optional) Add TURN server credentials if needed.

4. Start the application:
   ```bash
   # Start backend server
   cd backend
   npm start

   # Start frontend development server
   cd ../frontend
   npm start
   ```

5. Access the application in your browser at `http://localhost:3000`.

## Folder Structure

```
video-p2p/
├── backend/       # Node.js server and signaling logic
├── frontend/      # React application
└── README.md      # Project documentation
```

## Future Enhancements

- Add support for recording video calls.
- Implement user authentication for enhanced security.
- Integrate with third-party calendar services for scheduling meetings.
- Add mobile app support using React Native.

## Acknowledgments

- WebRTC community for providing excellent resources and support.
- Open-source contributors for making this project possible.

---

For any questions or feedback, feel free to open an issue or reach out to us at [chattkush34@gmail.com](mailto:chattkush34@gmail.com).
