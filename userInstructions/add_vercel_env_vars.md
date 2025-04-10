# How to Add Environment Variables to Your Vercel Project

To allow your deployed Vercel application (specifically the API function `api/generate-combination.js`) to connect to Supabase and OpenAI, you need to securely add the following environment variables to your Vercel project settings:

1.  `SUPABASE_URL`
2.  `SUPABASE_SERVICE_ROLE_KEY`
3.  `OPENAI_API_KEY`

**Steps:**

1.  **Log in to Vercel:** Go to [https://vercel.com/](https://vercel.com/) and log in to your account.
2.  **Select Your Project:** Navigate to your dashboard and select the project corresponding to this "drug_craft" game.
3.  **Go to Settings:** Once in the project view, click on the "Settings" tab.
4.  **Find Environment Variables:** In the left-hand sidebar under "Project Settings", click on "Environment Variables".
5.  **Add Variables:** You will add three variables one by one:
    *   **Name:** Enter the variable name (e.g., `SUPABASE_URL`).
    *   **Value:** Paste the corresponding value. You can copy these values from your local `.env` file:
        *   For `SUPABASE_URL`: Copy the URL from your `.env` file.
        *   For `SUPABASE_SERVICE_ROLE_KEY`: Copy the secret service role key from your `.env` file (or get it from your Supabase project settings: API > Project API keys > `service_role` key). **Treat this key as highly confidential.**
        *   For `OPENAI_API_KEY`: Copy your OpenAI API key from your `.env` file (or get it from your OpenAI account).
    *   **Environment(s):** Ensure the variable is available for the "Production" environment. You might also want to add it to "Preview" and "Development" if you use Vercel's preview deployments or local development integration (`vercel dev`). It's generally safe to add it to all three for these keys.
    *   **Click "Add":** Save the variable.
6.  **Repeat:** Repeat step 5 for the other two variables (`SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY`).
7.  **Redeploy (Recommended):** After adding the variables, it's a good practice to trigger a new deployment on Vercel to ensure the latest settings are applied. You can usually do this from the "Deployments" tab in your Vercel project.

Once you have added these three environment variables in your Vercel project settings, the deployed API function will be able to securely access the required services.
