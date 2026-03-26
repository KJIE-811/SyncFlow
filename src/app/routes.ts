import { createHashRouter, redirect } from "react-router";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { Dashboard } from "./pages/Dashboard";
import { CalendarIntegration } from "./pages/CalendarIntegration";
import { TasksIntegration } from "./pages/TasksIntegration";
import { ChatIntegration } from "./pages/ChatIntegration";
import { Journal } from "./pages/Journal";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AdminAccounts } from "./pages/AdminAccounts";
import { ForgotPassword } from "./pages/ForgotPassword";
import { RegisterSuccessLoading } from "./pages/RegisterSuccessLoading";
import { ReportPreview } from "./pages/ReportPreview";

export const router = createHashRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/register/success",
    Component: RegisterSuccessLoading,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "integration/calendar", Component: CalendarIntegration },
      { path: "integration/tasks", Component: TasksIntegration },
      { path: "integration/chat", Component: ChatIntegration },
      { path: "journal", Component: Journal },
      { path: "report-preview", Component: ReportPreview },
      { path: "settings", Component: Settings },
      { path: "admin/accounts", Component: AdminAccounts },
    ],
  },
  {
    path: "*",
    loader: () => redirect("/"),
  },
]);
