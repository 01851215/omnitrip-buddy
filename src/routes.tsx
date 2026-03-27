import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AuthGuard } from "./components/auth/AuthGuard";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { PlanningScreen } from "./screens/PlanningScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { BudgetScreen } from "./screens/BudgetScreen";
import { FootprintsScreen } from "./screens/FootprintsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { DestinationDetailScreen } from "./screens/DestinationDetailScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <OnboardingScreen />,
  },
  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { path: "/home", element: <HomeScreen /> },
      { path: "/plan", element: <PlanningScreen /> },
      { path: "/calendar", element: <CalendarScreen /> },
      { path: "/budget", element: <BudgetScreen /> },
      { path: "/footprints", element: <FootprintsScreen /> },
      { path: "/profile", element: <ProfileScreen /> },
      { path: "/destination/:id", element: <DestinationDetailScreen /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
