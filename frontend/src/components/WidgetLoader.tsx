'use client';

export default function WidgetLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-[#DAA520] rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
      </div>
      <div className="text-gray-600 text-xs tracking-widest">LOADING</div>
      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
