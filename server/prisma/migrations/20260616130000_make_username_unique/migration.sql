-- Make username unique across all users
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");
