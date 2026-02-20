'use client';

interface SaveButtonProps {
  itemType: 'asset' | 'operator';
  itemId: string;
  isSaved: boolean;
  onToggle: (type: 'asset' | 'operator', id: string) => void;
  size?: 'sm' | 'md';
}

export default function SaveButton({ itemType, itemId, isSaved, onToggle, size = 'sm' }: SaveButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(itemType, itemId);
      }}
      className={`transition-colors ${
        isSaved ? 'text-[#DAA520]' : 'text-gray-500 hover:text-gray-300'
      } ${size === 'md' ? 'text-lg' : 'text-base'}`}
      title={isSaved ? 'Unsave' : 'Save'}
    >
      {isSaved ? '★' : '☆'}
    </button>
  );
}
