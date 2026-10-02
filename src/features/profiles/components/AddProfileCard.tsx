import { Plus } from 'lucide-react';

export interface AddProfileCardProps {
  readonly onAdd: () => void;
}

/** The dashed "Add Profile" tile (port of `profiles/AddProfileCard.svelte`). */
export function AddProfileCard({ onAdd }: AddProfileCardProps) {
  return (
    <button
      type="button"
      className="rounded-lg border-2 border-dashed border-gray-700 p-6 transition-all duration-200 hover:border-gray-600 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300 glassmorphism-card"
      onClick={onAdd}
    >
      <Plus className="w-5 h-5" />
      <span className="font-medium">Add Profile</span>
    </button>
  );
}
