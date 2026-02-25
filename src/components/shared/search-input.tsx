"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
  className?: string;
}

export function SearchInput({
  placeholder = "Search...",
  onSearch,
  defaultValue = "",
  className,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  return (
    <div className={`relative ${className || ""}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={() => setValue("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
