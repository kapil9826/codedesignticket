import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type: 'ticket-list' | 'ticket-detail' | 'sidebar-ticket' | 'comment';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'ticket-list':
        return (
          <div className="skeleton-ticket-list">
            <div className="skeleton-ticket-item">
              <div className="skeleton-ticket-header">
                <div className="skeleton-ticket-id"></div>
                <div className="skeleton-ticket-status"></div>
              </div>
              <div className="skeleton-ticket-title"></div>
              <div className="skeleton-ticket-meta">
                <div className="skeleton-ticket-priority"></div>
                <div className="skeleton-ticket-date"></div>
              </div>
            </div>
          </div>
        );
      
      case 'ticket-detail':
        return (
          <div className="skeleton-ticket-detail">
            <div className="skeleton-ticket-header">
              <div className="skeleton-ticket-id"></div>
              <div className="skeleton-ticket-status"></div>
            </div>
            <div className="skeleton-ticket-title"></div>
            <div className="skeleton-ticket-description"></div>
            <div className="skeleton-ticket-meta">
              <div className="skeleton-ticket-priority"></div>
              <div className="skeleton-ticket-date"></div>
            </div>
          </div>
        );
      
      case 'sidebar-ticket':
        return (
          <div className="skeleton-sidebar-ticket">
            <div className="skeleton-ticket-id"></div>
            <div className="skeleton-ticket-issue"></div>
            <div className="skeleton-ticket-badges">
              <div className="skeleton-badge"></div>
              <div className="skeleton-badge"></div>
            </div>
          </div>
        );
      
      case 'comment':
        return (
          <div className="skeleton-comment">
            <div className="skeleton-comment-header">
              <div className="skeleton-comment-author"></div>
              <div className="skeleton-comment-time"></div>
            </div>
            <div className="skeleton-comment-message"></div>
          </div>
        );
      
      default:
        return <div className="skeleton-default"></div>;
    }
  };

  return (
    <div className="skeleton-container">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-item">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
