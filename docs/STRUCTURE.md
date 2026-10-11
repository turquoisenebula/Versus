debate-platform/
├── README.md
├── .gitignore
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── app.js
│   ├── config/        (db.js, env.js)
│   ├── models/        (User, Debate, Argument, Vote, ArgumentUpvote)
│   ├── routes/        (auth, user, debate, argument)
│   ├── controllers/   (auth, user, debate, argument, vote)
│   ├── services/      (debate.service, vote.service, argument.service, debateClose.service)
│   ├── jobs/          (closeDebates.job.js)
│   ├── scripts/       (closeDebatesOnce.js)
│   ├── middleware/    (auth, optionalAuth, validate, errorHandler, rateLimiter)
│   ├── utils/         (ApiError, asyncHandler, generateToken)
│   └── tests/         (debateClose.test.js, vote.test.js)
└── client/
    ├── package.json, vite.config.js, index.html, .env.example
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── api/        (axios, auth, debate, user)
        ├── context/    (AuthContext)
        ├── hooks/      (useAuth, useDebounce)
        ├── pages/      (Home, DebateDetail, CreateDebate, Profile, Login, Register, NotFound)
        ├── components/
        │   ├── layout/   (Navbar, ProtectedRoute)
        │   ├── debate/   (DebateCard, VoteBar, VoteButtons, ArgumentList, ArgumentForm, DebateFilters)
        │   ├── profile/  (StatsCard, BadgeList)
        │   └── common/   (Button, Loader, Toast)
        └── utils/      (constants.js, formatDate.js)