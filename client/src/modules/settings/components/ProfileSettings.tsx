"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile, useUpdateAvatar } from "@/modules/users/hooks/useProfile";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { uploadAvatarAndGetUrl, deleteAvatar } from "@/shared/lib/upload";
import { Camera, Trash, Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { useInviteLink } from "@/modules/invites/hooks/useInviteLink";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  fullName: z.string().max(80).nullable().optional(),
  bio: z.string().max(160).nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfileSettings = () => {
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();
  const { mutateAsync: updateAvatar } = useUpdateAvatar();
  const { inviteUrl, isLoading: isInviteLoading, generate } = useInviteLink();
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);

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
      fullName: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username || "",
        fullName: profile.fullName || "",
        bio: profile.bio || "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsUploading(true);
      
      let newAvatarUrl: string | null = profile!.avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatarAndGetUrl(profile!.id, avatarFile);
      } else if (isAvatarRemoved) {
        newAvatarUrl = null;
      }
      
      if (newAvatarUrl !== profile!.avatarUrl) {
        await updateAvatar(newAvatarUrl);
        if (profile!.avatarUrl) {
          await deleteAvatar(profile!.avatarUrl);
        }
      }

      await updateProfile({
        ...data,
        fullName: data.fullName || null,
        bio: data.bio || null,
      });
      
      toast.success("Profile updated successfully");
      
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsAvatarRemoved(false);
      reset({ ...data, fullName: data.fullName || "", bio: data.bio || "" }); 
    } catch (error: any) {
      if (error.status === 409) {
        toast.error("Username is already taken. Please choose another one.");
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setIsAvatarRemoved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsAvatarRemoved(true);
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

      <div className="flex items-center gap-6 pb-2">
        <div className="relative group">
          <UserAvatar 
            name={profile?.username || "ME"}
            src={isAvatarRemoved ? null : (avatarPreview || profile?.avatarUrl)}
            className="h-24 w-24 text-2xl" 
          />
          <button 
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp" 
            onChange={handleFileChange}
          />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Profile Picture</h4>
          <p className="text-xs text-muted-foreground max-w-[250px]">
            JPG, GIF or PNG. 5MB max.
          </p>
          {profile?.avatarUrl && (
            <Button variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={isUploading} className="mt-2 text-destructive hover:text-destructive">
              <Trash className="h-4 w-4 mr-2" />
              Remove Picture
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="What is your full name?"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us a little bit about yourself"
              className="resize-none"
              {...register("bio")}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">
                {errors.bio.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {watch("bio")?.length || 0} / 160
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Direct Message Invite Link</Label>
            {inviteUrl ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="bg-muted/50 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl);
                      setIsInviteCopied(true);
                      toast.success("Invite link copied to clipboard");
                      setTimeout(() => setIsInviteCopied(false), 2000);
                    } catch {
                      toast.error("Failed to copy link");
                    }
                  }}
                >
                  {isInviteCopied ? (
                    <><Check className="h-4 w-4 mr-2 text-green-500" />Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" />Copy</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => generate("USER")}
                  disabled={isInviteLoading}
                  title="Generate new link"
                >
                  <RefreshCw className={`h-4 w-4 ${isInviteLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => generate("USER")}
                  disabled={isInviteLoading}
                >
                  {isInviteLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" />Generate Invite Link</>
                  )}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Share this link with others so they can easily start a direct
              message with you.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={(!isDirty && !avatarFile && !isAvatarRemoved) || isPending || isUploading}>
            {isPending || isUploading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};
