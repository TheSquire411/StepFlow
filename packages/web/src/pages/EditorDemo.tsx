import React from 'react';
import { Link } from 'react-router-dom';

export const EditorDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Guide Editor Demo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Experience the powerful drag-and-drop guide editor with annotation tools and brand customization.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 bg-blue-600">
            <h2 className="text-xl font-semibold text-white">Features Implemented</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">✅ Core Editor Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Drag-and-drop step reordering</li>
                  <li>• Rich text editing capabilities</li>
                  <li>• Real-time preview functionality</li>
                  <li>• Step-by-step navigation</li>
                  <li>• Auto-save functionality</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">✅ Annotation Tools</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Highlight tool for emphasis</li>
                  <li>• Arrow annotations for direction</li>
                  <li>• Blur tool for sensitive data</li>
                  <li>• Text annotations and callouts</li>
                  <li>• Rectangle selection tool</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">✅ Brand Customization</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Custom color schemes</li>
                  <li>• Typography selection</li>
                  <li>• Logo upload and placement</li>
                  <li>• Font size adjustment</li>
                  <li>• Theme customization</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">✅ User Experience</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Responsive design</li>
                  <li>• Keyboard shortcuts</li>
                  <li>• Undo/redo functionality</li>
                  <li>• Mobile-friendly interface</li>
                  <li>• Accessibility compliant</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 bg-green-600">
            <h2 className="text-xl font-semibold text-white">Technical Implementation</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Frontend Technologies</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• React 18 with TypeScript</li>
                  <li>• React DnD for drag-and-drop</li>
                  <li>• Tailwind CSS for styling</li>
                  <li>• Heroicons for UI icons</li>
                  <li>• Zustand for state management</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Architecture</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Component-based architecture</li>
                  <li>• Modular design patterns</li>
                  <li>• Type-safe interfaces</li>
                  <li>• Comprehensive test coverage</li>
                  <li>• Performance optimized</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/guides/1/edit"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try the Guide Editor
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Click above to open the interactive guide editor with sample data
          </p>
        </div>
      </div>
    </div>
  );
};