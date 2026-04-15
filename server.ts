import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

const app = express();
const PORT = 3000;

// Trust proxy for secure cookies behind nginx
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'studionote-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    httpOnly: true 
  }
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

// Helper to get drive client
const getDrive = (tokens: any) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);
  return google.drive({ version: 'v3', auth });
};

// API Routes
app.get("/api/auth/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    (req.session as any).tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/user", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const userInfo = await oauth2.userinfo.get();
    res.json(userInfo.data);
  } catch (error) {
    res.status(401).json({ error: "Invalid tokens" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Drive Operations
app.get("/api/notes", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    
    // Find or create StudioNote folder
    let folderId: string;
    const folderRes = await drive.files.list({
      q: "name = 'StudioNote' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
    });

    if (folderRes.data.files && folderRes.data.files.length > 0) {
      folderId = folderRes.data.files[0].id!;
    } else {
      const createFolder = await drive.files.create({
        requestBody: {
          name: 'StudioNote',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = createFolder.data.id!;
    }

    // List JSON files in folder
    const filesRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType = 'application/json'`,
      fields: 'files(id, name, modifiedTime)',
    });

    const notes = await Promise.all((filesRes.data.files || []).map(async (file) => {
      const content = await drive.files.get({
        fileId: file.id!,
        alt: 'media',
      });
      return { ...content.data as any, driveId: file.id, modifiedTime: file.modifiedTime };
    }));

    res.json(notes);
  } catch (error) {
    console.error("Drive error:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.post("/api/notes", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    const note = req.body;

    // Find StudioNote folder
    const folderRes = await drive.files.list({
      q: "name = 'StudioNote' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
    });
    const folderId = folderRes.data.files![0].id;

    const fileMetadata = {
      name: `${note.id}.json`,
      parents: [folderId!],
      mimeType: 'application/json',
    };
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(note),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    res.json({ driveId: file.data.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/api/notes/:driveId", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    const { driveId } = req.params;
    const note = req.body;

    await drive.files.update({
      fileId: driveId,
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(note),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/api/notes/:driveId", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    const { driveId } = req.params;

    await drive.files.delete({ fileId: driveId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

app.get("/api/notes/:driveId/history", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    const { driveId } = req.params;

    const revisions = await drive.revisions.list({
      fileId: driveId,
      fields: 'revisions(id, modifiedTime, lastModifyingUser)',
    });

    res.json(revisions.data.revisions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/notes/:driveId/history/:revisionId", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    const { driveId, revisionId } = req.params;

    const content = await drive.revisions.get({
      fileId: driveId,
      revisionId: revisionId,
      alt: 'media',
    });

    res.json(content.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch revision content" });
  }
});

// Image Upload
app.post("/api/upload", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  try {
    const drive = getDrive(tokens);
    const { name, type, data } = req.body; // data is base64

    // Find StudioNote folder
    const folderRes = await drive.files.list({
      q: "name = 'StudioNote' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
    });
    const folderId = folderRes.data.files![0].id;

    const buffer = Buffer.from(data.split(',')[1], 'base64');
    const fileMetadata = {
      name: name,
      parents: [folderId!],
    };
    const media = {
      mimeType: type,
      body: Readable.from(buffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    res.json({ id: file.data.id, link: file.data.webViewLink });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
