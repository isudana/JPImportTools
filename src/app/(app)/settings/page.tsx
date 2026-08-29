"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VehicleReferencePrice } from "@/lib/types";

type FormState = {
  name: string;
  model_code: string;
  display_name: string;
  grade: string;
  capacity: string;
  fuel: "Petrol" | "Hybrid" | "Series_Hybrid";
  website_value_jpy: string;
  shipping_insurance_jpy: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  model_code: "",
  display_name: "",
  grade: "",
  capacity: "",
  fuel: "Petrol",
  website_value_jpy: "",
  shipping_insurance_jpy: "",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });
}

function previewCif(websiteValue: string, shippingInsurance: string): number | null {
  const wv = Number(websiteValue);
  const si = Number(shippingInsurance);
  if (!Number.isFinite(wv) || !Number.isFinite(si)) return null;
  return Math.round((((wv * 100) / 110) * 0.85 + si) * 100) / 100;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<VehicleReferencePrice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  async function refresh() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("vehicle_reference_prices")
      .select("*")
      .order("name");
    setLoading(false);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setVehicles((data ?? []) as VehicleReferencePrice[]);
  }

  useEffect(() => {
    supabase
      .from("vehicle_reference_prices")
      .select("*")
      .order("name")
      .then(({ data, error: queryError }) => {
        setLoading(false);
        if (queryError) {
          setError(queryError.message);
          return;
        }
        setVehicles((data ?? []) as VehicleReferencePrice[]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) => v.name.toLowerCase().includes(q) || (v.display_name ?? "").toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  function toPayload(form: FormState) {
    return {
      name: form.name.trim(),
      model_code: form.model_code.trim() || null,
      display_name: form.display_name.trim() || null,
      grade: form.grade.trim() || null,
      capacity: Number(form.capacity),
      fuel: form.fuel,
      website_value_jpy: Number(form.website_value_jpy),
      shipping_insurance_jpy: Number(form.shipping_insurance_jpy),
    };
  }

  function validate(form: FormState): string | null {
    if (!form.name.trim()) return "Enter a vehicle name.";
    if (!Number.isFinite(Number(form.capacity)) || Number(form.capacity) <= 0) return "Enter a valid capacity.";
    if (!Number.isFinite(Number(form.website_value_jpy)) || Number(form.website_value_jpy) <= 0)
      return "Enter a valid website value.";
    if (!Number.isFinite(Number(form.shipping_insurance_jpy)) || Number(form.shipping_insurance_jpy) < 0)
      return "Enter a valid shipping & insurance amount.";
    return null;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate(addForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    const { error: insertError } = await supabase.from("vehicle_reference_prices").insert(toPayload(addForm));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAddForm(EMPTY_FORM);
    refresh();
  }

  function startEdit(v: VehicleReferencePrice) {
    setEditingId(v.id);
    setEditForm({
      name: v.name,
      model_code: v.model_code ?? "",
      display_name: v.display_name ?? "",
      grade: v.grade ?? "",
      capacity: String(v.capacity),
      fuel: (v.fuel === "Hybrid" || v.fuel === "Series_Hybrid" ? v.fuel : "Petrol") as FormState["fuel"],
      website_value_jpy: String(v.website_value_jpy),
      shipping_insurance_jpy: String(v.shipping_insurance_jpy),
    });
  }

  async function handleEditSave(id: string) {
    setError(null);
    const validationError = validate(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    const { error: updateError } = await supabase
      .from("vehicle_reference_prices")
      .update(toPayload(editForm))
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error: deleteError } = await supabase.from("vehicle_reference_prices").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    refresh();
  }

  const addCif = previewCif(addForm.website_value_jpy, addForm.shipping_insurance_jpy);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage the vehicle reference prices used by the Tax Calculator.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-900">Add Vehicle</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            placeholder="Name"
            className="col-span-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 sm:col-span-4"
          />
          <input
            value={addForm.model_code}
            onChange={(e) => setAddForm({ ...addForm, model_code: e.target.value })}
            placeholder="Model Code"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
          <input
            value={addForm.display_name}
            onChange={(e) => setAddForm({ ...addForm, display_name: e.target.value })}
            placeholder="Display Name"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
          <input
            value={addForm.grade}
            onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}
            placeholder="Grade"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
          <select
            value={addForm.fuel}
            onChange={(e) => setAddForm({ ...addForm, fuel: e.target.value as FormState["fuel"] })}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="Petrol">Petrol</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Series_Hybrid">Series Hybrid</option>
          </select>
          <input
            value={addForm.capacity}
            onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })}
            placeholder={addForm.fuel === "Series_Hybrid" ? "Motor Power (kW)" : "Capacity (cc)"}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
          <input
            value={addForm.website_value_jpy}
            onChange={(e) => setAddForm({ ...addForm, website_value_jpy: e.target.value })}
            placeholder="Website Value (JPY, with taxes)"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
          <input
            value={addForm.shipping_insurance_jpy}
            onChange={(e) => setAddForm({ ...addForm, shipping_insurance_jpy: e.target.value })}
            placeholder="Avg Shipping & Insurance (JPY)"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {addCif != null ? `Computed CIF: JPY ${addCif.toLocaleString()}` : "Enter website value and shipping & insurance to preview CIF"}
          </p>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Vehicle
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicles…"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs text-gray-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Fuel</th>
                  <th className="px-3 py-2">Capacity</th>
                  <th className="px-3 py-2">Website Value</th>
                  <th className="px-3 py-2">Shipping & Ins.</th>
                  <th className="px-3 py-2">CIF (JPY)</th>
                  <th className="px-3 py-2">Last Modified</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) =>
                  editingId === v.id ? (
                    <tr key={v.id} className="border-b border-gray-100 align-top">
                      <td className="px-3 py-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        />
                        <div className="mt-1 grid grid-cols-3 gap-1">
                          <input
                            value={editForm.model_code}
                            onChange={(e) => setEditForm({ ...editForm, model_code: e.target.value })}
                            placeholder="Model Code"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          />
                          <input
                            value={editForm.display_name}
                            onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                            placeholder="Display Name"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          />
                          <input
                            value={editForm.grade}
                            onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                            placeholder="Grade"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.fuel}
                          onChange={(e) => setEditForm({ ...editForm, fuel: e.target.value as FormState["fuel"] })}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        >
                          <option value="Petrol">Petrol</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Series_Hybrid">Series Hybrid</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={editForm.capacity}
                          onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                          className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={editForm.website_value_jpy}
                          onChange={(e) => setEditForm({ ...editForm, website_value_jpy: e.target.value })}
                          className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={editForm.shipping_insurance_jpy}
                          onChange={(e) => setEditForm({ ...editForm, shipping_insurance_jpy: e.target.value })}
                          className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {previewCif(editForm.website_value_jpy, editForm.shipping_insurance_jpy)?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(v.updated_at)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          onClick={() => handleEditSave(v.id)}
                          className="mr-2 text-xs font-medium text-gray-900 hover:underline"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={v.id} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-400">
                          {[v.model_code, v.display_name, v.grade].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{v.fuel}</td>
                      <td className="px-3 py-2 text-gray-600">{v.capacity}</td>
                      <td className="px-3 py-2 text-gray-600">{v.website_value_jpy.toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-600">{v.shipping_insurance_jpy.toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-600">{v.cif_jpy.toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(v.updated_at)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button onClick={() => startEdit(v)} className="mr-2 text-xs font-medium text-gray-900 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(v.id, v.name)} className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-gray-500">
                      No vehicles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
