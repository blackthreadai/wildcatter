'use client';

import { useState, useEffect } from 'react';
import NewsWidget from '@/components/NewsWidget';
import YouTubeWidget from '@/components/YouTubeWidget';
import WildcatterWidget from '@/components/IntelFeedWidget';
import WorldClockWidget from '@/components/WorldClockWidget';
import TravelAdvisoryWidget from '@/components/TravelAdvisoryWidget';
import PredictionMarketsWidget from '@/components/PredictionMarketsWidget';
import PreciousMetalsWidget from '@/components/PreciousMetalsWidget';
import CryptocurrencyWidget from '@/components/CryptocurrencyWidget';
import GlobalEnergyMarketsWidget from '@/components/GlobalEnergyMarketsWidget';
import EconomicIndicatorsWidget from '@/components/EconomicIndicatorsWidget';
import ClimateExtremesWidget from '@/components/ClimateExtremesWidget';
import GlobalOilTrackerWidget from '@/components/GlobalOilTrackerWidget';
import OPECWidget from '@/components/OPECWidget';
import NaturalGasWidget from '@/components/NaturalGasWidget';
import OilRigTrackerWidget from '@/components/OilRigTrackerWidget';
import PowerGridStressWidget from '@/components/PowerGridStressWidget';
import RefineryOutagesWidget from '@/components/RefineryOutagesWidget';
import SanctionsWidget from '@/components/SanctionsWidget';
import EnergyFuturesWidget from '@/components/EnergyFuturesWidget';
import CrackSpreadWidget from '@/components/CrackSpreadWidget';
import GlobalLNGWidget from '@/components/GlobalLNGWidget';
import CarbonCreditWidget from '@/components/CarbonCreditWidget';
import GlobalFuelDemandWidget from '@/components/GlobalFuelDemandWidget';
import PositionMonitorWidget from '@/components/PositionMonitorWidget';
import AIPriceForecastWidget from '@/components/AIPriceForecastWidget';
import EventCalendarWidget from '@/components/EventCalendarWidget';
import WorldMapWidget from '@/components/WorldMapWidget';

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

// Widget configuration types
type Widget = {
  id: string;
  type: 'news' | 'youtube' | 'world-clock' | 'travel' | 'prediction' | 'intel-feed' | 'precious-metals' | 'cryptocurrency' | 'global-energy-markets' | 'economic-indicators' | 'climate-extremes' | 'global-oil-tracker' | 'opec' | 'natural-gas' | 'oil-rig-tracker' | 'power-grid-stress' | 'refinery-outages' | 'sanctions' | 'energy-futures' | 'crack-spread' | 'global-lng' | 'carbon-credit' | 'global-fuel-demand' | 'position-monitor' | 'ai-price-forecast' | 'event-calendar' | 'world-map';
  title: string;
  span?: { col: number; row: number };
  region?: 'STRATEGIC RESERVE' | 'GLOBAL';
  activeLayers?: string[];
};

// Widget version to force updates when we add new widgets  
const WIDGET_VERSION = '18.13-REAL-ENERGY-FUTURES';

const defaultWidgets: Widget[] = [
  // NEW CUSTOM ORDER AS REQUESTED
  { id: 'world-map', type: 'world-map', title: 'GLOBAL ENERGY MAP', span: { col: 3, row: 1 }, activeLayers: [] },
  { id: 'youtube', type: 'youtube', title: 'LIVE NEWS', span: { col: 2, row: 1 } },
  { id: 'world-clock', type: 'world-clock', title: 'WORLD CLOCK' },
  { id: 'energy-news', type: 'news', title: 'ENERGY NEWS', region: 'GLOBAL' },
  { id: 'strategic-reserve', type: 'news', title: 'STRATEGIC RESERVE', region: 'STRATEGIC RESERVE' },
  { id: 'global-energy-markets', type: 'global-energy-markets', title: 'ENERGY MARKETS' },
  { id: 'precious-metals', type: 'precious-metals', title: 'PRECIOUS METALS' },
  { id: 'economic-indicators', type: 'economic-indicators', title: 'ECONOMIC INDICATORS' },
  { id: 'energy-futures', type: 'energy-futures', title: 'ENERGY FUTURES' },
  { id: 'predictions', type: 'prediction', title: 'PREDICTION MARKETS' },
  { id: 'position-monitor', type: 'position-monitor', title: 'POSITION MONITOR' },
  { id: 'opec', type: 'opec', title: 'OPEC' },
  { id: 'natural-gas', type: 'natural-gas', title: 'NATURAL GAS' },
  { id: 'travel', type: 'travel', title: 'TRAVEL ADVISORIES' },
  { id: 'cryptocurrency', type: 'cryptocurrency', title: 'CRYPTOCURRENCY' },
  { id: 'global-oil-tracker', type: 'global-oil-tracker', title: 'GLOBAL O/G TRACKER' },
  { id: 'intel-feed', type: 'intel-feed', title: 'WILDCATTER' },
  { id: 'power-grid-stress', type: 'power-grid-stress', title: 'POWER GRID STRESS' },
  { id: 'climate-extremes', type: 'climate-extremes', title: 'CLIMATE EXTREMES' },
  { id: 'oil-rig-tracker', type: 'oil-rig-tracker', title: 'OIL RIG TRACKER' },
  { id: 'refinery-outages', type: 'refinery-outages', title: 'REFINERY OUTAGES' },
  { id: 'sanctions', type: 'sanctions', title: 'SANCTIONS' },
  { id: 'crack-spread', type: 'crack-spread', title: 'CRACK SPREAD' },
  { id: 'global-lng', type: 'global-lng', title: 'GLOBAL LNG' },
  { id: 'carbon-credit', type: 'carbon-credit', title: 'CARBON CREDIT' },
  { id: 'global-fuel-demand', type: 'global-fuel-demand', title: 'GLOBAL FUEL DEMAND' },
  { id: 'ai-price-forecast', type: 'ai-price-forecast', title: 'AI PRICE FORECAST' },
  { id: 'event-calendar', type: 'event-calendar', title: 'EVENT CALENDAR' },
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
  const [widgetTooltip, setWidgetTooltip] = useState<string | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: widget.id,
    disabled: false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Render the appropriate widget component
  const renderWidget = () => {
    switch (widget.type) {
      case 'news':
        return <NewsWidget region={widget.region} title={widget.title} />;
      case 'youtube':
        return <YouTubeWidget />;
      case 'intel-feed':
        return <WildcatterWidget />;
      case 'world-clock':
        return <WorldClockWidget />;
      case 'travel':
        return <TravelAdvisoryWidget />;
      case 'prediction':
        return <PredictionMarketsWidget />;
      case 'precious-metals':
        return <PreciousMetalsWidget />;
      case 'cryptocurrency':
        return <CryptocurrencyWidget />;
      case 'global-energy-markets':
        return <GlobalEnergyMarketsWidget />;
      case 'economic-indicators':
        return <EconomicIndicatorsWidget />;
      case 'climate-extremes':
        return <ClimateExtremesWidget />;
      case 'global-oil-tracker':
        return <GlobalOilTrackerWidget />;
      case 'opec':
        return <OPECWidget />;
      case 'natural-gas':
        return <NaturalGasWidget />;
      case 'oil-rig-tracker':
        return <OilRigTrackerWidget />;
      case 'power-grid-stress':
        return <PowerGridStressWidget />;
      case 'refinery-outages':
        return <RefineryOutagesWidget />;
      case 'sanctions':
        return <SanctionsWidget />;
      case 'energy-futures':
        return <EnergyFuturesWidget />;
      case 'crack-spread':
        return <CrackSpreadWidget />;
      case 'global-lng':
        return <GlobalLNGWidget />;
      case 'carbon-credit':
        return <CarbonCreditWidget />;
      case 'global-fuel-demand':
        return <GlobalFuelDemandWidget />;
      case 'position-monitor':
        return <PositionMonitorWidget />;
      case 'ai-price-forecast':
        return <AIPriceForecastWidget />;
      case 'event-calendar':
        return <EventCalendarWidget />;
      case 'world-map':
        return <WorldMapWidget initialLayers={widget.activeLayers || ['geopolitical']} />;
      default:
        return <NewsWidget region="GLOBAL" title="NEWS" />;
    }
  };

  // Generate span classes properly for Tailwind
  const getSpanClasses = () => {
    if (!widget.span) return '';
    
    const colSpan = widget.span.col === 2 ? 'col-span-2' : 
                   widget.span.col === 3 ? 'col-span-3' : '';
    const rowSpan = widget.span.row === 2 ? 'row-span-2' : '';
    
    return `${colSpan} ${rowSpan}`.trim();
  };

  return (
    <div 
      ref={setNodeRef}
      className={`relative group ${getSpanClasses()}`}
      style={{
        ...style,
        opacity: isHidden ? 0.5 : 1,
        height: '400px', // All widgets now single-row height
        filter: isDragging 
          ? 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.5))'
          : isHidden 
            ? 'drop-shadow(0 0 10px rgba(102, 102, 102, 0.2))'
            : 'drop-shadow(0 0 10px rgba(218, 165, 32, 0.2))'
      }}
      {...attributes}
    >
      {/* Control buttons in top-right */}
      <div className="absolute top-1 right-1 z-50 flex items-center gap-1 bg-black/80 rounded px-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(widget.id);
            }}
            onMouseEnter={() => setWidgetTooltip('visibility')}
            onMouseLeave={() => setWidgetTooltip(null)}
            className="text-[#DAA520] pointer-events-auto p-1"
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
          {widgetTooltip === 'visibility' && (
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black text-[#DAA520] text-xs font-medium whitespace-nowrap z-50 rounded border border-[#DAA520]">
              Hide Module
              <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#DAA520]"></div>
            </div>
          )}
        </div>

        <div 
          className="relative"
          onMouseEnter={() => setWidgetTooltip('drag')}
          onMouseLeave={() => setWidgetTooltip(null)}
          {...listeners}
          style={{cursor: isDragging ? 'grabbing' : 'grab'}}
        >
          <div className="cursor-move p-1">
            <svg 
              className="w-3 h-3 text-[#DAA520]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4M8 15l4 4 4-4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
            </svg>
          </div>
          {widgetTooltip === 'drag' && (
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black text-[#DAA520] text-xs font-medium whitespace-nowrap z-50 rounded border border-[#DAA520]">
              Drag To Arrange Modules
              <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#DAA520]"></div>
            </div>
          )}
        </div>
      </div>
      
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketData, setMarketData] = useState<{label: string; value: string; change: number}[]>([]);
  const [defconStatus, setDefconStatus] = useState<{level: number; description: string; color: string}>({
    level: 4,
    description: 'INCREASED INTELLIGENCE',
    color: '#4ade80'
  });
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [showHomepagePopup, setShowHomepagePopup] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  // Tailwind safelist for dynamic classes (ensures they're not purged)
  // col-span-2 row-span-2 col-span-3

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

  const handleSetHomepage = () => {
    const url = window.location.origin + '/terminal';
    
    try {
      if ((window as any).external && 'AddFavorite' in (window as any).external) {
        (window as any).external.AddFavorite(url, 'Wildcatter Energy Terminal');
      } else {
        alert(`To set as homepage:\n\nChrome: Settings → On startup → Open specific page → Add: ${url}\nFirefox: Preferences → Home → Homepage → Use current page\nSafari: Preferences → General → Homepage`);
      }
    } catch (e) {
      alert(`To set as homepage:\n\nChrome: Settings → On startup → Open specific page → Add: ${url}\nFirefox: Preferences → Home → Homepage → Use current page\nSafari: Preferences → General → Homepage`);
    }
    
    setShowHomepagePopup(false);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        localStorage.setItem('terminal-widget-order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }

  // Load saved widget order and hidden widgets from localStorage
  useEffect(() => {
    const savedVersion = localStorage.getItem('terminal-widget-version');
    const shouldReset = savedVersion !== WIDGET_VERSION;
    
    if (shouldReset) {
      localStorage.removeItem('terminal-widget-order');
      localStorage.removeItem('terminal-hidden-widgets');
      localStorage.setItem('terminal-widget-version', WIDGET_VERSION);
      setWidgets(defaultWidgets);
      setHiddenWidgets([]);
      return;
    }

    const saved = localStorage.getItem('terminal-widget-order');
    if (saved) {
      try {
        const savedWidgets = JSON.parse(saved) as Widget[];
        setWidgets(savedWidgets);
      } catch (error) {
        console.error('Failed to load saved widget order:', error);
        setWidgets(defaultWidgets);
      }
    }

    const savedHidden = localStorage.getItem('terminal-hidden-widgets');
    if (savedHidden) {
      try {
        const hiddenIds = JSON.parse(savedHidden) as string[];
        setHiddenWidgets(hiddenIds);
      } catch (error) {
        console.error('Failed to load hidden widgets:', error);
        setHiddenWidgets([]);
      }
    }
  }, []);

  const toggleWidgetVisibility = (widgetId: string) => {
    setHiddenWidgets(prev => {
      const newHidden = prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId];
      
      localStorage.setItem('terminal-hidden-widgets', JSON.stringify(newHidden));
      return newHidden;
    });
  };

  // Get visible widgets (filter out hidden unless showHidden is true)
  const visibleWidgets = widgets.filter(widget => 
    showHidden || !hiddenWidgets.includes(widget.id)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/market');
        const data = await response.json();
        const filtered = data.filter((item: any) => 
          item.label === 'WTI' || 
          item.label === 'BRENT' || 
          item.label === 'GASOLINE'
        );
        setMarketData(filtered);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    const fetchDefconStatus = async () => {
      try {
        const response = await fetch('/api/defcon');
        const data = await response.json();
        setDefconStatus(data);
      } catch (error) {
        console.error('Failed to fetch DEFCON status:', error);
      }
    };

    fetchMarketData();
    fetchDefconStatus();
    
    const marketInterval = setInterval(fetchMarketData, 60000);
    const defconInterval = setInterval(fetchDefconStatus, 12 * 60 * 60000);
    
    return () => {
      clearInterval(marketInterval);
      clearInterval(defconInterval);
    };
  }, []);

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
      <style jsx global>{`
        /* FORCE BETA BANNER TO ALWAYS STAY VISIBLE */
        .beta-warning-banner {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          z-index: 99999 !important;
          background: #dc2626 !important;
        }
        
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
        /* Custom dropdown styling */
        select option {
          background-color: #111827 !important;
          color: white !important;
        }
        select option:hover {
          background-color: #DAA520 !important;
          color: black !important;
        }
        select option:checked {
          background-color: #DAA520 !important;
          color: black !important;
        }
        
        /* Standardized Widget Grid */
        .widget-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-auto-rows: minmax(400px, max-content);
          gap: 1rem;
          align-items: start;
        }
        
        /* Consistent Widget Heights */
        .energy-widget {
          min-height: 400px;
          max-height: 500px;
          width: 100%;
          overflow: hidden;
        }
      `}</style>

      <div className="beta-warning-banner bg-red-600 border-b border-red-500 px-6 py-2 sticky top-0 z-[99999] w-full">
        <div className="flex items-center justify-center text-center">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
            </svg>
            <span className="text-white text-sm font-medium">
              <strong>BETA WARNING:</strong> This terminal is in beta testing. All data should be independently verified before making financial or operational decisions. 
              Not investment advice. Use at your own risk. Market data may be delayed or inaccurate.
            </span>
          </div>
        </div>
      </div>

      <header className="bg-black border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/w-icon.svg" alt="W" className="w-8 h-8" />
              <span className="text-[#DAA520] text-sm font-light tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>TERMINAL</span>
            </div>

            <span className="text-gray-400 text-sm">v1.1</span>
            <span className="text-gray-400 text-sm">|</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400 tracking-wider">MARKET SNAPSHOT</span>
              {marketData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[#DAA520] text-xs">{item.label}</span>
                  <span className="text-white font-medium tracking-[0.1em]" style={{ fontStretch: 'condensed' }}>{item.value}</span>
                  <span className={`text-xs ${item.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 relative">
              <div className="relative">
                <button 
                  onClick={() => setShowHomepagePopup(true)}
                  onMouseEnter={() => setHoveredTooltip('homepage')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
                {hoveredTooltip === 'homepage' && (
                  <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black text-[#DAA520] text-xs font-medium whitespace-nowrap z-50 rounded border border-[#DAA520]">
                    Make Terminal Your Homepage
                    <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#DAA520]"></div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowHidden(!showHidden)}
                  onMouseEnter={() => setHoveredTooltip('visibility')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  className={`p-2 transition-colors relative ${
                    showHidden 
                      ? 'bg-[#DAA520] text-black' 
                      : hiddenWidgets.length > 0
                        ? 'bg-black text-[#DAA520]'
                        : 'bg-black text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={hiddenWidgets.length === 0}
                >
                  {showHidden ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}
                  {hiddenWidgets.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {hiddenWidgets.length}
                    </span>
                  )}
                </button>
                {hoveredTooltip === 'visibility' && (
                  <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black text-[#DAA520] text-xs font-medium whitespace-nowrap z-50 rounded border border-[#DAA520]">
                    {hiddenWidgets.length > 0 ? `Show ${hiddenWidgets.length} Hidden Module${hiddenWidgets.length !== 1 ? 's' : ''}` : 'Hide / Reveal Modules'}
                    <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#DAA520]"></div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => {
                    setWidgets(defaultWidgets);
                    setHiddenWidgets([]);
                    setShowHidden(false);
                    localStorage.removeItem('terminal-widget-order');
                    localStorage.removeItem('terminal-hidden-widgets');
                    localStorage.setItem('terminal-widget-version', WIDGET_VERSION);
                  }}
                  onMouseEnter={() => setHoveredTooltip('reset')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {hoveredTooltip === 'reset' && (
                  <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black text-[#DAA520] text-xs font-medium whitespace-nowrap z-50 rounded border border-[#DAA520]">
                    Refresh Module Settings
                    <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#DAA520]"></div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onMouseEnter={() => setHoveredTooltip('settings')}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {hoveredTooltip === 'settings' && (
                  <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black text-[#DAA520] text-xs font-medium whitespace-nowrap z-50 rounded border border-[#DAA520]">
                    Account Settings (Coming Soon!)
                    <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#DAA520]"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="h-[calc(100vh-115px)] relative">
        <div className="bg-gray-800 border-b border-gray-700 py-2 px-6 pb-3">
          <div className="flex items-center justify-center gap-8">
            <span className="text-white text-sm font-thin tracking-[0.1em] uppercase" style={{ fontStretch: 'condensed' }}>
              {formatDateTime(currentTime)}
            </span>
            <div 
              className="flex items-center gap-1 text-xs font-bold tracking-[0.2em] border px-2 py-1" 
              style={{ 
                fontStretch: 'condensed', 
                animation: defconStatus.level <= 3 ? 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
                color: defconStatus.color,
                borderColor: defconStatus.color
              }}
            >
              <span>DEFCON {defconStatus.level}</span>
            </div>
            
            <a 
              href="https://apps.apple.com/app/wildcatter-energy-intelligence/id123456789" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#DAA520] transition-colors cursor-pointer uppercase"
              style={{ fontStretch: 'condensed' }}
            >
              <span>GET</span>
              <img src="/w-icon.svg" alt="W" className="w-6 h-6" />
              <span className="text-[#DAA520]">ENERGY INTELLIGENCE™</span>
              <span>ON iOS</span>
            </a>
          </div>
        </div>

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
                className="grid grid-cols-5 gap-4 h-full overflow-y-auto p-4"
                style={{
                  gridAutoRows: 'minmax(400px, max-content)',
                  alignItems: 'start'
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
                  className="bg-[#DAA520] text-black px-6 py-2 rounded font-semibold"
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