"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { ModeToggle } from "@/components/mode-toggle";
import { Menu, AlertTriangle, LogOut } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { Loader } from "@/components/ui/loader";
import { logout } from "@/lib/slices/authSlice";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Use the global auth state instead of local state.
  const user = useSelector((state: { auth: { user: any } }) => state.auth.user);
  const isLoggedIn = Boolean(user);

  // Reset loading state when the route changes
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  const handleLinkClick = (targetPath: string) => {
    // Don't set loading state if we're already on the target path
    // or if we're already in a loading state (prevents double-clicks)
    if (pathname !== targetPath && !loading) {
      setLoading(true);
    }
  };

  // Open the logout confirmation dialog
  const openLogoutDialog = () => {
    setShowLogoutDialog(true);
  };

  // Handle logout by calling the backend logout API and then dispatching the logout action
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Call the backend logout API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!response.ok) {
        console.warn("Backend logout failed with status:", response.status);
      }

      // Dispatch logout action regardless of API response
      dispatch(logout());
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
      // Still logout from frontend even if backend call fails
      dispatch(logout());
      router.push("/");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  // Base routes always visible.
  const routes = [
    // { href: "/", label: "Home" },
    { href: "/find", label: "Find Missing" },
    { href: "/report", label: "Report Missing" },
    { href: "/alerts", label: "Alerts" },
  ];

  // Add the dashboard route if the user is logged in.
  if (isLoggedIn) {
    routes.push({ href: "/dashboard", label: "Dashboard" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-primary shadow-md">
      <div className="container px-4 mx-auto flex h-16 items-center relative">
        {/* Mobile Logo - Always visible */}
        <div className="flex md:hidden items-center">
          <Link
            href="/"
            onClick={() => handleLinkClick("/")}
            className="flex items-center space-x-2"
          >
            <AlertTriangle className="h-5 w-5 text-primary-foreground" />
            <span className="text-lg font-bold text-primary-foreground">ABSENS</span>
          </Link>
        </div>

        {/* Mobile Navigation using a Sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden mr-auto ml-2">
            <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8 p-0 hover:bg-primary/80">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="bg-card text-card-foreground border-r border-border w-[250px] sm:w-[300px]"
          >
            <Link
              href="/"
              onClick={() => {
                setOpen(false);
                handleLinkClick("/");
              }}
              className="flex items-center space-x-2 mb-8"
            >
              <AlertTriangle className="h-6 w-6 text-foreground" />
              <span className="text-xl font-bold text-foreground">ABSENS</span>
            </Link>
            <nav className="flex flex-col gap-4">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => {
                    setOpen(false);
                    handleLinkClick(route.href);
                  }}
                  className={`text-lg font-medium transition-colors hover:text-foreground ${
                    pathname === route.href ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {route.label}
                </Link>
              ))}

              {/* Mobile Logout Button */}
              {isLoggedIn && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-4 text-sm"
                  onClick={() => {
                    setOpen(false);
                    openLogoutDialog();
                  }}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <div className="flex items-center gap-2">
                      <Loader size="sm" />
                      <span>Logging out...</span>
                    </div>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </>
                  )}
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center flex-1">
          <Link
            href="/"
            onClick={() => handleLinkClick("/")}
            className="mr-6 flex items-center space-x-2"
          >
            <AlertTriangle className="h-6 w-6 text-primary-foreground" />
            <span className="text-xl font-bold text-primary-foreground">ABSENS</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => handleLinkClick(route.href)}
                className={`transition-colors hover:text-primary-foreground ${
                  pathname === route.href ? "text-primary-foreground" : "text-primary-foreground/80"
                }`}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side: Notification Bell, Register or Logout button, plus ModeToggle */}
        <div className="flex items-center ml-auto space-x-2">
          {isLoggedIn && <NotificationBell />}
          {isLoggedIn ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={openLogoutDialog}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <div className="flex items-center gap-2">
                    <Loader size="sm" />
                    <span>Logging out...</span>
                  </div>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </>
                )}
              </Button>

              {/* Logout Confirmation Dialog */}
              <AlertDialog
                open={showLogoutDialog}
                onOpenChange={(open) => {
                  // Prevent closing the dialog while logging out
                  if (!isLoggingOut) {
                    setShowLogoutDialog(open);
                  }
                }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will need to login again to access your account and submit reports.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <div className="flex items-center gap-2">
                          <Loader size="sm" className="text-white" />
                          <span>Logging out...</span>
                        </div>
                      ) : (
                        "Logout"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs sm:text-sm"
              asChild
            >
              <Link href="/signup" onClick={() => handleLinkClick("/signup")}>
                Register
              </Link>
            </Button>
          )}
          <ModeToggle />
        </div>

        {/* Loader overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
            <Loader size="lg" overlay={true} />
          </div>
        )}
      </div>
    </header>
  );
}
