"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/modules/users/hooks/useProfile";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { UserAvatar } from "@/shared/components/ui/user-avatar";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  displayName: z.string().max(50).nullable().optional(),
  avatarUrl: z
    .string()
    .url("Must be a valid URL")
    .nullable()
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfileSettings = () => {
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      avatarUrl: "",
    },
  });

  const avatarUrl = watch("avatarUrl");

  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username || "",
        displayName: profile.displayName || "",
        avatarUrl: profile.avatarUrl || "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile({
        ...data,
        avatarUrl: data.avatarUrl || null,
        displayName: data.displayName || null,
      });
      toast.success("Profile updated successfully");
      reset(data); // Reset form with new values to clear dirty state
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-1/4 bg-muted rounded"></div>
        <div className="h-4 w-1/2 bg-muted rounded"></div>
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on Nexus.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-6">
          <UserAvatar
            name={profile?.displayName || profile?.username || "You"}
            src={avatarUrl || profile?.avatarUrl || undefined}
            className="h-20 w-20 text-xl"
          />
          <div className="space-y-1 flex-1">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              placeholder="https://example.com/avatar.png"
              {...register("avatarUrl")}
            />
            {errors.avatarUrl && (
              <p className="text-sm text-destructive">
                {errors.avatarUrl.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email || ""}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email address cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="How should we call you?"
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Label>Direct Message Invite Link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/dm/${profile?.username}`
                    : ""
                }
                className="bg-muted/50 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (typeof window !== "undefined" && profile?.username) {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/dm/${profile.username}`,
                    );
                    toast.success("Invite link copied to clipboard");
                  }
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with others so they can easily start a direct
              message with you.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};
