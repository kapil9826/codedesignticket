import React, { useEffect, useState } from 'react';
import './CommentSuccess.css';

interface CommentSuccessProps {
  onComplete: () => void;
}

const CommentSuccess: React.FC<CommentSuccessProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`comment-success ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="success-content">
        <div className="success-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path 
              d="M9 12l2 2 4-4" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="success-text">
          <span className="success-title">Comment added successfully!</span>
          <span className="success-subtitle">Your comment has been saved</span>
        </div>
      </div>
    </div>
  );
};

export default CommentSuccess;
