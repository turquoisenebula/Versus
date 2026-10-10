# Project: Debate Platform

Stack: MongoDB (Mongoose), Express, React (Vite), Node.js. Real-time features may be added later.

## Product rules
- Guests can read debates, arguments, and user profiles. They cannot vote, post, or upvote.
- Logged-in users can create debates, post arguments (For or Against), upvote arguments,
  and vote For, Against, or Neutral.
- A user may only argue ONE side per debate. Reject a second argument on the opposite side.
- One vote per user per debate (unique index on debate+voter). Users may change their
  vote while the debate is open.
- Users cannot upvote their own arguments. One upvote per user per argument.
- No voting, posting, or upvoting once a debate is closed or past endsAt.

## Closing a debate
- Winner = side with more For vs Against votes. Neutral counts toward turnout only.
  Equal For/Against = draw.
- On close, inside one function in services/debateClose.service.js:
  - Set status=closed and result.
  - Arguers on the winning side get a win, losing side a loss, draw gives all arguers a draw.
    Increment stats.debates for every arguer.
  - The most-upvoted argument on the winning side (min 1 upvote, tie -> earliest) sets
    debate.bestArgument and increments author's badges.bestArguments.
  - Guard with debate.statsProcessed so stats can never be applied twice.
- Run closing via node-cron every minute for debates where endsAt <= now and status=open.

## Architecture rules
- Monorepo: /server and /client.
- Server: routes -> controllers -> services. Routes map URLs, controllers handle req/res,
  services hold business logic.
- server.js starts the HTTP server; app.js holds the Express app.
- JWT auth middleware; public GET routes must NOT require auth.
- Validate request bodies with zod. Central error handler, ApiError, asyncHandler.
- Never hardcode secrets. Use .env; commit only .env.example.
- Add pagination to all list endpoints.
- Client: functional components, hooks, AuthContext, one axios instance with JWT interceptor.
  Guests who click vote/post are redirected to login, then returned to the same page.