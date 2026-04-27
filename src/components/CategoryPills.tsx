import { categories } from "@/lib/mock-data";

interface CategoryPillsProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-3 px-3">
      <button
        onClick={() => onSelect("all")}
        className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${
          selected === "all"
            ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
            : "bg-muted text-textSecondary hover:bg-gray-200 hover:text-textPrimary"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all whitespace-nowrap duration-200 ${
            selected === cat.id
              ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
              : "bg-muted text-textSecondary hover:bg-gray-200 hover:text-textPrimary"
          }`}
        >
          <span className="mr-1.5">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
