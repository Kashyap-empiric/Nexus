import type { CompleteOnboardingInput } from "./onboarding.schema.js";
import { uuidv7 } from "uuidv7";
import { runTransaction } from "@/lib/transaction.js";
import { extractAvatarPath } from "@/utils/upload.js";

export const completeOnboarding = async (userId: string, data: CompleteOnboardingInput) => {
  return await runTransaction(async (tx) => {
    // 1. Update user profile
    const avatarUrl = data.avatarUrl || null;
    const avatarPath = extractAvatarPath(avatarUrl);
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        bio: data.bio || null,
        avatarPath,
        avatarUrl,
        isOnboarded: true,
      },
    });

    // If user skipped workspace creation, stop here.
    if (data.skipWorkspace || !data.workspaceSlug || !data.workspaceName) {
      return { skippedWorkspace: true };
    }

    // 2. Check if slug exists
    const existingWorkspace = await tx.workspace.findUnique({
      where: { slug: data.workspaceSlug },
    });

    let finalSlug = data.workspaceSlug;
    if (existingWorkspace) {
      finalSlug = `${data.workspaceSlug}-${Math.floor(Math.random() * 10000)}`;
    }

    // 3. Create workspace
    const workspaceId = uuidv7();
    const workspace = await tx.workspace.create({
      data: {
        id: workspaceId,
        name: data.workspaceName,
        slug: finalSlug,
        description: data.workspaceDescription || null,
        iconPath: data.workspaceIconPath || null,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: "OWNER",
          },
        },
      },
    });

    // 4. Create #general channel
    const generalChannelId = uuidv7();
    const generalChannel = await tx.conversation.create({
      data: {
        id: generalChannelId,
        type: "CHANNEL",
        name: "general",
        workspaceId: workspaceId,
        visibility: "PUBLIC",
        isPrivate: false,
        createdBy: userId,
        members: {
          create: {
            userId: userId,
          },
        },
      },
    });

    return {
      workspaceId: workspace.id,
      generalChannelId: generalChannel.id,
      workspaceSlug: workspace.slug,
      skippedWorkspace: false,
    };
  });
};
