import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const helpArticles: HelpArticle[] = [
  {
    id: '1',
    title: 'Getting Started with StepFlow',
    category: 'Getting Started',
    content: 'Learn how to create your first guide with StepFlow...',
    tags: ['beginner', 'setup', 'recording']
  },
  {
    id: '2',
    title: 'Recording Best Practices',
    category: 'Recording',
    content: 'Tips for creating high-quality recordings...',
    tags: ['recording', 'quality', 'tips']
  },
  {
    id: '3',
    title: 'Sharing and Permissions',
    category: 'Sharing',
    content: 'How to share guides and manage permissions...',
    tags: ['sharing', 'permissions', 'collaboration']
  }
];

const faqItems: FAQItem[] = [
  {
    question: 'How do I install the browser extension?',
    answer: 'Visit the Chrome Web Store, search for "StepFlow", and click "Add to Chrome". Follow the prompts to grant necessary permissions.',
    category: 'Installation'
  },
  {
    question: 'What browsers are supported?',
    answer: 'StepFlow supports Chrome, Edge, and Firefox. Chrome provides the best experience with full feature support.',
    category: 'Compatibility'
  },
  {
    question: 'How long does AI processing take?',
    answer: 'Most guides are processed within 2-5 minutes. Complex recordings with many steps may take up to 10 minutes.',
    category: 'Processing'
  },
  {
    question: 'Can I edit AI-generated content?',
    answer: 'Yes! All AI-generated content can be edited using our drag-and-drop editor. You can modify text, replace images, and add annotations.',
    category: 'Editing'
  }
];

export const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Getting Started', 'Recording', 'Editing', 'Sharing', 'Troubleshooting'];

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqItems.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-xl text-gray-600 mb-8">
          Find answers to your questions and learn how to get the most out of StepFlow
        </p>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help articles, FAQs, and guides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Link
          to="/help/getting-started"
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <div className="flex items-center mb-3">
            <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-semibold">Getting Started</h3>
          </div>
          <p className="text-blue-100">Learn the basics and create your first guide</p>
        </Link>

        <Link
          to="/help/video-tutorials"
          className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
        >
          <div className="flex items-center mb-3">
            <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
            <h3 className="text-lg font-semibold">Video Tutorials</h3>
          </div>
          <p className="text-green-100">Watch step-by-step video guides</p>
        </Link>

        <Link
          to="/help/contact"
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
        >
          <div className="flex items-center mb-3">
            <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-semibold">Contact Support</h3>
          </div>
          <p className="text-purple-100">Get help from our support team</p>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Help Articles */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Help Articles</h2>
          <div className="space-y-4">
            {filteredArticles.map(article => (
              <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                    <Link to={`/help/articles/${article.id}`}>{article.title}</Link>
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {article.category}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{article.content}</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg">
                <details className="group">
                  <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50">
                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                    <svg
                      className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-6">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Still need help?</h2>
        <p className="text-gray-600 mb-6">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/help/contact"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </Link>
          <Link
            to="/help/community"
            className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Community Forum
          </Link>
        </div>
      </div>
    </div>
  );
};