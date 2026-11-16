import { 
  Sparkles, 
  ChefHat, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Cpu, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

export default function About() {
  const pillars = [
    {
      icon: Sparkles,
      title: 'Google Gemini AI Recipes',
      description: 'Generates creative, personalized recipes using only what you have in stock, strictly structured via Zod schemas without hallucinated staples.',
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      icon: Clock,
      title: 'Expiry-First Intelligence',
      description: 'Prioritizes recipes that consume ingredients expiring today, tomorrow, or within 3 days to eliminate food waste proactively.',
      color: 'bg-red-50 text-red-700 border-red-200'
    },
    {
      icon: ShieldCheck,
      title: 'Strict Food Safety Guardrails',
      description: '122+ validated culinary ingredients with a strict rejection filter blocking rubber, plastic, chemicals, glass, and other non-edibles.',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      icon: Layers,
      title: 'Substitution & Servings Engine',
      description: 'One-click culinary substitutions with instant match recalculation, and proportional scaling for any number of dinner guests.',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      icon: ChefHat,
      title: 'Interactive Cooking Mode',
      description: 'Distraction-free step-by-step guidance, per-step countdown timers with audio alerts, and live ingredient checklists.',
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      icon: Cpu,
      title: 'Automated Leftover Tracking',
      description: 'Automatically calculates and deducts used quantities from your pantry upon cooking completion with confirmation safeguards.',
      color: 'bg-teal-50 text-teal-700 border-teal-200'
    }
  ];

  const techStack = [
    { name: 'React 19 & TypeScript', role: 'Frontend Architecture & Type Safety' },
    { name: 'Vite 8 & Tailwind CSS v4', role: 'Next-Gen Build Tooling & Modern Styling' },
    { name: 'Node.js & Express 5', role: 'RESTful API Services & Static SPA Hosting' },
    { name: 'Google Gemini GenAI SDK', role: 'Multimodal / Text Structured LLM Generation' },
    { name: 'Zod 4', role: 'Strict Schema Validation for AI Outputs' },
    { name: 'Render', role: 'Continuous Deployment & Cloud Hosting' }
  ];

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#244C3A] to-[#1B382B] text-white p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#D9E9A5]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9E9A5]/20 text-[#D9E9A5] text-xs font-semibold tracking-wide uppercase border border-[#D9E9A5]/30">
              <Sparkles className="w-3.5 h-3.5" />
              Kitchen Intelligence Platform
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Turn Ingredients into <span className="text-[#D9E9A5]">Inspiration.</span>
            </h1>

            <p className="text-[#A8BDA5] text-base md:text-lg leading-relaxed">
              <strong>IngrAIent</strong> answers the central everyday question: <strong>&ldquo;What can I cook with what I already have?&rdquo;</strong> By uniting intelligent pantry tracking with Google Gemini AI, IngrAIent transforms your available ingredients into delicious, waste-free home-cooked meals.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 bg-[#D9E9A5] text-[#244C3A] font-bold px-5 py-2.5 rounded-xl text-sm shadow hover:bg-[#cbe08e] transition-colors"
              >
                Start Cooking
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/NandanGanna/ingrAIent"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors border border-white/15"
              >
                <GithubIcon className="w-4 h-4" />
                GitHub Repository
                <ExternalLink className="w-3.5 h-3.5 text-white/60" />
              </a>
            </div>
          </div>

          <div className="w-32 h-32 md:w-44 md:h-44 shrink-0 rounded-full bg-[#D9E9A5] p-3 shadow-2xl flex items-center justify-center border-4 border-white/20">
            <img src="/logo.png" alt="IngrAIent Official Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* Mission & Problem Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#E7E9E1] shadow-sm space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
            The Problem
          </span>
          <h2 className="text-xl font-bold text-[#242A25]">
            Food Waste & Recipe Fatigue
          </h2>
          <p className="text-sm text-[#66756A] leading-relaxed">
            Billions of pounds of food are wasted annually simply because groceries sit unnoticed at the back of the pantry until they spoil. At the same time, finding recipes online usually demands trips to the supermarket for missing exotic ingredients.
          </p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#E7E9E1] shadow-sm space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            The Solution
          </span>
          <h2 className="text-xl font-bold text-[#242A25]">
            Expiry-Driven Inventory Intelligence
          </h2>
          <p className="text-sm text-[#66756A] leading-relaxed">
            IngrAIent tracks expiration dates in real time, alerting you when items need urgent use. It passes your pantry inventory directly to Google Gemini to synthesize structured recipes specifically designed to rescue ingredients before they go bad.
          </p>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#242A25] tracking-tight">
            Key Architecture & Features
          </h2>
          <p className="text-sm text-[#66756A]">
            Built with production-grade engineering, deterministic scoring, and strict safety guardrails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx} 
                className="bg-white p-5 rounded-2xl border border-[#E7E9E1] shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${pillar.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#242A25] text-base">
                  {pillar.title}
                </h3>
                <p className="text-xs text-[#66756A] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#E7E9E1] shadow-sm space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#242A25] tracking-tight">
            Technology Stack
          </h2>
          <p className="text-sm text-[#66756A]">
            Modern, type-safe full-stack ecosystem designed for high performance and reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {techStack.map((tech, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl bg-[#F8F7F1] border border-[#E7E9E1] flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-[#244C3A] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-[#242A25]">{tech.name}</div>
                <div className="text-xs text-[#66756A] mt-0.5">{tech.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment & Links */}
      <div className="bg-[#244C3A]/5 border border-[#244C3A]/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="font-bold text-[#242A25] flex items-center justify-center md:justify-start gap-2">
            <Globe className="w-4 h-4 text-[#244C3A]" />
            Hosted on Render Cloud
          </div>
          <p className="text-xs text-[#66756A]">
            Live single-origin web application with real-time AI recipe generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://ingraient.onrender.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#244C3A] text-white hover:bg-[#1e3f30] transition-colors"
          >
            Live Site
          </a>
          <a
            href="https://github.com/NandanGanna/ingrAIent"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white border border-[#E7E9E1] text-[#242A25] hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
