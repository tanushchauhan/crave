"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MenuItemRow = {
  category: string;
  cuisine: string;
  name: string;
  dietary: string;
  price: string;
  description: string;
};

export type MenuItemEditRow = MenuItemRow & { defaultOrder: number };

const brandSelectTrigger =
  "h-10 w-full min-w-0 justify-between rounded-lg border-brand bg-brand px-3 text-left text-sm font-medium text-white shadow-none focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/40 data-placeholder:text-white/85 [&_svg]:text-white [&_[data-slot=select-value]]:text-left";

const fieldInput =
  "h-10 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

const fieldTextarea =
  "min-h-36 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

function priceToInputValue(price: string): string {
  return price.replace(/[^0-9.]/g, "");
}

function categoryToSelectValue(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

function cuisineToSelectValue(cuisine: string): string {
  return cuisine.toLowerCase().replace(/\s+/g, "-");
}

type EditItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemEditRow | null;
};

function EditItemDialogBody({
  item,
  onOpenChange,
}: {
  item: MenuItemEditRow;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(priceToInputValue(item.price));
  const [calories, setCalories] = useState("");
  const [dietary, setDietary] = useState(item.dietary);
  const [category, setCategory] = useState(categoryToSelectValue(item.category));
  const [cuisine, setCuisine] = useState(cuisineToSelectValue(item.cuisine));

  return (
    <DialogContent
      showCloseButton
      overlayClassName="bg-black/55 backdrop-blur-[2px] supports-backdrop-filter:backdrop-blur-sm"
      className={cn(
        "max-h-[min(92vh,calc(100%-2rem))] overflow-y-auto rounded-3xl border-0 bg-white p-6 text-dark shadow-xl ring-0 sm:max-w-5xl sm:p-8",
        "gap-0 data-[slot=dialog-close]:text-dark"
      )}
    >
      <DialogTitle className="text-left text-xl font-bold tracking-tight text-dark">
        Edit Item
      </DialogTitle>

      <div className="mt-6 grid grid-cols-1 gap-6 font-sans md:grid-cols-3 md:gap-8">
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <span className="font-bold text-dark">Image (File Upload)</span>
            <label className="group cursor-pointer">
              <input type="file" accept="image/*" className="sr-only" />
              <span className="flex aspect-[4/3] max-h-44 w-full items-center justify-center rounded-2xl bg-brand transition-opacity group-hover:opacity-95 group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-brand">
                <Plus
                  className="size-14 text-white sm:size-16"
                  strokeWidth={3}
                  aria-hidden
                />
                <span className="sr-only">Choose image file</span>
              </span>
            </label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item-category" className="font-bold text-dark">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                id="edit-item-category"
                className={brandSelectTrigger}
              >
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appetizer">Appetizer</SelectItem>
                <SelectItem value="entree">Entree</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
                <SelectItem value="salad">Salad</SelectItem>
                <SelectItem value="soup">Soup</SelectItem>
                <SelectItem value="beverage">Beverage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item-cuisine" className="font-bold text-dark">
              Cuisine
            </Label>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger
                id="edit-item-cuisine"
                className={brandSelectTrigger}
              >
                <SelectValue placeholder="Cuisine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="italian">Italian</SelectItem>
                <SelectItem value="mexican">Mexican</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="edit-item-name" className="font-bold text-dark">
              Name
            </Label>
            <Input
              id="edit-item-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alfredo Pasta"
              className={fieldInput}
            />
          </div>

          <div className="grid min-h-0 flex-1 gap-2">
            <Label
              htmlFor="edit-item-description"
              className="font-bold text-dark"
            >
              Description and Nutritional Information
            </Label>
            <Textarea
              id="edit-item-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Alfredo Pasta..."
              className={cn(fieldTextarea, "min-h-44 resize-y sm:min-h-52")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="edit-item-price" className="font-bold text-dark">
              Price
            </Label>
            <div className="flex overflow-hidden rounded-lg border border-brand bg-white shadow-none ring-brand/20 focus-within:ring-2 focus-within:ring-brand/25">
              <span className="flex shrink-0 items-center border-r border-brand/40 bg-white px-3 text-sm font-semibold text-dark">
                $
              </span>
              <Input
                id="edit-item-price"
                name="price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="19.99"
                className="h-10 flex-1 rounded-none border-0 bg-white px-3 text-dark shadow-none placeholder:text-gray focus-visible:ring-0 md:text-sm"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item-calories" className="font-bold text-dark">
              Calorie Count
            </Label>
            <Input
              id="edit-item-calories"
              name="calories"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="1024"
              className={fieldInput}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item-dietary" className="font-bold text-dark">
              Dietary Tags
            </Label>
            <Input
              id="edit-item-dietary"
              name="dietary"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Halal, Vegetarian"
              className={fieldInput}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button
          type="button"
          className="h-12 w-full rounded-xl bg-brand text-base font-bold text-white shadow-none hover:bg-brand/95"
          onClick={() => onOpenChange(false)}
        >
          Save changes
        </Button>
      </div>
    </DialogContent>
  );
}

export function EditItemDialog({ open, onOpenChange, item }: EditItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {item ? (
        <EditItemDialogBody
          key={item.defaultOrder}
          item={item}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}
