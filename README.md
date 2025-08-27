# PreAid - AI Health Assistant

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
Create a `.env` file and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. Start the Server
```bash
npm start
```

### 4. Access the Application
Open your browser and go to `http://localhost:3000`

## Features
- Secure API key handling via backend
- User history tracking and analysis
- Recent consultations panel
- Voice input support
- Dark/light theme toggle
- Share functionality

## Security
- API key is stored securely on the server
- User sessions are tracked with unique IDs
- No sensitive data exposed to frontend