import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import AgentLabPage from './pages/AgentLabPage';
import TestLibraryPage from './pages/TestLibraryPage';
import DocumentLabPage from './pages/DocumentLabPage';
import ResultsPage from './pages/ResultsPage';
import ReportsPage from './pages/ReportsPage';
import { RunTestPage } from './pages/RunTestPage';
import { ComparativeTrialsPage } from './pages/ComparativeTrialsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="run" element={<RunTestPage />} />
          <Route path="trials" element={<ComparativeTrialsPage />} />
          <Route path="agents" element={<AgentLabPage />} />
          <Route path="test-library" element={<TestLibraryPage />} />
          <Route path="document-lab" element={<DocumentLabPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
