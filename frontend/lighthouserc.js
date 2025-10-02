module.exports = {
  ci: {
    collect: {
      url: [
        "https://inrent.vercel.app",
        "https://inrent.vercel.app/marketplace",
        "https://inrent.vercel.app/messages",
      ],
      numberOfRuns: 5,
      settings: {
        chromeFlags: "--no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:perfomance": ["warn", { minScore: 0.8 }],
        "categories: accessibility": ["error", { minScore: 0.9 }],
        "categories: best-practises": ["warn", { minScore: 0.8 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
