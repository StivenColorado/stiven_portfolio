import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout';
import Home from './pages/Home';

const Projects = lazy(() => import('./pages/Projects'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ExperiencePage = lazy(() => import('./pages/ExperiencePage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const Admin = lazy(() => import('./pages/Admin'));
const Auditoria = lazy(() => import('./pages/admin/Auditoria'));
const Cuenta = lazy(() => import('./pages/admin/Cuenta'));
const ProjectsList = lazy(() => import('./pages/admin/projects/ProjectsList'));
const ProjectEditor = lazy(() => import('./pages/admin/projects/ProjectEditor'));
const ServicesList = lazy(() => import('./pages/admin/services/ServicesList'));
const ServiceEditor = lazy(() => import('./pages/admin/services/ServiceEditor'));
const ExperienceList = lazy(() => import('./pages/admin/experience/ExperienceList'));
const ExperienceEditor = lazy(() => import('./pages/admin/experience/ExperienceEditor'));
const AdminReset = lazy(() => import('./pages/AdminReset'));

const App: React.FC = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/experience" element={<ExperiencePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacidad" element={<Privacy />} />
      <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>}>
        <Route index element={<Navigate to="auditoria" replace />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="proyectos" element={<ProjectsList />} />
        <Route path="proyectos/nuevo" element={<ProjectEditor />} />
        <Route path="proyectos/:id" element={<ProjectEditor />} />
        <Route path="servicios" element={<ServicesList />} />
        <Route path="servicios/nuevo" element={<ServiceEditor />} />
        <Route path="servicios/:id" element={<ServiceEditor />} />
        <Route path="experiencia" element={<ExperienceList />} />
        <Route path="experiencia/nuevo" element={<ExperienceEditor />} />
        <Route path="experiencia/:id" element={<ExperienceEditor />} />
        <Route path="cuenta" element={<Cuenta />} />
        <Route path="*" element={<Navigate to="/admin/auditoria" replace />} />
      </Route>
      <Route path="/admin/restablecer" element={<Suspense fallback={null}><AdminReset /></Suspense>} />
      <Route path="*" element={<Home />} />
    </Route>
  </Routes>
);

export default App;
