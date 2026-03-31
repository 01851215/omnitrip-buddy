import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AuthGuard } from "./components/auth/AuthGuard";
import { ScreenLoader } from "./components/ui/Spinner";
import { OnboardingScreen } from "./screens/OnboardingScreen";

const HomeScreen = lazy(() => import("./screens/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const PlanningScreen = lazy(() => import("./screens/PlanningScreen").then((m) => ({ default: m.PlanningScreen })));
const CalendarScreen = lazy(() => import("./screens/CalendarScreen").then((m) => ({ default: m.CalendarScreen })));
const BudgetScreen = lazy(() => import("./screens/BudgetScreen").then((m) => ({ default: m.BudgetScreen })));
const FootprintsScreen = lazy(() => import("./screens/FootprintsScreen").then((m) => ({ default: m.FootprintsScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const DestinationDetailScreen = lazy(() => import("./screens/DestinationDetailScreen").then((m) => ({ default: m.DestinationDetailScreen })));
const ResetPasswordScreen = lazy(() => import("./screens/ResetPasswordScreen").then((m) => ({ default: m.ResetPasswordScreen })));
const OAuthCallbackScreen = lazy(() => import("./screens/OAuthCallbackScreen").then((m) => ({ default: m.OAuthCallbackScreen })));

function LazyScreen({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ScreenLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <OnboardingScreen />,
  },
  {
    path: "/reset-password",
    element: <LazyScreen><ResetPasswordScreen /></LazyScreen>,
  },
  {
    path: "/auth/calendar/callback",
    element: <LazyScreen><OAuthCallbackScreen /></LazyScreen>,
  },
  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { path: "/home", element: <LazyScreen><HomeScreen /></LazyScreen> },
      { path: "/plan", element: <LazyScreen><PlanningScreen /></LazyScreen> },
      { path: "/calendar", element: <LazyScreen><CalendarScreen /></LazyScreen> },
      { path: "/budget", element: <LazyScreen><BudgetScreen /></LazyScreen> },
      { path: "/footprints", element: <LazyScreen><FootprintsScreen /></LazyScreen> },
      { path: "/profile", element: <LazyScreen><ProfileScreen /></LazyScreen> },
      { path: "/destination/:id", element: <LazyScreen><DestinationDetailScreen /></LazyScreen> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
