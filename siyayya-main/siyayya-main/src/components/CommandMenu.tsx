import React, { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Laptop, 
  Smartphone, 
  BookOpen, 
  Search, 
  PlusCircle, 
  MessageSquare,
  TrendingUp,
  Tag,
  Wrench,
  Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { categories } from "@/lib/mock-data";
import { useProducts, useServices } from "@/hooks/use-queries";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search anything... (e.g. laptop, repair, textbooks)" />
        <CommandList className="max-h-[450px]">
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/new"))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Post a New Listing</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/messages"))}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Check Messages</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Marketplace Listings">
            {products.slice(0, 10).map((p) => (
              <CommandItem 
                key={p.id} 
                onSelect={() => runCommand(() => navigate(`/product/${p.id}`))}
                className="flex items-center gap-3 py-3"
              >
                <div className="h-8 w-8 rounded-lg overflow-hidden bg-muted">
                  <img src={p.image} className="h-full w-full object-cover" alt="" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs truncate max-w-[200px]">{p.title}</span>
                  <span className="text-[10px] text-textMuted uppercase tracking-widest">₦{p.price.toLocaleString()}</span>
                </div>
                <Package className="ml-auto h-3 w-3 text-textMuted opacity-20" />
              </CommandItem>
            ))}
            <CommandItem onSelect={() => runCommand(() => navigate("/marketplace"))}>
              <Search className="mr-2 h-4 w-4" />
              <span className="text-primary font-bold">View all products...</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Expert Services">
            {services.slice(0, 5).map((s) => (
              <CommandItem 
                key={s.id} 
                onSelect={() => runCommand(() => navigate(`/service/${s.id}`))}
                className="flex items-center gap-3 py-3"
              >
                <div className="h-8 w-8 rounded-lg overflow-hidden bg-muted">
                  <img src={s.image || s.mediaUrl} className="h-full w-full object-cover" alt="" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs truncate max-w-[200px]">{s.title}</span>
                  <span className="text-[10px] text-accent uppercase tracking-widest font-black">Expert Service</span>
                </div>
                <Wrench className="ml-auto h-3 w-3 text-textMuted opacity-20" />
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Categories">
            {categories.map((cat) => (
              <CommandItem 
                key={cat.id} 
                onSelect={() => runCommand(() => navigate(`/marketplace?category=${cat.id}`))}
              >
                <span className="mr-2 text-lg">{cat.icon}</span>
                <span>{cat.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
