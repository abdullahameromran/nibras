import App from "./App";

function normalizePath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function isDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isAuthAppPath(pathname: string) {
  return pathname === "/signup" || pathname === "/login" || pathname === "/reset" || isDashboardPath(pathname);
}

export default function EmptyRoot() {
  const pathname = normalizePath(window.location.pathname);

  if (pathname === "/") {
    return <main className="min-h-screen bg-white" />;
  }

  if (isAuthAppPath(pathname)) {
    return <App />;
  }

  return <main className="min-h-screen bg-white" />;
}
