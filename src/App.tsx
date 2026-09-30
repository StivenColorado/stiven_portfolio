import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import Home from './pages/Home';
import Projects from './pages/Projects';
import About from './pages/About';
import Privacy from './pages/Privacy';

const Admin = lazy(() => import('./pages/Admin'));
const AdminReset = lazy(() => import('./pages/AdminReset'));

const App: React.FC = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacidad" element={<Privacy />} />
      <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
      <Route path="/admin/restablecer" element={<Suspense fallback={null}><AdminReset /></Suspense>} />
      <Route path="*" element={<Home />} />
    </Route>
  </Routes>
);

export default App;
