import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { LoginForm } from './components/forms/LoginForm';
import { RegisterForm } from './components/forms/RegisterForm';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { RecordingPage } from './pages/Recording';
import { GuideEditorPage } from './pages/GuideEditor';
import { GuideViewer } from './pages/GuideViewer';
import { EmbeddedGuideViewer } from './pages/EmbeddedGuideViewer';
import { EditorDemo } from './pages/EditorDemo';
import './components/viewer/GuideViewer.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterForm />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Placeholder protected routes for future implementation */}
        <Route
          path="/guides"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">My Guides</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/guides/:guideId/edit"
          element={
            <ProtectedRoute>
              <GuideEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guides/:guideId"
          element={<GuideViewer />}
        />
        <Route
          path="/embed/guides/:guideId"
          element={<EmbeddedGuideViewer />}
        />
        <Route
          path="/editor-demo"
          element={<EditorDemo />}
        />
        <Route
          path="/recording"
          element={
            <ProtectedRoute>
              <RecordingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Shared Guides</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Analytics</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;