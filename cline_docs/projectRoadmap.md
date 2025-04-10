# Project Roadmap

## High-Level Goals
- [x] Set up the initial project structure. (Basic files and docs exist)
- [x] Integrate Supabase for backend data storage. (Client initialized, schema defined, basic data persistence implemented in `game.js`)
- [ ] Develop core game mechanics.
  - [x] Basic element/combination data persistence using Supabase.
  - [ ] Implement crafting logic (checking combinations, handling results).
  - [ ] Player inventory management (fetching/displaying discovered items).
- [ ] Implement user interface.
- [ ] Deploy the application.

## Key Features
- [x] Player inventory management (DB table created, basic fetch in `game.js`).
- [x] Crafting system for combining items (DB tables created, basic fetch/save in `game.js`, API interaction pending refinement).
- [ ] Basic game loop (buy, craft, sell).

## Completion Criteria
- Core game loop is functional.
- Data is persisted using Supabase.
- Basic UI allows interaction with the game.

## Completed Tasks
- Initial project documentation setup (`cline_docs`).
- Supabase client library installation and initialization setup (`supabaseClient.js`, `.env`).
- Defined Supabase database schema (`elements`, `combinations`, `player_inventory` tables).
- Integrated Supabase data loading/saving into `game.js` (replacing LocalStorage).
- Implemented basic reset functionality using Supabase.
