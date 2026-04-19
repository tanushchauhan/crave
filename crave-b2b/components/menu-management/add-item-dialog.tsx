"use client";

import { useEffect, useState } from "react";
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
import { MENU_CATEGORIES } from "@/lib/menu/category-options";
import { parseDollarsToCents } from "@/lib/menu/types";
import { cn } from "@/lib/utils";

const brandSelectTrigger =
  "h-10 w-full min-w-0 justify-between rounded-lg border-brand bg-brand px-3 text-left text-sm font-medium text-white shadow-none focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/40 data-placeholder:text-white/85 [&_svg]:text-white [&_[data-slot=select-value]]:text-left";

const fieldInput =
  "h-10 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

const fieldTextarea =
  "min-h-36 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

export type NewMenuItemPayload = {
  name: string;
  description: string;
  price_cents: number;
  categoryLabel: string;
  dietary: string;
  calories: string;
  image_url: string | null;
};

export type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuisineDisplay: string;
  onCreate: (payload: NewMenuItemPayload) => Promise<{ ok: boolean; error?: string }>;
};

export function AddItemDialog({
  open,
  onOpenChange,
  cuisineDisplay,
  onCreate,
}: AddItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [calories, setCalories] = useState("");
  const [dietary, setDietary] = useState("");
  const [categorySlug, setCategorySlug] = useState<string>("appetizer");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setPrice("");
    setCalories("");
    setDietary("");
    setCategorySlug("appetizer");
    setImageUrl("");
    setError(null);
  }, [open]);

  async function handleAdd() {
    setError(null);
    const price_cents = parseDollarsToCents(price);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (price_cents === null) {
      setError("Enter a valid price.");
      return;
    }
    const label =
      MENU_CATEGORIES.find((c) => c.slug === categorySlug)?.label ?? "Appetizer";
    setSaving(true);
    const trimmedUrl = imageUrl.trim();
    const res = await onCreate({
      name: name.trim(),
      description: description.trim(),
      price_cents,
      categoryLabel: label,
      dietary: dietary.trim(),
      calories: calories.trim(),
      image_url: trimmedUrl === "" ? null : trimmedUrl,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not add item.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        overlayClassName="bg-black/55 backdrop-blur-[2px] supports-backdrop-filter:backdrop-blur-sm"
        className={cn(
          "max-h-[min(92vh,calc(100%-2rem))] overflow-y-auto rounded-3xl border-0 bg-white p-6 text-dark shadow-xl ring-0 sm:max-w-5xl sm:p-8",
          "gap-0 data-[slot=dialog-close]:text-dark",
        )}
      >
        <DialogTitle className="text-left text-xl font-bold tracking-tight text-dark">
          Add Item
        </DialogTitle>

        <div className="mt-6 grid grid-cols-1 gap-6 font-sans md:grid-cols-3 md:gap-8">
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="add-item-image-url" className="font-bold text-dark">
                Image URL (optional)
              </Label>
              <Input
                id="add-item-image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className={fieldInput}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-category" className="font-bold text-dark">
                Category
              </Label>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger id="add-item-category" className={brandSelectTrigger}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.filter((c) => c.slug !== "uncategorized").map(
                    (c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <span className="font-bold text-dark">Cuisine</span>
              <p className="rounded-lg border border-brand/25 bg-light/80 px-3 py-2 text-sm text-dark">
                {cuisineDisplay}
              </p>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Margherita Pizza"
                className={fieldInput}
              />
            </div>

            <div className="grid min-h-0 flex-1 gap-2">
              <Label htmlFor="add-item-description" className="font-bold text-dark">
                Description
              </Label>
              <Textarea
                id="add-item-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Wood-fired crust…"
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
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="19.99"
                  className="h-10 flex-1 rounded-none border-0 bg-white px-3 text-dark shadow-none placeholder:text-gray focus-visible:ring-0 md:text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-calories" className="font-bold text-dark">
                Calorie count (optional)
              </Label>
              <Input
                id="add-item-calories"
                name="calories"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="480"
                className={fieldInput}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-dietary" className="font-bold text-dark">
                Dietary tags
              </Label>
              <Input
                id="add-item-dietary"
                name="dietary"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Vegetarian, Nuts"
                className={fieldInput}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8">
          <Button
            type="button"
            disabled={saving}
            className="h-12 w-full rounded-xl bg-brand text-base font-bold text-white shadow-none hover:bg-brand/95 disabled:opacity-60"
            onClick={() => void handleAdd()}
          >
            {saving ? "Adding…" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
