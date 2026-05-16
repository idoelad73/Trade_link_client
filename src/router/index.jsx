import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';

// Layouts
// import RootLayout from '../layouts/RootLayout';
// import AuthLayout from '../layouts/AuthLayout';
// import DashboardLayout from '../layouts/DashboardLayout';

// Pages — lazy loaded when implemented
// const Landing      = lazy(() => import('../pages/Landing'));
// const Login        = lazy(() => import('../pages/auth/Login'));
// const Register     = lazy(() => import('../pages/auth/Register'));
// const Dashboard    = lazy(() => import('../pages/dashboard/Dashboard'));
// const Profile      = lazy(() => import('../pages/profile/Profile'));
// const JobBoard     = lazy(() => import('../pages/jobs/JobBoard'));
// const JobDetail    = lazy(() => import('../pages/jobs/JobDetail'));
// const NotFound     = lazy(() => import('../pages/NotFound'));

import PonsLanding from '../PonsLanding';
import RegistrationArea from '../pages/RegistrationArea';
import TradeRegister from '../pages/register/TradeRegister';
import ContractorRegister from '../pages/register/ContractorRegister';
import ContractorDashboard from '../pages/dashboard/ContractorDashboard';
import TradeDashboard from '../pages/dashboard/TradeDashboard';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public */}
      <Route path="/" element={<PonsLanding />} />
      <Route path="/register" element={<RegistrationArea />} />
      <Route path="/register/trade" element={<TradeRegister />} />
      <Route path="/register/contractor" element={<ContractorRegister />} />

      {/* Dashboards */}
      <Route path="/dashboard/contractor" element={<ContractorDashboard />} />
      <Route path="/dashboard/trade"      element={<TradeDashboard />} />

      {/* Auth — uncomment when pages are built */}
      {/* <Route element={<AuthLayout />}>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route> */}

      {/* Protected dashboard — uncomment when pages are built */}
      {/* <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile"   element={<Profile />} />
        <Route path="/jobs"      element={<JobBoard />} />
        <Route path="/jobs/:id"  element={<JobDetail />} />
      </Route> */}

      {/* 404 */}
      {/* <Route path="*" element={<NotFound />} /> */}
    </>
  )
);

export default router;
