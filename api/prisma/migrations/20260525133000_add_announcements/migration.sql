-- Announcements
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Announcement views (per-user seen status)
CREATE TABLE IF NOT EXISTS "announcement_views" (
  "id" SERIAL PRIMARY KEY,
  "announcementId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcement_views_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "announcement_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "announcement_views_announcementId_userId_key" ON "announcement_views"("announcementId", "userId");
CREATE INDEX IF NOT EXISTS "announcement_views_userId_seenAt_idx" ON "announcement_views"("userId", "seenAt");

