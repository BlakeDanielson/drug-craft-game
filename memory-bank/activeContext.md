# Active Context: Infinite Craft Enhanced

## Current Focus: Phase 1 - Setup & Core Backend

We are proceeding with Phase 1 as outlined in the `projectbrief.md` and the initial plan.

**Current Task:** Set up the Supabase project.

**Completed Steps:**
*   Initialized core Memory Bank documentation files (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`).

**Immediate Next Steps:**
1.  Guide the user through creating a new Supabase project via the Supabase dashboard.
2.  Obtain the Supabase Project URL and Anon Key from the user.
3.  Store these credentials securely (likely guide user to create `.env` or similar for local dev, and configure Supabase secrets later).
4.  Proceed to define the database schema.

**Active Decisions:**
*   Project Goal: Enhance Infinite Craft concept with Global Discovery, Dual AI (OpenAI/Gemini), and User Accounts.
*   Technology Stack: Vanilla JS, HTML, CSS, Supabase (DB, Auth, Edge Functions), OpenAI API, Gemini API.
*   Initial UI: Minimalist, similar to Infinite Craft.
*   User Identification: Simple Accounts (Email/Password via Supabase Auth).
*   Database Choice: Supabase.

**Open Questions/Considerations:**
*   Specific database schema details for Supabase (to be defined soon).
*   Exact strategy for choosing between OpenAI and Gemini for generation (e.g., random, alternating, user choice?). Start simple.
*   Detailed error handling strategies for API calls and DB interactions.

**Learnings/Insights:**
*   The project involves a significant shift from the original 'drug_craft' codebase, requiring backend infrastructure (Supabase) from the start due to the Global Discovery and User Account features.
