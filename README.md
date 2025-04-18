# Studio DATA Portfolio Chat

An interactive portfolio website for Studio DATA that features an AI-powered chat assistant. The chat assistant uses a client-side language model to answer questions about Studio DATA's projects and expertise.

## Features

- **AI Chat Assistant**: Uses Transformers.js to run a language model directly in the browser
- **Portfolio API**: Backend API that provides project and studio information
- **Responsive Design**: Clean, modern interface that works on mobile and desktop

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript with Transformers.js
- **Backend**: Node.js with Express
- **AI Model**: DistilGPT2 from Hugging Face, running in the browser

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/chrisbamborough/Studio_DATA_LLM.git
   cd Studio_DATA_LLM
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory (optional):
   ```
   PORT=3000
   ```

### Running the Application

Development mode with auto-reload:

```
npm run dev
```

Production mode:

```
npm start
```

The application will be available at `http://localhost:3000`.

## How It Works

1. The server provides static files and a simple API endpoint for portfolio data
2. When a user loads the page, the application:

   - Fetches portfolio data from the API
   - Loads the language model (DistilGPT2) in the browser
   - Sets up the chat interface

3. Users can ask questions about Studio DATA, and the AI will:
   - Extract relevant information based on the query
   - Format a prompt with that information
   - Generate a response using the language model
   - Present the response in the chat interface

## Project Structure

```
/
├── public/                 # Static frontend assets
│   ├── index.html          # Main HTML file
│   ├── css/                # Stylesheets
│   │   └── style.css       # Main CSS file
│   └── js/                 # JavaScript files
│       └── app.js          # Main application logic
├── src/
│   └── backend/            # Backend code
│       └── server.js       # Express server setup
├── .env                    # Environment variables (not in repo)
├── .gitignore              # Git ignore file
├── package.json            # Project configuration
└── README.md               # This file
```

## Future Enhancements

- Add a database to store real project data
- Implement session management for chat history
- Add more sophisticated AI model options
- Create admin interface for portfolio management

## License

ISC
