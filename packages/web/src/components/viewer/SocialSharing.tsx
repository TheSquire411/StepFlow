import React, { useState } from 'react';
import { ShareIcon, LinkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Guide } from '../../types/guide.types';

interface SocialSharingProps {
  guide: Guide;
  currentStep: number;
  className?: string;
}

export const SocialSharing: React.FC<SocialSharingProps> = ({
  guide,
  currentStep,
  className = ''
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/guides/${guide.id}${currentStep > 0 ? `?step=${currentStep + 1}` : ''}`;
  const shareTitle = `${guide.title} - Step ${currentStep + 1}`;
  const shareDescription = guide.description;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleLinkedInShare = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=550,height=420');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`Check out this guide: ${shareTitle}\n\n${shareDescription}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const supportsNativeShare = navigator.share !== undefined;

  return (
    <div className={`social-sharing relative ${className}`}>
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="p-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
        aria-label="Share this guide"
        title="Share"
      >
        <ShareIcon className="w-5 h-5 text-gray-600" />
      </button>

      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowShareMenu(false)}
            aria-hidden="true"
          />

          {/* Share menu */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-20 min-w-48">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share this guide</h3>
            
            <div className="space-y-2">
              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Copy link to clipboard"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4 mr-3 text-green-500" />
                ) : (
                  <LinkIcon className="w-4 h-4 mr-3" />
                )}
                {copied ? 'Copied!' : 'Copy link'}
              </button>

              {/* Native share (mobile) */}
              {supportsNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Share via device"
                >
                  <ShareIcon className="w-4 h-4 mr-3" />
                  Share
                </button>
              )}

              {/* Social media shares */}
              <button
                onClick={handleTwitterShare}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Share on Twitter"
              >
                <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </button>

              <button
                onClick={handleLinkedInShare}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Share on LinkedIn"
              >
                <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>

              <button
                onClick={handleFacebookShare}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Share on Facebook"
              >
                <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>

              <button
                onClick={handleEmailShare}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Share via email"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};