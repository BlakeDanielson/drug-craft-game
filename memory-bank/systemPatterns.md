# System Patterns: Infinite Craft Enhanced

## 1. Overall Architecture

The system follows a client-server architecture:

*   **Client (Browser):** Handles user interface (HTML/CSS/JS), user interactions (drag/drop), local state management (e.g., current elements in playground, potentially user's *personal* discovered list), and communication with the backend API.
*   **Backend (Supabase):** Provides database storage, user authentication, and serverless API endpoints (Edge Functions) to handle core logic like combination generation, database checks, and first discovery tracking.

```mermaid
graph LR
    A[Client (Browser)] -- HTTPS Request --> B(Supabase Edge Function API);
    B -- Auth Check --> C(Supabase Auth);
    B -- DB Query/Mutation --> D(Supabase Database);
    B -- API Call (if needed) --> E(OpenAI API);
    B -- API Call (if needed) --> F(Google Gemini API);
    C -- Auth Result --> B;
    D -- DB Result --> B;
    E -- AI Result --> B;
    F -- AI Result --> B;
    B -- HTTPS Response --> A;
```

## 2. Key Technical Decisions & Patterns

*   **Backend as a Service (BaaS):** Leveraging Supabase significantly reduces the need for managing traditional server infrastructure. We use its integrated database, authentication, and serverless functions.
*   **Serverless API:** Using Supabase Edge Functions for the backend logic allows for scalability and simplifies deployment. The core `generate-combination-enhanced` function will encapsulate the main backend workflow. SUPABASE PASSWORD fQ#5l*1CnpG*yChf DO NOT DELETE!!! NEVER DELETE!!!
*   **Centralized State for Global Discoveries:** The Supabase database acts as the single source of truth for all globally discovered elements and first discovery information. The client relies on the API to get this global state.
*   **Client-Side UI Rendering:** Standard Vanilla JS manipulates the DOM to render the game interface based on data received from the API and local user interactions.
*   **Dual AI Integration:** The backend API will contain logic to select between OpenAI and Gemini for generating new combinations. The initial strategy will be simple (e.g., random choice) and can be refined later.
*   **Authentication Flow:** Standard email/password authentication managed by Supabase Auth on the backend and the Supabase JS client library on the frontend. API endpoints will require authentication tokens.

## 3. Data Flow for Combination

1.  User drops Element B onto Element A in the client UI.
2.  Client JS identifies Element A and Element B IDs.
3.  Client JS sends an authenticated request to the Supabase Edge Function API (`/generate-combination-enhanced`) with `{ elementA_id, elementB_id }`.
4.  API authenticates the user via the provided token (Supabase Auth).
5.  API generates a canonical combination key (e.g., `sorted_id_A + '+' + sorted_id_B`).
6.  API queries the Supabase Database (`combinations` table) using the key.
    *   **If Found:** Retrieve the resulting `element_id` and `first_discoverer_user_id`. Query the `elements` table for the result element details. Check if the current user is the `first_discoverer_user_id`.
    *   **If Not Found:**
        *   Select an AI provider (OpenAI or Gemini).
        *   Call the selected AI API with a prompt like "Element A + Element B = ?".
        *   Parse the AI response to get the new element's `name` and `icon`.
        *   Generate a unique ID for the new element (e.g., based on name or UUID).
        *   Insert the new element into the `elements` table (if it doesn't exist by name).
        *   Insert the new combination into the `combinations` table, linking Element A, Element B, the resulting element ID, and the current `user_id` as the `first_discoverer_user_id`. Mark this as a global first discovery.
7.  API constructs a response object including the resulting element details (`id`, `name`, `icon`), `isNewGlobalDiscovery` (boolean), and `firstDiscovererName` (if applicable).
8.  API sends the response back to the client.
9.  Client JS receives the response.
10. Client JS updates the UI: displays the resulting element, shows the "First Discovery" message if `isNewGlobalDiscovery` is true, and adds the element to the user's sidebar (if not already present locally).

## 4. Future Considerations

*   **Scalability:** Supabase handles much of the scaling, but database indexing and efficient queries will be important as the number of elements grows. Edge Function performance might need monitoring.
*   **API Rate Limiting:** Implement rate limiting on the API endpoint to prevent abuse and manage AI costs.
*   **AI Prompt Engineering:** Refining the prompts sent to OpenAI/Gemini will be crucial for the quality of generated combinations.
