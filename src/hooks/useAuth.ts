import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";
import {
  signIn as authSignIn,
  signOut as authSignOut,
  signUpSchool as authSignUpSchool,
  fetchUserRoles,
  fetchCurrentProfile,
  UserRoleRecord,
  AuthUser,
  SchoolSignupPayload,
} from "@/lib/auth";
import type { Portal } from "@/app/shared";

export type { UserRoleRecord, AuthUser, SchoolSignupPayload };

const ACTIVE_ROLE_STORAGE_KEY = "school-platform-active-context";
const ROLE_PRIORITY: UserRoleRecord["role"][] = ["super_admin", "school_admin", "teacher", "parent", "student"];

type StoredRoleContext = {
  role: UserRoleRecord["role"];
  schoolId: string | null;
};

function readStoredRoleContext(): StoredRoleContext | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRoleContext>;
    if (typeof parsed.role !== "string") return null;
    return {
      role: parsed.role as UserRoleRecord["role"],
      schoolId: typeof parsed.schoolId === "string" ? parsed.schoolId : null,
    };
  } catch {
    return null;
  }
}

function persistRoleContext(role: string | null, schoolId: string | null) {
  try {
    if (!role) {
      window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, JSON.stringify({ role, schoolId }));
  } catch {
    // Ignore localStorage failures and continue with in-memory auth state.
  }
}

function pickInitialRoleContext(roles: UserRoleRecord[]): Pick<AuthState, "activeRole" | "activeSchoolId"> {
  if (!roles.length) {
    return { activeRole: null, activeSchoolId: null };
  }

  const stored = readStoredRoleContext();
  const storedMatch = stored
    ? roles.find((role) => role.role === stored.role && (role.school_id ?? null) === stored.schoolId)
    : null;

  const chosenRole = storedMatch ?? [...roles].sort((left, right) => {
    const leftPriority = ROLE_PRIORITY.indexOf(left.role);
    const rightPriority = ROLE_PRIORITY.indexOf(right.role);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    if (left.school_id && !right.school_id) return -1;
    if (!left.school_id && right.school_id) return 1;
    return (left.school_id ?? "").localeCompare(right.school_id ?? "");
  })[0];

  return {
    activeRole: chosenRole.role,
    activeSchoolId: chosenRole.school_id ?? null,
  };
}

export interface AuthState {
  user: AuthUser | null;
  roles: UserRoleRecord[];
  activeRole: string | null;     // the role the user is currently operating as
  activeSchoolId: string | null; // the school currently in context
  loading: boolean;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>;
  signUpSchool: (payload: SchoolSignupPayload) => Promise<string | null>;
  signOut: () => Promise<void>;
  setActiveRole: (role: string, schoolId: string | null) => void;
  /** Derive the portal name from the active role */
  portal: Portal;
}

function roleToPortal(role: string | null): Portal {
  switch (role) {
    case "super_admin":  return "super-admin";
    case "school_admin": return "school-admin";
    case "teacher":      return "teacher";
    case "student":      return "student";
    case "parent":       return "parent";
    default:             return "login";
  }
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    roles: [],
    activeRole: null,
    activeSchoolId: null,
    loading: true,
    error: null,
  });

  const loadUserData = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const [profile, roles] = await Promise.all([
        fetchCurrentProfile(),
        fetchUserRoles(),
      ]);
      if (!profile) {
        persistRoleContext(null, null);
        setState({ user: null, roles: [], activeRole: null, activeSchoolId: null, loading: false, error: null });
        return;
      }

      if (profile.is_active === false) {
        await authSignOut();
        persistRoleContext(null, null);
        setState({ user: null, roles: [], activeRole: null, activeSchoolId: null, loading: false, error: "Your account is inactive. Contact your administrator." });
        return;
      }

      if (!roles.length) {
        persistRoleContext(null, null);
        setState({
          user: profile,
          roles: [],
          activeRole: null,
          activeSchoolId: null,
          loading: false,
          error: "No active school access is available for this account.",
        });
        return;
      }

      const { activeRole, activeSchoolId } = pickInitialRoleContext(roles);
      persistRoleContext(activeRole, activeSchoolId);

      setState({ user: profile, roles, activeRole, activeSchoolId, loading: false, error: null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: String(e) }));
    }
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) loadUserData();
      else setState(s => ({ ...s, loading: false }));
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadUserData();
      if (event === "SIGNED_OUT") {
        persistRoleContext(null, null);
        setState({ user: null, roles: [], activeRole: null, activeSchoolId: null, loading: false, error: null });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const err = await authSignIn(email, password);
    if (err) return err;
    await loadUserData();
    return null;
  }, [loadUserData]);

  const signUpSchool = useCallback(async (payload: SchoolSignupPayload) => {
    const signupError = await authSignUpSchool(payload);
    if (signupError) return signupError;

    const loginError = await authSignIn(payload.admin_email, payload.admin_password);
    if (loginError) return loginError;

    await loadUserData();
    return null;
  }, [loadUserData]);

  const doSignOut = useCallback(async () => {
    await authSignOut();
  }, []);

  const setActiveRole = useCallback((role: string, schoolId: string | null) => {
    persistRoleContext(role, schoolId);
    setState(s => ({ ...s, activeRole: role, activeSchoolId: schoolId }));
  }, []);

  return {
    ...state,
    signIn,
    signUpSchool,
    signOut: doSignOut,
    setActiveRole,
    portal: state.loading
      ? "login"
      : state.user
        ? (state.activeRole ? roleToPortal(state.activeRole) : "login")
        : "login",
  };
}
