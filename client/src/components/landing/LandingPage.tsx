import Link from "next/link";
import { MessageSquare, Zap, Shield, LayoutDashboard } from "lucide-react";

export const LandingPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-emerald-500/30">
      
      {/* Navigation Bar */}
      <header className="px-6 lg:px-12 h-16 flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center shadow-sm">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Nexus</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-colors bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm"
            href="/register"
          >
            Sign up
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 flex flex-col items-center justify-center px-4 md:px-6 text-center border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20">
          <div className="max-w-4xl space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              A better way to communicate <br className="hidden sm:block" />
              with your team.
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Nexus provides secure, organized, and real-time messaging for professionals. Keep your conversations focused and your data protected.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md bg-emerald-600 px-8 text-base font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Get Started
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 text-base font-medium shadow-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Designed for productivity</h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                Everything you need to manage team communications effectively, without the unnecessary clutter.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col space-y-4 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold">Real-time Messaging</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Powered by WebSockets, messages are delivered instantly. Say goodbye to refreshing pages.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col space-y-4 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold">Enterprise Security</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Built on Supabase Auth with strict row-level security. Your data belongs to your organization alone.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col space-y-4 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold">Clean Interface</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  A minimal, distraction-free environment that helps your team focus on the work that matters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Ready to improve your workflow?</h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
              Join thousands of teams already using Nexus to communicate securely.
            </p>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md bg-emerald-600 px-8 text-base font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Create a free account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            Nexus
          </div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms</Link>
          </div>
          <p>
            © {new Date().getFullYear()} Nexus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
