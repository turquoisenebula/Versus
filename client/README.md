# Versus client

## Run locally

1. Install dependencies with `npm install` from this directory.
2. Copy `.env.example` to `.env` and adjust `VITE_API_URL` if the API uses a
   different address.
3. Start the Vite development server with `npm run dev`. Open the URL printed
   in the terminal (by default, `http://localhost:5173`).

The server's `CLIENT_URL` must match the client origin. Its current example
value, `http://localhost:5173`, matches Vite's default.

Run `npm run build` to verify and produce a production build, or
`npm run preview` to preview that build locally.
