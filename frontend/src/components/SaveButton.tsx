'use client';

interface SaveButtonProps {
  itemType: 'asset' | 'operator';
  itemId: string;
  isSaved: boolean;
  onToggle: (type: 'asset' | 'operator', id: string) => void;
}

export default function SaveButton({ itemType, itemId, isSaved, onToggle }: SaveButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(itemType, itemId);
      }}
      className="p-1 rounded hover:bg-gray-700 transition-colors"
      title={isSaved ? 'Unsave' : 'Save'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isSaved ? '#DAA520' : 'none'}
        stroke={isSaved ? '#DAA520' : '#6b7280'}
        strokeWidth={2}
        className="w-5 h-5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    </button>
  );
}
