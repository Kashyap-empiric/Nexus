"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Shield, ShieldCheck, User as UserIcon, UserX } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WorkspaceRole } from "../types/workspace";

/* ─── Shared constants ─────────────────────────────────── */

export const ROLE_BADGE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ADMIN: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MEMBER: "bg-muted text-muted-foreground",
};

const ROLE_ICONS: Record<WorkspaceRole, typeof Shield> = {
  OWNER: ShieldCheck,
  ADMIN: Shield,
  MEMBER: UserIcon,
};

const ROLE_OPTIONS: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"];

/* ─── Props ──────────────────────────────────────────────── */

interface CustomRoleDropdownProps {
  role: WorkspaceRole;
  memberId: string;
  memberUsername: string;
  canPromote: boolean;
  onRoleChange: (userId: string, role: WorkspaceRole) => void;
  onRemove: (userId: string) => void;
  onPromote: (userId: string, username: string) => void;
}

/* ─── Component ──────────────────────────────────────────── */

export function CustomRoleDropdown({
  role,
  memberId,
  memberUsername,
  canPromote,
  onRoleChange,
  onRemove,
  onPromote,
}: CustomRoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  // Measure and position on open
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const measure = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      }
    };

    measure();
    // Re-measure on scroll/resize in case the dialog moved
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [isOpen]);

  // Click outside + escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isTrigger = triggerRef.current?.contains(target);
      const isPanel = panelRef.current?.contains(target);
      if (!isTrigger && !isPanel) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    // Use rAF delay so the same mousedown that opened doesn't immediately close
    const raf = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const RoleIcon = ROLE_ICONS[role];

  const availableOptions = ROLE_OPTIONS.filter(
    (r) => r !== role && (r !== "OWNER" || canPromote)
  );

  const handleSelect = (newRole: WorkspaceRole) => {
    setIsOpen(false);
    if (newRole === "OWNER") {
      onPromote(memberId, memberUsername);
    } else {
      onRoleChange(memberId, newRole);
    }
  };

  const handleRemove = () => {
    setIsOpen(false);
    onRemove(memberId);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none",
          ROLE_BADGE_STYLES[role]
        )}
      >
        <RoleIcon className="h-3.5 w-3.5 shrink-0" />
        {role}
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-60 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            className="fixed z-[9999] min-w-[180px] rounded-lg bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
            style={{
              top: position.top,
              right: position.right,
            }}
          >
            {availableOptions.map((r) => {
              const Icon = ROLE_ICONS[r];
              return (
                <button
                  key={r}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="pt-[1px]">
                    {r === "OWNER"
                      ? "Promote to Owner"
                      : `Make ${r.charAt(0) + r.slice(1).toLowerCase()}`}
                  </span>
                </button>
              );
            })}
            <div className="-mx-1 my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              onClick={handleRemove}
              className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <UserX className="h-4 w-4 shrink-0" />
              <span className="pt-[1px]">Remove</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
