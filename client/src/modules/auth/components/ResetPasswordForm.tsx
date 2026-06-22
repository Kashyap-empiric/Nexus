"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES, API_ROUTES } from "@/config/url";
import { api } from "@/shared/lib/api";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .max(128, { message: "Password must be less than 128 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type VerifyState =
  | { status: "loading" }
  | { status: "valid"; email: string | null }
  | { status: "expired" }
  | { status: "error"; message: string };

export const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifyState, setVerifyState] = useState<VerifyState>({ status: "loading" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Verify the token on mount
  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVerifyState({ status: "expired" });
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const { data } = await api.get<{ valid: boolean; email?: string | null }>(
          `${API_ROUTES.AUTH.RESET_PASSWORD_VERIFY}?token=${encodeURIComponent(token)}`,
        );

        if (cancelled) return;

        if (data.valid) {
          setVerifyState({ status: "valid", email: data.email ?? null });
        } else {
          setVerifyState({ status: "expired" });
        }
      } catch {
        if (!cancelled) {
          setVerifyState({
            status: "error",
            message: "Something went wrong validating your reset link. Please try again.",
          });
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      await api.post(API_ROUTES.AUTH.RESET_PASSWORD_COMPLETE, {
        token,
        newPassword: data.password,
      });

      setSuccess(true);

      setTimeout(() => {
        router.push(`${APP_ROUTES.AUTH.LOGIN}?passwordReset=true`);
      }, 1500);
    } catch (err: unknown) {
      // Axios errors have the server message in response.data.error
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.error ||
        (err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // State: no token in URL
  if (!token) {
    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
          <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
            <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
              Invalid link
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
              No reset token found in the URL. Use the link from your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center px-6 sm:px-8 pb-6">
            <Link
              href={APP_ROUTES.AUTH.FORGOT_PASSWORD}
              className="inline-flex items-center justify-center w-full h-11 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors shadow-sm"
            >
              Request new link
            </Link>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 p-5 sm:p-6 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              <Link
                href={APP_ROUTES.AUTH.LOGIN}
                className="font-semibold text-brand hover:text-brand-muted hover:underline transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // State: verifying token
  if (verifyState.status === "loading") {
    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
          <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
            <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
              Reset your password
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
              Validating your reset link...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8 px-6 sm:px-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // State: verification error
  if (verifyState.status === "error") {
    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
          <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
            <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
              Something went wrong
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
              {verifyState.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center px-6 sm:px-8 pb-6">
            <Link
              href={APP_ROUTES.AUTH.FORGOT_PASSWORD}
              className="inline-flex items-center justify-center w-full h-11 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors shadow-sm"
            >
              Request new link
            </Link>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 p-5 sm:p-6 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              <Link
                href={APP_ROUTES.AUTH.LOGIN}
                className="font-semibold text-brand hover:text-brand-muted hover:underline transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // State: token expired or invalid
  if (verifyState.status === "expired") {
    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
          <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
            <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
              Link expired
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
              This password reset link is no longer valid. Request a new one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center px-6 sm:px-8 pb-6">
            <Link
              href={APP_ROUTES.AUTH.FORGOT_PASSWORD}
              className="inline-flex items-center justify-center w-full h-11 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors shadow-sm"
            >
              Request new link
            </Link>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 p-5 sm:p-6 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              <Link
                href={APP_ROUTES.AUTH.LOGIN}
                className="font-semibold text-brand hover:text-brand-muted hover:underline transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // State: valid token — show password form
  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
        <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
          <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
            Reset your password
          </CardTitle>
          {verifyState.email && (
            <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
              For <strong>{verifyState.email}</strong>
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-5 px-6 sm:px-8">
          {success ? (
            <div className="p-4 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md dark:text-green-300 dark:bg-green-950/30 dark:border-green-800 text-center">
              ✓ Password updated successfully! Redirecting to sign in...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password" className={errors.password ? "text-destructive" : "text-foreground/80 font-medium"}>
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-destructive" : "text-foreground/80 font-medium"}>
                  Confirm new password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs font-medium text-destructive mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating password..." : "Reset password"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 p-5 sm:p-6 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            <Link
              href={APP_ROUTES.AUTH.LOGIN}
              className="font-semibold text-brand hover:text-brand-muted hover:underline transition-colors"
            >
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
