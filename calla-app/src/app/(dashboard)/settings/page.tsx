"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createBrowserClient, type Business } from "@/lib/supabase";
import { PLANS } from "@/lib/stripe";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type Tab = "business" | "ai" | "phone" | "integrations" | "billing";

interface TabConfig {
  id: Tab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "business", label: "Business Info" },
  { id: "ai", label: "AI Config" },
  { id: "phone", label: "Phone Number" },
  { id: "integrations", label: "Integrations" },
  { id: "billing", label: "Billing" },
];

// ---------------------------------------------------------------------------
// Days of week for business hours
// ---------------------------------------------------------------------------

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const supabase = createBrowserClient();

  const [activeTab, setActiveTab] = useState<Tab>("business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state per-tab (lifted to avoid re-fetch on tab switch)
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [servicesRaw, setServicesRaw] = useState(""); // comma-separated
  const [calendarUrl, setCalendarUrl] = useState("");
  const [crmWebhookUrl, setCrmWebhookUrl] = useState("");
  const [shieldEnabled, setShieldEnabled] = useState(true);
  const [businessHours, setBusinessHours] = useState<Record<DayKey, DayHours>>(
    defaultHours()
  );

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBusiness(data);
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setWebsite(data.website ?? "");
        setGreetingMessage(
          data.greeting_message ??
            "Thank you for calling. How can I help you today?"
        );
        setServicesRaw((data.services ?? []).join(", "));
        setCalendarUrl(data.calendar_url ?? "");
        setCrmWebhookUrl(data.crm_webhook_url ?? "");
        setShieldEnabled(data.calla_shield_enabled ?? true);
        if (data.business_hours) {
          setBusinessHours(data.business_hours as Record<DayKey, DayHours>);
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    setSaveMessage(null);

    const services = servicesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        address: address || null,
        website: website || null,
        greeting_message: greetingMessage,
        services,
        business_hours: businessHours,
        calendar_url: calendarUrl || null,
        crm_webhook_url: crmWebhookUrl || null,
        calla_shield_enabled: shieldEnabled,
      })
      .eq("id", business.id);

    setSaving(false);

    if (error) {
      setSaveMessage({ type: "error", text: "Failed to save. " + error.message });
    } else {
      setSaveMessage({ type: "success", text: "Settings saved." });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  function toggleDayClosed(day: DayKey) {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed },
    }));
  }

  function updateDayHours(day: DayKey, field: "open" | "close", val: string) {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: val },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your business profile, AI behaviour, integrations, and billing.
        </p>
      </div>

      {/* Tab nav */}
      <div className="mb-8 flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Save feedback */}
      {saveMessage && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ring-1 ${
            saveMessage.type === "success"
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-red-50 text-red-700 ring-red-200"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* ---------------------------------------------------------------- */}
        {/* Business Info Tab                                                 */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "business" && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Business Information
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Business name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Acme Plumbing Co."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Anytown, ST 00000"
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  className="input"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Business hours
              </h3>
              <div className="space-y-2">
                {DAYS.map(({ key, label }) => {
                  const day = businessHours[key] ?? defaultDay();
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-24">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!day.closed}
                            onChange={() => toggleDayClosed(key)}
                            className="rounded border-gray-300 text-emerald-brand focus:ring-emerald-brand"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      </div>
                      {!day.closed ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) =>
                              updateDayHours(key, "open", e.target.value)
                            }
                            className="input w-32 text-sm"
                          />
                          <span className="text-gray-400 text-sm">to</span>
                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) =>
                              updateDayHours(key, "close", e.target.value)
                            }
                            className="input w-32 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          Closed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <SaveButton saving={saving} />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* AI Config Tab                                                     */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "ai" && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              AI Configuration
            </h2>

            <div>
              <label className="label">Greeting message</label>
              <p className="text-xs text-gray-400 mb-2">
                The first thing CALLA says when it answers a call.
              </p>
              <textarea
                className="input min-h-[80px] resize-y"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder="Thank you for calling Acme Plumbing. How can I help you today?"
              />
            </div>

            <div>
              <label className="label">Services offered</label>
              <p className="text-xs text-gray-400 mb-2">
                Comma-separated list of services CALLA knows about.
              </p>
              <input
                className="input"
                value={servicesRaw}
                onChange={(e) => setServicesRaw(e.target.value)}
                placeholder="Emergency plumbing, Water heater installation, Drain cleaning"
              />
            </div>

            <div className="flex items-start gap-4 rounded-xl bg-gold-brand/10 p-5 ring-1 ring-gold-brand/30">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  CALLA SHIELD
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  After positive calls, CALLA sends a friendly SMS asking the
                  caller to leave a Google review — automatically.
                </p>
              </div>
              <label className="mt-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={shieldEnabled}
                  onChange={(e) => setShieldEnabled(e.target.checked)}
                />
                <div
                  className="relative h-6 w-11 rounded-full bg-gray-200
                              peer-checked:bg-emerald-brand transition-colors
                              after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5
                              after:rounded-full after:bg-white after:shadow
                              after:transition-transform peer-checked:after:translate-x-5"
                />
              </label>
            </div>

            <SaveButton saving={saving} />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Phone Number Tab                                                  */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "phone" && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Phone Number
            </h2>

            <div className="rounded-xl bg-emerald-brand p-6 text-cream">
              <p className="text-xs font-medium uppercase tracking-wider text-white/60 mb-1">
                Your CALLA number
              </p>
              <p className="text-4xl font-bold tracking-tight">
                {business?.phone_number ?? "Not yet assigned"}
              </p>
              <p className="mt-3 text-sm text-white/70">
                Forward this number from your existing business phone, or give
                it to customers directly. CALLA will answer every call.
              </p>
            </div>

            <div>
              <label className="label">Your real business number (for forwarding)</label>
              <p className="text-xs text-gray-400 mb-2">
                This is the number you forward calls FROM — your existing
                business line.
              </p>
              <input
                className="input bg-gray-50 cursor-not-allowed"
                value={business?.original_number ?? "Not set"}
                disabled
                readOnly
              />
              <p className="text-xs text-gray-400 mt-1.5">
                To change your forwarding number, contact support.
              </p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Integrations Tab                                                  */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "integrations" && (
          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Integrations
            </h2>

            <div>
              <label className="label">Google Calendar / booking URL</label>
              <p className="text-xs text-gray-400 mb-2">
                CALLA will share this link with callers who want to book an
                appointment. Works with Google Calendar, Cal.com, Calendly, etc.
              </p>
              <input
                className="input"
                type="url"
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                placeholder="https://cal.com/yourname"
              />
            </div>

            <div>
              <label className="label">CRM webhook URL</label>
              <p className="text-xs text-gray-400 mb-2">
                After each call, CALLA will POST call data (JSON) to this
                endpoint. Use it to push leads to your CRM, Zapier, or Make.
              </p>
              <input
                className="input font-mono text-sm"
                type="url"
                value={crmWebhookUrl}
                onChange={(e) => setCrmWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
            </div>

            <SaveButton saving={saving} />
          </div>
        )}
      </form>

      {/* ------------------------------------------------------------------ */}
      {/* Billing Tab (outside <form> — links only)                           */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "billing" && (
        <div className="space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Billing &amp; Plan
          </h2>

          {/* Current plan */}
          <div className="rounded-xl bg-gray-50 p-5 ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Current plan
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 capitalize">
                  {business?.plan ?? "Trial"}
                </p>
              </div>
              {business?.plan && business.plan !== "trial" && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-brand ring-1 ring-emerald-200">
                  Active
                </span>
              )}
            </div>

            {business?.plan === "trial" && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                You&apos;re on a free trial. Upgrade to keep CALLA answering your
                calls after the trial ends.
              </p>
            )}
          </div>

          {/* Plan comparison */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl p-5 ring-1 ${
                  plan.highlighted
                    ? "bg-emerald-brand text-cream ring-emerald-brand"
                    : "bg-white ring-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        plan.highlighted ? "text-cream" : "text-gray-900"
                      }`}
                    >
                      {plan.name}
                      {plan.highlighted && (
                        <span className="ml-2 rounded-full bg-gold-brand px-2 py-0.5 text-[10px] font-bold text-emerald-brand">
                          Popular
                        </span>
                      )}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-bold ${
                        plan.highlighted ? "text-cream" : "text-gray-900"
                      }`}
                    >
                      ${plan.monthlyPrice / 100}
                      <span
                        className={`text-sm font-normal ${
                          plan.highlighted ? "text-white/60" : "text-gray-400"
                        }`}
                      >
                        /mo
                      </span>
                    </p>
                  </div>
                  {business?.plan === plan.id && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        plan.highlighted
                          ? "bg-white/20 text-cream"
                          : "bg-emerald-50 text-emerald-brand"
                      }`}
                    >
                      Current
                    </span>
                  )}
                </div>
                <ul
                  className={`mt-4 space-y-1.5 text-xs ${
                    plan.highlighted ? "text-white/80" : "text-gray-500"
                  }`}
                >
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <span className="mt-px">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Stripe portal */}
          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500 mb-4">
              Manage your subscription, update payment method, or download
              invoices from the Stripe billing portal.
            </p>
            <a
              href="/api/billing/portal"
              className="btn-primary"
            >
              Open billing portal
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save button sub-component
// ---------------------------------------------------------------------------

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <div className="pt-2 border-t border-gray-100">
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default hours helpers
// ---------------------------------------------------------------------------

function defaultDay(): DayHours {
  return { open: "09:00", close: "17:00", closed: false };
}

function defaultHours(): Record<DayKey, DayHours> {
  return {
    mon: defaultDay(),
    tue: defaultDay(),
    wed: defaultDay(),
    thu: defaultDay(),
    fri: defaultDay(),
    sat: { open: "10:00", close: "14:00", closed: false },
    sun: { open: "09:00", close: "17:00", closed: true },
  };
}
