'use client';

import { useState, useEffect } from 'react';

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  views: string;
  publishedAt: string;
}

export default function YouTubeWidget() {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock YouTube video - in production, this would fetch from YouTube API
    const mockVideo: YouTubeVideo = {
      id: "dQw4w9WgXcQ", // Rick Roll as placeholder
      title: "Oil Markets Rally on Supply Disruption News",
      channel: "Energy News Network",
      views: "125,432",
      publishedAt: "2026-02-21T10:00:00Z"
    };

    setTimeout(() => {
      setVideo(mockVideo);
      setLoading(false);
    }, 1000);
  }, []);

  const formatViews = (views: string) => {
    return `${views} views`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2">
          <h3 className="text-white text-xs font-semibold tracking-wider">ENERGY TV</h3>
        </div>
        <div className="flex-1 bg-black flex items-center justify-center">
          <div className="text-gray-500 text-xs">Loading video...</div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2">
          <h3 className="text-white text-xs font-semibold tracking-wider">ENERGY TV</h3>
        </div>
        <div className="flex-1 bg-black flex items-center justify-center">
          <div className="text-gray-500 text-xs">No video available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2">
        <h3 className="text-white text-xs font-semibold tracking-wider">ENERGY TV</h3>
      </div>
      
      <div className="flex-1 bg-black p-2 flex flex-col">
        {/* Video Thumbnail/Player Area */}
        <div className="bg-gray-700 rounded mb-2 flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800 rounded flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div className="text-white text-xs">Click to play</div>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="space-y-1">
          <h4 className="text-white text-xs leading-tight line-clamp-2">
            {video.title}
          </h4>
          <div className="text-gray-400 text-xs">
            {video.channel}
          </div>
          <div className="text-gray-500 text-xs">
            {formatViews(video.views)} • {formatTime(video.publishedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}