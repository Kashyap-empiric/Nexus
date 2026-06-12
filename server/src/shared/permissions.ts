// Re-export from auth module for backward compatibility
// Direct consumers should import from '@/modules/auth/auth.service.js'
export { isWorkspaceMember, verifyConversationMembership } from "@/modules/auth/auth.service.js";
