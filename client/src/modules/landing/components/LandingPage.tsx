"use client";
/* eslint-disable no-restricted-syntax */

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Hash,
  Lock,
  MessageSquare,
  Zap,
  Shield,
  CheckCircle2,
  ChevronRight,
  MonitorSmartphone,
  Layers,
  Search
} from "lucide-react";
import { APP_ROUTES } from "@/config/url";



const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
  }),
};



const ApplicationMockup = () => (
  <div className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
    {}
    <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-950">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-zinc-800" />
        <div className="w-3 h-3 rounded-full bg-zinc-800" />
        <div className="w-3 h-3 rounded-full bg-zinc-800" />
      </div>
      <div className="mx-auto h-6 w-64 bg-zinc-900 rounded-md flex items-center px-2 border border-zinc-800">
        <Search className="w-3 h-3 text-zinc-500" />
      </div>
    </div>
    
    {}
    <div className="flex h-[400px] md:h-[500px]">
      {}
      <div className="w-16 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
          <Image src="/images/Logo.png" alt="Logo" width={20} height={20} className="w-5 h-5 opacity-80" />
        </div>
        <div className="w-8 h-[2px] bg-zinc-800 rounded-full" />
        <div className="w-10 h-10 rounded-full bg-zinc-800 relative cursor-pointer">
          <div className="absolute -left-3 top-2 bottom-2 w-1 bg-zinc-100 rounded-r-md" />
        </div>
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800" />
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800" />
      </div>

      {}
      <div className="hidden md:flex w-60 bg-zinc-900/50 border-r border-zinc-800 flex-col py-3">
        <div className="px-4 mb-4 flex items-center justify-between">
          <span className="font-semibold text-zinc-100">Militech Corp</span>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="px-2 space-y-0.5">
          <div className="px-2 py-1 text-xs font-semibold text-zinc-500 mb-1">PUBLIC CHANNELS</div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
            <Hash className="w-4 h-4" /> <span className="font-medium text-sm">general</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-400">
            <Hash className="w-4 h-4" /> <span className="text-sm">training</span>
          </div>
        </div>
        <div className="px-2 mt-4 space-y-0.5">
          <div className="px-2 py-1 text-xs font-semibold text-zinc-500 mb-1">DIRECT MESSAGES</div>
          {["alice", "bob", "johndoe"].map((name, i) => (
            <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-400">
              <div className="relative w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                {name[0].toUpperCase()}
                {i !== 1 && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-zinc-900" />}
              </div>
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="flex-1 bg-zinc-950 flex flex-col">
        <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold">
            <Hash className="w-5 h-5 text-zinc-500" /> general
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-zinc-100">alice</span>
                <span className="text-xs text-zinc-500">11:30 AM</span>
              </div>
              <p className="text-zinc-300 text-sm mt-0.5">hello ✓</p>
            </div>
          </div>
          <div className="flex gap-3 mt-auto">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-zinc-100">You</span>
              </div>
              <div className="mt-2 border border-zinc-800 rounded-lg p-2 bg-zinc-900/50 flex flex-col gap-2">
                <div className="flex gap-2 text-zinc-500 border-b border-zinc-800 pb-2">
                  <div className="w-4 h-4 rounded bg-zinc-700" />
                  <div className="w-4 h-4 rounded bg-zinc-700" />
                  <div className="w-4 h-4 rounded bg-zinc-700" />
                </div>
                <span className="text-zinc-500 text-sm">Message #general...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);



export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/Logo.png" alt="Nexus Logo" width={24} height={24} className="w-6 h-6 object-contain" />
            <span className="font-bold text-lg tracking-tight">Nexus</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="#features" className="hover:text-zinc-100 transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</Link>
            <Link href="#security" className="hover:text-zinc-100 transition-colors">Security</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href={APP_ROUTES.AUTH.LOGIN} className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href={APP_ROUTES.AUTH.REGISTER} className="hidden sm:inline-flex h-9 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative max-w-4xl mx-auto text-center z-10">

            
            <motion.h1 custom={0.1} initial="hidden" animate="visible" variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Where teams <span className="text-emerald-400">move faster.</span>
            </motion.h1>
            
            <motion.p custom={0.2} initial="hidden" animate="visible" variants={fadeUp} className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Chat, collaborate, and build together in one unified workspace. The clean, developer-friendly alternative to bloated enterprise tools.
            </motion.p>
            
            <motion.div custom={0.3} initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link href={APP_ROUTES.AUTH.REGISTER} className="w-full sm:w-auto h-12 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-8 text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors">
                Get Started Free
              </Link>
              <Link href="#demo" className="w-full sm:w-auto h-12 inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-8 text-base font-medium text-zinc-100 hover:bg-zinc-900 transition-colors">
                Book Demo
              </Link>
            </motion.div>
          </div>

          <motion.div custom={0.4} initial="hidden" animate="visible" variants={fadeUp} className="relative z-20 px-4 md:px-0">
            <ApplicationMockup />
          </motion.div>
        </section>


        {}
        <section id="features" className="py-32 px-6">
          <div className="max-w-6xl mx-auto space-y-32">
            
            {}
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Real-time messaging that actually feels real-time.</h2>
                <p className="text-lg text-zinc-400">
                  Built on a robust WebSocket infrastructure, messages, typing indicators, and presence status are delivered instantly. No polling, no lag, just flow.
                </p>
                <ul className="space-y-3 pt-4">
                  {["Instant message delivery", "Live typing indicators", "Online/Offline presence", "Read receipts"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-3xl" />
                 {}
                 <div className="space-y-4">
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-zinc-800" />
                     <div className="bg-zinc-800 rounded-lg p-3 w-3/4">
                       <div className="w-1/2 h-2 bg-zinc-700 rounded mb-2" />
                       <div className="w-full h-2 bg-zinc-700 rounded" />
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-zinc-800" />
                     <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 w-1/2">
                       typing...
                     </div>
                   </div>
                 </div>
              </div>
            </div>

            {}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
              <div className="flex-1 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Hash className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Organized channels and workspaces.</h2>
                <p className="text-lg text-zinc-400">
                  Keep conversations contextual. Create public channels for team-wide announcements, private channels for sensitive projects, and direct messages for everything else.
                </p>
                <ul className="space-y-3 pt-4">
                  {["Public & Private Channels", "Direct Messages (1:1 & Groups)", "Threaded conversations", "Pinned messages"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative">
                 <div className="w-full border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
                   <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                     <span className="text-sm font-medium">Channels</span>
                   </div>
                   <div className="p-2 space-y-1">
                     <div className="px-2 py-1.5 bg-emerald-500/10 text-emerald-400 rounded flex items-center gap-2 text-sm"><Hash className="w-4 h-4"/> general</div>
                     <div className="px-2 py-1.5 text-zinc-400 rounded flex items-center gap-2 text-sm"><Hash className="w-4 h-4"/> engineering</div>
                     <div className="px-2 py-1.5 text-zinc-400 rounded flex items-center gap-2 text-sm"><Lock className="w-4 h-4"/> leadership</div>
                   </div>
                 </div>
              </div>
            </div>

            {}
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Enterprise-grade security by default.</h2>
                <p className="text-lg text-zinc-400">
                  Your data belongs to you. Nexus uses PostgreSQL Row-Level Security to ensure absolute isolation between workspaces. Security is enforced at the database layer, not just in application logic.
                </p>
                <ul className="space-y-3 pt-4">
                  {["Row-Level Security (RLS)", "Role-based access control", "Secure, single-use invite links", "Data encryption at rest"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                 <pre className="text-xs text-emerald-400 font-mono bg-zinc-950 p-4 rounded-lg border border-zinc-800 overflow-x-auto">
                   <code>
{`CREATE POLICY "Users can view workspace data"
ON messages
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);`}
                   </code>
                 </pre>
              </div>
            </div>

          </div>
        </section>

        {}
        <section className="py-24 px-6 bg-zinc-900/30 border-y border-zinc-800/50">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-16">Why switch to Nexus?</h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                <MessageSquare className="w-8 h-8 text-zinc-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Faster than email</h3>
                <p className="text-zinc-400 text-sm">Stop waiting for replies. Real-time presence and instant delivery keep your team moving at the speed of thought.</p>
              </div>
              <div className="p-6 bg-zinc-900 rounded-2xl border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <Layers className="w-8 h-8 text-emerald-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">More organized than chat</h3>
                <p className="text-zinc-400 text-sm">Chaotic group texts don&apos;t scale. Channels and threaded replies keep conversations strictly on-topic.</p>
              </div>
              <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                <MonitorSmartphone className="w-8 h-8 text-zinc-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Lighter than enterprise apps</h3>
                <p className="text-zinc-400 text-sm">No clunky interfaces or 10-second load times. Nexus is designed for developers who appreciate speed and simplicity.</p>
              </div>
            </div>
          </div>
        </section>

        {}
        <section id="pricing" className="py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-zinc-400">Start for free, upgrade when you need more power.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {}
              <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <div className="text-4xl font-bold mb-6">$0<span className="text-base font-normal text-zinc-500">/mo</span></div>
                <p className="text-sm text-zinc-400 mb-6">Perfect for small teams and hobby projects.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Unlimited messages</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> 1 Workspace</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Basic search</li>
                </ul>
                <Link href={APP_ROUTES.AUTH.REGISTER} className="w-full h-10 flex items-center justify-center rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors font-medium">Get Started</Link>
              </div>
              
              {}
              <div className="p-8 rounded-2xl border border-emerald-500 bg-zinc-900 relative shadow-2xl shadow-emerald-500/10 flex flex-col">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommended</div>
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-6">$8<span className="text-base font-normal text-zinc-500">/user/mo</span></div>
                <p className="text-sm text-zinc-400 mb-6">For growing businesses that need more control.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Unlimited Workspaces</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Role-based permissions</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Unlimited message history</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Guest accounts</li>
                </ul>
                <Link href={APP_ROUTES.AUTH.REGISTER} className="w-full h-10 flex items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors font-semibold">Start Free Trial</Link>
              </div>

              {}
              <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="text-4xl font-bold mb-6">Custom</div>
                <p className="text-sm text-zinc-400 mb-6">For large organizations with strict security needs.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Single Sign-On (SAML)</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Audit logs</li>
                  <li className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Dedicated support manager</li>
                </ul>
                <Link href="#contact" className="w-full h-10 flex items-center justify-center rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors font-medium">Contact Sales</Link>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-24 px-6 border-t border-zinc-800/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to bring your team together?</h2>
            <p className="text-xl text-zinc-400 mb-10">Join thousands of teams already using Nexus to communicate faster.</p>
            <Link href={APP_ROUTES.AUTH.REGISTER} className="h-14 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-10 text-lg font-bold text-zinc-950 hover:bg-emerald-400 transition-all hover:scale-105">
              Get Started for Free
            </Link>
          </div>
        </section>

      </main>

      {}
      <footer className="w-full py-12 px-6 border-t border-zinc-800/50 bg-zinc-950 text-zinc-500 text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6 text-zinc-100">
              <Image src="/images/Logo.png" alt="Nexus Logo" width={20} height={20} className="w-5 h-5 object-contain" />
              <span className="font-bold tracking-tight">Nexus</span>
            </div>
            <p className="max-w-xs">The modern team collaboration platform engineered for speed and simplicity.</p>
          </div>
          <div>
            <h4 className="text-zinc-100 font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Security</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-100 font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">API Reference</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-100 font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Nexus Systems Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-zinc-300">Privacy Policy</Link>
            <Link href="#" className="hover:text-zinc-300">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};