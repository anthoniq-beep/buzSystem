-- Add canSendMail to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "canSendMail" BOOLEAN NOT NULL DEFAULT FALSE;

-- Internal mail table
CREATE TABLE IF NOT EXISTS "internal_mails" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "senderId" INTEGER NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_mails_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "internal_mails_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "internal_mails_recipientId_readAt_idx" ON "internal_mails"("recipientId", "readAt");
CREATE INDEX IF NOT EXISTS "internal_mails_senderId_createdAt_idx" ON "internal_mails"("senderId", "createdAt");

