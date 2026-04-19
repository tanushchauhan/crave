"use client";

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

const brandSelectTrigger =
  "h-10 w-full min-w-0 justify-between rounded-lg border-brand bg-brand px-3 text-left text-sm font-medium text-white shadow-none focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/40 data-placeholder:text-white/85 [&_svg]:text-white [&_[data-slot=select-value]]:text-left";

const fieldInput =
  "h-10 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

const fieldTextarea =
  "min-h-36 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        overlayClassName="bg-black/55 backdrop-blur-[2px] supports-backdrop-filter:backdrop-blur-sm"
        className={cn(
          "max-h-[min(92vh,calc(100%-2rem))] overflow-y-auto rounded-3xl border-0 bg-white p-6 text-dark shadow-xl ring-0 sm:max-w-5xl sm:p-8",
          "gap-0 data-[slot=dialog-close]:text-dark"
        )}
      >
        <DialogTitle className="text-left text-xl font-bold tracking-tight text-dark">
          Add Item
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
              <Label htmlFor="add-item-category" className="font-bold text-dark">
                Category
              </Label>
              <Select defaultValue="appetizer">
                <SelectTrigger
                  id="add-item-category"
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
              <Label htmlFor="add-item-cuisine" className="font-bold text-dark">
                Cuisine
              </Label>
              <Select defaultValue="italian">
                <SelectTrigger
                  id="add-item-cuisine"
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
              <Label htmlFor="add-item-name" className="font-bold text-dark">
                Name
              </Label>
              <Input
                id="add-item-name"
                name="name"
                placeholder="Alfredo Pasta"
                className={fieldInput}
              />
            </div>

            <div className="grid min-h-0 flex-1 gap-2">
              <Label
                htmlFor="add-item-description"
                className="font-bold text-dark"
              >
                Description and Nutritional Information
              </Label>
              <Textarea
                id="add-item-description"
                name="description"
                placeholder="Alfredo Pasta..."
                className={cn(fieldTextarea, "min-h-44 resize-y sm:min-h-52")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="add-item-price" className="font-bold text-dark">
                Price
              </Label>
              <div className="flex overflow-hidden rounded-lg border border-brand bg-white shadow-none ring-brand/20 focus-within:ring-2 focus-within:ring-brand/25">
                <span className="flex shrink-0 items-center border-r border-brand/40 bg-white px-3 text-sm font-semibold text-dark">
                  $
                </span>
                <Input
                  id="add-item-price"
                  name="price"
                  inputMode="decimal"
                  placeholder="19.99"
                  className="h-10 flex-1 rounded-none border-0 bg-white px-3 text-dark shadow-none placeholder:text-gray focus-visible:ring-0 md:text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-calories" className="font-bold text-dark">
                Calorie Count
              </Label>
              <Input
                id="add-item-calories"
                name="calories"
                inputMode="numeric"
                placeholder="1024"
                className={fieldInput}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-dietary" className="font-bold text-dark">
                Dietary Tags
              </Label>
              <Select>
                <SelectTrigger
                  id="add-item-dietary"
                  className={cn(brandSelectTrigger, "text-sm")}
                >
                  <SelectValue placeholder="Select All From Dropdown" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="halal">Halal</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="gluten">Gluten</SelectItem>
                  <SelectItem value="nuts">Nuts</SelectItem>
                  <SelectItem value="dairy">Dairy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-brand text-base font-bold text-white shadow-none hover:bg-brand/95"
            onClick={() => onOpenChange(false)}
          >
            Add Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
