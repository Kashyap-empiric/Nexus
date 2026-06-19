"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../schemas/auth";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/config/url";
import { useSearchParams } from "next/navigation";

export const LoginForm = () => {
  const { login, loginWithGithub, isLoading, error } = useAuth();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const needsConfirmation = searchParams.get("confirm") === "true";
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border border-border/40 shadow-lg bg-card/50 backdrop-blur-xl sm:rounded-2xl relative overflow-hidden">
        {/* Subtle top gradient line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
        
        <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-8">
          <CardTitle className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-center text-foreground">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
            Enter your email and password to sign in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 sm:px-8">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 bg-background/50 hover:bg-background border-border/50 transition-all duration-200"
            onClick={loginWithGithub}
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Sign in with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-medium">
              <span className="bg-card px-3 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {registered && (
              <div className={`p-3 text-sm font-medium rounded-lg border ${needsConfirmation
                ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800"
                : "text-brand bg-brand/10 border-brand/20"
                }`}>
                {needsConfirmation
                  ? "Account created! Please check your email to confirm your account before signing in."
                  : "Account created successfully! You can now sign in."}
              </div>
            )}

            {error && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-lg border border-destructive/20 animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="identifier" className={errors.identifier ? "text-destructive" : "text-foreground/80 font-medium"}>
                Email or username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="you@example.com or username"
                className="h-11 bg-background/50 focus:bg-background transition-colors"
                {...register("identifier")}
                aria-invalid={!!errors.identifier}
              />
              {errors.identifier && <p className="text-xs font-medium text-destructive mt-1">{errors.identifier.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={errors.password ? "text-destructive" : "text-foreground/80 font-medium"}>
                  Password <span className="text-destructive">*</span>
                </Label>
                <Link href="/forgot-password" className="text-xs font-medium text-brand hover:text-brand-muted hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 bg-background/50 focus:bg-background transition-colors pr-10"
                  {...register("password")}
                  aria-invalid={!!errors.password}
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
              {errors.password && <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium shadow-sm hover:shadow transition-all mt-2" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/40 p-5 sm:p-6 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href={APP_ROUTES.AUTH.REGISTER} className="font-semibold text-brand hover:text-brand-muted hover:underline transition-colors">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

