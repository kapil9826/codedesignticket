import React from 'react';
import './CommentLoader.css';

interface CommentLoaderProps {
  message?: string;
}

const CommentLoader: React.FC<CommentLoaderProps> = ({ 
  message = "Adding your comment..." 
}) => {
  return (
    <div className="comment-loader">
      <div className="comment-loader-content">
        <div className="comment-loader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <div className="comment-loader-text">
          <span className="loader-message">{message}</span>
          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentLoader;
