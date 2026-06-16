import { useState, useRef } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { uploadAvatar } from "@/shared/lib/upload";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { UserAvatar } from "@/shared/components/ui/user-avatar";

interface SetupProfileStepProps {
  onContinue: (data: { fullName: string; bio: string; avatarFile: File | null }) => void;
  initialData?: { fullName: string; bio: string; avatarFile: File | null };
}

export function SetupProfileStep({ onContinue, initialData }: SetupProfileStepProps) {
  const user = useUser();
  const [fullName, setFullName] = useState(initialData?.fullName || user?.user_metadata?.full_name || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(initialData?.avatarFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim()) {
      onContinue({ fullName: fullName.trim(), bio: bio.trim(), avatarFile });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Set up your profile</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Welcome to Nexus! Let's get to know you better.</p>
      </div>

      <div className="bg-card border shadow-sm rounded-xl p-6 space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border bg-muted flex items-center justify-center hover:opacity-90 transition-opacity">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-muted-foreground group-hover:scale-110 transition-transform" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-sm">Profile Picture</h3>
            <p className="text-xs text-muted-foreground">Click to upload (optional)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About Me (optional)</Label>
            <Textarea
              id="bio"
              placeholder="Tell your team a little about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="resize-none h-24 bg-background"
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!fullName.trim()}
        className="w-full h-11 text-base font-medium"
      >
        Continue
      </Button>
    </form>
  );
}
