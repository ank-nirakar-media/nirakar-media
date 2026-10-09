// Point the YouTube and Instagram connectors at fake hosts. Imported before them in publish.test.ts.
process.env.ENCRYPTION_KEY = "a-test-encryption-key-that-is-long-enough";
process.env.YOUTUBE_UPLOAD_BASE = "https://upload.test";
process.env.META_GRAPH_BASE = "https://graph.test";
