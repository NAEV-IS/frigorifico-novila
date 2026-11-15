import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, Award, BadgeCheck, BadgePercent, Banknote,
  BarChart3, BatteryFull, Beef, Bell, Bot, Boxes, CalendarDays, Check, CheckCheck, CheckCircle2,
  ChefHat, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign, ClipboardList,
  Clock, CookingPot, CreditCard, Drumstick, Filter, Flame, Gauge, HeartHandshake, HelpCircle,
  Info, LayoutDashboard, Lock, MapPin, Maximize2, Megaphone, MessageCircle, MessageSquareText,
  Mic, Minimize2, Minus, MoreVertical, Package, PackageSearch, Paperclip, PartyPopper, Pause,
  Phone, PiggyBank, Play, Plus, ReceiptText, RefreshCw, Repeat2, RotateCcw, Scale, Search, Send,
  ShieldCheck, ShoppingBag, ShoppingCart, Signal, Smartphone, Smile, Sparkles, Star, Store, Tag,
  Timer, TrendingUp, Trash2, UserRound, Users, Video, Volume2, Wallet, Warehouse, Wifi, X,
} from "lucide-react";
import {
  ASADO_PACKS, BRAND, CAMPAIGNS, CATEGORIES, INITIAL_CUSTOMERS, INITIAL_ORDERS, INITIAL_PRODUCTS,
  INITIAL_WHATSAPP_MESSAGES, PAYMENT_METHODS, PICKUP_SLOTS, TRANSFER_DATA, WHATSAPP_DEMO_PHONE,
  calcRaffleChances, firstName, formatKg, formatMoney, initials, isValidFullName, isValidPhone,
  nextOrderCode, normalizePhone, normalizeText, nowTime, orderRequestedTotal, orderTotal, todayDate,
} from "./data";
import { IMAGES } from "./images";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const clone = (value) => JSON.parse(JSON.stringify(value));

const CHANNEL_META = {
  web: { label: "Web", short: "Web", color: "bg-[#6B091E] text-[#FAF8F5]", dot: "#6B091E" },
  whatsapp: { label: "WhatsApp Bot IA", short: "Bot IA", color: "bg-[#075E54] text-white", dot: "#25D366" },
};

const ORDER_STATUS = {
  0: { label: "Pago en revisión", full: "0. Pago en revisión", short: "Pago en revisión", color: "#B45309", soft: "#FDF0E0" },
  1: { label: "Recibido", full: "1. Recibido", short: "Recibido", color: "#B58E3E", soft: "#F7EFD9" },
  2: { label: "En Corte y Pesaje", full: "2. En Corte y Pesaje", short: "Corte y pesaje", color: "#B45309", soft: "#FDF0E0" },
  3: { label: "Listo en Cámara", full: "3. Listo en Cámara (Cliente Avisado)", short: "Listo en cámara", color: "#1F6F43", soft: "#E8F4EC" },
  4: { label: "Retirado", full: "4. Retirado", short: "Retirado", color: "#6B7280", soft: "#F0F0EF" },
};

const AVATAR_COLORS = [
  "bg-[#6B091E] text-[#FAF8F5]", "bg-[#B58E3E] text-[#141414]",
  "bg-[#075E54] text-white", "bg-[#3E0412] text-[#D8B56A]", "bg-[#A65A2E] text-white",
];

function avatarColor(name) {
  const total = String(name || "").split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

function productToOrderItem(product, qty) {
  const pricing = product.kind === "kg" ? "kg" : product.kind === "promo" ? "pack" : "unit";
  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    pricing,
    unitPrice: product.price,
    qty,
    requestedKg: pricing === "kg" ? qty : null,
    actualKg: pricing === "kg" ? qty : null,
    unitLabel: product.unitLabel,
    image: product.image,
    packKg: product.packKg || null,
  };
}

function lineTotal(item) {
  if (item.pricing === "kg") return Number(item.actualKg || 0) * Number(item.unitPrice || 0);
  return Number(item.qty || 0) * Number(item.unitPrice || 0);
}

function itemDescription(item, mode = "actual") {
  if (item.pricing === "kg") {
    const qty = mode === "requested" ? item.requestedKg : item.actualKg;
    return `${Number(qty || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg`;
  }
  if (item.pricing === "pack") return `${item.qty} × ${item.unitLabel}`;
  return `${item.qty} ${item.qty === 1 ? "unidad" : "unidades"}`;
}

function getOrderLane(items, total) {
  const hasWholesale = (items || []).some((entry) => {
    const category = entry?.category || entry?.product?.category || "";
    const categoryId = entry?.product?.categoryId || "";
    return category === "Mayorista" || categoryId === "mayorista";
  });
  const isMonthPurchase = Number(total || 0) >= 100000 || hasWholesale;
  return isMonthPurchase
    ? {
        id: "mayorista",
        label: "Compra del Mes / Mayorista",
        short: "Compra del Mes",
        description: "Carril Compra del Mes / Mayorista · Retiro directo sin fila en el corralito",
      }
    : {
        id: "express",
        label: "Retiro Express",
        short: "Retiro Express",
        description: "Ventanilla Retiro Express · Sin fila en las 3 cajas",
      };
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * 0.11);
      gain.gain.linearRampToValueAtTime(0.075, now + index * 0.11 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + index * 0.11);
      oscillator.stop(now + index * 0.11 + 0.33);
    });
    window.setTimeout(() => ctx.close?.(), 900);
  } catch (error) {
    // El sonido es un extra: si el navegador lo bloquea, la demo sigue igual.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand & primitives
// ─────────────────────────────────────────────────────────────────────────────

function SteerMark({ className = "h-10 w-10" }) {
  return (
    <img
      src={IMAGES.logo}
      alt="Frigorífico Novila"
      className={`rounded-full object-cover ${className}`}
    />
  );
}

function Logo({ compact = false, light = true, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 text-left ${onClick ? "cursor-pointer" : "cursor-default"}`}
      aria-label="Frigorífico Novila"
    >
      <SteerMark className={compact ? "h-8 w-8 text-[#6B091E]" : "h-9 w-9 text-[#6B091E]"} />
      <span className="min-w-0">
        <span className={`block text-[11px] font-normal leading-none ${light ? "text-[#5E554A]" : "text-white/55"}`}>
          Frigorífico
        </span>
        <span className={`mt-1 block text-[18px] font-semibold leading-none tracking-[-0.01em] ${light ? "text-[#1F1B16]" : "text-white"}`}>
          Novila
        </span>
      </span>
    </button>
  );
}

function Icon({ name, ...props }) {
  const icons = {
    Flame, Beef, Package, PiggyBank, Drumstick, CookingPot, Warehouse, MapPin, Clock, ShoppingBag,
    Plus, Minus, Search, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ShieldCheck,
    BadgeCheck, Check, CheckCheck, Phone, Video, MoreVertical, Paperclip, Smile, Mic, Send,
    ArrowLeft, Wifi, Signal, BatteryFull, Play, Pause, LayoutDashboard, Bot, Store, BarChart3,
    RotateCcw, HelpCircle, Maximize2, Smartphone, Minimize2, UserRound, Scale, Timer, CreditCard,
    Banknote, ReceiptText, Users, PackageSearch, Bell, Sparkles, PartyPopper, Repeat2, Megaphone,
    TrendingUp, Wallet, CheckCircle2, AlertCircle, Info, ArrowUpRight, Filter, ShoppingCart, Star,
    Award, ChefHat, ClipboardList, ArrowRight, BadgePercent, Tag, CalendarDays, MessageCircle,
    CircleDollarSign, MessageSquareText, Lock, Gauge, HeartHandshake, RefreshCw, Trash2,
  };
  const Cmp = icons[name] || Info;
  return <Cmp {...props} />;
}

function LiveDot({ color = "#25D366", pulse = false }) {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: color }} />}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

function ChannelBadge({ channel, compact = false }) {
  const meta = CHANNEL_META[channel] || CHANNEL_META.web;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.08em] ${meta.color}`}>
      <Icon name={channel === "web" ? "ShoppingBag" : "Bot"} size={10} strokeWidth={2.4} />
      {compact ? meta.short : meta.label}
    </span>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[120] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2.5">
      {toasts.slice(-3).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex animate-toastIn items-start gap-3 rounded-[10px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-4 text-[#1F1B16] shadow-[0_8px_24px_rgba(31,27,22,0.12)]"
          role="status"
        >
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ${toast.type === "success" ? "bg-[#206A45]/10 text-[#206A45]" : toast.type === "gold" ? "bg-[#8A5A22]/10 text-[#8A5A22]" : "bg-[#6B091E]/10 text-[#6B091E]"}`}>
            <Icon name={toast.icon || (toast.type === "success" ? "Check" : "Info")} size={15} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            {toast.title && <p className="text-[13px] font-medium leading-snug">{toast.title}</p>}
            {toast.message && <p className="mt-1 text-[12px] leading-5 text-[#5E554A]">{toast.message}</p>}
          </div>
          <button type="button" onClick={() => onDismiss(toast.id)} className="rounded-[4px] p-1 text-[#7B7266] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]" aria-label="Cerrar aviso">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation & guide
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 1, icon: "ShoppingBag", label: "Web cliente", short: "Web" },
  { id: 2, icon: "MessageCircle", label: "WhatsApp", short: "Chat" },
  { id: 3, icon: "LayoutDashboard", label: "Panel", short: "Panel" },
  { id: 4, icon: "Megaphone", label: "Campañas", short: "Campañas" },
];

function TopNav({ activeView, onChange, unread, activeOrders, onReset, onGuide }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[80] border-b border-[#1F1B16]/10 bg-[#F7F4EE]/95 text-[#1F1B16] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="shrink-0 sm:hidden">
          <SteerMark className="h-7 w-7 text-[#6B091E]" />
        </div>
        <div className="hidden shrink-0 sm:block">
          <Logo compact />
        </div>

        <nav className="no-scrollbar ml-2 flex h-16 flex-1 items-stretch gap-1 overflow-x-auto sm:ml-6" aria-label="Vistas del sistema">
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            const count = item.id === 2 ? unread : item.id === 3 ? activeOrders : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`relative flex shrink-0 items-center gap-1.5 border-b-2 px-2 text-[13px] transition-colors sm:px-3 ${active ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} size={15} strokeWidth={1.5} className={active ? "text-[#6B091E]" : "text-[#7B7266]"} />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.short}</span>
                {count > 0 && <span className={`font-mono text-[11px] ${item.id === 2 ? "text-[#6B091E]" : "text-[#7B7266]"}`}>{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 border-l border-[#1F1B16]/10 pl-2 sm:pl-4">
          <button
            type="button"
            onClick={onGuide}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]"
            title="Guion de demostración"
          >
            <HelpCircle size={15} strokeWidth={1.5} /> <span className="hidden lg:inline">Guion</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]"
            title="Reiniciar datos de la demo"
          >
            <RotateCcw size={15} strokeWidth={1.5} /> <span className="hidden lg:inline">Reiniciar</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function GuideModal({ open, onClose, onGo }) {
  if (!open) return null;
  const steps = [
    { n: "01", title: "Hacé un pedido en la Web", text: "Agregá una promo y completá nombre, WhatsApp y franja de retiro.", view: 1 },
    { n: "02", title: "Ajustá la balanza", text: "Cambiá el peso real y el total se recalcula.", view: 3 },
    { n: "03", title: "Marcá listo y enviá WhatsApp", text: "El cliente recibe el aviso con código, total y hora de retiro.", view: 3 },
    { n: "04", title: "Pedí por el bot y transferí", text: "El bot pide nombre, muestra el alias y recibe el comprobante.", view: 2 },
    { n: "05", title: "Acreditá el pago y pedí la franja", text: "Confirmá la transferencia y el bot pide el horario.", view: 3 },
    { n: "06", title: "Cerrá con Campañas", text: "Simulá una campaña y mostrá cómo vuelve a vender la misma base.", view: 4 },
  ];
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F1B16]/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[14px] border border-[#1F1B16]/10 bg-[#F7F4EE]">
        <div className="flex items-start justify-between gap-4 border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-6 py-5">
          <div>
            <p className="text-[12px] text-[#7B7266]">Demostración</p>
            <h2 className="mt-1 font-display text-[30px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">Guion</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-[6px] p-1.5 text-[#5E554A] transition-colors hover:bg-[#EFE9DF]" aria-label="Cerrar guion">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="thin-scrollbar flex-1 overflow-y-auto">
          {steps.map((step) => (
            <button
              key={step.n}
              type="button"
              onClick={() => { onGo(step.view); onClose(); }}
              className="flex w-full items-start gap-4 border-b border-[#1F1B16]/8 px-6 py-4 text-left transition-colors hover:bg-[#EFE9DF]/60"
            >
              <span className="mt-0.5 font-mono text-[11px] text-[#7B7266]">{step.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[#1F1B16]">{step.title}</span>
                <span className="mt-1 block text-[12px] leading-5 text-[#5E554A]">{step.text}</span>
              </span>
              <ArrowUpRight size={15} strokeWidth={1.5} className="mt-1 shrink-0 text-[#7B7266]" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#FDFBF7] px-6 py-4">
          <span className="flex items-center gap-2 text-[11px] text-[#7B7266]"><LiveDot color="#206A45" pulse={false} /> Frigorífico Novila</span>
          <button type="button" onClick={() => { onGo(1); onClose(); }} className="flex h-9 items-center gap-2 rounded-[7px] bg-[#6B091E] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#580617]">
            Empezar <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE 1 · WEB APP CLIENTE
// ─────────────────────────────────────────────────────────────────────────────

function PromoCard({ product, onAdd, compact = false }) {
  const disabled = !product.stock;
  return (
    <article className={`group overflow-hidden rounded-[14px] border border-[#1F1B16]/10 bg-[#FDFBF7] ${compact ? "w-[240px] shrink-0 snap-start" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#EFE9DF]">
        <img src={IMAGES[product.image] || IMAGES.rawbeef} alt={product.name} className="h-full w-full object-cover" />
        <span className="absolute bottom-3 left-3 rounded-[4px] bg-[#FDFBF7]/95 px-2 py-1 text-[11px] font-medium text-[#1F1B16] backdrop-blur">
          {product.unit}
        </span>
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#FDFBF7]/80">
            <span className="rounded-[4px] border border-[#1F1B16]/15 px-2 py-1 text-[11px] font-medium text-[#5E554A]">Sin stock</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-medium leading-tight text-[#1F1B16]">{product.name.replace("Promo ", "")}</h3>
                      </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAdd(product)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#1F1B16]/15 bg-[#FDFBF7] text-[#1F1B16] transition-colors hover:border-[#6B091E]/35 hover:text-[#6B091E] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Agregar ${product.name}`}
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[19px] font-medium tabular-nums leading-none text-[#1F1B16]">{formatMoney(product.price)}</p>
            <p className="mt-1 text-[12px] text-[#7B7266] line-through">{formatMoney(product.normalPrice)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductRow({ product, onAdd }) {
  const disabled = !product.stock;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1F1B16]/10 py-3">
      <div className="min-w-0">
        <p className={`truncate text-[14px] font-medium ${disabled ? "text-[#7B7266] line-through" : "text-[#1F1B16]"}`}>{product.name}</p>
        <p className="mt-0.5 text-[11px] text-[#7B7266]">{disabled ? "Sin stock" : product.unitLabel === "kg" ? "por kg" : product.unitLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="font-mono text-[14px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(product.price)}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAdd(product)}
          className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#1F1B16]/15 text-[#1F1B16] transition-colors hover:border-[#6B091E]/35 hover:text-[#6B091E] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Agregar ${product.name}`}
        >
          <Plus size={15} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function CartBar({ count, total, onClick, full }) {
  if (!count) return null;
  return (
    <div className={`${full ? "fixed bottom-6 right-6 z-[60] w-[min(380px,calc(100vw-32px))]" : "absolute inset-x-3 bottom-3 z-40"}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-[10px] bg-[#1F1B16] p-3 text-left text-[#F7F4EE] shadow-[0_8px_24px_rgba(31,27,22,0.16)] transition-colors hover:bg-[#2B2620]"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-white/10">
          <ShoppingBag size={17} strokeWidth={1.5} />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F7F4EE] px-1 font-mono text-[11px] text-[#1F1B16]">{count}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">{count} {count === 1 ? "producto" : "productos"}</span>
          <span className="block text-[11px] text-white/55">Retiro en Sabattini</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-[15px] font-medium tabular-nums">{formatMoney(total)}</span>
          <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] text-white/65">Ver pedido <ChevronRight size={11} strokeWidth={1.5} /></span>
        </span>
      </button>
    </div>
  );
}

function CheckoutSheet({ open, onClose, cartLines, total, customers, onConfirm, full }) {
  const [form, setForm] = useState({ name: "", phone: "", slot: PICKUP_SLOTS[1], payment: "caja", notes: "" });
  const [errors, setErrors] = useState({});
  const [matched, setMatched] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    const timer = window.setTimeout(() => nameRef.current?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const digits = normalizePhone(form.phone);
    if (digits.length < 10) { setMatched(null); return; }
    const customer = customers.find((entry) => normalizePhone(entry.phone) === digits);
    setMatched(customer || null);
    if (customer && !form.name.trim()) setForm((prev) => ({ ...prev, name: customer.name }));
  }, [form.phone, customers]);

  if (!open) return null;

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!isValidFullName(form.name)) nextErrors.name = "Ingresá nombre y apellido";
    if (!isValidPhone(form.phone)) nextErrors.phone = "Ingresá un WhatsApp válido";
    if (!form.slot) nextErrors.slot = "Elegí una franja";
    if (!form.payment) nextErrors.payment = "Elegí un método de pago";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onConfirm({ ...form, payment: PAYMENT_METHODS.find((method) => method.id === form.payment)?.label || form.payment });
  };

  return (
    <div className={`${full ? "fixed inset-0 z-[105] flex items-center justify-center p-4" : "absolute inset-0 z-[65] flex items-end"} bg-[#1F1B16]/45 backdrop-blur-[2px]`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`flex max-h-[94%] w-full flex-col overflow-hidden border border-[#1F1B16]/10 bg-[#F7F4EE] ${full ? "max-w-[560px] rounded-[14px]" : "rounded-t-[14px]"}`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-5 py-4">
          <div>
            <p className="text-[12px] text-[#7B7266]">Retiro</p>
            <h2 className="mt-1 font-display text-[28px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">Confirmar pedido</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-[6px] p-2 text-[#5E554A] transition-colors hover:bg-[#EFE9DF]" aria-label="Cerrar checkout">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={submit} className="thin-scrollbar flex-1 overflow-y-auto">
          <div className="border-b border-[#1F1B16]/10 bg-[#EFE9DF]/60 px-5 py-4">
            <div className="space-y-1.5">
              {cartLines.map((line) => (
                <div key={line.product.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-[#5E554A]">
                    {line.product.kind === "kg" ? `${line.qty.toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg` : `${line.qty} ×`} {line.product.name} <span className="text-[#7B7266]">· {line.product.unitLabel}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-[#1F1B16]">{formatMoney(line.qty * line.product.price)}</span>
                </div>
              ))}
            </div>
            {(() => {
              const lane = getOrderLane(cartLines, total);
              const chances = calcRaffleChances(total);
              return (
                <div className="mt-3 space-y-2 border-t border-[#1F1B16]/10 pt-3">
                  <div className="flex items-center gap-2 rounded-[8px] border border-[#6B091E]/20 bg-[#FDFBF7] px-3 py-2 text-[11px] font-medium text-[#6B091E]">
                    <Timer size={13} strokeWidth={1.6} className="shrink-0" />
                    <span>{lane.description}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[8px] border border-[#8A5A22]/20 bg-[#FDFBF7] px-3 py-2 text-[11px] text-[#5E554A]">
                    <PartyPopper size={13} strokeWidth={1.6} className="shrink-0 text-[#8A5A22]" />
                    <span>
                      {chances > 0
                        ? `🎟️ Sorteo Novila: Sumás ${chances} ${chances === 1 ? "chance digital automática" : "chances digitales automáticas"} con tu WhatsApp (1 cada $25.000, sin cupón de papel).`
                        : "🎟️ Sorteo Novila: A partir de $25.000 sumás chances digitales automáticas con tu WhatsApp (sin cupón de papel)."}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-2 flex items-center gap-1 text-[12px] font-medium text-[#5E554A]">
                Nombre y apellido <span className="text-[#6B091E]">*</span>
              </label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Juan Pérez"
                className={`input-ring h-11 w-full rounded-[8px] border bg-[#FDFBF7] px-3 text-[14px] text-[#1F1B16] placeholder:text-[#7B7266] ${errors.name ? "border-red-400" : "border-[#1F1B16]/15"}`}
                autoComplete="name"
              />
              {errors.name && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600"><AlertCircle size={12} strokeWidth={1.5} /> {errors.name}</p>}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 text-[12px] font-medium text-[#5E554A]">
                WhatsApp <span className="text-[#6B091E]">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#7B7266]">+54 9</span>
                <input
                  value={form.phone}
                  onChange={(event) => set("phone", event.target.value.replace(/[^\d\s]/g, "").slice(0, 14))}
                  placeholder="351 612 4478"
                  inputMode="tel"
                  className={`input-ring h-11 w-full rounded-[8px] border bg-[#FDFBF7] py-2 pl-[62px] pr-3 text-[14px] text-[#1F1B16] placeholder:text-[#7B7266] ${errors.phone ? "border-red-400" : "border-[#1F1B16]/15"}`}
                  autoComplete="tel"
                />
              </div>
              {errors.phone && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600"><AlertCircle size={12} strokeWidth={1.5} /> {errors.phone}</p>}
              {matched && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#206A45]"><CheckCircle2 size={12} strokeWidth={1.5} /> Hola de nuevo, {firstName(matched.name)}</p>}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 text-[12px] font-medium text-[#5E554A]">
                Franja de retiro <span className="text-[#6B091E]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PICKUP_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => set("slot", slot)}
                    className={`flex h-11 items-center justify-between rounded-[8px] border px-3 text-left text-[12px] transition-colors ${form.slot === slot ? "border-[#6B091E]/50 bg-[#6B091E]/[0.05] text-[#1F1B16]" : "border-[#1F1B16]/15 bg-[#FDFBF7] text-[#5E554A] hover:border-[#1F1B16]/30"}`}
                  >
                    {slot.replace(" hs", "")}
                    {form.slot === slot && <Check size={14} strokeWidth={1.5} className="text-[#6B091E]" />}
                  </button>
                ))}
              </div>
              {errors.slot && <p className="mt-1.5 text-[11px] text-red-600">{errors.slot}</p>}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 text-[12px] font-medium text-[#5E554A]">
                Pago <span className="text-[#6B091E]">*</span>
              </label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => set("payment", method.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-[8px] border p-3 text-left transition-colors ${form.payment === method.id ? "border-[#6B091E]/50 bg-[#6B091E]/[0.05]" : "border-[#1F1B16]/15 bg-[#FDFBF7] hover:border-[#1F1B16]/30"}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-[6px] ${form.payment === method.id ? "bg-[#6B091E] text-white" : "bg-[#EFE9DF] text-[#5E554A]"}`}>
                      <Icon name={method.icon} size={16} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-[12px] text-[#1F1B16]">{method.label}</span>
                    {form.payment === method.id && <Check size={15} strokeWidth={1.5} className="text-[#6B091E]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-medium text-[#5E554A]">Nota <span className="text-[#7B7266]">(opcional)</span></label>
              <textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                rows={2}
                placeholder="Cortar las costillas en tiras"
                className="input-ring w-full resize-none rounded-[8px] border border-[#1F1B16]/15 bg-[#FDFBF7] px-3 py-2.5 text-[13px] text-[#1F1B16] placeholder:text-[#7B7266]"
              />
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-[#7B7266]">Total estimado</span>
              <span className="font-mono text-[20px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(total)}</span>
            </div>
            <p className="mb-3 text-[11px] leading-4 text-[#7B7266]">El total se ajusta al peso real en balanza.</p>
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] text-[14px] font-medium text-white transition-colors hover:bg-[#580617]">
              <CheckCircle2 size={16} strokeWidth={1.5} /> Confirmar pedido · {formatMoney(total)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WebSuccess({ order, onWhatsApp, onContinue }) {
  const total = orderTotal(order);
  const lane = getOrderLane(order.items, total);
  const chances = calcRaffleChances(total);
  return (
    <div className="flex min-h-full flex-col bg-[#F7F4EE]">
      <div className="border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-6 pb-8 pt-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#206A45] text-white"><Check size={20} strokeWidth={2} /></div>
        <h1 className="mt-5 font-display text-[34px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">Pedido confirmado</h1>
        <p className="mt-2 text-[13px] text-[#5E554A]">Tu pedido ya está en el panel del frigorífico.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] text-[#7B7266]">Código de retiro</span>
            <span className="font-mono text-[22px] font-medium tracking-[-0.02em] text-[#6B091E]">#{order.id}</span>
          </div>
          <span className="rounded-full border border-[#6B091E]/25 bg-[#6B091E]/[0.06] px-2.5 py-1 text-[11px] font-medium text-[#6B091E]">
            {lane.label}
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-3 p-6">
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <div className="flex items-start gap-3">
            <Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#6B091E]" />
            <div>
              <p className="text-[12px] text-[#7B7266]">Retiro · {lane.short}</p>
              <p className="mt-1 text-[14px] font-medium text-[#1F1B16]">{order.pickupSlot}</p>
              <p className="mt-1 text-[12px] text-[#7B7266]">{BRAND.address}</p>
              <p className="mt-1 text-[11px] font-medium text-[#206A45]">{lane.description}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#1F1B16]/10 pt-4">
            <div>
              <p className="text-[11px] text-[#7B7266]">Cliente</p>
              <p className="mt-1 truncate text-[13px] text-[#1F1B16]">{order.customerName}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#7B7266]">Total estimado</p>
              <p className="mt-1 font-mono text-[14px] text-[#1F1B16]">{formatMoney(total)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#8A5A22]/25 bg-[#8A5A22]/[0.06] p-5">
          <div className="flex items-start gap-3">
            <PartyPopper size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#8A5A22]" />
            <div>
              <p className="text-[13px] font-medium text-[#1F1B16]">
                🎟️ Sorteo Novila · {chances > 0 ? `${chances} ${chances === 1 ? "chance digital acreditada" : "chances digitales acreditadas"}` : "Chances digitales por WhatsApp"}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#5E554A]">
                {chances > 0
                  ? `Quedaron registradas automáticamente con tu WhatsApp (${order.phone}). Sin cupón de papel ni urna.`
                  : "Sumás 1 chance automática cada $25.000 de compra registrada con tu WhatsApp."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#206A45]/20 bg-[#206A45]/[0.05] p-5">
          <div className="flex items-start gap-3">
            <MessageCircle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#206A45]" />
            <div>
              <p className="text-[13px] font-medium text-[#1F1B16]">Confirmación por WhatsApp</p>
              <p className="mt-1 text-[12px] leading-5 text-[#5E554A]">Te avisamos cuando el pedido esté preparado y pesado.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <p className="text-[12px] text-[#7B7266]">Resumen</p>
          <div className="mt-3 space-y-2">
            {order.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="flex justify-between gap-3 text-[12px]">
                <span className="min-w-0 truncate text-[#5E554A]">{item.pricing === "kg" ? `${item.qty} kg` : `${item.qty} ×`} {item.name}</span>
                <span className="shrink-0 font-mono text-[12px] text-[#1F1B16]">{formatMoney(item.qty * item.unitPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2 p-6 pt-0">
        <button type="button" onClick={onWhatsApp} className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#075E54] text-[13px] font-medium text-white transition-colors hover:bg-[#064b43]">
          <MessageCircle size={16} strokeWidth={1.5} /> Ver aviso en WhatsApp <ArrowRight size={14} strokeWidth={1.5} />
        </button>
        <button type="button" onClick={onContinue} className="h-11 w-full rounded-[8px] border border-[#1F1B16]/15 text-[13px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF]">
          Seguir comprando
        </button>
      </div>
    </div>
  );
}

function WebApp({ products, cart, onAdd, onAddPack, onRemove, onOpenCart, cartOpen, onCloseCart, onConfirm, customers, lastWebOrder, onClearLastOrder, onGoWhatsApp, full, onToggleFull }) {
  const [category, setCategory] = useState("vacuno");
  const [query, setQuery] = useState("");
  const promoRef = useRef(null);
  const productsRef = useRef(null);

  const cartLines = useMemo(
    () => cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId) })).filter((line) => line.product),
    [cart, products]
  );
  const cartCount = Math.round(cartLines.reduce((sum, line) => sum + line.qty, 0) * 100) / 100;
  const cartTotal = cartLines.reduce((sum, line) => sum + line.qty * line.product.price, 0);

  const featured = products.filter((product) => product.categoryId === "super").slice(0, 4);
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const needle = normalizeText(query);
    return products.filter((product) => normalizeText(`${product.name} ${product.category} ${product.note}`).includes(needle));
  }, [products, query]);

  const visibleProducts = useMemo(() => {
    if (query.trim()) return searchResults;
    return products.filter((product) => product.categoryId === category);
  }, [products, category, query, searchResults]);

  const currentCategory = CATEGORIES.find((entry) => entry.id === category);

  if (lastWebOrder) {
    return (
      <div className={full ? "min-h-[calc(100vh-64px)] bg-[#F7F4EE] p-6" : "h-full overflow-y-auto no-scrollbar bg-[#F7F4EE]"}>
        <div className={full ? "mx-auto max-w-[620px]" : "min-h-full"}>
          <WebSuccess order={lastWebOrder} onWhatsApp={onGoWhatsApp} onContinue={onClearLastOrder} />
        </div>
      </div>
    );
  }

  const scrollToPromos = () => promoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToProducts = (nextCategory) => {
    if (nextCategory) { setCategory(nextCategory); setQuery(""); }
    window.setTimeout(() => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className={full ? "bg-[#F7F4EE]" : "relative h-full overflow-y-auto no-scrollbar bg-[#F7F4EE]"} id="web-app-scroll">
      <div className="pb-28">
        <header className={`border-b border-[#1F1B16]/10 bg-[#FDFBF7] ${full ? "" : "pt-8"}`}>
          <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
            {full ? (
              <nav className="hidden items-center gap-6 text-[13px] md:flex" aria-label="Tienda">
                <button type="button" onClick={scrollToPromos} className="text-[#1F1B16] transition-colors hover:text-[#6B091E]">Promos</button>
                <button type="button" onClick={() => scrollToProducts("vacuno")} className="text-[#5E554A] transition-colors hover:text-[#1F1B16]">Cortes</button>
                <button type="button" onClick={() => scrollToProducts("mayorista")} className="text-[#5E554A] transition-colors hover:text-[#1F1B16]">Mayorista</button>
              </nav>
            ) : (
              <Logo compact />
            )}
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-3 text-[12px] text-[#5E554A] sm:gap-4">
                <span className="flex items-center gap-1.5"><LiveDot color="#206A45" pulse={false} />Abierto</span>
                <span className="hidden items-center gap-1.5 sm:flex"><Clock size={14} strokeWidth={1.5} />Retiro en 2 min</span>
              </div>
              <button type="button" onClick={onToggleFull} className="hidden h-9 items-center gap-1.5 rounded-[8px] px-2 text-[12px] text-[#7B7266] transition-colors hover:bg-[#EFE9DF] sm:flex" title={full ? "Ver en celular" : "Ver completo"}>
                {full ? <Smartphone size={15} strokeWidth={1.5} /> : <Maximize2 size={15} strokeWidth={1.5} />} {full ? "Celular" : "Completo"}
              </button>
              <button type="button" onClick={onOpenCart} className="relative flex h-9 items-center gap-1.5 rounded-[8px] border border-[#1F1B16]/15 bg-[#FDFBF7] px-3 text-[12px] text-[#1F1B16] transition-colors hover:border-[#6B091E]/30" aria-label="Ver carrito">
                <ShoppingBag size={16} strokeWidth={1.5} /> Carrito
                {cartCount > 0 && <span className="font-mono text-[11px] text-[#6B091E]">{cartCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
          <div className={`overflow-hidden rounded-[18px] border border-[#1F1B16]/10 bg-[#FDFBF7] ${full ? "grid lg:grid-cols-[1.05fr_1fr]" : ""}`}>
            <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
              <p className="text-[12px] text-[#7B7266]">Carnicería mayorista y minorista · Córdoba</p>
              <h1 className="mt-4 max-w-[420px] font-display text-[44px] font-normal leading-[1.02] tracking-[-0.02em] text-[#1F1B16] sm:text-[58px]">
                Del campo a tu casa
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-[#5E554A]">Retiro sin fila en Av. Amadeo Sabattini 3480 (al lado del Hiper Libertad).</p>
              <button type="button" onClick={scrollToPromos} className="mt-8 flex h-11 w-fit items-center gap-2 rounded-[8px] bg-[#6B091E] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#580617]">
                Ver promos <ArrowRight size={15} strokeWidth={1.5} />
              </button>
            </div>
            <div className={`relative ${full ? "min-h-[340px]" : "h-56"}`}>
              <img src={IMAGES.hero} alt="Asado de Frigorífico Novila" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
        </section>

        <section ref={promoRef} className="mx-auto max-w-[1180px] scroll-mt-20 px-4 pt-10 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-[30px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Super promos</h2>
            <span className="font-mono text-[11px] text-[#7B7266]">10 combos</span>
          </div>
          {full ? (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {featured.map((product) => <PromoCard key={product.id} product={product} onAdd={onAdd} />)}
            </div>
          ) : (
            <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
              {featured.map((product) => <PromoCard key={product.id} product={product} onAdd={onAdd} compact />)}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Armá tu Asado en 1 clic</h2>
              <p className="mt-1.5 text-[12px] text-[#7B7266]">Combos calculados según cantidad de comensales · Retiro Express sin fila</p>
            </div>
            <span className="font-mono text-[11px] text-[#6B091E]">Precio mayorista</span>
          </div>
          <div className={`mt-4 grid gap-3 ${full ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}`}>
            {ASADO_PACKS.map((pack) => {
              const packTotal = pack.items.reduce((sum, entry) => {
                const product = products.find((item) => item.id === entry.productId);
                return sum + (product ? product.price * entry.qty : 0);
              }, 0);
              const allInStock = pack.items.every((entry) => products.find((item) => item.id === entry.productId)?.stock);
              return (
                <div key={pack.id} className="flex flex-col justify-between rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#EFE9DF] px-2.5 py-0.5 font-mono text-[11px] text-[#6B091E]">{pack.weightLabel}</span>
                      <span className="font-mono text-[16px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(packTotal)}</span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-medium text-[#1F1B16]">{pack.title}</h3>
                    <p className="mt-1 text-[12px] leading-5 text-[#7B7266]">{pack.detail}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!allInStock}
                    onClick={() => onAddPack(pack, packTotal)}
                    className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#6B091E]/30 bg-[#6B091E]/[0.04] text-[12px] font-medium text-[#6B091E] transition-colors hover:bg-[#6B091E] hover:text-white disabled:opacity-45"
                  >
                    <Plus size={14} strokeWidth={1.8} /> {allInStock ? "Cargar combo al carrito" : "Sin stock completo"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-6">
          <div className={`flex flex-col gap-5 ${full ? "lg:flex-row lg:items-end lg:justify-between" : ""}`}>
            <div className="relative w-full max-w-[320px]">
              <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar"
                className="h-10 w-full rounded-[8px] border border-[#1F1B16]/12 bg-[#FDFBF7] pl-9 pr-8 text-[13px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none focus:ring-2 focus:ring-[#6B091E]/10"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-1 text-[#7B7266] hover:text-[#1F1B16]" aria-label="Limpiar búsqueda">
                  <X size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
            <div className="no-scrollbar flex gap-5 overflow-x-auto border-b border-[#1F1B16]/10">
              {CATEGORIES.map((entry) => {
                const active = category === entry.id && !query;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => { setCategory(entry.id); setQuery(""); }}
                    className={`shrink-0 border-b-2 px-0 pb-3 text-[13px] transition-colors ${active ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}
                  >
                    {entry.short}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={productsRef} className="mx-auto max-w-[1180px] scroll-mt-20 px-4 pt-8 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-[26px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">
              {query ? `${visibleProducts.length} resultados` : currentCategory?.label}
            </h2>
            {query && <span className="text-[12px] text-[#7B7266]">“{query}”</span>}
          </div>

          {visibleProducts.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#1F1B16]/15 bg-[#FDFBF7] px-4 py-12 text-center">
              <Search size={22} strokeWidth={1.5} className="mx-auto text-[#7B7266]" />
              <p className="mt-3 text-[14px] font-medium text-[#1F1B16]">No encontramos ese corte</p>
              <p className="mt-1 text-[12px] text-[#7B7266]">Probá con vacío o milanesa.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {visibleProducts.some((product) => product.kind === "promo") && (
                <div className={`grid gap-3 ${full ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-2"}`}>
                  {visibleProducts.filter((product) => product.kind === "promo").map((product) => <PromoCard key={product.id} product={product} onAdd={onAdd} />)}
                </div>
              )}
              {visibleProducts.some((product) => product.kind !== "promo") && (
                <div className={`grid border-t border-[#1F1B16]/10 ${full ? "grid-cols-2 gap-x-10" : "grid-cols-1"}`}>
                  {visibleProducts.filter((product) => product.kind !== "promo").map((product) => <ProductRow key={product.id} product={product} onAdd={onAdd} />)}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <CartBar count={cartCount} total={cartTotal} onClick={onOpenCart} full={full} />

      <CheckoutSheet
        open={cartOpen}
        onClose={onCloseCart}
        cartLines={cartLines}
        total={cartTotal}
        customers={customers}
        onConfirm={onConfirm}
        full={full}
      />

      {cartCount === 0 && cartOpen && (
        <div className="absolute inset-x-4 bottom-20 z-[66] rounded-xl bg-[#141414] px-4 py-3 text-center text-[11px] font-bold text-white shadow-xl">
          Agregá productos para armar tu pedido.
        </div>
      )}
    </div>
  );
}

function WebView({ products, cart, customers, lastWebOrder, onAdd, onAddPack, onRemove, onOpenCart, cartOpen, onCloseCart, onConfirm, onClearLastOrder, onGoWhatsApp }) {
  const [full, setFull] = useState(true);
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => {
    const product = products.find((entry) => entry.id === line.productId);
    return sum + (product ? product.price * line.qty : 0);
  }, 0);

  const app = (
    <WebApp
      products={products}
      cart={cart}
      customers={customers}
      lastWebOrder={lastWebOrder}
      onAdd={onAdd}
      onAddPack={onAddPack}
      onRemove={onRemove}
      onOpenCart={onOpenCart}
      cartOpen={cartOpen}
      onCloseCart={onCloseCart}
      onConfirm={onConfirm}
      onClearLastOrder={onClearLastOrder}
      onGoWhatsApp={onGoWhatsApp}
      full={full}
      onToggleFull={() => setFull((value) => !value)}
    />
  );

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#F7F4EE]">
      <div className="flex min-h-[calc(100vh-64px)] flex-col">
        {full ? (
          <div className="w-full flex-1">{app}</div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="phone-shell h-[min(820px,calc(100vh-136px))] w-[min(420px,calc(100vw-32px))]">
              <div className="phone-screen">
                <div className="phone-notch" />
                {app}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE 2 · WHATSAPP NOVILABOT
// ─────────────────────────────────────────────────────────────────────────────

function WhatsappProfile({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[75] flex flex-col bg-[#FAF8F5]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="bg-[#075E54] px-4 pb-4 pt-8 text-white">
        <button type="button" onClick={onClose} className="rounded-full p-1 text-white/90" aria-label="Volver al chat"><ArrowLeft size={19} /></button>
        <div className="mt-3 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
            <SteerMark className="h-full w-full" />
          </div>
          <h3 className="mt-4 text-[20px] font-medium leading-none">Frigorífico Novila</h3>
          <div className="mt-2 flex items-center gap-1.5 rounded-[6px] bg-white/10 px-2.5 py-1.5 text-[11px] text-[#b8f5ce]">
            <BadgeCheck size={13} strokeWidth={1.5} /> Cuenta oficial · API de Meta
          </div>
          <p className="mt-2 text-center text-[12px] leading-5 text-white/65">Carnicería mayorista y minorista</p>
        </div>
      </div>
      <div className="thin-scrollbar flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-[12px] text-[#7B7266]">Información del negocio</p>
          <div className="mt-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-[#6B091E]" />
              <div><p className="text-[13px] font-medium text-[#1F1B16]">Av. Amadeo Sabattini 3480</p><p className="mt-0.5 text-[11px] text-[#7B7266]">Al lado del Hiper Libertad · Córdoba Capital · Tel. {BRAND.landline}</p></div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="mt-0.5 shrink-0 text-[#6B091E]" />
              <div><p className="text-[13px] font-medium text-[#1F1B16]">Lunes a sábado · 8:00 a 21:00</p><p className="mt-0.5 text-[11px] text-[#7B7266]">Domingos y feriados · 9:00 a 13:30</p></div>
            </div>
            <div className="flex items-start gap-2.5">
              <Banknote size={15} className="mt-0.5 shrink-0 text-[#6B091E]" />
              <div><p className="text-[13px] font-medium text-[#1F1B16]">Pago por transferencia</p><p className="mt-0.5 text-[11px] text-[#7B7266]">Alias {TRANSFER_DATA.alias}</p></div>
            </div>
            <div className="flex items-start gap-2.5">
              <HeartHandshake size={15} className="mt-0.5 shrink-0 text-[#6B091E]" />
              <div><p className="text-[13px] font-medium text-[#1F1B16]">@frigorificonovila</p><p className="mt-0.5 text-[11px] text-[#7B7266]">Retiro en Ventanilla Express</p></div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-[#1F6F43]/15 bg-[#E8F4EC] p-3">
          <ShieldCheck size={18} className="shrink-0 text-[#1F6F43]" />
          <p className="text-[12px] leading-5 text-[#1F6F43]/80"><span className="font-medium">Privacidad.</span> Los mensajes están cifrados de extremo a extremo.</p>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#7B7266]"><Lock size={11} strokeWidth={1.5} /> Demo funcional</div>
      </div>
    </div>
  );
}

function AudioBubble({ msg }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f7a67] text-white"><Play size={12} fill="currentColor" /></span>
        <div className="flex h-6 flex-1 items-center gap-[2px]">
          {[6, 12, 18, 9, 15, 7, 21, 12, 6, 17, 10, 20, 8, 14, 18, 7, 12, 9, 16, 6].map((height, index) => (
            <span key={index} className="wa-wave opacity-60" style={{ height: `${height}px` }} />
          ))}
        </div>
        <span className="text-[11px] text-[#7B7266]">0:07</span>
      </div>
      <div className="rounded-lg bg-white/55 px-2 py-1.5">
        <p className="text-[11px] font-medium text-[#075E54]">Transcripción</p>
        <p className="mt-0.5 text-[11px] leading-4 text-[#5E554A]">“{msg.transcript || msg.text}”</p>
      </div>
    </div>
  );
}

function TransferDetails({ transfer }) {
  const rows = [
    ["Alias", transfer.alias],
    ["CBU", transfer.cbu],
    ["Titular", transfer.titular],
    ["Banco", transfer.bank],
  ];
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[#075E54]/15 bg-[#F4FAF7]">
      <div className="flex items-center justify-between bg-[#075E54] px-2.5 py-1.5 text-white">
        <span className="flex items-center gap-1.5 text-[11px] font-medium"><Banknote size={13} strokeWidth={1.5} /> Transferencia</span>
        <span className="font-mono text-[14px] font-medium leading-none">{formatMoney(transfer.amount)}</span>
      </div>
      <div className="space-y-1 p-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-[11px] text-[#7B7266]">{label}</span>
            <span className="break-all text-right text-[11px] font-medium text-[#1F1B16]">{value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-[#075E54]/15 bg-[#E8F4EC] px-3 py-2 text-[11px] leading-4 text-[#206A45]">
        Transferí el total exacto y enviá el comprobante.
      </div>
    </div>
  );
}

function ReceiptBubble({ receipt }) {
  return (
    <div className="w-[240px] overflow-hidden rounded-[8px] border border-[#1F1B16]/10 bg-white">
      <div className="flex items-center justify-between bg-[#075E54] px-2.5 py-2 text-white">
        <span className="flex items-center gap-1.5 text-[11px] font-medium"><CheckCircle2 size={13} strokeWidth={1.5} /> Comprobante</span>
        <span className="text-[11px] text-white/60">Transferencia</span>
      </div>
      <div className="p-2.5">
        <p className="text-[11px] text-[#7B7266]">Importe transferido</p>
        <p className="mt-1 font-mono text-[22px] font-medium leading-none text-[#1F1B16]">{formatMoney(receipt.amount)}</p>
        <div className="mt-2 space-y-1 border-t border-dashed border-black/10 pt-1.5">
          <div className="flex justify-between gap-2"><span className="text-[11px] text-[#7B7266]">Para</span><span className="text-[11px] text-[#1F1B16]">Frigorífico Novila</span></div>
          <div className="flex justify-between gap-2"><span className="text-[11px] text-[#7B7266]">Alias</span><span className="text-[11px] text-[#1F1B16]">{receipt.alias}</span></div>
          <div className="flex justify-between gap-2"><span className="text-[11px] text-[#7B7266]">Ref.</span><span className="text-[11px] text-[#1F1B16]">{receipt.reference}</span></div>
          <div className="flex justify-between gap-2"><span className="text-[11px] text-[#7B7266]">Fecha</span><span className="text-[11px] text-[#1F1B16]">{receipt.date}</span></div>
        </div>
        <p className="mt-2 rounded-[4px] bg-[#FDF0E0] px-2 py-1.5 text-center text-[11px] text-[#8A5A22]">Pago pendiente de acreditación</p>
      </div>
    </div>
  );
}

function WaMessage({ msg, onQuickReply, products }) {
  const isOut = msg.side === "out";
  const ready = msg.kind === "ready";
  const campaign = msg.kind === "campaign";
  const confirmation = msg.kind === "order_confirmed";
  const receipt = msg.kind === "receipt";
  return (
    <div className={`flex w-full ${isOut ? "justify-end" : "justify-start"} ${msg.kind === "system" ? "justify-center" : ""}`}>
      {msg.kind === "system" ? (
        <div className="mx-auto my-1 max-w-[90%] rounded-[6px] bg-[#fdf6e3] px-3 py-1.5 text-center text-[11px] leading-4 text-[#6b5f45]">
          <Lock size={11} strokeWidth={1.5} className="mr-1 inline" /> {msg.text}
        </div>
      ) : (
        <div className={`flex max-w-[88%] items-end gap-2 ${isOut ? "flex-row-reverse" : ""}`}>
          {!isOut && (
            <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#1F1B16]/10 bg-white">
              <SteerMark className="h-full w-full" />
            </div>
          )}
          <div className={`relative min-w-[104px] px-3 py-2 text-[13px] leading-5 text-[#1F1B16] shadow-[0_1px_1px_rgba(0,0,0,.06)] ${isOut ? "bubble-out" : "bubble-in"}`}>
            {ready && (
              <div className="mb-2 flex items-center gap-1.5 border-b border-[#1F1B16]/[0.08] pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#206A45] text-white"><CheckCircle2 size={12} strokeWidth={2} /></span>
                <span className="text-[11px] font-medium text-[#206A45]">Pedido listo</span>
              </div>
            )}
            {campaign && (
              <div className="mb-2 flex items-center gap-1.5 border-b border-[#1F1B16]/[0.08] pb-2">
                <Megaphone size={12} strokeWidth={1.5} className="text-[#6B091E]" />
                <span className="text-[11px] font-medium text-[#6B091E]">{msg.campaignName || "Campaña"}</span>
              </div>
            )}
            {confirmation && (
              <div className="mb-2 flex items-center gap-1.5 border-b border-[#1F1B16]/[0.08] pb-2">
                <ReceiptText size={12} strokeWidth={1.5} className="text-[#075E54]" />
                <span className="text-[11px] font-medium text-[#075E54]">Pedido confirmado</span>
              </div>
            )}
            {msg.kind === "audio" ? (
              <AudioBubble msg={msg} />
            ) : receipt ? (
              <ReceiptBubble receipt={msg.receipt} />
            ) : (
              <>
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.kind === "transfer" && <TransferDetails transfer={msg.transfer} />}
              </>
            )}
            {msg.quickReplies?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#1F1B16]/[0.08] pt-2">
                {msg.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => onQuickReply(reply)}
                    className="rounded-[6px] border border-[#075E54]/25 bg-[#075E54]/[0.04] px-2.5 py-1.5 text-[12px] text-[#075E54] transition-colors hover:bg-[#075E54]/[0.08]"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
            <div className={`mt-1 flex items-center justify-end gap-1 ${isOut ? "text-[#1F1B16]/40" : "text-[#1F1B16]/35"}`}>
              <span className="text-[11px]">{msg.time}</span>
              {isOut && <CheckCheck size={12} strokeWidth={1.5} className="text-[#34B7F1]" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppView({ messages, typing, onSend, onAudio, waFlow, orders }) {
  const [input, setInput] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const chatOrder = orders?.find((order) => order.id === waFlow.orderId) || null;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => { node.scrollTop = node.scrollHeight; }, 80);
    return () => window.clearTimeout(timer);
  }, [messages.length, typing]);

  const submit = (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    onSend(text);
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#F7F4EE]">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1180px] items-center gap-12 px-6 py-8">
        <aside className="hidden w-[300px] shrink-0 xl:block">
          <p className="text-[12px] text-[#7B7266]">WhatsApp</p>
          <h1 className="mt-2 font-display text-[36px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">NovilaBot</h1>
          <p className="mt-3 max-w-[240px] text-[13px] leading-5 text-[#5E554A]">Consulta, pago por transferencia y retiro en un mismo hilo.</p>

          {chatOrder ? (
            <div className="mt-8 rounded-[14px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[12px] text-[#6B091E]">#{chatOrder.id}</span>
                <span className="text-[11px] text-[#7B7266]">{ORDER_STATUS[chatOrder.status]?.label || "En revisión"}</span>
              </div>
              <p className="mt-3 text-[16px] font-medium text-[#1F1B16]">{chatOrder.customerName}</p>
              <dl className="mt-5 space-y-3 border-t border-[#1F1B16]/10 pt-4 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#7B7266]">Pago</dt>
                  <dd className={chatOrder.paymentStatus === "approved" ? "text-[#206A45]" : "text-[#8A5A22]"}>{chatOrder.paymentStatus === "approved" ? "Acreditado" : "En revisión"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#7B7266]">Retiro</dt>
                  <dd className="text-right text-[#1F1B16]">{chatOrder.pickupSlot || "Pendiente"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#7B7266]">Total</dt>
                  <dd className="font-mono text-[12px] tabular-nums text-[#1F1B16]">{formatMoney(orderTotal(chatOrder))}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-8 space-y-5 border-t border-[#1F1B16]/10 pt-6">
              {[
                ["MessageCircle", "Consulta", "Respondemos con la información del local"],
                ["Banknote", "Pago", "Transferencia y comprobante"],
                ["ShoppingBag", "Retiro", "Franja horaria en Sabattini 3480"],
              ].map(([icon, title, text], index) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1F1B16]/10 text-[11px] text-[#7B7266]">{index + 1}</span>
                  <div>
                    <p className="text-[13px] font-medium text-[#1F1B16]">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#7B7266]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="flex w-full flex-col items-center xl:w-auto">
          <div className="phone-shell h-[min(820px,calc(100vh-128px))] w-[min(440px,calc(100vw-32px))]">
            <div className="phone-screen bg-[#efeae2]">
              <div className="phone-notch" />
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between bg-[#075E54] px-5 pb-1 pt-2 text-white">
                  <span className="text-[11px] font-medium">9:41</span>
                  <div className="flex items-center gap-1"><Signal size={12} strokeWidth={1.5} /><Wifi size={12} strokeWidth={1.5} /><BatteryFull size={13} strokeWidth={1.5} /></div>
                </div>
                <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
                  <button type="button" className="rounded-[6px] p-1 text-white/80 transition-colors hover:bg-white/10" aria-label="Volver"><ArrowLeft size={18} strokeWidth={1.5} /></button>
                  <button type="button" onClick={() => setProfileOpen(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"><SteerMark className="h-full w-full" /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-[14px] font-medium leading-none">Frigorífico Novila</span>
                        <BadgeCheck size={14} strokeWidth={1.5} className="shrink-0 text-[#8ff0b3]" />
                      </span>
                      <span className="mt-1 block text-[11px] font-normal text-white/65">en línea · API oficial de Meta</span>
                    </span>
                  </button>
                  <button type="button" className="rounded-[6px] p-1.5 text-white/75 transition-colors hover:bg-white/10" aria-label="Videollamada"><Video size={18} strokeWidth={1.5} /></button>
                  <button type="button" className="rounded-[6px] p-1.5 text-white/75 transition-colors hover:bg-white/10" aria-label="Llamar"><Phone size={16} strokeWidth={1.5} /></button>
                  <button type="button" className="rounded-[6px] p-1.5 text-white/75 transition-colors hover:bg-white/10" aria-label="Más opciones"><MoreVertical size={18} strokeWidth={1.5} /></button>
                </div>

                <div ref={scrollRef} className="whatsapp-wallpaper thin-scrollbar relative flex-1 overflow-y-auto px-3 py-3">
                  <div className="mx-auto mb-3 w-fit rounded-[4px] bg-[#fdf6e3]/95 px-2.5 py-1 text-[11px] font-medium text-[#6b5f45]">Hoy</div>
                  <div className="mb-3 flex justify-center">
                    <div className="max-w-[88%] rounded-[6px] bg-[#fdf6e3] px-3 py-1.5 text-center text-[11px] leading-4 text-[#6b5f45]">
                      <Lock size={10} strokeWidth={1.5} className="mr-1 inline" /> Los mensajes están cifrados de extremo a extremo.
                    </div>
                  </div>
                  <div className="space-y-2">
                    {messages.map((msg) => <WaMessage key={msg.id} msg={msg} onQuickReply={onSend} products={[]} />)}
                    {typing && (
                      <div className="flex items-end gap-2">
                        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[#1F1B16]/10 bg-white"><SteerMark className="h-full w-full" /></div>
                        <div className="bubble-in flex items-center gap-1 px-3 py-2.5">
                          {[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F1B16]/30" style={{ animationDelay: `${dot * 120}ms` }} />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#1F1B16]/10 bg-[#efeae2] px-2 pb-2 pt-2">
                  <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-1">
                    {[
                      ["Beef", "Asado 6", "¿Qué me recomendás para un asado para 6 personas?"],
                      ["Flame", "Promos", "¿Cuáles son las Super promos de esta semana?"],
                      ["ShoppingBag", "Armar pedido", "Quiero armar un pedido"],
                      ["Mic", "Audio", null],
                    ].map(([icon, label, text]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => text ? onSend(text) : onAudio()}
                        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] transition-colors ${label === "Audio" ? "border-[#6B091E]/25 bg-[#6B091E]/[0.06] text-[#6B091E]" : "border-[#1F1B16]/10 bg-white/90 text-[#075E54] hover:bg-white"}`}
                      >
                        <Icon name={icon} size={14} strokeWidth={1.5} /> {label}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={submit} className="flex items-end gap-2">
                    <div className="flex min-h-10 flex-1 items-center gap-2 rounded-[8px] bg-white px-2.5">
                      <button type="button" className="p-1 text-[#1F1B16]/40 transition-colors hover:text-[#1F1B16]" aria-label="Emojis"><Smile size={18} strokeWidth={1.5} /></button>
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={waFlow.mode === "awaiting_name" ? "Escribí tu Nombre y Apellido" : "Escribí un mensaje"}
                        className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-[#1F1B16] outline-none placeholder:text-[#7B7266]"
                      />
                      <button type="button" className="p-1 text-[#1F1B16]/40 transition-colors hover:text-[#1F1B16]" aria-label="Adjuntar"><Paperclip size={18} strokeWidth={1.5} /></button>
                    </div>
                    {input.trim() ? (
                      <button type="submit" disabled={typing} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#075E54] text-white transition-colors hover:bg-[#064b43] disabled:opacity-50" aria-label="Enviar mensaje"><Send size={18} strokeWidth={1.5} /></button>
                    ) : (
                      <button type="button" onClick={onAudio} disabled={typing} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#075E54] text-white transition-colors hover:bg-[#064b43] disabled:opacity-50" aria-label="Enviar audio de demostración"><Mic size={18} strokeWidth={1.5} /></button>
                    )}
                  </form>
                </div>
              </div>
              <WhatsappProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA 3 · PANEL DEL FRIGORÍFICO
// ─────────────────────────────────────────────────────────────────────────────

function WeightInput({ item, onChange }) {
  const [value, setValue] = useState(Number(item.actualKg || 0).toFixed(2));

  useEffect(() => {
    setValue(Number(item.actualKg || 0).toFixed(2));
  }, [item.actualKg]);

  const commit = () => {
    const parsed = Number(String(value).replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      onChange(Math.min(99, Math.round(parsed * 100) / 100));
    } else {
      setValue(Number(item.actualKg || 0).toFixed(2));
    }
  };

  const step = (delta) => {
    const next = Math.max(0.01, Math.round((Number(item.actualKg || 0) + delta) * 100) / 100);
    onChange(next);
  };

  return (
    <div className="flex h-8 items-center gap-0.5 rounded-[6px] border border-[#1F1B16]/12 bg-[#FDFBF7] px-0.5">
      <button type="button" onClick={() => step(-0.05)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#7B7266] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]" aria-label="Restar 50 gramos">
        <Minus size={12} strokeWidth={1.5} />
      </button>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          className="scale-input w-[56px] bg-transparent py-1 pr-4 text-right text-[12px] font-medium text-[#1F1B16] outline-none"
          aria-label={`Peso real de ${item.name}`}
        />
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[11px] text-[#7B7266]">kg</span>
      </div>
      <button type="button" onClick={() => step(0.05)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#7B7266] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]" aria-label="Sumar 50 gramos">
        <Plus size={12} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function OrderSteps({ status }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {[1, 2, 3, 4].map((step) => {
        const active = status >= step;
        return (
          <div key={step}>
            <div className={`h-1 rounded-full ${active ? "bg-[#6B091E]" : "bg-[#1F1B16]/10"}`} />
            <p className={`mt-2 text-[11px] leading-tight ${active ? "text-[#1F1B16]" : "text-[#7B7266]"}`}>{ORDER_STATUS[step].short}</p>
          </div>
        );
      })}
    </div>
  );
}

function TicketModal({ order, onClose, onToast }) {
  if (!order) return null;
  const total = orderTotal(order);
  const lane = getOrderLane(order.items, total);
  const chances = calcRaffleChances(total);
  const isApproved = (order.paymentStatus || "approved") === "approved";

  const handlePrint = () => {
    onToast({
      type: "success",
      title: `Comanda #${order.id} enviada a impresión`,
      message: "Formato térmico 80mm listo para pegar en bolsa (sin fila en el corralito).",
      icon: "ReceiptText",
      duration: 3600,
    });
    window.print?.();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F1B16]/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[14px] border border-[#1F1B16]/15 bg-[#F7F4EE] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1F1B16]">
            <ReceiptText size={16} strokeWidth={1.6} className="text-[#6B091E]" /> Comanda térmica 80mm
          </div>
          <button type="button" onClick={onClose} className="rounded-[6px] p-1.5 text-[#5E554A] hover:bg-[#EFE9DF]" aria-label="Cerrar comanda">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full rounded-[8px] border border-dashed border-[#1F1B16]/25 bg-white p-4 font-mono text-[12px] text-[#1F1B16] shadow-sm">
            <div className="border-b border-dashed border-[#1F1B16]/20 pb-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#5E554A]">Frigorífico Novila</p>
              <p className="mt-0.5 text-[10px] text-[#7B7266]">Av. Amadeo Sabattini 3480 · Córdoba</p>
              <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-[#6B091E]">#{order.id}</p>
              <span className="mt-2 inline-block rounded-[4px] border border-[#1F1B16]/20 bg-[#F7F4EE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]">
                {lane.label}
              </span>
            </div>

            <div className="space-y-1 border-b border-dashed border-[#1F1B16]/20 py-3 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-[#7B7266]">Cliente:</span>
                <span className="text-right font-semibold">{order.customerName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#7B7266]">WhatsApp:</span>
                <span>{order.phone}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#7B7266]">Franja:</span>
                <span className="text-right">{order.pickupSlot || "A confirmar"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#7B7266]">Estado pago:</span>
                <span className={isApproved ? "font-semibold text-[#206A45]" : "font-semibold text-[#8A5A22]"}>
                  {isApproved ? "ACREDITADO · SIN FILA" : "EN REVISIÓN"}
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-[#1F1B16]/20 py-3">
              <div className="mb-1.5 flex justify-between text-[10px] uppercase text-[#7B7266]">
                <span>Corte / Peso</span>
                <span>Subtotal</span>
              </div>
              <div className="space-y-2 text-[11px]">
                {order.items.map((item, idx) => (
                  <div key={`${item.productId}-${idx}`}>
                    <div className="flex justify-between gap-2 font-semibold">
                      <span>{item.name}</span>
                      <span>{formatMoney(lineTotal(item))}</span>
                    </div>
                    <p className="text-[10px] text-[#7B7266]">
                      {item.pricing === "kg"
                        ? `Pedido: ${formatKg(item.requestedKg)} · Balanza: ${formatKg(item.actualKg)}`
                        : `${item.qty} × ${item.unitLabel}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase text-[#5E554A]">Total final</span>
                <span className="text-[20px] font-bold">{formatMoney(total)}</span>
              </div>
              <p className="mt-2 rounded-[4px] bg-[#F7F4EE] px-2 py-1.5 text-center text-[10px] text-[#5E554A]">
                🎟️ Sorteo Novila: {chances} {chances === 1 ? "chance acreditada" : "chances acreditadas"}
              </p>
              <p className="mt-2 text-center text-[10px] text-[#7B7266]">Pegar en bolsa · Retiro directo Ventanilla Express</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#1F1B16]/10 bg-[#FDFBF7] px-4 py-3">
          <button type="button" onClick={onClose} className="h-9 flex-1 rounded-[8px] border border-[#1F1B16]/15 text-[12px] text-[#5E554A] hover:bg-[#EFE9DF]">
            Cerrar
          </button>
          <button type="button" onClick={handlePrint} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#6B091E] text-[12px] font-medium text-white hover:bg-[#580617]">
            <ReceiptText size={14} strokeWidth={1.6} /> Imprimir comanda
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onAdvance, onMarkReady, onWithdraw, onUpdateWeight, onConfirmPayment, onRequestSlot, onOpenTicket, onToast }) {
  const total = orderTotal(order);
  const requested = orderRequestedTotal(order);
  const status = ORDER_STATUS[order.status] || ORDER_STATUS[1];
  const delta = total - requested;
  const clientFirst = firstName(order.customerName);
  const paymentStatus = order.paymentStatus || "approved";
  const isReview = paymentStatus === "review";
  const waitingSlot = !isReview && !order.pickupSlot;
  const weightsLocked = isReview || waitingSlot;
  const paymentReference = order.paymentReference || "TRF-PENDIENTE";
  const lane = getOrderLane(order.items, total);
  const chances = calcRaffleChances(total);

  return (
    <article className="overflow-hidden rounded-[14px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
      <div className="h-[2px]" style={{ background: status.color }} />
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[12px] text-[#7B7266]">#{order.id}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#7B7266]">
              <Icon name={order.channel === "web" ? "ShoppingBag" : "MessageCircle"} size={13} strokeWidth={1.5} />
              {order.channel === "web" ? "Web" : "WhatsApp"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${lane.id === "mayorista" ? "bg-[#6B091E]/10 text-[#6B091E]" : "bg-[#206A45]/10 text-[#206A45]"}`}>
              {lane.label}
            </span>
            {chances > 0 && (
              <span className="rounded-full bg-[#8A5A22]/10 px-2 py-0.5 font-mono text-[10px] text-[#8A5A22]">
                🎟️ {chances} {chances === 1 ? "chance" : "chances"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenTicket(order)}
              className="flex h-7 items-center gap-1 rounded-[6px] border border-[#1F1B16]/15 bg-white px-2 text-[11px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]"
              title="Vista previa de comanda térmica 80mm"
            >
              <ReceiptText size={12} strokeWidth={1.5} /> Comanda 80mm
            </button>
            <span className="flex items-center gap-2 text-[12px] text-[#5E554A]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
              {status.full.replace(" (Cliente Avisado)", "")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[23px] font-medium leading-tight tracking-[-0.01em] text-[#1F1B16]" title={order.customerName}>{order.customerName}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#7B7266]">
              <span>{order.phone}</span>
              <span>{order.createdAt}</span>
              <span>{order.payment.replace(" (Retiro en 10 seg)", "")}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-[#7B7266]">{isReview ? "Transferido" : "Total"}</p>
            <p className="mt-1 font-mono text-[21px] font-medium tabular-nums leading-none text-[#1F1B16]">{formatMoney(total)}</p>
            {Math.abs(delta) >= 1 && <p className="mt-1 font-mono text-[11px] text-[#8A5A22]">{delta > 0 ? "+" : ""}{formatMoney(delta)}</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-[#1F1B16]/15 pt-3 text-[12px]">
          <span className="flex items-center gap-1.5 text-[#5E554A]">
            <Clock size={14} strokeWidth={1.5} /> {order.pickupSlot || (isReview ? "Retiro tras el pago" : "Franja pendiente")}
          </span>
          <span className="flex items-center gap-1.5 text-[#7B7266]">
            <ShoppingBag size={14} strokeWidth={1.5} /> {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"}
          </span>
          {paymentStatus === "approved" && (
            <span className="flex items-center gap-1.5 text-[#206A45]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#206A45]" /> Pago acreditado
            </span>
          )}
          {order.status === 3 && order.readyAt && (
            <span className="text-[#206A45]">Avisado {order.readyAt}</span>
          )}
        </div>

        {isReview ? (
          <div className="mt-4 border-l-2 border-[#8A5A22] pl-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-[#1F1B16]">Transferencia en revisión</p>
                <p className="mt-1 text-[12px] leading-5 text-[#7B7266]">Comprobante por {formatMoney(total)}. El pedido se prepara cuando el pago esté acreditado.</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-[#7B7266]">{paymentReference}</span>
            </div>
            <button
              type="button"
              onClick={() => onConfirmPayment(order)}
              className="mt-3 flex h-9 items-center gap-2 rounded-[8px] border border-[#8A5A22]/40 px-3 text-[12px] font-medium text-[#8A5A22] transition-colors hover:bg-[#8A5A22]/[0.06]"
            >
              <ShieldCheck size={14} strokeWidth={1.5} /> Confirmar pago
            </button>
          </div>
        ) : (
          <OrderSteps status={order.status} />
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#7B7266]">{weightsLocked ? "Peso estimado" : "Peso en balanza"}</p>
            {!weightsLocked && <span className="font-mono text-[11px] text-[#206A45]">Total en vivo</span>}
          </div>
          <div className="border-t border-[#1F1B16]/10">
            {order.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 border-b border-[#1F1B16]/8 py-2.5 last:border-b-0">
                {item.pricing === "kg" ? (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1F1B16]">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#7B7266]">Pedido {formatKg(item.requestedKg)} · {formatMoney(item.unitPrice)}/kg</p>
                    </div>
                    {weightsLocked ? (
                      <span className="font-mono text-[12px] text-[#5E554A]">{formatKg(item.actualKg)}</span>
                    ) : (
                      <WeightInput item={item} onChange={(value) => onUpdateWeight(order.id, index, value)} />
                    )}
                    <span className="w-16 shrink-0 text-right font-mono text-[12px] tabular-nums text-[#1F1B16]">{formatMoney(lineTotal(item))}</span>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1F1B16]">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#7B7266]">{item.pricing === "pack" ? `Combo ${item.unitLabel}` : "Unidad"} · ×{item.qty}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-[#1F1B16]">{formatMoney(lineTotal(item))}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#1F1B16]/10 pt-4">
          <div>
            <p className="text-[11px] text-[#7B7266]">{isReview ? "Total a acreditar" : "Total final"}</p>
            <p className="mt-0.5 text-[11px] text-[#7B7266]">{order.payment}</p>
          </div>
          <p className="font-mono text-[24px] font-medium tabular-nums leading-none text-[#1F1B16]">{formatMoney(total)}</p>
        </div>

        <div className="mt-4">
          {isReview ? (
            <p className="text-[11px] leading-4 text-[#7B7266]">Al confirmar el pago, NovilaBot pide la franja de retiro y se habilita la preparación.</p>
          ) : waitingSlot ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-[#206A45]">Pago acreditado. Falta la franja de retiro.</p>
              <button type="button" onClick={() => onRequestSlot(order)} className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#1F1B16]/15 px-3 text-[12px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]">
                <RefreshCw size={14} strokeWidth={1.5} /> Pedir franja
              </button>
            </div>
          ) : order.status < 3 ? (
            <div className="flex gap-2">
              {order.status === 1 && (
                <button
                  type="button"
                  onClick={() => onAdvance(order.id, 2)}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] border border-[#1F1B16]/15 px-3 text-[12px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]"
                >
                  <ChefHat size={14} strokeWidth={1.5} /> Iniciar
                </button>
              )}
              <button
                type="button"
                onClick={() => onMarkReady(order)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#580617]"
              >
                <Check size={15} strokeWidth={1.8} /> Marcar listo y enviar WhatsApp
              </button>
            </div>
          ) : order.status === 3 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-[#206A45]">Cliente avisado por WhatsApp a las {order.readyAt || "--:--"}</p>
              <button type="button" onClick={() => onWithdraw(order)} className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#1F1B16]/15 px-3 text-[12px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]">
                <ShoppingBag size={14} strokeWidth={1.5} /> Marcar retirado
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[#7B7266]">Retirado {order.withdrawnAt ? `${order.withdrawnAt}` : ""}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function CustomerTable({ customers, orders, onReminder, onToast }) {
  const [query, setQuery] = useState("");
  const rows = customers
    .map((customer) => {
      const ownOrders = orders.filter((order) => normalizePhone(order.phone) === normalizePhone(customer.phone));
      const currentSpent = ownOrders.filter((order) => (order.paymentStatus || "approved") === "approved").reduce((sum, order) => sum + orderTotal(order), 0);
      return {
        ...customer,
        orderCount: customer.historicOrders + ownOrders.length,
        spent: customer.historicSpent + currentSpent,
        lastOrder: ownOrders[0] || null,
      };
    })
    .filter((customer) => normalizeText(`${customer.name} ${customer.phone}`).includes(normalizeText(query)))
    .sort((a, b) => b.spent - a.spent);

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Clientes</h2>
          <p className="mt-2 text-[12px] text-[#7B7266]">{rows.length} registrados</p>
        </div>
        <div className="relative">
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" className="h-9 w-[210px] rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] pl-9 pr-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
        <div className="thin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1F1B16]/10 text-[11px] text-[#7B7266]">
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">WhatsApp</th>
                <th className="px-4 py-3 text-center font-normal">Pedidos</th>
                <th className="px-4 py-3 text-right font-normal">Total gastado</th>
                <th className="px-4 py-3 text-center font-normal">Chances Sorteo</th>
                <th className="px-4 py-3 font-normal">Último pedido</th>
                <th className="px-4 py-3 text-right font-normal">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1B16]/8">
              {rows.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-[#F7F4EE]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1F1B16]/10 bg-[#EFE9DF] font-mono text-[11px] text-[#5E554A]">{initials(customer.name)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#1F1B16]">{customer.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#7B7266]">{customer.favorite || "Sin preferencia"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#5E554A]">{customer.phone}</td>
                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#5E554A]">{customer.orderCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-[#1F1B16]">{formatMoney(customer.spent)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#8A5A22]/10 px-2.5 py-0.5 font-mono text-[11px] text-[#8A5A22]">
                      🎟️ {calcRaffleChances(customer.spent)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {customer.lastOrder ? (
                      <div>
                        <p className="font-mono text-[11px] text-[#5E554A]">#{customer.lastOrder.id}</p>
                        <p className="mt-0.5 text-[11px] text-[#7B7266]">{customer.lastOrder.pickupSlot}</p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#7B7266]">Historial</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onReminder(customer)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[#1F1B16]/12 px-2.5 text-[12px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]"
                    >
                      <MessageCircle size={14} strokeWidth={1.5} /> Recordar
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[12px] text-[#7B7266]">No hay clientes con ese nombre o teléfono.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#1F1B16]/10 px-4 py-3">
          <p className="text-[11px] text-[#7B7266]">Datos recolectados con consentimiento en el checkout y el bot.</p>
        </div>
      </div>
    </div>
  );
}

function PriceCell({ product, onCommit, onToast }) {
  const [value, setValue] = useState(String(product.price));
  useEffect(() => { setValue(String(product.price)); }, [product.price]);

  const commit = () => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      onCommit(parsed);
    } else {
      setValue(String(product.price));
    }
  };

  return (
    <div className="relative w-[112px]">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#141414]/35">$</span>
      <input
        type="number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        className="price-input w-full rounded-[4px] border border-transparent bg-transparent py-1 pl-5 pr-1 text-right text-[12px] font-medium text-[#1F1B16] transition-colors hover:border-[#1F1B16]/15 hover:bg-white focus:border-[#6B091E]/35 focus:bg-white focus:outline-none"
        aria-label={`Precio de ${product.name}`}
      />
    </div>
  );
}

function CatalogTable({ products, onUpdatePrice, onToggleStock, onToast }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const visible = products.filter((product) => {
    const inCategory = category === "all" || product.categoryId === category;
    const inSearch = normalizeText(`${product.name} ${product.category}`).includes(normalizeText(query));
    return inCategory && inSearch;
  });

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Catálogo</h2>
          <p className="mt-2 text-[12px] text-[#7B7266]">Precios y stock de la Web y el bot</p>
        </div>
        <div className="relative">
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" className="h-9 w-[210px] rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] pl-9 pr-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none" />
        </div>
      </div>

      <div className="no-scrollbar mb-4 flex gap-5 overflow-x-auto border-b border-[#1F1B16]/10">
        <button type="button" onClick={() => setCategory("all")} className={`shrink-0 border-b-2 pb-2.5 text-[12px] transition-colors ${category === "all" ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}>Todos</button>
        {CATEGORIES.map((entry) => (
          <button key={entry.id} type="button" onClick={() => setCategory(entry.id)} className={`shrink-0 border-b-2 pb-2.5 text-[12px] transition-colors ${category === entry.id ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}>
            {entry.short}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
        <div className="thin-scrollbar max-h-[calc(100vh-350px)] min-h-[420px] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#FDFBF7] text-[11px] text-[#7B7266]">
              <tr className="border-b border-[#1F1B16]/10">
                <th className="px-4 py-3 font-normal">Producto</th>
                <th className="px-4 py-3 font-normal">Categoría</th>
                <th className="px-4 py-3 text-right font-normal">Precio</th>
                <th className="px-4 py-3 text-center font-normal">Estado</th>
                <th className="px-4 py-3 text-center font-normal">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1B16]/8">
              {visible.map((product) => (
                <tr key={product.id} className={`transition-colors hover:bg-[#F7F4EE] ${!product.stock ? "opacity-55" : ""}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <img src={IMAGES[product.image] || IMAGES.rawbeef} alt="" className="h-8 w-10 rounded-[4px] object-cover" />
                      <div className="min-w-0">
                        <p className={`truncate text-[13px] ${product.stock ? "text-[#1F1B16]" : "text-[#7B7266] line-through"}`}>{product.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#7B7266]">{product.kind === "promo" ? `Combo ${product.unitLabel}` : product.kind === "unit" ? product.unitLabel : "Por kg"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#5E554A]">{product.category}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <PriceCell product={product} onCommit={(price) => { onUpdatePrice(product.id, price); onToast({ type: "success", title: `${product.name} actualizado`, message: `Nuevo precio ${formatMoney(price)}.`, icon: "Tag", duration: 2600 }); }} onToast={onToast} />
                      <span className="w-6 text-[11px] text-[#7B7266]">/{product.unitLabel === "kg" ? "kg" : product.unitLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] ${product.stock ? "text-[#206A45]" : "text-[#8A5A22]"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${product.stock ? "bg-[#206A45]" : "bg-[#8A5A22]"}`} /> {product.stock ? "Activo" : "Pausado"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStock(product.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${product.stock ? "bg-[#6B091E]" : "bg-[#1F1B16]/15"}`}
                      aria-label={`${product.stock ? "Desactivar" : "Activar"} stock de ${product.name}`}
                      aria-pressed={product.stock}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${product.stock ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                    </button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[12px] text-[#7B7266]">No encontramos productos con ese filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#1F1B16]/10 px-4 py-3">
          <p className="text-[11px] text-[#7B7266]">Los cambios se reflejan en la Web y el bot</p>
          <p className="font-mono text-[11px] text-[#7B7266]">{visible.length} productos</p>
        </div>
      </div>
    </div>
  );
}

function PanelView({ orders, customers, products, onAdvance, onMarkReady, onWithdraw, onUpdateWeight, onConfirmPayment, onRequestSlot, onUpdatePrice, onToggleStock, onReminder, onToast }) {
  const [tab, setTab] = useState("board");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [ticketOrder, setTicketOrder] = useState(null);

  const activeOrders = orders.filter((order) => order.status < 4);
  const reviewOrders = orders.filter((order) => order.paymentStatus === "review");

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status !== b.status) return a.status - b.status;
    return b.number - a.number;
  });
  const filtered = sortedOrders.filter((order) => {
    const inChannel = filter === "all" || order.channel === filter;
    const inQuery = normalizeText(`${order.id} ${order.customerName} ${order.phone}`).includes(normalizeText(query));
    return inChannel && inQuery;
  });

  const tabs = [
    { id: "board", label: "Pedidos", icon: "ClipboardList", count: activeOrders.length },
    { id: "clients", label: "Clientes", icon: "Users", count: customers.length },
    { id: "catalog", label: "Catálogo", icon: "PackageSearch", count: products.length },
  ];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#F7F4EE] pb-16">
      <div className="border-b border-[#1F1B16]/10 bg-[#FDFBF7]">
        <div className="mx-auto flex max-w-[1560px] items-end justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-[12px] text-[#7B7266]">Operación</p>
            <h1 className="mt-1 font-display text-[32px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">Panel</h1>
          </div>
          <span className="flex items-center gap-2 text-[12px] text-[#5E554A]"><LiveDot color="#6B091E" pulse={false} /> En vivo</span>
        </div>
        <div className="mx-auto flex max-w-[1560px] gap-6 overflow-x-auto px-6">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex h-11 shrink-0 items-center gap-2 border-b-2 text-[13px] transition-colors ${tab === entry.id ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}
            >
              <Icon name={entry.icon} size={15} strokeWidth={1.5} /> {entry.label}
              <span className="font-mono text-[11px] text-[#7B7266]">{entry.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1560px] px-6 py-6">
        {tab === "board" && (
          <div>
            <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Pedidos</h2>
                <p className="mt-2 text-[12px] text-[#7B7266]">Hoy · {filtered.length} en tablero</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-1">
                  {[
                    { id: "all", label: "Todos", count: orders.length },
                    { id: "web", label: "Web", count: orders.filter((order) => order.channel === "web").length },
                    { id: "whatsapp", label: "WhatsApp", count: orders.filter((order) => order.channel === "whatsapp").length },
                  ].map((entry) => (
                    <button key={entry.id} type="button" onClick={() => setFilter(entry.id)} className={`flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[12px] transition-colors ${filter === entry.id ? "bg-[#1F1B16] text-white" : "text-[#5E554A] hover:text-[#1F1B16]"}`}>
                      {entry.label} <span className="font-mono text-[11px] opacity-70">{entry.count}</span>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" className="h-9 w-[220px] rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] pl-9 pr-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none" />
                </div>
              </div>
            </div>

            {reviewOrders.length > 0 && (
              <div className="mb-5 flex items-center gap-3 border-l-2 border-[#8A5A22] pl-4">
                <Banknote size={15} strokeWidth={1.5} className="shrink-0 text-[#8A5A22]" />
                <div>
                  <p className="text-[13px] font-medium text-[#1F1B16]">{reviewOrders.length} pago{reviewOrders.length > 1 ? "s" : ""} por acreditar</p>
                  <p className="mt-0.5 text-[12px] text-[#7B7266]">Confirmá la transferencia para habilitar la preparación.</p>
                </div>
              </div>
            )}

            {filtered.length ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {filtered.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={onAdvance}
                    onMarkReady={onMarkReady}
                    onWithdraw={onWithdraw}
                    onUpdateWeight={onUpdateWeight}
                    onConfirmPayment={onConfirmPayment}
                    onRequestSlot={onRequestSlot}
                    onOpenTicket={setTicketOrder}
                    onToast={onToast}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[12px] border border-dashed border-[#1F1B16]/15 bg-[#FDFBF7] px-4 py-14 text-center">
                <ClipboardList size={24} strokeWidth={1.5} className="mx-auto text-[#7B7266]" />
                <p className="mt-3 text-[13px] font-medium text-[#1F1B16]">No hay pedidos con ese filtro</p>
                <p className="mt-1 text-[12px] text-[#7B7266]">Probá con Todos o buscá otro nombre.</p>
              </div>
            )}
          </div>
        )}

        {tab === "clients" && <CustomerTable customers={customers} orders={orders} onReminder={onReminder} onToast={onToast} />}
        {tab === "catalog" && <CatalogTable products={products} onUpdatePrice={onUpdatePrice} onToggleStock={onToggleStock} onToast={onToast} />}
      </div>
      <TicketModal order={ticketOrder} onClose={() => setTicketOrder(null)} onToast={onToast} />
    </main>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// VISTA 4 · CRM WHATSAPP
// ─────────────────────────────────────────────────────────────────────────────

function CrmView({ customers, products, campaignState, onSimulate, onGoWhatsApp }) {
  const [selectedId, setSelectedId] = useState("miercoles");
  const target = customers.find((customer) => normalizePhone(customer.phone) === normalizePhone(WHATSAPP_DEMO_PHONE)) || customers[0];
  const promos = products.filter((product) => product.categoryId === "super" && product.stock).slice(0, 3);
  const livePrice = (id, fallback) => products.find((product) => product.id === id)?.price ?? fallback;
  const asadoPrices = {
    vacio: livePrice("vacuno-vacio", 15499),
    costilla: livePrice("vacuno-costilla", 14499),
    chorizo: livePrice("elaborados-chorizo-bombon", 11999),
  };
  const fridayAudience = customers.filter((customer) => customer.tags?.some((tag) => ["Asadora", "Parrillero"].includes(tag))).length || 2;
  const recompraAudience = customers.filter((customer) => customer.tags?.some((tag) => ["Recompra", "Cazuela"].includes(tag))).length || 2;

  const previews = {
    miercoles: `Hola ${firstName(target?.name) || "vecino"}, estas son las que vuelan esta semana:\n\n${promos.map((promo) => `• ${promo.name.replace("Promo ", "")} ${promo.unit} · ${formatMoney(promo.price)}`).join("\n")}\n\nArmá tu pedido por acá.`,
    viernes: `Hola ${firstName(target?.name) || "vecino"}, ¿armamos el asado de este finde?\n\nVacío ${formatMoney(asadoPrices.vacio)}/kg, Costilla ${formatMoney(asadoPrices.costilla)}/kg y Chorizo Bombón ${formatMoney(asadoPrices.chorizo)}/kg.\n\nRespondé “ASADO”.`,
    recompra: `Hola ${firstName(target?.name) || "vecino"}, recién salieron Milanesas Vacunas frescas (${formatMoney(livePrice("elaborados-milanesa-vacuna", 9999))}/kg) y hamburguesas de elaboración propia.\n\nReservá tu bandeja ahora por acá antes de que se agoten en mostrador y retirá sin hacer fila.`,
  };

  const campaignCards = CAMPAIGNS.map((campaign) => {
    const sent = campaignState[campaign.id]?.sentAt;
    const audience = campaign.id === "miercoles" ? customers.length : campaign.id === "viernes" ? fridayAudience : recompraAudience;
    return { ...campaign, sent, audience };
  });
  const selected = campaignCards.find((campaign) => campaign.id === selectedId) || campaignCards[0];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#F7F4EE] pb-16">
      <div className="mx-auto max-w-[1560px] px-6 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">Campañas</h1>
            <p className="mt-2 text-[12px] text-[#7B7266]">WhatsApp · {customers.length} clientes</p>
          </div>
          <button type="button" onClick={onGoWhatsApp} className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#1F1B16]/12 px-3 text-[12px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]">
            <MessageCircle size={15} strokeWidth={1.5} /> WhatsApp
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
              {campaignCards.map((campaign, index) => {
                const active = campaign.id === selectedId;
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setSelectedId(campaign.id)}
                    className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors ${index > 0 ? "border-t border-[#1F1B16]/10" : ""} ${active ? "bg-[#EFE9DF]/55" : "hover:bg-[#F7F4EE]"}`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-[8px] ${active ? "bg-[#6B091E] text-white" : "bg-[#EFE9DF] text-[#6B091E]"}`}>
                      <Icon name={campaign.icon} size={17} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium text-[#1F1B16]">{campaign.title}</span>
                      <span className="mt-1 block text-[12px] text-[#7B7266]">{campaign.eyebrow} · {campaign.audience} clientes</span>
                    </span>
                    <span className={`text-[11px] ${campaign.sent ? "text-[#206A45]" : "text-[#7B7266]"}`}>{campaign.sent ? `Enviada ${campaign.sent}` : "Pendiente"}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
              <p className="text-[12px] text-[#7B7266]">Mensaje de la campaña</p>
              <div className="mt-3 rounded-[8px] bg-[#F7F4EE] p-4">
                <p className="whitespace-pre-line text-[13px] leading-6 text-[#1F1B16]">{previews[selected.id]}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-[12px] text-[#7B7266]">{selected.description}</p>
                <button type="button" onClick={() => onSimulate(selected.id)} className="flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-[#1F1B16] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#2B2620]">
                  <Send size={15} strokeWidth={1.5} /> Simular envío
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
              <p className="text-[12px] text-[#7B7266]">Base registrada</p>
              <p className="mt-3 font-mono text-[36px] font-medium leading-none tabular-nums text-[#1F1B16]">{customers.length}</p>
              <p className="mt-2 text-[12px] text-[#5E554A]">clientes con WhatsApp</p>
            </div>

            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
              <p className="text-[12px] text-[#7B7266]">Próximos envíos</p>
              <div className="mt-4 space-y-3">
                {[
                  ["Mié", "10:00", "Super promos", `${customers.length} clientes`],
                  ["Vie", "10:00", "¿Armamos el asado?", `${fridayAudience} clientes`],
                  ["Stock", "Hoy", "Milanesas recién hechas", `${recompraAudience} clientes`],
                ].map(([day, time, title, audience]) => (
                  <div key={title} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[7px] bg-[#EFE9DF] text-[#6B091E]">
                      <span className="text-[11px] font-medium leading-none">{day}</span>
                      <span className="mt-0.5 font-mono text-[11px] leading-none text-[#7B7266]">{time}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#1F1B16]">{title}</p>
                      <p className="mt-0.5 text-[11px] text-[#7B7266]">{audience}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" onClick={onGoWhatsApp} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#1F1B16] text-[12px] text-white transition-colors hover:bg-[#2B2620]">
              <MessageCircle size={15} strokeWidth={1.5} /> Abrir WhatsApp
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// App state & handlers
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [activeView, setActiveView] = useState(1);
  const [products, setProducts] = useState(() => clone(INITIAL_PRODUCTS));
  const [customers, setCustomers] = useState(() => clone(INITIAL_CUSTOMERS));
  const [orders, setOrders] = useState(() => clone(INITIAL_ORDERS));
  const [whatsappMessages, setWhatsappMessages] = useState(() => clone(INITIAL_WHATSAPP_MESSAGES));
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastWebOrder, setLastWebOrder] = useState(null);
  const [unread, setUnread] = useState(0);
  const [waTyping, setWaTyping] = useState(false);
  const [waFlow, setWaFlow] = useState({ mode: "idle" });
  const [campaignState, setCampaignState] = useState(() => Object.fromEntries(CAMPAIGNS.map((campaign) => [campaign.id, { sentAt: null }])));
  const [toasts, setToasts] = useState([]);
  const [guideOpen, setGuideOpen] = useState(false);

  const ordersRef = useRef(orders);
  const customersRef = useRef(customers);
  const activeViewRef = useRef(activeView);
  const waTypingRef = useRef(false);
  const waSeqRef = useRef(0);
  const toastSeqRef = useRef(0);
  const timersRef = useRef([]);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  useEffect(() => {
    activeViewRef.current = activeView;
    if (activeView === 2) setUnread(0);
  }, [activeView]);

  useEffect(() => () => { timersRef.current.forEach((timer) => window.clearTimeout(timer)); }, []);

  const pushTimer = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  };

  const addToast = (toast) => {
    const id = ++toastSeqRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    pushTimer(() => setToasts((prev) => prev.filter((entry) => entry.id !== id)), toast.duration || 5600);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((entry) => entry.id !== id));

  const addWaMessage = (message) => {
    const msg = {
      id: `wa-${Date.now()}-${++waSeqRef.current}`,
      side: "in",
      kind: "text",
      time: nowTime(),
      ...message,
    };
    setWhatsappMessages((prev) => [...prev, msg]);
    return msg;
  };

  const bumpUnreadIfNeeded = () => {
    if (activeViewRef.current !== 2) setUnread((value) => value + 1);
  };

  const setOrdersState = (nextOrders) => {
    ordersRef.current = nextOrders;
    setOrders(nextOrders);
  };

  const setCustomersState = (nextCustomers) => {
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
  };

  const upsertCustomer = (name, phone, tag) => {
    const digits = normalizePhone(phone);
    const existing = customersRef.current.find((customer) => normalizePhone(customer.phone) === digits);
    if (existing) {
      const updated = {
        ...existing,
        name: name || existing.name,
        tags: Array.from(new Set([...(existing.tags || []), tag])),
      };
      setCustomersState(customersRef.current.map((customer) => (customer.id === existing.id ? updated : customer)));
      return updated;
    }
    const created = {
      id: `cli-${Date.now()}`,
      name,
      phone,
      historicOrders: 0,
      historicSpent: 0,
      joined: "Hoy",
      tags: [tag],
      favorite: "",
    };
    setCustomersState([...customersRef.current, created]);
    return created;
  };

  const createOrderRecord = ({
    customer, customerName, phone, channel, pickupSlot, payment, items,
    status = 1, paymentStatus = "approved", paymentConfirmedAt = null, paymentReference = null,
  }) => {
    const code = nextOrderCode(ordersRef.current);
    const order = {
      id: code,
      number: Number(code.split("-")[1]),
      customerId: customer?.id || null,
      customerName,
      phone,
      channel,
      pickupSlot,
      payment,
      paymentStatus,
      paymentConfirmedAt,
      paymentReference,
      status,
      createdAt: nowTime(),
      readyAt: null,
      withdrawnAt: null,
      items,
    };
    setOrdersState([order, ...ordersRef.current]);
    return order;
  };

  const handleAddToCart = (product) => {
    if (!product.stock) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) return prev.map((line) => line.productId === product.id ? { ...line, qty: line.qty + 1 } : line);
      return [...prev, { productId: product.id, qty: 1 }];
    });
    addToast({ type: "success", title: `${product.name} agregado`, message: `${product.unitLabel} · ${formatMoney(product.price)}`, icon: "ShoppingBag", duration: 2200 });
  };

  const handleAddPack = (pack, packTotal) => {
    setCart((prev) => {
      const next = [...prev];
      pack.items.forEach(({ productId, qty }) => {
        const product = products.find((entry) => entry.id === productId);
        if (!product || !product.stock) return;
        const idx = next.findIndex((line) => line.productId === productId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], qty: Math.round((next[idx].qty + qty) * 100) / 100 };
        } else {
          next.push({ productId, qty });
        }
      });
      return next;
    });
    addToast({
      type: "success",
      title: `${pack.title} cargado`,
      message: `${pack.weightLabel} · Estimado ${formatMoney(packTotal)}`,
      icon: "Beef",
      duration: 3200,
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  };

  const handleWebConfirm = (form) => {
    if (!cart.length) return;
    const items = cart.map((line) => {
      const product = products.find((entry) => entry.id === line.productId);
      return product ? productToOrderItem(product, line.qty) : null;
    }).filter(Boolean);
    if (!items.length) return;
    const customer = upsertCustomer(form.name.trim(), form.phone, "Web");
    const order = createOrderRecord({
      customer,
      customerName: form.name.trim(),
      phone: form.phone,
      channel: "web",
      pickupSlot: form.slot,
      payment: form.payment,
      items,
      paymentStatus: "approved",
      paymentConfirmedAt: nowTime(),
      paymentReference: `WEB-${String(Date.now()).slice(-5)}`,
    });
    const total = orderTotal(order);
    const lane = getOrderLane(order.items, total);
    const chances = calcRaffleChances(total);
    const chancesLine = chances > 0 ? `\n🎟️ Sumaste ${chances} ${chances === 1 ? "chance digital" : "chances digitales"} para el Sorteo Novila.` : "";
    addWaMessage({
      side: "in",
      kind: "order_confirmed",
      text: `Listo, ${firstName(order.customerName)}. Recibimos tu pedido #${order.id} en Frigorífico Novila.\n\nRetiro: ${order.pickupSlot}\n${BRAND.address}\n${lane.description}\nTotal estimado: ${formatMoney(total)} (se ajusta al peso real en balanza)\nPago: ${order.payment}${chancesLine}\n\nTe aviso por acá apenas esté preparado.`,
      time: nowTime(),
    });
    bumpUnreadIfNeeded();
    setCart([]);
    setCartOpen(false);
    setLastWebOrder(order);
    addToast({ type: "success", title: `Pedido #${order.id} confirmado`, message: `Ya aparece en el Panel del Frigorífico. Le enviamos la confirmación a ${order.customerName}.`, icon: "CheckCircle2", duration: 6000 });
  };

  const handleUpdateWeight = (orderId, index, value) => {
    const parsed = Math.max(0.01, Math.round(Number(value) * 100) / 100);
    if (!Number.isFinite(parsed)) return;
    const next = ordersRef.current.map((order) => {
      if (order.id !== orderId) return order;
      return { ...order, items: order.items.map((item, itemIndex) => itemIndex === index ? { ...item, actualKg: parsed } : item) };
    });
    setOrdersState(next);
  };

  const handleAdvanceStatus = (orderId, status) => {
    const next = ordersRef.current.map((order) => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        status,
        readyAt: status === 3 ? (order.readyAt || nowTime()) : order.readyAt,
        withdrawnAt: status === 4 ? nowTime() : order.withdrawnAt,
      };
    });
    setOrdersState(next);
  };

  const handleMarkReady = (order) => {
    if (order.status >= 3) return;
    if ((order.paymentStatus || "approved") !== "approved") {
      addToast({ type: "gold", title: "Pago pendiente de acreditación", message: `El pedido #${order.id} no puede prepararse hasta corroborar la transferencia.`, icon: "Banknote", duration: 5200 });
      return;
    }
    if (!order.pickupSlot) {
      addToast({ type: "gold", title: "Falta la franja de retiro", message: `Esperá a que ${firstName(order.customerName)} elija horario por WhatsApp.`, icon: "Clock", duration: 5200 });
      return;
    }
    const finalTotal = orderTotal(order);
    const readyAt = nowTime();
    const next = ordersRef.current.map((entry) => entry.id === order.id ? { ...entry, status: 3, readyAt } : entry);
    setOrdersState(next);
    const clientFirst = firstName(order.customerName);
    addWaMessage({
      side: "in",
      kind: "ready",
      orderCode: order.id,
      time: readyAt,
      text: `Hola ${clientFirst}. Tu pedido #${order.id} ya está preparado y pesado en Frigorífico Novila. Peso final verificado. Total a abonar: ${formatMoney(finalTotal)}. Pasá directo por la Ventanilla Express en Av. Sabattini 3480 diciendo tu nombre (${clientFirst}) o mostrando el código #${order.id}.`,
    });
    bumpUnreadIfNeeded();
    playChime();
    addToast({
      type: "success",
      title: `WhatsApp oficial enviado a ${order.customerName} (${order.phone})`,
      message: "Puedes verlo en la Pestaña 2.",
      icon: "MessageCircle",
      duration: 7000,
    });
  };

  const requestPickupSlot = (order, options = {}) => {
    setWaFlow({
      mode: "awaiting_slot",
      orderId: order.id,
      customerName: order.customerName,
      customerId: order.customerId,
    });
    addWaMessage({
      side: "in",
      kind: "text",
      time: nowTime(),
      text: options.paymentConfirmed
        ? ` Pago acreditado, ${firstName(order.customerName)}. Tu pedido #${order.id} ya está confirmado y reservado.\n\n¿En qué franja de hoy lo querés retirar?`
        : `Hola ${firstName(order.customerName)}, tu pago está acreditado. Para terminar de reservar el pedido #${order.id}, contame en qué franja lo retirás.`,
      quickReplies: PICKUP_SLOTS,
    });
    bumpUnreadIfNeeded();
    if (options.toast !== false) {
      addToast({ type: "gold", title: "Franja de retiro solicitada", message: `Le pedimos el horario a ${order.customerName} por WhatsApp.`, icon: "Clock", duration: 4600 });
    }
  };

  const handleConfirmPayment = (order) => {
    if ((order.paymentStatus || "approved") !== "review") return;
    const confirmedAt = nowTime();
    const next = ordersRef.current.map((entry) => entry.id === order.id
      ? { ...entry, status: 1, paymentStatus: "approved", paymentConfirmedAt: confirmedAt, payment: "Transferencia bancaria acreditada" }
      : entry);
    setOrdersState(next);
    requestPickupSlot({ ...order, status: 1, paymentStatus: "approved" }, { paymentConfirmed: true, toast: false });
    addToast({
      type: "success",
      title: `Pago acreditado · Pedido #${order.id}`,
      message: `Transferencia de ${formatMoney(orderTotal(order))} corroborada. NovilaBot ya le pide la franja de retiro a ${firstName(order.customerName)}.`,
      icon: "Banknote",
      duration: 6200,
    });
  };

  const handleWithdraw = (order) => {
    handleAdvanceStatus(order.id, 4);
    addToast({ type: "gold", title: `Pedido #${order.id} retirado`, message: `${order.customerName} pasó por la Ventanilla Express.`, icon: "CheckCircle2", duration: 4200 });
  };

  const handleUpdateProductPrice = (productId, price) => {
    const value = Math.max(0, Math.round(Number(price) || 0));
    setProducts((prev) => prev.map((product) => {
      if (product.id !== productId) return product;
      const normalPrice = product.normalPrice;
      return {
        ...product,
        price: value,
        savings: normalPrice ? Math.max(0, normalPrice - value) : product.savings,
        discount: normalPrice && normalPrice > 0 ? Math.max(0, Math.round(((normalPrice - value) / normalPrice) * 100)) : product.discount,
      };
    }));
  };

  const handleToggleStock = (productId) => {
    setProducts((prev) => prev.map((product) => {
      if (product.id !== productId) return product;
      addToast({ type: product.stock ? "gold" : "success", title: product.stock ? `${product.name} sin stock` : `${product.name} disponible`, message: "La Web y el Bot ya reflejan el cambio.", icon: product.stock ? "AlertCircle" : "CheckCircle2", duration: 3000 });
      return { ...product, stock: !product.stock };
    }));
  };

  const sendCustomerReminder = (customer) => {
    addWaMessage({
      side: "in",
      kind: "campaign",
      campaignName: "Recordatorio individual",
      time: nowTime(),
      text: `Hola ${firstName(customer.name)}, te escribimos de Frigorífico Novila. Esta semana tenemos super promos. Pasá por Av. Sabattini 3480 o pedí por acá.`,
    });
    bumpUnreadIfNeeded();
    addToast({ type: "gold", title: `Recordatorio enviado a ${customer.name}`, message: "Mensaje de muestra disponible en la Pestaña 2.", icon: "MessageCircle" });
  };

  const sendCampaign = (campaignId) => {
    const campaign = CAMPAIGNS.find((entry) => entry.id === campaignId);
    if (!campaign) return;
    const target = customersRef.current.find((customer) => normalizePhone(customer.phone) === normalizePhone(WHATSAPP_DEMO_PHONE)) || customersRef.current[0];
    const promos = products.filter((product) => product.categoryId === "super" && product.stock);
    let text = "";
    if (campaignId === "miercoles") {
      text = `Hola ${firstName(target?.name) || "vecino"}, estas son las que vuelan esta semana:\n\n${promos.slice(0, 4).map((promo) => `• ${promo.name.replace("Promo ", "")} ${promo.unit} · ${formatMoney(promo.price)}`).join("\n")}\n\nArmá tu pedido por acá. `;
    } else if (campaignId === "viernes") {
      const livePrice = (id, fallback) => products.find((product) => product.id === id)?.price ?? fallback;
      text = `Hola ${firstName(target?.name) || "vecino"}  ¿Armamos el asado de este finde?\n\nReservá hoy. Tenemos Vacío ${formatMoney(livePrice("vacuno-vacio", 15499))}/kg, Costilla ${formatMoney(livePrice("vacuno-costilla", 14499))}/kg y Chorizo Bombón ${formatMoney(livePrice("elaborados-chorizo-bombon", 11999))}/kg.\n\nRespondé “ASADO” y te lo dejo preparado.`;
    } else {
      const milaPrice = products.find((product) => product.id === "elaborados-milanesa-vacuna")?.price ?? 9999;
      text = `Hola ${firstName(target?.name) || "vecino"}, recién salieron Milanesas Vacunas frescas (${formatMoney(milaPrice)}/kg) y hamburguesas de elaboración propia.\n\nReservá tu bandeja por acá antes de que se agoten en mostrador y retirá por Ventanilla Express sin fila.`;
    }
    addWaMessage({ side: "in", kind: "campaign", campaignName: campaign.title, text, time: nowTime() });
    bumpUnreadIfNeeded();
    setCampaignState((prev) => ({ ...prev, [campaignId]: { sentAt: nowTime() } }));
    const audience = campaignId === "miercoles" ? customersRef.current.length : campaignId === "viernes" ? Math.max(1, customersRef.current.filter((customer) => ["Asadora", "Parrillero"].some((tag) => customer.tags?.includes(tag))).length) : Math.max(1, customersRef.current.filter((customer) => ["Recompra", "Cazuela"].some((tag) => customer.tags?.includes(tag))).length);
    addToast({ type: "success", title: `${campaign.title}: envío simulado`, message: `${audience} clientes en la audiencia. El mensaje de muestra ya entró a la Pestaña 2.`, icon: "Megaphone", duration: 6500 });
  };

  const parseOrderIntent = (rawText, options = {}) => {
    const text = normalizeText(rawText);
    const items = [];
    const seen = new Set();
    const addProduct = (product, qty = 1) => {
      if (!product || seen.has(product.id)) return;
      seen.add(product.id);
      items.push(productToOrderItem(product, product.kind === "kg" ? qty : Math.max(1, Math.round(qty))));
    };
    const quantityFor = (keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const before = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:kg|kilos?|kilo)\\s+(?:de\\s+)?${escaped}`));
      if (before) return Number(before[1].replace(",", "."));
      const after = text.match(new RegExp(`${escaped}[^\\d]{0,14}(\\d+(?:[.,]\\d+)?)\\s*(?:kg|kilos?)`));
      if (after) return Number(after[1].replace(",", "."));
      return 1;
    };

    const promoAguja = products.find((product) => product.id === "promo-aguja-2kg");
    const milanesa = products.find((product) => product.id === "elaborados-milanesa-vacuna");
    const promoPuchero = products.find((product) => product.id === "promo-puchero-comun-3kg");

    if (text.includes("aguja") && (text.includes("promo") || options.audio)) addProduct(promoAguja, 1);
    if (text.includes("milanesa")) addProduct(milanesa, quantityFor("milanesa"));
    if (text.includes("puchero") && text.includes("promo")) addProduct(promoPuchero, 1);

    if (!items.length) {
      const specials = [
        { words: ["vacio cerdo"], id: "cerdo-vacio-de-cerdo" },
        { words: ["vacio"], id: "vacuno-vacio" },
        { words: ["costilla"], id: "vacuno-costilla" },
        { words: ["chorizo"], id: "elaborados-chorizo-bombon" },
        { words: ["morcilla"], id: "elaborados-morcilla" },
        { words: ["pollo entero"], id: "pollo-pollo-entero" },
        { words: ["bondiola"], id: "cerdo-bondiola" },
        { words: ["peceto"], id: "vacuno-peceto" },
        { words: ["matambre"], id: "vacuno-matambre" },
        { words: ["entrana"], id: "vacuno-entrana" },
        { words: ["asado"], id: "vacuno-costilla" },
      ];
      specials.forEach((special) => {
        if (items.length) return;
        if (special.words.every((word) => text.includes(word))) {
          addProduct(products.find((product) => product.id === special.id), quantityFor(special.words[special.words.length - 1]));
        }
      });
    }

    if (options.suggestion && !items.length) {
      const suggestion = buildAsadoSuggestion();
      suggestion.forEach((entry) => addProduct(entry.product, entry.qty));
    }
    return items;
  };

  const buildAsadoSuggestion = () => {
    const vacio = products.find((product) => product.id === "vacuno-vacio");
    const costilla = products.find((product) => product.id === "vacuno-costilla");
    const chorizo = products.find((product) => product.id === "elaborados-chorizo-bombon");
    const morcilla = products.find((product) => product.id === "elaborados-morcilla");
    return [
      { product: vacio, qty: 2 },
      { product: costilla, qty: 1.5 },
      { product: chorizo, qty: 1 },
      { product: morcilla, qty: 0.5 },
    ].filter((entry) => entry.product);
  };

  const asadoAnswer = () => {
    const suggestion = buildAsadoSuggestion();
    const lines = suggestion.map(({ product, qty }) => `• ${qty.toLocaleString("es-AR")} kg ${product.name} — ${formatMoney(product.price * qty)}`);
    const total = suggestion.reduce((sum, entry) => sum + entry.product.price * entry.qty, 0);
    return `Para 6 personas calculá unos 500 g por persona. Te recomiendo esta combinación:\n\n${lines.join("\n")}\n\nTotal estimado: ${formatMoney(total)}\nRinde 5 kg de carne + achuras. Si querés, te tomo el pedido ahora. `;
  };

  const startOrderFlow = () => {
    setWaFlow({ mode: "choosing" });
    return {
      text: "Dale Te armo el pedido express. Decime qué querés llevar y lo dejo reservado para retirar en Av. Sabattini 3480.",
      quickReplies: ["Promo Aguja 2 kg", "1 kg Milanesa Vacuna", "Promo Puchero 3 kg"],
    };
  };

  const itemsEstimatedTotal = (items) =>
    (items || []).reduce((sum, item) => sum + (item.pricing === "kg" ? item.qty * item.unitPrice : item.qty * item.unitPrice), 0);

  const transferPrompt = (items, customerName) => {
    const total = itemsEstimatedTotal(items);
    return {
      side: "in",
      kind: "transfer",
      text: `Para reservar el pedido, el pago es por transferencia bancaria.\n\nTransferí ${formatMoney(total)} y enviame el comprobante. Cuando el frigorífico lo corrobore, te pido la franja de retiro.`,
      transfer: {
        amount: total,
        alias: TRANSFER_DATA.alias,
        cbu: TRANSFER_DATA.cbu,
        titular: TRANSFER_DATA.titular,
        bank: TRANSFER_DATA.bank,
        customerName,
      },
      quickReplies: ["Simular transferencia", "Cancelar pedido"],
    };
  };

  const prepareDraft = (items, options = {}) => {
    if (!items.length) {
      return {
        flow: waFlow.mode === "choosing" ? { mode: "choosing" } : waFlow,
        messages: [{
          side: "in",
          text: "No pude identificar el corte en el mensaje. Probá con “Promo Aguja 2 kg”, “1 kg Milanesa Vacuna” o mirá las promos.",
          quickReplies: ["Ver promos", "Promo Aguja 2 kg", "1 kg Milanesa Vacuna"],
        }],
      };
    }
    const registered = customersRef.current.find((customer) => normalizePhone(customer.phone) === normalizePhone(WHATSAPP_DEMO_PHONE));
    const summary = items.map((item) => `• ${item.pricing === "kg" ? `${item.qty} kg` : `${item.qty} ×`} ${item.name}${item.pricing === "pack" ? ` (${item.unitLabel})` : ""} — ${formatMoney(item.pricing === "kg" ? item.qty * item.unitPrice : item.qty * item.unitPrice)}`).join("\n");
    const total = itemsEstimatedTotal(items);
    const intro = options.audio ? "Escuché tu audio y lo interpreté así: 🎙️\n\n" : "";
    if (registered) {
      return {
        flow: { mode: "awaiting_transfer", items, customerName: registered.name, customerId: registered.id, total },
        messages: [
          {
            side: "in",
            text: `${intro}Perfecto, ${firstName(registered.name)}. Te tomo este pedido:\n\n${summary}\n\nTotal estimado: ${formatMoney(total)} (se ajusta al peso real de balanza).`,
          },
          transferPrompt(items, registered.name),
        ],
      };
    }
    return {
      flow: { mode: "awaiting_name", items, customerName: "", customerId: null, total },
      messages: [{
        side: "in",
        text: `${intro}Perfecto, te tomo este pedido:\n\n${summary}\n\nTotal estimado: ${formatMoney(total)}.\n\nAntes de confirmar necesito tu Nombre y Apellido (obligatorio para la orden de retiro). Tu WhatsApp ${WHATSAPP_DEMO_PHONE} ya lo tengo detectado. ✍️`,
      }],
    };
  };

  const completeChatSlot = (flow, pickupSlot) => {
    const order = ordersRef.current.find((entry) => entry.id === flow.orderId);
    if (!order) return null;
    const next = ordersRef.current.map((entry) => entry.id === order.id
      ? { ...entry, pickupSlot, status: Math.max(1, entry.status || 1) }
      : entry);
    setOrdersState(next);
    setWaFlow({ mode: "idle" });
    const total = orderTotal({ ...order, pickupSlot });
    const lane = getOrderLane(order.items, total);
    const chances = calcRaffleChances(total);
    const chancesLine = chances > 0 ? `\n🎟️ Sumaste ${chances} ${chances === 1 ? "chance digital" : "chances digitales"} automáticas para el Sorteo Novila.` : "";
    return {
      order: { ...order, pickupSlot },
      messages: [{
        side: "in",
        kind: "order_confirmed",
        text: `Listo, ${firstName(order.customerName)}. Tu pedido #${order.id} quedó reservado para retirar ${pickupSlot}.\n\n${BRAND.address}\n${lane.description}\nTotal estimado: ${formatMoney(total)}.${chancesLine}\n\nYa está confirmado. Te aviso por acá cuando esté preparado.`,
      }],
    };
  };

  const processWaMessage = (rawText, flowSnapshot, options = {}) => {
    const text = String(rawText || "").trim();
    const norm = normalizeText(text);

    if (norm === "cancelar" || norm === "menu" || norm === "menú") {
      if (flowSnapshot.mode === "payment_review") {
        addWaMessage({ side: "in", text: `Tu pedido #${flowSnapshot.orderId} está en revisión de pago y no se puede cancelar desde acá. Apenas se acredite, te pido la franja de retiro.`, quickReplies: ["Consultar estado del pago"] });
        return;
      }
      setWaFlow({ mode: "idle" });
      addWaMessage({ side: "in", text: "Listo, cancelé la operación. Cuando quieras retomamos. ¿Te ayudo con algo más?", quickReplies: ["Ver promos", "Asado para 6", "Armar pedido"] });
      return;
    }

    if (flowSnapshot.mode === "awaiting_name") {
      if (!isValidFullName(text)) {
        addWaMessage({ side: "in", text: "Para reservar la orden de retiro necesito tu Nombre y Apellido completo (por ejemplo: Juan Pérez). Es obligatorio para que el carnicero identifique tu pedido. ✍️" });
        return;
      }
      const name = text.replace(/\s+/g, " ").trim();
      const customer = upsertCustomer(name, WHATSAPP_DEMO_PHONE, "Bot IA");
      const total = itemsEstimatedTotal(flowSnapshot.items);
      setWaFlow({
        mode: "awaiting_transfer",
        items: flowSnapshot.items,
        customerName: name,
        customerId: customer.id,
        total,
      });
      addWaMessage({
        side: "in",
        text: `Gracias, ${name} Ya registré tu nombre y tu WhatsApp ${WHATSAPP_DEMO_PHONE}. Para dejar el pedido reservado, el pago es por transferencia bancaria. `,
      });
      addWaMessage(transferPrompt(flowSnapshot.items, name));
      return;
    }

    if (flowSnapshot.mode === "awaiting_transfer") {
      const sentTransfer = /(simular|transferi|comprobante|pague|pagué|ya esta|ya está|listo)/.test(norm);
      if (!sentTransfer) {
        addWaMessage({
          side: "in",
          text: `Para confirmar el pedido necesito la transferencia de ${formatMoney(itemsEstimatedTotal(flowSnapshot.items))}.\n\nAlias: ${TRANSFER_DATA.alias}\nCuando la hagas, tocá “Simular transferencia” y seguimos. Sin el pago no puedo reservar la orden. `,
          quickReplies: ["Simular transferencia", "Cancelar pedido"],
        });
        return;
      }
      const customer = customersRef.current.find((entry) => entry.id === flowSnapshot.customerId)
        || customersRef.current.find((entry) => normalizePhone(entry.phone) === normalizePhone(WHATSAPP_DEMO_PHONE));
      if (!customer) {
        addWaMessage({ side: "in", text: "No encontré tus datos. Escribime de nuevo tu Nombre y Apellido." });
        setWaFlow({ ...flowSnapshot, mode: "awaiting_name" });
        return;
      }
      const reference = `TRF-${String(Date.now()).slice(-4)}`;
      const order = createOrderRecord({
        customer,
        customerName: customer.name,
        phone: customer.phone,
        channel: "whatsapp",
        pickupSlot: null,
        payment: "Transferencia bancaria · a verificar",
        items: flowSnapshot.items,
        status: 0,
        paymentStatus: "review",
        paymentReference: reference,
      });
      addWaMessage({
        side: "out",
        kind: "receipt",
        text: "Comprobante de transferencia",
        time: nowTime(),
        receipt: {
          amount: itemsEstimatedTotal(flowSnapshot.items),
          alias: TRANSFER_DATA.alias,
          cbu: TRANSFER_DATA.cbu,
          titular: TRANSFER_DATA.titular,
          reference,
          date: todayDate(),
          holder: customer.name,
        },
      });
      addWaMessage({
        side: "in",
        kind: "text",
        text: ` Recibimos tu comprobante por ${formatMoney(itemsEstimatedTotal(flowSnapshot.items))}. Estamos corroborando la acreditación en el frigorífico.`,
      });
      addWaMessage({
        side: "in",
        kind: "text",
        text: `Tu pedido #${order.id} quedó en proceso de revisión de pago. \n\nNo entra a preparación hasta que se confirme la transferencia. Apenas se acredite, te pido la franja de retiro. No hace falta que envíes nada más.`,
        quickReplies: ["Consultar estado del pago", "Ver promos"],
      });
      setWaFlow({ mode: "payment_review", orderId: order.id, customerName: customer.name, customerId: customer.id });
      addToast({
        type: "gold",
        title: `Pedido #${order.id} en revisión de pago`,
        message: `Transferencia simulada por ${formatMoney(itemsEstimatedTotal(flowSnapshot.items))}. Ya aparece en el Panel para corroborar.`,
        icon: "Banknote",
        duration: 6500,
      });
      return;
    }

    if (flowSnapshot.mode === "payment_review") {
      if (norm.includes("promo")) {
        const activePromos = products.filter((product) => product.categoryId === "super");
        const lines = activePromos.map((promo, index) => `${index + 1}. ${promo.name.replace("Promo ", "")} ${promo.unit} · ${formatMoney(promo.price)}`).join("\n");
        addWaMessage({ side: "in", text: `Super promos de la semana\n\n${lines}\n\nMientras tanto, tu pago sigue en revisión. Apenas se acredite te pido la franja de retiro.`, quickReplies: ["Consultar estado del pago"] });
        return;
      }
      addWaMessage({
        side: "in",
        text: `Tu pedido #${flowSnapshot.orderId} está en proceso de revisión de pago. \n\nEl frigorífico está corroborando la transferencia. Apenas se acredite, te pido la franja de retiro por acá.`,
        quickReplies: ["Ver promos"],
      });
      return;
    }

    if (flowSnapshot.mode === "awaiting_slot") {
      const matchedSlot = PICKUP_SLOTS.find((slot) => normalizeText(slot) === norm) || PICKUP_SLOTS.find((slot) => normalizeText(text).includes(normalizeText(slot.split(" - ")[0]))) || (/(hoy|manana|mañana|hs|horas)/.test(norm) ? text : PICKUP_SLOTS[1]);
      const completed = completeChatSlot(flowSnapshot, matchedSlot);
      if (!completed) {
        addWaMessage({ side: "in", text: "No encontré el pedido asociado. Escribime tu Nombre y Apellido para volver a vincularlo." });
        setWaFlow({ ...flowSnapshot, mode: "awaiting_name" });
        return;
      }
      completed.messages.forEach((message) => addWaMessage(message));
      addToast({ type: "success", title: `Franja confirmada · Pedido #${completed.order.id}`, message: `${matchedSlot} · ${completed.order.customerName}. Ya impactó en el Panel.`, icon: "Clock", duration: 5600 });
      return;
    }

    if (flowSnapshot.mode === "choosing" || options.audio) {
      if (options.suggestion) {
        const suggestionItems = buildAsadoSuggestion().map(({ product, qty }) => productToOrderItem(product, qty));
        const prepared = prepareDraft(suggestionItems, options);
        setWaFlow(prepared.flow);
        prepared.messages.forEach((message) => addWaMessage(message));
        return;
      }
      if (norm.includes("ver promo") || norm === "promos") {
        const activePromos = products.filter((product) => product.categoryId === "super");
        const lines = activePromos.map((promo, index) => `${index + 1}. ${promo.name.replace("Promo ", "")} ${promo.unit} · ${formatMoney(promo.price)}`).join("\n");
        addWaMessage({ side: "in", text: `Super promos de la semana\n\n${lines}\n\n¿Te armo alguna?`, quickReplies: ["Promo Aguja 2 kg", "Promo Puchero 3 kg"] });
        return;
      }
      const parsed = parseOrderIntent(text, { audio: options.audio });
      const prepared = prepareDraft(parsed, options);
      setWaFlow(prepared.flow);
      prepared.messages.forEach((message) => addWaMessage(message));
      return;
    }

    if ((norm.includes("pedir") || norm.includes("retirar sin fila") || norm.includes("comprar") || norm.includes("hacer un pedido") || norm.includes("armar pedido") || norm.includes("armar un pedido")) && !norm.includes("sugerencia") && !norm.includes("pedir esta") && !norm.includes("armar este")) {
      const intro = startOrderFlow();
      addWaMessage({ side: "in", ...intro });
      return;
    }

    if (norm.includes("ubicad") || norm.includes("ubicacion") || norm.includes("donde") || norm.includes("direccion") || norm.includes("horario")) {
      addWaMessage({
        side: "in",
        text: `Estamos en ${BRAND.address}.\n\nLunes a Sábado: 8:00 a 21:00 hs.\nDomingos y Feriados: 9:00 a 13:30 hs.\nTel: ${BRAND.landline}\n\n¿Te armo un pedido para retirar sin fila?`,
        quickReplies: ["Ver promos", "Corte vs. Envasado al Vacío", "Armar pedido"],
      });
      return;
    }

    if (norm.includes("envasado") || norm.includes("vacio vs") || norm.includes("al vacio")) {
      const vacioCorte = products.find((p) => p.id === "vacuno-vacio")?.price ?? 15499;
      const vacioEnvasado = products.find((p) => p.id === "envasado-vacio")?.price ?? 16999;
      addWaMessage({
        side: "in",
        text: `Trabajamos las dos opciones en el local:\n\n• Corte fresco en mostrador: ej. Vacío ${formatMoney(vacioCorte)}/kg.\n• Envasado al vacío (heladeras de autoservicio): +$1.500/kg aprox. (ej. Vacío ${formatMoney(vacioEnvasado)}/kg), ideal para freezer y llevar directo sin esperar.\n\nY si encargás por acá o por la web, retirás sin hacer cola en el corralito de cajas.`,
        quickReplies: ["Armar pedido", "Cotizar Media Res", "Ver promos"],
      });
      return;
    }

    if (norm.includes("sorteo") || norm.includes("cupon") || norm.includes("chances")) {
      addWaMessage({
        side: "in",
        text: "🎟️ Con el Sorteo Novila ya no dependés de cupones de papel ni urnas.\n\nPor cada $25.000 de compra registrada en la web o por acá, sumás 1 chance digital automática asociada a tu número de WhatsApp (ej. una compra del mes de $100.000 suma 4 chances al instante).",
        quickReplies: ["Armar pedido", "Ver promos"],
      });
      return;
    }

    if (norm.includes("asado") || norm.includes("recomend") || norm.includes("seis") || norm.includes("6 personas")) {
      addWaMessage({
        side: "in",
        text: asadoAnswer(),
        quickReplies: ["Armar este pedido", "Ver promos"],
      });
      return;
    }

    if (norm.includes("sugerencia") || norm.includes("pedir esta") || norm.includes("armar este")) {
      const suggestionItems = buildAsadoSuggestion().map(({ product, qty }) => productToOrderItem(product, qty));
      const prepared = prepareDraft(suggestionItems, { suggestion: true });
      setWaFlow(prepared.flow);
      prepared.messages.forEach((message) => addWaMessage(message));
      return;
    }

    if (norm.includes("promo") || norm.includes("oferta")) {
      const activePromos = products.filter((product) => product.categoryId === "super");
      const lines = activePromos.map((promo, index) => `${index + 1}. ${promo.name.replace("Promo ", "")} ${promo.unit} · ${formatMoney(promo.price)}`).join("\n");
      addWaMessage({
        side: "in",
        text: `Super promos de la semana\n\n${lines}\n\n¿Te armo alguna?`,
        quickReplies: ["Promo Aguja 2 kg", "Promo Puchero 3 kg"],
      });
      return;
    }

    if (norm.includes("precio") || norm.includes("cuanto") || norm.includes("sale")) {
      const product = products
        .filter((entry) => norm.includes(normalizeText(entry.name)) || norm.includes(normalizeText(entry.cut)))
        .sort((a, b) => b.name.length - a.name.length)[0];
      if (product) {
        addWaMessage({
          side: "in",
          text: `${product.stock ? "Sí, tenemos" : "Por el momento no tenemos stock de"} ${product.name}.\n\nPrecio: ${formatMoney(product.price)} ${product.unitLabel === "kg" ? "por kg" : `por ${product.unitLabel}`}.\n${product.stock ? "¿Te lo agrego a un pedido?" : "¿Querés que te muestre las promos disponibles?"}`,
          quickReplies: product.stock ? ["Armar pedido", "Ver promos"] : ["Ver promos"],
        });
        return;
      }
    }

    if (norm.includes("mayorista") || norm.includes("media res") || norm.includes("cajon")) {
      addWaMessage({
        side: "in",
        text: "Sí, trabajamos mayorista. Tenemos medias reses familiares, cuartos, costillares y cajones de pollo.\n\n• Media Res Familiar desde $11.900/kg\n• Costillar del Medio $15.499/kg\n• Cajón Pollo Resistire $59.900\n\nContame qué volumen necesitás y te paso disponibilidad real. ",
        quickReplies: ["Ver promos", "Armar pedido"],
      });
      return;
    }

    if (norm.includes("pago") || norm.includes("mercado pago") || norm.includes("transferencia") || norm.includes("efectivo") || norm.includes("tarjeta") || norm.includes("credito") || norm.includes("cuota")) {
      addWaMessage({
        side: "in",
        text: "Aceptamos Transferencia / Mercado Pago, Tarjeta de Crédito (en 1 pago), Débito y Efectivo. Si abonás por transferencia previa, pasás directo por Retiro Express sin hacer fila en las 3 cajas.",
        quickReplies: ["Armar pedido", "Ver promos", "Sorteo Novila"],
      });
      return;
    }

    if (norm.includes("hola") || norm.includes("buenas") || norm.includes("buen dia") || norm.includes("buenas tardes")) {
      addWaMessage({
        side: "in",
        text: "Buenas. Soy NovilaBot. Te puedo ayudar con horarios, precios, promos o armar tu pedido. ¿Qué necesitás?",
        quickReplies: ["Ubicación y horarios", "Asado para 6", "Ver promos"],
      });
      return;
    }

    addWaMessage({
      side: "in",
      text: "Puedo ayudarte con:\n• Ubicación y horarios\n• Super promos de la semana\n• Una sugerencia de asado para 6\n• Precios de cortes\n• Armar tu pedido\n\nEscribime “promos”, “asado” o “armar pedido”. ",
      quickReplies: ["Ver promos", "Asado para 6", "Armar pedido"],
    });
  };

  const sendWaMessage = (rawText, options = {}) => {
    const text = String(rawText || "").trim();
    if (!text || waTypingRef.current) return;
    waTypingRef.current = true;
    setWaTyping(true);
    const flowSnapshot = waFlow;
    if (options.audio) {
      addWaMessage({ side: "out", kind: "audio", text, transcript: text, time: nowTime() });
    } else {
      addWaMessage({ side: "out", kind: "text", text, time: nowTime() });
    }
    pushTimer(() => {
      waTypingRef.current = false;
      setWaTyping(false);
      processWaMessage(text, flowSnapshot, options);
    }, options.audio ? 1150 : 760);
  };

  const sendDemoAudio = () => {
    if (waTypingRef.current) return;
    sendWaMessage("Hola, armame una promo de Aguja de 2kg y 1kg de Milanesa Vacuna", { audio: true });
  };

  const handleReset = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setProducts(clone(INITIAL_PRODUCTS));
    setCustomers(clone(INITIAL_CUSTOMERS));
    setOrders(clone(INITIAL_ORDERS));
    setWhatsappMessages(clone(INITIAL_WHATSAPP_MESSAGES));
    setCart([]);
    setCartOpen(false);
    setLastWebOrder(null);
    setUnread(0);
    setWaTyping(false);
    waTypingRef.current = false;
    setWaFlow({ mode: "idle" });
    setCampaignState(Object.fromEntries(CAMPAIGNS.map((campaign) => [campaign.id, { sentAt: null }])));
    setActiveView(1);
    setToasts([]);
    addToast({ type: "gold", title: "Demo reiniciada", message: "Los 3 pedidos de ejemplo, el stock y los precios volvieron al estado inicial.", icon: "RefreshCw", duration: 3800 });
  };

  const activeOrdersCount = orders.filter((order) => order.status < 4).length;

  const changeView = (view) => {
    setActiveView(view);
    if (view === 2) setUnread(0);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <TopNav
        activeView={activeView}
        onChange={changeView}
        unread={unread}
        activeOrders={activeOrdersCount}
        onReset={handleReset}
        onGuide={() => setGuideOpen(true)}
      />

      <div className="pt-16">
        {activeView === 1 && (
          <WebView
            products={products}
            cart={cart}
            customers={customers}
            lastWebOrder={lastWebOrder}
            onAdd={handleAddToCart}
            onAddPack={handleAddPack}
            onRemove={handleRemoveFromCart}
            onOpenCart={() => setCartOpen(true)}
            cartOpen={cartOpen}
            onCloseCart={() => setCartOpen(false)}
            onConfirm={handleWebConfirm}
            onClearLastOrder={() => setLastWebOrder(null)}
            onGoWhatsApp={() => changeView(2)}
          />
        )}
        {activeView === 2 && (
          <WhatsAppView
            messages={whatsappMessages}
            typing={waTyping}
            onSend={sendWaMessage}
            onAudio={sendDemoAudio}
            waFlow={waFlow}
            orders={orders}
          />
        )}
        {activeView === 3 && (
          <PanelView
            orders={orders}
            customers={customers}
            products={products}
            onAdvance={handleAdvanceStatus}
            onMarkReady={handleMarkReady}
            onWithdraw={handleWithdraw}
            onUpdateWeight={handleUpdateWeight}
            onConfirmPayment={handleConfirmPayment}
            onRequestSlot={requestPickupSlot}
            onUpdatePrice={handleUpdateProductPrice}
            onToggleStock={handleToggleStock}
            onReminder={sendCustomerReminder}
            onToast={addToast}
          />
        )}
        {activeView === 4 && (
          <CrmView
            customers={customers}
            products={products}
            campaignState={campaignState}
            onSimulate={sendCampaign}
            onGoWhatsApp={() => changeView(2)}
          />
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} onGo={changeView} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
