"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import {
  MENU_CATEGORIES,
  categoryLabelToSlug,
  categorySlugToLabel,
} from "@/lib/menu/category-options";
import { parseDollarsToCents, type MenuTableRow } from "@/lib/menu/types";
import { cn } from "@/lib/utils";

const brandSelectTrigger =
  "h-10 w-full min-w-0 justify-between rounded-lg border-brand bg-brand px-3 text-left text-sm font-medium text-white shadow-none focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/40 data-placeholder:text-white/85 [&_svg]:text-white [&_[data-slot=select-value]]:text-left";

const fieldInput =
  "h-10 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

const fieldTextarea =
  "min-h-36 rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm";

function priceToInputValue(price: string): string {
  return price.replace(/[^0-9.]/g, "");
}

export type EditItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuTableRow | null;
  cuisineDisplay: string;
  onSave: (id: string, values: EditMenuItemPayload) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

export type EditMenuItemPayload = {
  name: string;
  description: string;
  price_cents: number;
  categoryLabel: string;
  dietary: string;
  calories: string;
  image_url: string | null;
  is_available: boolean;
};

function EditItemDialogBody({
  item,
  cuisineDisplay,
  onOpenChange,
  onSave,
  onDelete,
}: {
  item: MenuTableRow;
  cuisineDisplay: string;
  onOpenChange: (open: boolean) => void;
  onSave: EditItemDialogProps["onSave"];
  onDelete: EditItemDialogProps["onDelete"];
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(priceToInputValue(item.price));
  const [calories, setCalories] = useState(item.calories);
  const [dietary, setDietary] = useState(item.dietary);
  const [categorySlug, setCategorySlug] = useState<string>(() =>
    categoryLabelToSlug(item.category),
  );
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");
  const [isAvailable, setIsAvailable] = useState(item.is_available);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(item.name);
    setDescription(item.description);
    setPrice(priceToInputValue(item.price));
    setDietary(item.dietary);
    setCategorySlug(categoryLabelToSlug(item.category));
    setImageUrl(item.image_url ?? "");
    setIsAvailable(item.is_available);
    setCalories(item.calories);
    setError(null);
    setDeleting(false);
  }, [item]);

  async function handleDelete() {
    setError(null);
    const ok = window.confirm(
      "Delete this menu item permanently? This will fail if the item is referenced by an order.",
    );
    if (!ok) return;
    setDeleting(true);
    const res = await onDelete(item.id);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete item.");
      return;
    }
    onOpenChange(false);
  }

  async function handleSave() {
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
    setSaving(true);
    const trimmedUrl = imageUrl.trim();
    const res = await onSave(item.id, {
      name: name.trim(),
      description: description.trim(),
      price_cents,
      categoryLabel: categorySlugToLabel(categorySlug),
      dietary: dietary.trim(),
      calories: calories.trim(),
      image_url: trimmedUrl === "" ? null : trimmedUrl,
      is_available: isAvailable,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save changes.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <DialogContent
      showCloseButton
      overlayClassName="bg-black/55 backdrop-blur-[2px] supports-backdrop-filter:backdrop-blur-sm"
      className={cn(
        "max-h-[min(92vh,calc(100%-2rem))] overflow-y-auto rounded-3xl border-0 bg-white p-6 text-dark shadow-xl ring-0 sm:max-w-5xl sm:p-8",
        "gap-0 data-[slot=dialog-close]:text-dark",
      )}
    >
      <DialogTitle className="text-left text-xl font-bold tracking-tight text-dark">
        Edit Item
      </DialogTitle>

      <div className="mt-6 grid grid-cols-1 gap-6 font-sans md:grid-cols-3 md:gap-8">
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="edit-item-image-url" className="font-bold text-dark">
              Image URL (optional)
            </Label>
            <Input
              id="edit-item-image-url"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className={fieldInput}
              autoComplete="off"
            />
            {item.image_url ? (
              <p className="text-xs text-gray-dark">
                Current:{" "}
                <a
                  href={item.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline"
                >
                  link
                </a>
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item-category" className="font-bold text-dark">
              Category
            </Label>
            <Select value={categorySlug} onValueChange={setCategorySlug}>
              <SelectTrigger id="edit-item-category" className={brandSelectTrigger}>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {MENU_CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <span className="font-bold text-dark">Cuisine</span>
            <p className="rounded-lg border border-brand/25 bg-light/80 px-3 py-2 text-sm text-dark">
              {cuisineDisplay}
            </p>
            <p className="text-xs text-gray-dark">
              Set on your restaurant profile (cuisine tags).
            </p>
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
              placeholder="Margherita Pizza"
              className={fieldInput}
            />
          </div>

          <div className="grid min-h-0 flex-1 gap-2">
            <Label htmlFor="edit-item-description" className="font-bold text-dark">
              Description
            </Label>
            <Textarea
              id="edit-item-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wood-fired crust, fresh mozzarella…"
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
              Calorie count (optional)
            </Label>
            <Input
              id="edit-item-calories"
              name="calories"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="480"
              className={fieldInput}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item-dietary" className="font-bold text-dark">
              Dietary tags
            </Label>
            <Input
              id="edit-item-dietary"
              name="dietary"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Vegetarian, Gluten-free"
              className={fieldInput}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-dark">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="size-4 shrink-0 rounded border-brand text-brand accent-brand"
            />
            Available on menu
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <Button
          type="button"
          variant="destructive"
          disabled={saving || deleting}
          className="h-11 w-full rounded-xl border border-red-600/30 bg-red-50 text-base font-bold text-red-700 shadow-none hover:bg-red-100 disabled:opacity-60"
          onClick={() => void handleDelete()}
        >
          <Trash2 className="mr-2 size-4" aria-hidden />
          {deleting ? "Removing…" : "Delete item"}
        </Button>
        <Button
          type="button"
          disabled={saving || deleting}
          className="h-12 w-full rounded-xl bg-brand text-base font-bold text-white shadow-none hover:bg-brand/95 disabled:opacity-60"
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </DialogContent>
  );
}

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  cuisineDisplay,
  onSave,
  onDelete,
}: EditItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {item ? (
        <EditItemDialogBody
          key={item.id}
          item={item}
          cuisineDisplay={cuisineDisplay}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : null}
    </Dialog>
  );
}
