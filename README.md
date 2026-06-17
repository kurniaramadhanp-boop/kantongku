<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/23be34da-a6e4-4f51-8181-6b09f409118d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Render

This app is ready to deploy on Render because it uses an Express server in `server.ts`.

1. Push this repository to GitHub.
2. In Render, create a new Web Service and connect the GitHub repo.
3. Use these values:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add the environment variable:
   - `GEMINI_API_KEY=<your Gemini API key>`
5. Deploy.

A Render config file is included in `render.yaml` for one-click setup.
