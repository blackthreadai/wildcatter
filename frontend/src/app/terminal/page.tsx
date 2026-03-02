'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import NewsWidget from '@/components/NewsWidget';
import YouTubeWidget from '@/components/YouTubeWidget';
import GreedFearWidget from '@/components/GreedFearWidget';
import StockWidget from '@/components/StockWidget';
import AsianStockWidget from '@/components/AsianStockWidget';
import WorldClockWidget from '@/components/WorldClockWidget';
import TravelAdvisoryWidget from '@/components/TravelAdvisoryWidget';
import PredictionMarketsWidget from '@/components/PredictionMarketsWidget';

// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Dynamically import the map to avoid SSR issues
const WorldMap = dynamic(() => import('@/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Loading World Map...</p>
      </div>
    </div>
  )
});

// Widget configuration - defines all widgets in the grid
type Widget = {
  id: string;
  type: 'news' | 'youtube' | 'greed-fear' | 'stock' | 'asian-stock' | 'world-clock' | 'travel' | 'prediction';
  title: string;
  span?: { col: number; row: number };
  region?: 'US' | 'RUSSIAN' | 'SOUTH AMERICAN' | 'AFRICAN' | 'ASIAN';
};

const defaultWidgets: Widget[] = [
  { id: 'youtube', type: 'youtube', title: 'LIVE NEWS CHANNELS', span: { col: 2, row: 2 } },
  { id: 'greed-fear', type: 'greed-fear', title: 'FEAR & GREED INDEX' },
  { id: 'us-news', type: 'news', title: 'US ENERGY', region: 'US' },
  { id: 'us-markets', type: 'stock', title: 'US ENERGY MARKETS' },
  { id: 'asian-news', type: 'news', title: 'ASIAN ENERGY', region: 'ASIAN' },
  { id: 'asian-markets', type: 'asian-stock', title: 'ASIAN ENERGY MARKETS' },
  { id: 'predictions', type: 'prediction', title: 'PREDICTION MARKETS' },
  { id: 'world-clock', type: 'world-clock', title: 'WORLD CLOCK' },
  { id: 'african-news', type: 'news', title: 'AFRICAN ENERGY', region: 'AFRICAN' },
  { id: 'travel', type: 'travel', title: 'TRAVEL ADVISORIES' },
  { id: 'sa-news', type: 'news', title: 'SOUTH AMERICAN ENERGY', region: 'SOUTH AMERICAN' },
  { id: 'russian-news', type: 'news', title: 'RUSSIAN ENERGY', region: 'RUSSIAN' },
];

// Draggable Widget Component
function DraggableWidget({ 
  widget, 
  isHidden, 
  onToggleVisibility 
}: { 
  widget: Widget;
  isHidden: boolean;
  onToggleVisibility: (widgetId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Render the appropriate widget component
  const renderWidget = () => {
    switch (widget.type) {
      case 'news':
        return <NewsWidget region={widget.region} />;
      case 'youtube':
        return <YouTubeWidget />;
      case 'greed-fear':
        return <GreedFearWidget />;
      case 'stock':
        return <StockWidget />;
      case 'asian-stock':
        return <AsianStockWidget />;
      case 'world-clock':
        return <WorldClockWidget />;
      case 'travel':
        return <TravelAdvisoryWidget />;
      case 'prediction':
        return <PredictionMarketsWidget />;
      default:
        return <NewsWidget region="US" />;
    }
  };

  // Generate span classes properly for Tailwind
  const getSpanClasses = () => {
    if (!widget.span) return '';
    
    const colSpan = widget.span.col === 2 ? 'col-span-2' : '';
    const rowSpan = widget.span.row === 2 ? 'row-span-2' : '';
    
    return `${colSpan} ${rowSpan}`.trim();
  };

  return (
    <div 
      ref={setNodeRef}
      className={`bg-black border overflow-hidden relative group ${getSpanClasses()}`}
      style={{
        ...style,
        margin: '5px',
        borderColor: isDragging ? '#DAA520' : (isHidden ? '#666666' : '#333333'),
        borderWidth: isDragging ? '2px' : '1px',
        boxShadow: isDragging 
          ? '0 0 20px rgba(218, 165, 32, 0.5), 0 0 40px rgba(218, 165, 32, 0.3)'
          : isHidden 
            ? '0 0 10px rgba(102, 102, 102, 0.2)'
            : '0 0 10px rgba(218, 165, 32, 0.2), 0 0 20px rgba(218, 165, 32, 0.1)',
        maxHeight: '100%',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isHidden ? 0.5 : 1
      }}
      {...attributes}
      {...listeners}
    >
      {/* Control buttons in top-right */}
      <div className="absolute top-1 right-1 z-50 flex items-center gap-1 bg-black/80 rounded px-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Eye icon button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(widget.id);
          }}
          className="text-[#DAA520] hover:text-yellow-300 transition-colors pointer-events-auto p-1"
          title={isHidden ? 'Show widget' : 'Hide widget'}
        >
          {isHidden ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          )}
        </button>

        {/* Drag handle - 4-directional arrows */}
        <div 
          className="pointer-events-none cursor-move p-1"
          title="Drag to move widget"
        >
          <svg 
            className="w-3 h-3 text-[#DAA520]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {/* Up and down arrows */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            {/* Left and right arrows */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
          </svg>
        </div>
      </div>
      
      {/* Removed drag hint overlay per user request */}
      
      {/* Dragging overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#DAA520]/20 pointer-events-none z-10 flex items-center justify-center">
          <div className="bg-[#DAA520] text-black px-3 py-2 rounded font-bold text-sm animate-pulse">
            MOVING...
          </div>
        </div>
      )}
      
      <div className="h-full w-full overflow-hidden relative">
        {renderWidget()}
      </div>
    </div>
  );
}

export default function TerminalPage() {
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeLayers, setActiveLayers] = useState<string[]>(['geopolitical']); // Default active
  const [marketData, setMarketData] = useState<{label: string; value: string; change: number}[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [showHomepagePopup, setShowHomepagePopup] = useState(false);

  // Remove the localStorage clearing to prevent interference

  // Tailwind safelist for dynamic classes (ensures they're not purged)
  // col-span-2 row-span-2

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle homepage setting
  const handleSetHomepage = () => {
    const url = window.location.origin + '/terminal';
    
    // Try different browser methods
    try {
      // For IE and older browsers
      if ((window as any).external && 'AddFavorite' in (window as any).external) {
        (window as any).external.AddFavorite(url, 'Wildcatter Energy Terminal');
      } else {
        // For modern browsers, we can't set homepage directly
        // Show instructions instead
        alert(`To set as homepage:\n\nChrome: Settings → On startup → Open specific page → Add: ${url}\nFirefox: Preferences → Home → Homepage → Use current page\nSafari: Preferences → General → Homepage`);
      }
    } catch (e) {
      // Fallback to instructions
      alert(`To set as homepage:\n\nChrome: Settings → On startup → Open specific page → Add: ${url}\nFirefox: Preferences → Home → Homepage → Use current page\nSafari: Preferences → General → Homepage`);
    }
    
    setShowHomepagePopup(false);
  };

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        localStorage.setItem('terminal-widget-order', JSON.stringify(newOrder));
        
        return newOrder;
      });
    }
  }

  // Load saved widget order and hidden widgets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('terminal-widget-order');
    if (saved) {
      try {
        const savedWidgets = JSON.parse(saved) as Widget[];
        setWidgets(savedWidgets);
      } catch (error) {
        console.error('Failed to load saved widget order:', error);
      }
    }

    const savedHidden = localStorage.getItem('terminal-hidden-widgets');
    if (savedHidden) {
      try {
        const hiddenIds = JSON.parse(savedHidden) as string[];
        setHiddenWidgets(hiddenIds);
      } catch (error) {
        console.error('Failed to load hidden widgets:', error);
      }
    }
  }, []);

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    setHiddenWidgets(prev => {
      const newHidden = prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId];
      
      // Save to localStorage
      localStorage.setItem('terminal-hidden-widgets', JSON.stringify(newHidden));
      
      return newHidden;
    });
  };

  // Get visible widgets (filter out hidden unless showHidden is true)
  const visibleWidgets = widgets.filter(widget => 
    showHidden || !hiddenWidgets.includes(widget.id)
  );

  const regions = [
    { value: 'global', label: 'GLOBAL' },
    { value: 'middle-east', label: 'MIDDLE EAST' },
    { value: 'americas', label: 'AMERICAS' },
    { value: 'europe', label: 'EUROPE' },
    { value: 'asia', label: 'ASIA' },
    { value: 'oceania', label: 'OCEANIA' },
    { value: 'africa', label: 'AFRICA' },
  ];

  const layers = [
    { id: 'geopolitical', label: 'GEOPOLITICAL ALERTS', color: '#ef4444' },
    { id: 'weather', label: 'WEATHER ALERTS', color: '#ef4444' },
    { id: 'seismic-activity', label: 'SEISMIC ACTIVITY', color: '#ef4444' },
    { id: 'active-wells', label: 'ACTIVE OIL & GAS WELLS', color: '#DAA520' },
    { id: 'drilling-rigs', label: 'ACTIVE DRILLING RIGS', color: '#4ade80' },
    { id: 'pipelines', label: 'PIPELINE ROUTES', color: '#ef4444' },
    { id: 'refineries', label: 'REFINERIES', color: '#DAA520' },
    { id: 'tanker-ships', label: 'TANKER SHIPS', color: '#DAA520' },
    { id: 'shipping-lanes', label: 'SHIPPING LANES', color: '#4ade80' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch market data
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/market');
        const data = await response.json();
        // Filter for WTI, Brent, and Gas
        const filtered = data.filter((item: any) => 
          item.label === 'WTI Crude' || 
          item.label === 'Brent Crude' || 
          item.label === 'Henry Hub Gas'
        );
        setMarketData(filtered);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  // No longer need scrolling variables - showing all layers with scroll container

  // Scroll functions removed - using native scroll container now

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Leaflet CSS overrides for dark theme */}
      <style jsx global>{`
        .leaflet-container {
          background: #374151 !important;
        }
        .leaflet-control-zoom a {
          background-color: #1f2937 !important;
          color: white !important;
          border-color: #4b5563 !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #374151 !important;
        }
        .leaflet-top.leaflet-left {
          top: 20px !important;
          left: 300px !important;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        /* Scrollbar styles */
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-track-gray-800::-webkit-scrollbar {
          width: 12px;
        }
        .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 6px;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        /* Geopolitical alert pulse animation */
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 2px;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          color: white !important;
        }
        .leaflet-popup-tip {
          background: #1f2937 !important;
        }
      `}</style>

      {/* Header Bar */}
      <header className="bg-black border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo + Version + Region Dropdown */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/w-icon.svg" alt="W" className="w-8 h-8" />
              <span className="text-[#DAA520] text-sm font-light tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>TERMINAL</span>
            </div>

            {/* Version */}
            <span className="text-gray-400 text-sm">v1.01</span>

            {/* Region Dropdown */}
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-gray-900 text-white border border-gray-700 pl-3 pr-20 py-1 text-sm focus:border-[#DAA520] focus:outline-none"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>

            {/* Market Snapshot */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400 tracking-wider">MARKET SNAPSHOT</span>
              {marketData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[#DAA520] text-xs">{item.label.replace(' Crude', '').replace('Henry Hub ', '')}</span>
                  <span className="text-white font-medium tracking-[0.1em]" style={{ fontStretch: 'condensed' }}>{item.value}</span>
                  <span className={`text-xs ${item.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            {/* DEFCON 3 Indicator */}
            <div className="flex items-center gap-1 text-[#DAA520] text-xs font-bold tracking-[0.2em] animate-pulse" style={{ fontStretch: 'condensed' }}>
              <div className="w-2 h-2 bg-[#DAA520] rounded-full shadow-[0_0_8px_#DAA520]"></div>
              DEFCON 3
            </div>
          </div>

          {/* Right Side - Control Buttons */}
          <div className="flex items-center">
            {/* Control Buttons Group */}
            <div className="flex items-center gap-1">
              {/* Homepage Button */}
              <button 
                onClick={() => setShowHomepagePopup(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
                title="Make Terminal your homepage"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>

              {/* View Hidden Widgets Button */}
              <button 
                onClick={() => setShowHidden(!showHidden)}
                className={`p-2 transition-colors flex items-center gap-2 ${
                  showHidden 
                    ? 'bg-[#DAA520] text-black' 
                    : hiddenWidgets.length > 0
                      ? 'bg-gray-700 text-[#DAA520] border border-[#DAA520]'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={hiddenWidgets.length === 0}
                title={showHidden ? 'Hide hidden widgets' : `Show ${hiddenWidgets.length} hidden widgets`}
              >
                {showHidden ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                )}
                {hiddenWidgets.length > 0 && (
                  <span className="text-xs font-semibold">
                    {hiddenWidgets.length}
                  </span>
                )}
              </button>

              {/* Reset Widgets Button */}
              <button 
                onClick={() => {
                  setWidgets(defaultWidgets);
                  setHiddenWidgets([]);
                  setShowHidden(false);
                  localStorage.removeItem('terminal-widget-order');
                  localStorage.removeItem('terminal-hidden-widgets');
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
                title="Reset widget layout and show all widgets"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Settings Gear */}
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)] relative">
        {/* Map Header with Date/Time */}
        <div className="bg-gray-800 border-b border-gray-700 py-2 px-6 pb-3">
          <div className="text-center">
            <span className="text-white text-sm font-medium tracking-[0.1em]" style={{ fontStretch: 'condensed' }}>
              {formatDateTime(currentTime)}
            </span>
          </div>
        </div>

        {/* Map Container - Half Height */}
        <div 
          className="h-[50vh] bg-gray-800 relative border"
          style={{
            borderColor: '#333333',
            boxShadow: '0 0 10px rgba(218, 165, 32, 0.2), 0 0 20px rgba(218, 165, 32, 0.1)'
          }}
        >
          <WorldMap activeLayers={activeLayers} />

          {/* Static Layers Panel - Left Side Full Height */}
          <div 
            className="absolute top-0 left-0 w-72 border-r flex flex-col"
            style={{ 
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderColor: '#333333',
              height: '100%'
            }}
          >
            {/* Scrollable Layers List - Full Height */}
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
              <div className="p-4 space-y-3">
                {layers.map(layer => (
                  <label
                    key={layer.id}
                    className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-800 hover:bg-opacity-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={activeLayers.includes(layer.id)}
                      onChange={() => toggleLayer(layer.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                      activeLayers.includes(layer.id) 
                        ? 'border-yellow-500 bg-yellow-500' 
                        : 'border-gray-500'
                    }`} style={{
                      borderColor: activeLayers.includes(layer.id) ? '#DAA520' : undefined,
                      backgroundColor: activeLayers.includes(layer.id) ? '#DAA520' : undefined
                    }}>
                      {activeLayers.includes(layer.id) && (
                        <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {layer.id === 'active-wells' ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={layer.color} strokeWidth="2">
                          <path d="M12 3v18"/>
                          <path d="M9 3l6 0"/>
                          <path d="M10 8l4 0"/>
                          <path d="M9 3l-2 18"/>
                          <path d="M15 3l2 18"/>
                          <path d="M7 21l10 0"/>
                          <rect x="11" y="4" width="2" height="2" fill={layer.color}/>
                        </svg>
                      </div>
                    ) : layer.id === 'drilling-rigs' ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={layer.color} strokeWidth="2">
                          <path d="M12 3v18"/>
                          <path d="M9 3l6 0"/>
                          <path d="M10 8l4 0"/>
                          <path d="M9 3l-2 18"/>
                          <path d="M15 3l2 18"/>
                          <path d="M7 21l10 0"/>
                          <rect x="11" y="4" width="2" height="3" fill={layer.color}/>
                          <circle cx="12" cy="15" r="1" fill={layer.color}/>
                        </svg>
                      </div>
                    ) : layer.id === 'seismic-activity' ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M2 12l4 0 4-6 4 12 4-6 4 0" 
                                stroke={layer.color} 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ) : layer.id === 'weather' ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={layer.color}>
                          <path d="M12 16l-6-8h12l-6 8z"/>
                        </svg>
                      </div>
                    ) : layer.id === 'refineries' ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={layer.color}>
                          <rect x="4" y="10" width="16" height="12" rx="1"/>
                          <rect x="6" y="4" width="3" height="8" rx="0.5"/>
                          <rect x="10" y="6" width="3" height="6" rx="0.5"/>
                          <rect x="14" y="3" width="3" height="9" rx="0.5"/>
                          <circle cx="7.5" cy="3" r="0.8" fill="white"/>
                          <circle cx="11.5" cy="5" r="0.8" fill="white"/>
                          <circle cx="15.5" cy="2" r="0.8" fill="white"/>
                        </svg>
                      </div>
                    ) : layer.id === 'pipelines' ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M2 12l20 0" stroke={layer.color} strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      </div>
                    ) : layer.id === 'tanker-ships' ? (
                      <div className="w-3 h-3 flex items-center justify-center text-xs">
                        ⚓
                      </div>
                    ) : layer.id === 'shipping-lanes' ? (
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M2 12l20 0" stroke={layer.color} strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      </div>
                    ) : (
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                    <span className="text-xs tracking-wider text-gray-300" style={{ fontStretch: 'condensed' }}>
                      {layer.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Area - Draggable Widget Grid */}
        <div className="flex-1 bg-black p-2 min-h-0">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={visibleWidgets.map(w => w.id)}
              strategy={rectSortingStrategy}
            >
              <div 
                className="grid grid-cols-5 gap-2 h-full"
                style={{ 
                  gridTemplateRows: '1fr 1fr 1fr',
                  maxHeight: '100%'
                }}
              >
                {visibleWidgets.map((widget) => (
                  <DraggableWidget 
                    key={widget.id} 
                    widget={widget}
                    isHidden={hiddenWidgets.includes(widget.id)}
                    onToggleVisibility={toggleWidgetVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Homepage Popup */}
      {showHomepagePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 text-[#DAA520] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <h3 className="text-xl text-white font-semibold">Make Terminal Your Homepage?</h3>
                <p className="text-gray-400 text-sm mt-2">
                  Set Wildcatter Energy Terminal as your browser homepage for instant access to energy markets and data.
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleSetHomepage}
                  className="bg-[#DAA520] text-black px-6 py-2 rounded font-semibold hover:bg-yellow-500 transition-colors"
                >
                  YES
                </button>
                <button
                  onClick={() => setShowHomepagePopup(false)}
                  className="bg-gray-700 text-white px-6 py-2 rounded font-semibold hover:bg-gray-600 transition-colors"
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}