# Drug Craft

**Drug Craft** is an educational game inspired by Infinite Craft that allows players to combine elements to discover new substances. It aims to explore drug creation, effects, and policy implications in an educational context.

## Features

- **Element Combination System**: Start with basic raw materials (coca leaf, cannabis seed, ethanol, etc.) and combine them to discover new substances.
- **AI-Powered Generation**: Utilizes OpenAI's API to dynamically generate new combinations.
- **Local Storage**: Saves your discoveries and combinations for future sessions.
- **Search & Filter**: Easily find elements by name or category.
- **Settings Panel**: Test API connectivity and view API status.

## Running the Game

### Option 1: With Local Server (Requires OpenAI API)

For the full experience with AI-generated combinations:

1. Clone this repository
2. Set up the server with Next.js:
   ```
   cd browser-games
   npm install
   ```
3. Create a `.env.local` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_key_here
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Navigate to `http://localhost:3000/drug-craft`

### Option 2: Deploy to Vercel (Recommended)

For the easiest setup with AI capabilities:

1. Fork this repository
2. Deploy to Vercel
3. Add your OpenAI API key as an environment variable in the Vercel dashboard

## Settings and API Testing

The game includes a settings panel where you can:

1. **Test API Connection**: Verify if the OpenAI API is properly configured and accessible
2. **View API Status**: See at a glance if the API is available or unavailable

To access settings, click the gear icon (⚙️) in the bottom right corner of the game.

## How It Works

### Combination Mechanics

When two elements are combined:

1. The game first checks if a combination already exists in cache
2. If not found in cache, it calls the OpenAI API to generate a new combination

### API Integration

The game requires deployment with a valid OpenAI API key. It communicates with the OpenAI API through a serverless function.

## Educational Context

This game provides a unique opportunity to learn about substances, their creation, effects, and policy implications in an interactive way. The educational aspects include:

- Understanding the basic components of various substances
- Learning about their classifications, effects, and risks
- Exploring the scientific and social contexts of drug production and policy

## Disclaimer

This game is created for educational purposes only. It does not promote or encourage drug use.

## About

Drug Craft is an interactive web-based game that allows players to combine different elements to create and discover various substances. The game aims to provide an educational experience exploring the social and economic aspects of drug policies.

## Technical Details

The game consists of:

- `index.html` - The main HTML file with the game structure
- `styles.css` - CSS styling for the game
- `game.js` - Core game logic and functionality
- `api/generate-combination.js` - Serverless function for OpenAI integration

## API Response Format

When the AI generates a new combination, it returns a JSON object with:

```json
{
  "id": "unique_id",
  "name": "Substance Name",
  "icon": "🧪",
  "category": "stimulant",
  "description": "Brief educational description of the substance"
}
```

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key for generating combinations (Required)

## Educational Purpose

This game is designed purely for educational purposes to explore the social, medical, and policy implications of various substances. It does not promote drug use or illegal activities.

## License

This project is licensed under the MIT License.

## Credits

- OpenAI for the combination generation
- Emoji graphics for substance representation
- Educational content sourced from academic and scientific resources 