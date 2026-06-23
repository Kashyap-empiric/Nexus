"use client";

import { useState } from "react";
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
import { api } from "@/shared/lib/api";
import { friendlyAuthError } from "../hooks/useAuth";
import Link from "next/link";
import { APP_ROUTES, API_ROUTES } from "@/config/url";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post(API_ROUTES.AUTH.FORGOT_PASSWORD, { email: data.email });
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
        <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
          <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6 sm:px-8">
          {error && (
            <div className="p-4 text-sm font-medium text-destructive bg-destructive/10 border-destructive/20 rounded-md">
              {error}
            </div>
          )}
          {sent ? (
            <div className="p-4 text-sm font-medium text-brand bg-brand/10 border border-brand/20 rounded-md text-center">
              ✓ Reset link sent to <strong>{getValues("email")}</strong>. Check
              your inbox (and spam folder).
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80 font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending link..." : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 p-5 sm:p-6 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href={APP_ROUTES.AUTH.LOGIN}
              className="font-semibold text-brand hover:text-brand-muted hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
