# Codebase Summary

## Key Components and Their Interactions

*   **`index.html`**: Main entry point, loads CSS, Supabase client, and game script.
*   **`styles.css`**: Defines visual styling.
*   **`supabaseClient.js`**: Initializes the Supabase client using credentials from `.env` (for client-side access using Anon key) and attaches it to `window._supabase`.
*   **`game.js`**: Core client-side logic:
    *   Initializes the game (`initGame`).
    *   Loads initial data (discovered elements, known combinations) from Supabase (`loadDataFromSupabase`).
    *   Renders the UI (element list, categories).
    *   Handles drag-and-drop interactions for adding elements to the playground and combining them.
    *   Processes combinations (`processCombination`): checks local cache, calls API if needed.
    *   Handles combination results (`handleCombinationResult`): updates UI, saves new discoveries to Supabase (`player_inventory`).
    *   Handles game reset (`resetButton` listener): clears non-initial elements from `player_inventory` via Supabase.
*   **`api/generate-combination.js`**: Vercel serverless function (Node.js):
    *   Handles POST requests from `game.js`.
    *   Connects to Supabase using **Service Role Key** (via Vercel environment variables).
    *   Checks `combinations` table for existing results.
    *   If no existing combination, calls OpenAI API to generate a new element concept.
    *   Checks `elements` table if the generated element name exists.
    *   Inserts the new element into `elements` table if it doesn't exist.
    *   Inserts the new combination mapping into `combinations` table.
    *   Returns the full result element object (including DB ID) to the client.
    *   Includes a test mode (`isTest: true`) to verify Supabase and OpenAI connections.
*   **`.env` / `.env.example`**: Store Supabase URL, Anon Key, Service Role Key, and OpenAI API Key. **Crucially, these must also be set in Vercel project settings for deployment.**
*   **`userInstructions/add_vercel_env_vars.md`**: Instructions for setting up Vercel environment variables.
*   `reset.html` / `reset_data.js`: (Potentially obsolete or needs review - reset logic is now in `game.js`).
*   `api.js`, `test_api.js`: (Potentially obsolete or need review based on current API implementation).

## Data Flow

1.  **Load:** `index.html` loads -> `supabaseClient.js` initializes -> `game.js` runs `initGame`.
2.  `initGame` calls `loadDataFromSupabase` which fetches `elements`, `player_inventory`, and `combinations` from Supabase via the client-side library.
3.  `game.js` renders the UI based on fetched data.
4.  **Combine:** User drags elements in the playground.
5.  `drop` event triggers `processCombination` in `game.js`.
6.  `processCombination` checks the local `combinationCache` (populated from Supabase).
7.  **Cache Miss:** If not cached, `processCombination` calls `generateCombination` (in `game.js`).
8.  `generateCombination` sends a POST request with element IDs to `/api/generate-combination`.
9.  **API Logic:** The Vercel function (`api/generate-combination.js`):
    *   Connects to Supabase (server-side).
    *   Checks `combinations` table.
    *   (If needed) Calls OpenAI.
    *   (If needed) Checks/Inserts into `elements` table.
    *   Inserts into `combinations` table.
    *   Returns the result element object (with DB ID).
10. **API Response:** `generateCombination` (in `game.js`) receives the result element.
11. `processCombination` updates the local `combinationCache` and `allElements` cache.
12. `processCombination` calls `handleCombinationResult`.
13. **New Discovery:** If the result is new, `handleCombinationResult` inserts the element ID into `player_inventory` via Supabase (client-side) and updates the UI.
14. `handleCombinationResult` displays the result element in the UI.

## External Dependencies

*   **Supabase:** PostgreSQL database, client library (`@supabase/supabase-js`) for frontend data access and backend (serverless function) data manipulation.
*   **OpenAI:** API (`openai` npm package) used server-side within the Vercel function for generating new combinations.
*   **Vercel:** Hosting platform for static files and serverless Node.js functions (`api/`). Relies on Vercel environment variables for secrets.
*   **Node.js Packages:** `@supabase/supabase-js`, `openai`, `dotenv` (for local dev), `serve` (for basic local static serving, but `vercel dev` is preferred for full testing).

## Recent Significant Changes

*   Implemented Supabase database schema (`elements`, `combinations`, `player_inventory`).
*   Refactored `game.js` to use Supabase for data persistence (load, save discoveries, reset) instead of LocalStorage.
*   Refactored `api/generate-combination.js` Vercel function to:
    *   Connect securely to Supabase server-side.
    *   Check database for existing combinations before calling OpenAI.
    *   Handle element existence checks and insertions in the database.
    *   Save new combinations to the database.
*   Added `icon` and `category` columns to the `elements` table.
*   Added logging to `game.js` for debugging.
*   **Implemented UI/UX Improvements (see `cline_docs/UI_improvements.md` for details):**
    *   Enhanced visual feedback during drag-and-drop (source dimming, target dimming).
    *   Added distinct animations for element merging and result appearance.
    *   Added shake animation for errors in the result zone.
    *   Added category headers and discovered indicators to the element list.
    *   Added a combination history log.
    *   Added tooltips to elements.
    *   Added element counts to category buttons.
    *   Added search term highlighting.
    *   Integrated API status/settings toggle into the header.

## User Feedback Integration

*   Identified and fixed missing `icon` and `category` columns in the `elements` table based on testing feedback.
*   Investigated drag-and-drop issues (though resolved by fixing DB issues).
