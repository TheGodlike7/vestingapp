import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { CreateProjectModal } from "./CreateProjectModal.tsx";
import CreateOrganization from "./CreateOrganization.tsx";
import { useSubscription } from "./useSubscription.ts";
import {
  Zap,
  FolderOpen,
  ChevronDown,
  CreditCard,
  KeyRound,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.tsx";
import type { User } from "@supabase/supabase-js";

type Project = {
  id: string;
  owner_id: string;
  project_name: string;
  token_mint: string;
  token_symbol: string;
  created_at: string;
};

export function AdminDashboard() {
  const { publicKey } = useWallet();

  const [user, setUser] = useState<User | null>(null);
  const userId = user?.id || null;

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [organization, setOrganization] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const fetchProjects = async (userId: string) => {
    const { data } = await supabase
      .from("vesting_projects")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (data) setProjects(data);
  };

  useEffect(() => {
    if (!publicKey) return;
    const fetchOrganization = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", publicKey.toBase58())
        .limit(1)
        .single();

      if (data) setOrganization(data);
    };
    fetchOrganization();
  }, [publicKey]);

  const { isActive, loading: subLoading, canCreate } = useSubscription(userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
      } else {
        setUser(session.user);
        fetchProjects(session.user.id);
        setLoading(false);
      }
    });
  }, []);

  // 🔥 STEP 4 (CORRECT POSITION)
  if (!loading && !organization) {
    return (
      <CreateOrganization
        onCreated={() => {
          if (!publicKey) return;
          const fetchOrganization = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", publicKey.toBase58())
      .limit(1)
      .single();

    if (data) setOrganization(data);
  };

  fetchOrganization();
        }}
      />
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Vesting<span className="gradient-text">App</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground hover:border-[hsl(var(--primary))] transition-all text-sm"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block">Account</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] glass-card rounded-xl border border-[hsl(265_40%_20%)] min-w-55 z-50 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-purple)" }}
                >
                  <div className="px-4 py-3 border-b border-[hsl(265_40%_20%/0.5)]">
                    <p className="text-xs text-muted-foreground mb-1">
                      Signed in as
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  {[
                    {
                      label: "Manage Subscription",
                      icon: CreditCard,
                      action: () => (window.location.href = "/subscription"),
                    },
                    {
                      label: "Change Password",
                      icon: KeyRound,
                      action: () => (window.location.href = "/reset-password"),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.action();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-[hsl(265_44%_15%/0.6)] transition-colors border-b border-[hsl(265_40%_20%/0.3)] text-left"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => (window.location.href = "/analytics")}
                    className="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white"
                  >
                    Analytics →
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[hsl(0_84%_60%)] hover:bg-[hsl(0_84%_60%/0.1)] transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-9">
          <h1 className="font-display text-3xl md:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Manage your vesting projects and schedules
          </p>
        </div>

        {/* Subscription Warning */}
        {!subLoading && !isActive && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(0_84%_60%/0.3)] bg-[hsl(0_84%_60%/0.08)] mb-8">
            <div>
              <p className="font-semibold text-[hsl(0_84%_60%)] text-sm">
                ⚠️ No Active Subscription
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Subscribe to create projects and manage vesting schedules
              </p>
            </div>
            <button
              onClick={() => (window.location.href = "/subscription")}
              className="btn-primary px-5 py-2 rounded-xl text-sm font-bold text-white whitespace-nowrap"
            >
              Subscribe Now →
            </button>
          </div>
        )}

        {/* Projects Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Your Projects
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* ✅ Step 2 enforcement ONLY (logic preserved) */}
            <button
              onClick={() => {
                if (!canCreate) {
                  window.location.href = "/subscription";
                } else {
                  setShowCreateModal(true);
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                canCreate
                  ? "btn-primary text-white"
                  : "border border-[hsl(265_40%_20%)] text-muted-foreground cursor-not-allowed"
              }`}
            >
              {canCreate ? "+ New Project" : "🔒 Subscribe to Create"}
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-[hsl(var(--primary))]" />
              </div>
              <p className="text-foreground font-medium mb-1">
                No projects yet
              </p>
              <p className="text-muted-foreground text-sm">
                Create your first vesting project to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center shrink-0">
                      <FolderOpen className="w-5 h-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {project.project_name}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {project.token_symbol} •{" "}
                        {project.token_mint.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <button
                    className="manage-btn text-sm"
                    onClick={() =>
                      (window.location.href = `/project/${project.id}`)
                    }
                  >
                    Manage →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && user && (
        <CreateProjectModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            if (user) fetchProjects(user.id);
          }}
        />
      )}
    </div>
  );
}
