# Tech Context: Infinite Craft Enhanced

## 1. Frontend Technologies

*   **HTML5:** Standard markup for structuring the web page.
*   **CSS3:** Styling the user interface, aiming for a minimalist aesthetic initially.
*   **JavaScript (Vanilla ES6+):** Core language for client-side logic, DOM manipulation, event handling, and API communication. No frontend frameworks (like React, Vue, Angular) are planned at this stage to maintain simplicity aligned with the original project structure.
*   **Supabase Client Library (JS):** Used for interacting with Supabase Auth (user login/signup) and potentially directly with the database or invoking Edge Functions.

## 2. Backend Technologies (Supabase)

*   **Supabase Platform:** The primary BaaS provider.
    *   **PostgreSQL Database:** Supabase's underlying database for storing user data, globally discovered elements, and combinations.
    *   **Supabase Auth:** Handles user authentication (email/password initially).
    *   **Supabase Edge Functions:** Serverless functions (written in TypeScript/Deno) to host the backend API logic for combination generation, database interaction, and AI calls.

## 3. AI Services

*   **OpenAI API:** One of the AI providers for generating element combinations. Requires an API key.
*   **Google Gemini API:** The second AI provider for generating element combinations. Requires an API key.

## 4. Development & Deployment

*   **Local Development:** Running the HTML/CSS/JS files locally. A local Supabase instance can be set up using the Supabase CLI for backend development, or development can occur directly against the cloud Supabase project. Running Supabase Edge Functions locally is also supported via the CLI.
*   **Version Control:** Git (repository hosting not specified, assumed GitHub or similar).
*   **Deployment:**
    *   **Frontend:** Can be deployed as static files to services like Vercel, Netlify, GitHub Pages, or Supabase Storage.
    *   **Backend:** Supabase Edge Functions are deployed via the Supabase CLI or Git integration.
    *   **Initial Plan:** Likely deploy frontend and backend together using Vercel, leveraging its integration with Supabase and serverless functions (similar to the original 'drug_craft' setup, but adapted for Supabase Edge Functions instead of Vercel Serverless Functions if preferred).

## 5. Key Libraries/SDKs

*   `supabase-js`: Official JavaScript client library for interacting with Supabase from the frontend.
*   Potentially `openai` npm package (or direct fetch calls) for OpenAI API interaction within the Edge Function.
*   Potentially Google AI SDK (or direct fetch calls) for Gemini API interaction within the Edge Function.
*   Supabase Deno libraries for backend interaction within Edge Functions.

## 6. Environment Variables & Configuration

*   `SUPABASE_URL`: URL of the Supabase project.
*   `SUPABASE_ANON_KEY`: Public anonymous key for the Supabase project (used by frontend client).
*   `SUPABASE_SERVICE_ROLE_KEY`: Secret key for backend operations (used within Edge Functions - **NEVER expose publicly**).
*   `OPENAI_API_KEY`: Secret key for OpenAI API.
*   `GEMINI_API_KEY`: Secret key for Google Gemini API.

These secrets will need to be configured securely within the Supabase project settings (for Edge Functions) and potentially locally for development (e.g., via `.env` files ignored by git).

## 7. Technical Constraints & Considerations

*   Reliance on external APIs (Supabase, OpenAI, Gemini) means potential costs, rate limits, and downtime.
*   Edge Function execution limits (time, memory) need to be considered for complex backend logic.
*   Database schema design and indexing are crucial for performance as the number of elements grows.
*   Keeping sensitive API keys secure is paramount.
