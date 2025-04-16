import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight } from 'lucide-react'; // Icons for toggle

interface AIMessageContentProps {
  content: string;
}

// Regex to capture content before, inside, and after <think>...</think>
// The 's' flag allows '.' to match newline characters.
const thinkRegex = /^(.*?)<think>(.*?)<\/think>(.*)$/s;

export const AIMessageContent: React.FC<AIMessageContentProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const match = content.match(thinkRegex);

  if (match) {
    const [, before, thinking, after] = match; // Destructure the captured groups

    return (
      <>
        {/* Render content before <think> tag if it exists */}
        {before && before.trim() && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {before.trim()}
          </ReactMarkdown>
        )}

        {/* Collapsible section for <think> content */}
        {thinking && thinking.trim() && ( // Only show toggle if there's thinking content
          <div className="mt-2 mb-1 border-l-2 border-dashed border-gray-400 dark:border-gray-600 pl-2 py-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown size={16} className="mr-1" /> : <ChevronRight size={16} className="mr-1" />}
              {isExpanded ? 'Hide Thoughts' : 'Show Thoughts'}
            </button>
            {isExpanded && (
              <div className="mt-1 text-sm opacity-80"> {/* Slightly faded style for thoughts */}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {thinking.trim()}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Render content after <think> tag if it exists */}
        {after && after.trim() && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {after.trim()}
          </ReactMarkdown>
        )}
      </>
    );
  } else {
    // No <think> tags found, or regex didn't match structure, render the whole content normally
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    );
  }
};