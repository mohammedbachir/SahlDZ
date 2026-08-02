import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X, ChefHat, Search, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/ops/recipes")({
  component: OpsRecipes,
});

type MenuItem = { id: string; name: string; price: number; category_id: string | null };
type Category = { id: string; name: string };
type Ingredient = { id: string; name: string; unit: string; cost_per_unit: number };
type Recipe = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n);
}

function OpsRecipes() {
  useTranslation();
  const { restaurantId, loading: restaurantLoading } = useRestaurantId();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCat, setNewCat] = useState("");

  const [open, setOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [draft, setDraft] = useState<{ ingredient_id: string; quantity: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ingMap = useMemo(() => {
    const m = new Map<string, Ingredient>();
    for (const i of ingredients) m.set(i.id, i);
    return m;
  }, [ingredients]);

  const recipesByItem = useMemo(() => {
    const m = new Map<string, Recipe[]>();
    for (const r of recipes) {
      const arr = m.get(r.menu_item_id) ?? [];
      arr.push(r);
      m.set(r.menu_item_id, arr);
    }
    return m;
  }, [recipes]);

  const itemCost = (itemId: string) => {
    const rs = recipesByItem.get(itemId) ?? [];
    let total = 0;
    for (const r of rs) {
      const ing = ingMap.get(r.ingredient_id);
      if (ing) total += Number(ing.cost_per_unit) * Number(r.quantity);
    }
    return total;
  };

  const loadAll = async (rid: string) => {
    const [m, i, r, c] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id,name,price,category_id")
        .eq("restaurant_id", rid),
      supabase
        .from("ingredients")
        .select("id,name,unit,cost_per_unit")
        .eq("restaurant_id", rid),
      supabase
        .from("menu_item_recipes")
        .select("id,menu_item_id,ingredient_id,quantity")
        .eq("restaurant_id", rid),
      supabase
        .from("categories")
        .select("id,name")
        .eq("restaurant_id", rid),
    ]);
    const menuItems = (m.data ?? []) as MenuItem[];
    menuItems.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const ings = (i.data ?? []) as Ingredient[];
    ings.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const cats = (c.data ?? []) as Category[];
    cats.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    setItems(menuItems);
    setCategories(cats);
    setIngredients(ings);
    setRecipes((r.data ?? []) as Recipe[]);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurantLoading) return;
    if (!restaurantId) {
      // Mock data for preview
      setItems([
        { id: "m1", name: "بيتزا مارغريتا", price: 1200, category_id: "c1" },
        { id: "m2", name: "شاورما لحم", price: 800, category_id: "c1" },
        { id: "m3", name: "برغر دجاج", price: 900, category_id: "c1" },
        { id: "m4", name: "كباب لحم", price: 1100, category_id: "c1" },
        { id: "m5", name: "سلطة سيزر", price: 700, category_id: "c2" },
        { id: "m6", name: "فرينش فرايز", price: 450, category_id: "c2" },
      ]);
      setCategories([
        { id: "c1", name: "أطباق رئيسية" },
        { id: "c2", name: "مقبلات" },
        { id: "c3", name: "مشروبات" },
      ]);
      setIngredients([
        { id: "ing1", name: "فرينة", unit: "كيلو", cost_per_unit: 80 },
        { id: "ing2", name: "طماطم", unit: "كيلو", cost_per_unit: 80 },
        { id: "ing3", name: "جبنة موزاريلا", unit: "كيلو", cost_per_unit: 1200 },
        { id: "ing4", name: "لحم بقري مفروم", unit: "كيلو", cost_per_unit: 1200 },
        { id: "ing5", name: "دجاج", unit: "كيلو", cost_per_unit: 450 },
        { id: "ing6", name: "خبز عربي", unit: "حبة", cost_per_unit: 20 },
        { id: "ing7", name: "خس", unit: "كيلو", cost_per_unit: 150 },
        { id: "ing8", name: "بطاطس", unit: "كيلو", cost_per_unit: 80 },
        { id: "ing9", name: "صلصة حارة", unit: "لتر", cost_per_unit: 200 },
        { id: "ing10", name: "زبادي", unit: "لتر", cost_per_unit: 150 },
      ]);
      setRecipes([
        // بيتزا مارغريتا
        { id: "r1", menu_item_id: "m1", ingredient_id: "ing1", quantity: 0.2 },  // 200g فرينة
        { id: "r2", menu_item_id: "m1", ingredient_id: "ing2", quantity: 0.1 },  // 100g طماطم
        { id: "r3", menu_item_id: "m1", ingredient_id: "ing3", quantity: 0.15 }, // 150g جبنة
        // شاورما لحم
        { id: "r4", menu_item_id: "m2", ingredient_id: "ing4", quantity: 0.2 },  // 200g لحم
        { id: "r5", menu_item_id: "m2", ingredient_id: "ing6", quantity: 1 },     // خبز
        { id: "r6", menu_item_id: "m2", ingredient_id: "ing7", quantity: 0.05 }, // 50g خس
        { id: "r7", menu_item_id: "m2", ingredient_id: "ing9", quantity: 0.03 }, // 30ml صلصة
        // برغر دجاج
        { id: "r8", menu_item_id: "m3", ingredient_id: "ing5", quantity: 0.18 }, // 180g دجاج
        { id: "r9", menu_item_id: "m3", ingredient_id: "ing6", quantity: 1 },     // خبز برغر
        { id: "r10", menu_item_id: "m3", ingredient_id: "ing7", quantity: 0.03 },// 30g خس
        // كباب لحم
        { id: "r11", menu_item_id: "m4", ingredient_id: "ing4", quantity: 0.25 },// 250g لحم
        { id: "r12", menu_item_id: "m4", ingredient_id: "ing2", quantity: 0.05 },// 50g طماطم
        // سلطة سيزر
        { id: "r13", menu_item_id: "m5", ingredient_id: "ing7", quantity: 0.15 },// 150g خس
        { id: "r14", menu_item_id: "m5", ingredient_id: "ing3", quantity: 0.05 },// 50g جبنة
        // فرينش فرايز
        { id: "r15", menu_item_id: "m6", ingredient_id: "ing8", quantity: 0.2 },  // 200g بطاطس
      ]);
      setLoading(false);
      return;
    }
    void loadAll(restaurantId);
  }, [restaurantId, restaurantLoading]);

  const openItem = (it: MenuItem) => {
    setCreatingNew(false);
    setActiveItem(it);
    const existing = recipesByItem.get(it.id) ?? [];
    setDraft(
      existing.length
        ? existing.map((r) => ({ ingredient_id: r.ingredient_id, quantity: String(r.quantity) }))
        : [{ ingredient_id: "", quantity: "" }],
    );
    setOpen(true);
  };

  const openNewRecipe = () => {
    setCreatingNew(true);
    setActiveItem(null);
    setNewName("");
    setNewPrice("");
    setNewCat(categories[0]?.id ?? "");
    setDraft([{ ingredient_id: "", quantity: "" }]);
    setOpen(true);
  };

  const save = async () => {
    if (!restaurantId) return;
    const clean = draft
      .map((d) => ({
        ingredient_id: d.ingredient_id,
        quantity: Number(d.quantity),
      }))
      .filter((d) => d.ingredient_id && d.quantity > 0);

    setSaving(true);

    if (creatingNew) {
      if (!newName.trim()) {
        toast.error(tx("أدخل اسم الصنف"));
        setSaving(false);
        return;
      }
      if (clean.length === 0) {
        toast.error(tx("أضف مكوّناً واحداً على الأقل"));
        setSaving(false);
        return;
      }
      const { data: created, error: itErr } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          name: newName.trim(),
          price: Number(newPrice) || 0,
          category_id: newCat || null,
        })
        .select("*")
        .single();
      if (itErr || !created) {
        toast.error(itErr?.message ?? tx("فشل إنشاء الصنف"));
        setSaving(false);
        return;
      }
      const { error: insErr } = await supabase.from("menu_item_recipes").insert(
        clean.map((c) => ({
          restaurant_id: restaurantId,
          menu_item_id: created.id,
          ingredient_id: c.ingredient_id,
          quantity: c.quantity,
        })),
      );
      if (insErr) {
        toast.error(tx("فشل حفظ الوصفة"));
        setSaving(false);
        return;
      }
      toast.success(tx("تمت إضافة الوصفة"));
      setOpen(false);
      setSaving(false);
      await loadAll(restaurantId);
      return;
    }

    if (!activeItem) {
      setSaving(false);
      return;
    }
    const { error: delErr } = await supabase
      .from("menu_item_recipes")
      .delete()
      .eq("menu_item_id", activeItem.id);
    if (delErr) {
      toast.error(tx("فشل الحفظ"));
      setSaving(false);
      return;
    }
    if (clean.length) {
      const { error: insErr } = await supabase.from("menu_item_recipes").insert(
        clean.map((c) => ({
          restaurant_id: restaurantId,
          menu_item_id: activeItem.id,
          ingredient_id: c.ingredient_id,
          quantity: c.quantity,
        })),
      );
      if (insErr) {
        toast.error(tx("فشل الحفظ"));
        setSaving(false);
        return;
      }
    }
    toast.success(tx("تم حفظ الوصفة"));
    setOpen(false);
    setSaving(false);
    await loadAll(restaurantId);
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const orphanCount = items.filter((i) => i.category_id === null).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOrphans = () => {
    setSelected(new Set(items.filter((i) => i.category_id === null).map((i) => i.id)));
  };

  const deleteSelected = async () => {
    if (!restaurantId || selected.size === 0) return;
    setDeleting(true);
    // FK: recipes cascade on item delete; old orders keep name/price snapshots
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .in("id", [...selected])
      .eq("restaurant_id", restaurantId);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast.error(tx("فشل الحذف"));
      return;
    }
    toast.success(`تم حذف ${selected.size} صنف نهائياً`);
    setSelected(new Set());
    await loadAll(restaurantId);
  };

  return (
    <div className="p-2 space-y-3" dir="rtl">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3" data-annotate="ops-recipes-header">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[var(--primary)]" />
              {tx("وصفات الأصناف")}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {tx("اربط كل صنف بالمكونات المستهلكة. عند تأكيد الدفع يُنقص المخزون تلقائياً.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tx("بحث صنف...")}
                className="pr-8 w-48 h-8 text-xs"
              />
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openNewRecipe}>
              <Plus className="w-3.5 h-3.5" /> {tx("إضافة وصفة")}
            </Button>
          </div>
        </div>
        {(orphanCount > 0 || selected.size > 0) && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-[var(--border)]">
            {orphanCount > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-[11px]" onClick={selectOrphans}>
                <ListChecks className="w-3.5 h-3.5" />
                غير المصنفة ({orphanCount})
              </Button>
            )}
            {selected.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 h-7 text-[11px]"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف ({selected.size})
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setSelected(new Set())}>
                  إلغاء
                </Button>
              </>
            )}
            {orphanCount > 0 && (
              <span className="text-[11px] text-[var(--muted-foreground)]">
                أصناف بدون تصنيف
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">{tx("جاري التحميل…")}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-8 text-center text-[var(--muted-foreground)] text-sm">
          {tx("لا توجد أصناف.")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {filtered.map((it) => {
            const rs = recipesByItem.get(it.id) ?? [];
            const cost = itemCost(it.id);
            const margin = Number(it.price) - cost;
            const marginPct = it.price > 0 ? (margin / Number(it.price)) * 100 : 0;
            return (
              <div
                key={it.id}
                data-annotate="ops-recipe-card"
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                onClick={() => openItem(it)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
                      <Checkbox
                        checked={selected.has(it.id)}
                        onCheckedChange={() => toggleSelect(it.id)}
                        aria-label={`تحديد ${it.name}`}
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{it.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {fmt(Number(it.price))} دج
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        rs.length === 0
                          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                          : "bg-[var(--primary)]/10 text-[var(--primary)]"
                      }`}
                    >
                      {rs.length === 0 ? tx("بدون وصفة") : (rs.length) + tx(" مكوّن")}
                    </div>
                    {it.category_id === null && (
                      <div className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        غير مصنف
                      </div>
                    )}
                  </div>
                </div>
                {rs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-xs" data-annotate="ops-recipe-cost">
                    <div>
                      <div className="text-[var(--muted-foreground)]">{tx("تكلفة")}</div>
                      <div className="font-semibold">{fmt(cost)} دج</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-foreground)]">{tx("ربح")}</div>
                      <div
                        className={`font-semibold ${
                          margin >= 0 ? "text-emerald-600" : "text-[var(--destructive)]"
                        }`}
                      >
                        {fmt(margin)} ({marginPct.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`حذف ${selected.size} صنف نهائياً؟`}
        description="الحذف نهائي ولا يمكن التراجع عنه. الطلبات القديمة وتقارير المبيعات لن تتأثر — تحتفظ باسم الصنف وسعره."
        confirmLabel={deleting ? "جاري الحذف…" : "نعم، احذف"}
        destructive
        onConfirm={() => void deleteSelected()}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{creatingNew ? tx("إضافة وصفة جديدة") : `وصفة: ${activeItem?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {creatingNew && (
              <div className="grid grid-cols-3 gap-2 pb-1">
                <div className="col-span-1">
                  <Label className="text-xs">{tx("اسم الصنف")}</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tx("مثال: طاجين")} />
                </div>
                <div>
                  <Label className="text-xs">{tx("السعر (دج)")}</Label>
                  <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs">{tx("الفئة")}</Label>
                  <Select value={newCat} onValueChange={setNewCat}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx("بدون تصنيف")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {draft.map((row, idx) => {
              const ing = ingMap.get(row.ingredient_id);
              return (
                <div key={idx} className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
                  <div>
                    {idx === 0 && <Label className="text-xs">{tx("المكوّن")}</Label>}
                    <Select
                      value={row.ingredient_id}
                      onValueChange={(v) => {
                        const next = [...draft];
                        next[idx] = { ...next[idx], ingredient_id: v };
                        setDraft(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tx("اختر...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {idx === 0 && <Label className="text-xs">الكمية {ing ? `(${ing.unit})` : ""}</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...draft];
                        next[idx] = { ...next[idx], quantity: e.target.value };
                        setDraft(next);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDraft(draft.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft([...draft, { ingredient_id: "", quantity: "" }])}
            >
              <Plus className="w-4 h-4 ml-1" /> {tx("إضافة مكوّن")}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tx("إلغاء")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? tx("جاري الحفظ…") : tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}