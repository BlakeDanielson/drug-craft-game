# Project Brief: Infinite Craft Enhanced

## 1. Core Objective

Transform the existing "Drug Craft" game into an enhanced version of "Infinite Craft". The goal is to create a web-based game where players combine basic elements (Water, Fire, Wind, Earth) to discover new elements infinitely.

## 2. Key Enhancements ("Even Better")

*   **Global First Discovery:** Implement a system to track and display the first player globally to discover each unique element combination.
*   **Dual AI Generation:** Utilize both OpenAI and Google Gemini APIs for generating new element combinations, potentially offering more diverse or creative results.
*   **User Accounts:** Include simple user accounts (email/password) via Supabase Auth to support persistent identity for the First Discovery feature.

## 3. Core Gameplay Mechanics

*   Start with four basic elements: Water, Fire, Wind, Earth.
*   Players drag and drop elements onto each other in a crafting area.
*   Combining two elements results in a new element.
*   The system checks a central database (Supabase) to see if the resulting element has been discovered globally before.
*   If it's a new global discovery, the player is recorded as the "First Discoverer".
*   If the combination logic hasn't been determined before, call either OpenAI or Gemini API to generate the resulting element's name, icon, and potentially a description.
*   Store all globally discovered elements and their generating combinations in the Supabase database.
*   Display discovered elements in a sidebar/list for reuse.

## 4. Target Platform & Technology

*   **Platform:** Web Browser
*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **Backend:** Supabase (Database, Authentication, Edge Functions for API)
*   **AI:** OpenAI API, Google Gemini API

## 5. Initial UI/UX Direction

*   Start with a minimalist UI aesthetic, similar to the original Infinite Craft.
*   Allow for potential UI evolution based on development and feedback.

## 6. Scope Considerations

*   Focus initially on the core combination loop, database integration, user auth, dual AI calls, and first discovery tracking.
*   Advanced features like leaderboards, element organization tools, or sharing can be considered later phases.
