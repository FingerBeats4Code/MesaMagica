import React from "react";
import { Category } from "@/api/api";

interface MenuProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

const Menu: React.FC<MenuProps> = ({ categories, selectedCategory, onCategorySelect }) => {
  return (
    <>
      <p className="text-xl font-semibold mb-4">Categories</p>
      <nav className="space-y-2">
        <button
          type="button"
          className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
            !selectedCategory ? 'bg-neutral-900 text-white' : 'text-gray-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          onClick={() => onCategorySelect(null)}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.categoryId}
            type="button"
            className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
              selectedCategory === cat.categoryId ? 'bg-neutral-900 text-white' : 'text-gray-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            onClick={() => onCategorySelect(cat.categoryId)}
          >
            {cat.name}
          </button>
        ))}
      </nav>
    </>
  );
};

export default Menu;