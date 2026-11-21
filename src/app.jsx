import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Award, BadgeCheck, BadgePercent, Banknote,
  BarChart3, BatteryFull, Beef, Bell, Bot, Boxes, CalendarDays, Camera, Check, CheckCheck, CheckCircle2,
  ChefHat, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign, ClipboardList,
  Clock, CookingPot, Copy, CreditCard, Drumstick, ExternalLink, FileText, Filter, Flame, Gauge, HeartHandshake, HelpCircle,
  Info, KeyRound, LayoutDashboard, Lock, MapPin, Maximize2, Megaphone, MessageCircle, MessageSquareText,
  Mic, Minimize2, Minus, MoreVertical, Package, PackageSearch, Paperclip, PartyPopper, Pause,
  Phone, PiggyBank, Play, Plus, Printer, QrCode, ReceiptText, RefreshCw, Repeat2, RotateCcw, Scale, Scan, Search, Send,
  Settings, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, Signal, Smartphone, Smile, Sparkles, Star, Store, Tag,
  Timer, TrendingUp, Trash2, UserRound, Users, Video, Volume2, Wallet, Warehouse, Wifi, X,
} from "lucide-react";
import {
  ASADO_PACKS, BRAND, CAMPAIGNS, CATEGORIES,
  INITIAL_CUSTOMERS, INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_WHATSAPP_MESSAGES,
  PAYMENT_METHODS, PICKUP_SLOTS, TRANSFER_DATA, WHATSAPP_DEMO_PHONE,
  buildInvoiceData, buildPickupQrPayload, calcRaffleChances, firstName, formatKg, formatMoney, formatPin,
  generatePickupPin, generatePickupToken, initials, isValidFullName, isValidPhone,
  nextOrderCode, normalizePhone, normalizeText, nowTime, orderRequestedTotal, orderTotal,
  parsePickupScan, resolvePickupOrder, todayDate,
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
  0: { label: "Pago en revisión", full: "Pago en revisión", short: "En revisión", color: "#B45309", soft: "#FDF0E0" },
  1: { label: "Por preparar", full: "Por preparar", short: "Por preparar", color: "#B58E3E", soft: "#F7EFD9" },
  2: { label: "Por preparar", full: "Por preparar", short: "Por preparar", color: "#B58E3E", soft: "#F7EFD9" },
  3: { label: "Listo para retirar", full: "Listo para retirar", short: "Listo", color: "#1F6F43", soft: "#E8F4EC" },
  4: { label: "Retirado", full: "Retirado", short: "Retirado", color: "#6B7280", soft: "#F0F0EF" },
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
  if (!item) return 0;
  if (item.pricing === "kg") {
    const kg = Number(item.actualKg != null ? item.actualKg : (item.requestedKg != null ? item.requestedKg : (item.qty || 0)));
    return kg * Number(item.unitPrice || 0);
  }
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

// ── Punto de dolor 1: venta por peso ─────────────────────────────────────────
const WEIGHT_TOLERANCE = 0.1; // ±10% entre lo pedido y lo que marca la balanza

const SUBSTITUTION_OPTIONS = [
  { id: "similar", label: "Reemplazar por un corte similar", short: "Reemplazar por similar", icon: "Repeat2" },
  { id: "avisar", label: "Avisarme por WhatsApp antes", short: "Avisar por WhatsApp", icon: "MessageCircle" },
  { id: "quitar", label: "Quitarlo y descontarlo del total", short: "Quitar y descontar", icon: "Minus" },
];

function hasWeighableItems(items) {
  return (items || []).some((item) => (item.pricing || (item.product?.kind === "kg" ? "kg" : "")) === "kg");
}

// Diferencia entre lo cobrado al hacer el pedido (peso estimado) y el peso real de balanza.
function weightAdjustment(order) {
  const paid = order?.paidAmount != null ? Number(order.paidAmount) : orderRequestedTotal(order);
  const real = orderTotal(order);
  return { paid, real, diff: Math.round(real - paid) };
}

function weightAdjustmentText(order) {
  const { diff } = weightAdjustment(order);
  if (Math.abs(diff) < 1) return "Coincide con lo abonado.";
  return diff > 0
    ? `Diferencia a abonar en el retiro: ${formatMoney(diff)}.`
    : `Saldo a tu favor: ${formatMoney(-diff)} (se reintegra en el retiro).`;
}

// ── Punto de dolor 2: stock real a partir de la media res ────────────────────
// Tabla de rendimiento estándar (% sobre el peso de la media res). Editable por el frigorífico.
const HALF_CARCASS_YIELD = [
  { productId: "vacuno-costilla", label: "Costilla / Asado", pct: 8.0 },
  { productId: "vacuno-molida-comun", label: "Molida Común", pct: 10.0 },
  { productId: "vacuno-nalga", label: "Nalga", pct: 5.0 },
  { productId: "vacuno-paleta", label: "Paleta", pct: 4.0 },
  { productId: "vacuno-falda", label: "Falda", pct: 4.0 },
  { productId: "vacuno-vacio", label: "Vacío", pct: 3.5 },
  { productId: "vacuno-bola-de-lomo", label: "Bola de Lomo", pct: 3.5 },
  { productId: "vacuno-cuadril", label: "Cuadril", pct: 3.0 },
  { productId: "vacuno-osobuco", label: "Osobuco", pct: 3.0 },
  { productId: "vacuno-roast-beef", label: "Roast Beef", pct: 2.5 },
  { productId: "vacuno-peceto", label: "Peceto", pct: 1.8 },
  { productId: "vacuno-lomo", label: "Lomo", pct: 1.8 },
  { productId: "vacuno-matambre", label: "Matambre", pct: 1.2 },
];

function stockLevelOf(product) {
  if (!product?.stock) return "out";
  return product.lowStock ? "low" : "ok";
}

const STOCK_LEVEL_META = {
  ok: { label: "Disponible", dot: "#1F6F43", soft: "#E8F4EC", text: "#1F6F43" },
  low: { label: "Pocas unidades", dot: "#B45309", soft: "#FDF0E0", text: "#8A5A22" },
  out: { label: "Agotado", dot: "#9B1C1C", soft: "#FBEAEA", text: "#9B1C1C" },
};

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
    QrCode, Camera, KeyRound, ShieldAlert, AlertTriangle, Scan, Settings,
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
// Retiro en Mostrador · Pase con QR + PIN de 6 dígitos
// ─────────────────────────────────────────────────────────────────────────────

function PickupPassCard({ order, compact = false, showDetails = true }) {
  if (!order) return null;
  const isDelivered = order.status === 4 || !!order.deliveredAt || !!order.withdrawnAt;
  const total = orderTotal(order);
  const pinDisplay = formatPin(order.pickupPin || "482910");
  const qrPayload = buildPickupQrPayload(order);
  const isApproved = (order.paymentStatus || "approved") === "approved";
  const deliveredTime = order.deliveredAt || order.withdrawnAt || nowTime();

  return (
    <div className={`overflow-hidden rounded-[14px] border transition-all text-left ${isDelivered ? "border-[#206A45]/30 bg-[#F4F9F5]" : "border-[#1F1B16]/15 bg-[#FDFBF7] shadow-sm"}`}>
      {/* Encabezado del pase */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 ${isDelivered ? "bg-[#206A45] text-white" : "bg-[#6B091E] text-[#FAF8F5]"}`}>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
            {isDelivered ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <QrCode size={13} strokeWidth={2} />}
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider leading-none">
              {isDelivered ? "Pase Canjeado · Pedido Retirado" : "Pase de Retiro en Mostrador"}
            </p>
            <p className="text-[10px] text-white/80 leading-tight mt-0.5">Av. Sabattini 3480 · Mostrador Central</p>
          </div>
        </div>
        <span className="font-mono text-[12px] font-bold text-white bg-black/25 px-2 py-0.5 rounded">
          #{order.id}
        </span>
      </div>

      {/* Cuerpo principal del pase */}
      <div className="p-3.5 sm:p-4 text-center">
        {isDelivered ? (
          <div className="py-2.5 px-2">
            <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-[#206A45]/15 text-[#206A45]">
              <CheckCircle2 size={34} strokeWidth={2.4} />
            </div>
            <div className="inline-block rounded-full bg-[#206A45] px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-white shadow-sm">
              ✓ Pedido Retirado
            </div>
            <p className="mt-2 text-[13px] font-semibold text-[#1F1B16]">
              Entregado el {deliveredTime} hs
            </p>
            <p className="mt-0.5 text-[11px] text-[#5E554A]">
              Av. Sabattini 3480 · ¡Muchas gracias por tu compra!
            </p>
          </div>
        ) : (
          <>
            {/* Contenedor del Código QR escaneable */}
            <div className="my-1.5 flex flex-col items-center">
              <div className="relative rounded-[12px] border border-[#1F1B16]/10 bg-white p-3 shadow-inner inline-block">
                <QRCodeSVG
                  value={qrPayload}
                  size={compact ? 134 : 160}
                  level="M"
                  fgColor="#1F1B16"
                  includeMargin={false}
                />
              </div>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#1F1B16]/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-[#5E554A]">
                <Scan size={11} /> Código QR de Retiro Express
              </span>
            </div>

            {/* PIN de seguridad de 6 dígitos */}
            <div className="mt-3 rounded-[10px] border border-[#1F1B16]/10 bg-[#F7F4EE] px-3 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7B7266]">
                PIN de seguridad (Plan B de 6 dígitos)
              </p>
              <p className="mt-0.5 font-mono text-[22px] sm:text-[25px] font-bold tracking-[0.25em] text-[#6B091E] select-all">
                {pinDisplay}
              </p>
            </div>

            {/* Instrucción clara de retiro */}
            <p className="mt-2.5 text-[11px] font-medium leading-4 text-[#5E554A]">
              Presentá este código QR en mostrador o dictá el PIN de 6 dígitos para retirar tu pedido sin fila.
            </p>
          </>
        )}

        {/* Metadatos del pedido */}
        {showDetails && (
          <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-[#1F1B16]/10 pt-3 text-left text-[11px]">
            <div>
              <span className="text-[#7B7266] block">Cliente</span>
              <span className="font-medium text-[#1F1B16] truncate block">{order.customerName}</span>
            </div>
            <div>
              <span className="text-[#7B7266] block">Franja Horaria</span>
              <span className="font-medium text-[#1F1B16] truncate block">{order.pickupSlot || "Hoy"}</span>
            </div>
            <div>
              <span className="text-[#7B7266] block">Pago</span>
              <span className={`font-semibold ${isApproved ? "text-[#206A45]" : "text-[#B45309]"}`}>
                {isApproved ? "✓ Acreditado" : "Pendiente de cobro"}
              </span>
            </div>
            <div>
              <span className="text-[#7B7266] block">Total</span>
              <span className="font-mono font-bold text-[#1F1B16]">{formatMoney(total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation, version switcher & guide
// ─────────────────────────────────────────────────────────────────────────────

function TopNav({ activeView, onChange, unread, activeOrders, onReset, onOpenGuide }) {
  const navItems = [
    { id: 1, icon: "ShoppingBag", label: "Web cliente", short: "Web" },
    { id: 2, icon: "MessageCircle", label: "WhatsApp", short: "Chat" },
    { id: 3, icon: "LayoutDashboard", label: "Panel", short: "Panel" },
    { id: 5, icon: "BarChart3", label: "Panel Admin", short: "Admin" },
    { id: 4, icon: "Megaphone", label: "Campañas", short: "Campañas" },
  ];

  return (
    <header className="no-print fixed inset-x-0 top-0 z-[80] border-b border-[#1F1B16]/10 bg-[#F7F4EE]/95 text-[#1F1B16] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="shrink-0 sm:hidden">
          <SteerMark className="h-7 w-7 text-[#6B091E]" />
        </div>
        <div className="hidden shrink-0 sm:block">
          <Logo compact />
        </div>

        <nav className="no-scrollbar ml-2 flex h-16 flex-1 items-stretch gap-1 overflow-x-auto sm:ml-6" aria-label="Vistas del sistema">
          {navItems.map((item) => {
            const active = activeView === item.id;
            const count = item.id === 2 ? unread : item.id === 3 || item.id === 5 ? activeOrders : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`relative flex shrink-0 items-center gap-1.5 border-b-2 px-2 text-[13px] transition-colors sm:px-3 ${active ? "border-[#6B091E] text-[#1F1B16] font-medium" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}
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
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="hidden h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16] md:flex"
              title="Ver guion de la demo"
            >
              <HelpCircle size={14} strokeWidth={1.5} /> Guion
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]"
            title="Reiniciar datos de la demo"
          >
            <RotateCcw size={14} strokeWidth={1.5} /> <span className="hidden lg:inline">Reiniciar</span>
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
    { n: "02", title: "Administrá desde Panel Admin", text: "Modificá precios, creá nuevos productos y consultá métricas en vivo.", view: 5 },
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
        {!disabled && product.lowStock && (
          <span className="absolute right-3 top-3 rounded-[4px] bg-[#FDF0E0] px-2 py-1 text-[11px] font-medium text-[#8A5A22]">Últimas unidades</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-medium leading-tight text-[#1F1B16]">{product.name.replace("Promo ", "")}</h3>
            {product.note && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#7B7266]">{product.note}</p>}
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
            {product.normalPrice ? <p className="mt-1 text-[12px] text-[#7B7266] line-through">{formatMoney(product.normalPrice)}</p> : null}
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
        <p className="mt-0.5 truncate text-[11px] text-[#7B7266]">
          {disabled ? "Sin stock" : product.unitLabel === "kg" ? "por kg · se pesa al preparar" : product.unitLabel}
          {!disabled && product.lowStock ? <span className="font-medium text-[#8A5A22]"> · Últimas unidades</span> : null}
          {product.note ? ` · ${product.note}` : ""}
        </p>
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

function CartSheet({ open, onClose, cartLines, total, onUpdateQty, onRemove, onProceedToCheckout, full }) {
  if (!open) return null;

  return (
    <div className={`${full ? "fixed inset-0 z-[105] flex items-center justify-center p-4" : "absolute inset-0 z-[65] flex items-end"} bg-[#1F1B16]/45 backdrop-blur-[2px]`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`flex max-h-[94%] w-full flex-col overflow-hidden border border-[#1F1B16]/10 bg-[#F7F4EE] ${full ? "max-w-[560px] rounded-[14px]" : "rounded-t-[14px]"}`}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-5 py-4">
          <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">Carrito</h2>
          <button type="button" onClick={onClose} className="rounded-[6px] p-2 text-[#5E554A] transition-colors hover:bg-[#EFE9DF]" aria-label="Cerrar carrito">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto">
          {cartLines.length === 0 ? (
            <div className="p-8 text-center text-[#7B7266]">
              <ShoppingBag size={32} strokeWidth={1.2} className="mx-auto mb-2 opacity-50" />
              <p className="text-[14px]">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1F1B16]/10 bg-[#FDFBF7]">
              {cartLines.map((line) => {
                const isKg = line.product.kind === "kg";
                const step = isKg ? 0.5 : 1;
                return (
                  <div key={line.product.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#1F1B16]">{line.product.name}</p>
                      <p className="mt-0.5 text-[12px] text-[#7B7266]">
                        {formatMoney(line.product.price)} · {line.product.unitLabel === "kg" ? "por kg" : line.product.unitLabel}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {/* Control de KG / Cantidad al lado del dinero */}
                      <div className="flex items-center rounded-[8px] border border-[#1F1B16]/15 bg-[#F7F4EE] p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const nextQty = Math.round((line.qty - step) * 10) / 10;
                            onUpdateQty(line.product.id, nextQty);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]"
                          aria-label="Restar cantidad"
                        >
                          <Minus size={13} strokeWidth={2} />
                        </button>
                        <span className="min-w-[54px] px-1 text-center font-mono text-[12px] font-medium text-[#1F1B16]">
                          {isKg
                            ? `${line.qty.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`
                            : `${line.qty} un`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextQty = Math.round((line.qty + step) * 10) / 10;
                            onUpdateQty(line.product.id, nextQty);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#5E554A] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]"
                          aria-label="Sumar cantidad"
                        >
                          <Plus size={13} strokeWidth={2} />
                        </button>
                      </div>

                      {/* Subtotal calculado según KG o unidades */}
                      <span className="min-w-[74px] text-right font-mono text-[13px] font-medium tabular-nums text-[#1F1B16]">
                        {formatMoney(line.qty * line.product.price)}
                      </span>

                      <button
                        type="button"
                        onClick={() => onRemove(line.product.id)}
                        className="p-1 text-[#7B7266] transition-colors hover:text-red-600"
                        aria-label="Eliminar del carrito"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[12px] text-[#7B7266]">{hasWeighableItems(cartLines) ? "Total estimado" : "Total"}</span>
            <span className="font-mono text-[20px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(total)}</span>
          </div>
          {hasWeighableItems(cartLines) && (
            <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-4 text-[#7B7266]">
              <Scale size={13} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#8A5A22]" />
              Los cortes por kg se pesan al preparar (±10%). Te avisamos el total real por WhatsApp antes del retiro.
            </p>
          )}
          <button
            type="button"
            disabled={cartLines.length === 0}
            onClick={onProceedToCheckout}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] text-[14px] font-medium text-white transition-colors hover:bg-[#580617] disabled:opacity-50"
          >
            Pagar · {formatMoney(total)}
          </button>
        </div>
      </div>
    </div>
  );
}



function WebCheckoutView({ cartLines, total, customers, onConfirm, onBackToMenu, onOpenCart }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    note: "",
    slot: PICKUP_SLOTS[1],
    payment: PAYMENT_METHODS[0].id,
    substitution: "avisar",
  });
  const [errors, setErrors] = useState({});
  const [matched, setMatched] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payStep, setPayStep] = useState(1);

  useEffect(() => {
    const digits = normalizePhone(form.phone);
    if (digits.length < 10) { setMatched(null); return; }
    const customer = customers.find((entry) => normalizePhone(entry.phone) === digits);
    setMatched(customer || null);
    if (customer && !form.name.trim()) setForm((prev) => ({ ...prev, name: customer.name }));
  }, [form.phone, customers]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event) => {
    if (event) event.preventDefault();
    const nextErrors = {};
    if (!isValidFullName(form.name)) nextErrors.name = "Ingresá nombre y apellido";
    if (!isValidPhone(form.phone)) nextErrors.phone = "Ingresá un WhatsApp válido";
    if (!form.slot) nextErrors.slot = "Elegí una franja";
    if (!form.payment) nextErrors.payment = "Elegí un método de pago";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setPaying(true);
    setPayStep(1);
    const t1 = setTimeout(() => setPayStep(2), 650);
    const t2 = setTimeout(() => setPayStep(3), 1300);
    const t3 = setTimeout(() => {
      onConfirm({
        ...form,
        payment: PAYMENT_METHODS.find((m) => m.id === form.payment)?.label || form.payment,
      });
    }, 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === form.payment) || PAYMENT_METHODS[0];

  return (
    <div className="flex min-h-full flex-col bg-[#F7F4EE]">
      <div className="border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-6 py-8 sm:px-8">
        <h1 className="font-display text-[32px] sm:text-[36px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">
          Finalizar pedido
        </h1>
        <p className="mt-2 text-[13px] text-[#5E554A]">
          Retiro en <strong>Av. Amadeo Sabattini 3480</strong>
        </p>
      </div>

      <div className="flex-1 p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 space-y-4 shadow-sm">
              <h2 className="text-[14px] font-medium text-[#1F1B16] border-b border-[#1F1B16]/10 pb-3">
                1. Datos de contacto
              </h2>
              <div>
                <label className="mb-2 flex items-center gap-1 text-[12px] font-medium text-[#5E554A]">
                  Nombre y apellido <span className="text-[#6B091E]">*</span>
                </label>
                <input
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
                {matched && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#206A45]"><CheckCircle2 size={12} strokeWidth={1.5} /> Cliente registrado: {firstName(matched.name)}</p>}
              </div>

              <div>
                <label className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#5E554A]">
                  <span>Nota del pedido</span>
                  <span className="font-normal text-[#7B7266]">Opcional</span>
                </label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(event) => set("note", event.target.value)}
                  placeholder="Ej: Cortar las costeletas finas, vacío con poca grasa, separar en bolsas..."
                  className="input-ring w-full resize-none rounded-[8px] border border-[#1F1B16]/15 bg-[#FDFBF7] px-3 py-2.5 text-[14px] text-[#1F1B16] placeholder:text-[#7B7266]"
                />
              </div>
            </div>

            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 shadow-sm">
              <h2 className="text-[14px] font-medium text-[#1F1B16] border-b border-[#1F1B16]/10 pb-3 mb-4">
                2. Franja de retiro
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {PICKUP_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => set("slot", slot)}
                    className={`flex h-11 items-center justify-between rounded-[8px] border px-3 text-left text-[12px] transition-colors ${form.slot === slot ? "border-[#6B091E]/50 bg-[#6B091E]/[0.05] text-[#1F1B16] font-medium" : "border-[#1F1B16]/15 bg-[#FDFBF7] text-[#5E554A] hover:border-[#1F1B16]/30"}`}
                  >
                    {slot.replace(" hs", "")}
                    {form.slot === slot && <Check size={14} strokeWidth={1.5} className="text-[#6B091E]" />}
                  </button>
                ))}
              </div>
              {errors.slot && <p className="mt-1.5 text-[11px] text-red-600">{errors.slot}</p>}
            </div>

            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 shadow-sm">
              <h2 className="text-[14px] font-medium text-[#1F1B16] border-b border-[#1F1B16]/10 pb-3 mb-4">
                Si falta algún corte al preparar…
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {SUBSTITUTION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => set("substitution", option.id)}
                    className={`flex min-h-12 items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-left text-[12px] transition-colors ${form.substitution === option.id ? "border-[#6B091E]/50 bg-[#6B091E]/[0.05] font-medium text-[#1F1B16]" : "border-[#1F1B16]/15 bg-[#FDFBF7] text-[#5E554A] hover:border-[#1F1B16]/30"}`}
                  >
                    <Icon name={option.icon} size={15} strokeWidth={1.6} className={form.substitution === option.id ? "shrink-0 text-[#6B091E]" : "shrink-0 text-[#7B7266]"} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-4 text-[#7B7266]">Así evitamos devoluciones: el carnicero sabe qué hacer sin frenar tu pedido.</p>
            </div>

            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 shadow-sm">
              <h2 className="text-[14px] font-medium text-[#1F1B16] border-b border-[#1F1B16]/10 pb-3 mb-4">
                3. Medio de pago
              </h2>
              <div className="space-y-2.5">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => set("payment", method.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-[8px] border p-3.5 text-left transition-colors ${form.payment === method.id ? "border-[#6B091E]/60 bg-[#6B091E]/[0.05]" : "border-[#1F1B16]/15 bg-[#FDFBF7] hover:border-[#1F1B16]/30"}`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-[6px] ${form.payment === method.id ? "bg-[#6B091E] text-white" : "bg-[#EFE9DF] text-[#5E554A]"}`}>
                      <Icon name={method.icon} size={17} strokeWidth={1.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1F1B16]">{method.label}</p>
                      <p className="text-[11px] text-[#7B7266]">
                        {method.description}
                      </p>
                    </div>
                    {form.payment === method.id && <Check size={16} strokeWidth={1.8} className="text-[#6B091E] shrink-0" />}
                  </button>
                ))}
              </div>
              {errors.payment && <p className="mt-1.5 text-[11px] text-red-600">{errors.payment}</p>}
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1F1B16]/10">
                <h2 className="text-[14px] font-medium text-[#1F1B16]">Resumen del pedido</h2>
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="text-[12px] font-medium text-[#6B091E] hover:underline"
                >
                  Modificar carrito
                </button>
              </div>

              <div className="mt-3.5 space-y-2.5 max-h-[300px] overflow-y-auto thin-scrollbar pr-1">
                {cartLines.map((line) => (
                  <div key={line.product.id} className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-[#5E554A]">
                      {line.product.kind === "kg" ? `${line.qty.toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg` : `${line.qty} ×`} {line.product.name}
                    </span>
                    <span className="shrink-0 font-mono text-[13px] text-[#1F1B16]">{formatMoney(line.qty * line.product.price)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-baseline justify-between border-t border-[#1F1B16]/10 pt-4">
                <span className="text-[13px] font-medium text-[#5E554A]">{hasWeighableItems(cartLines) ? "Total estimado" : "Total"}</span>
                <span className="font-mono text-[22px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(total)}</span>
              </div>
              {hasWeighableItems(cartLines) && (
                <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[#8A5A22]/25 bg-[#F7EFD9]/55 px-3 py-2.5 text-[11px] leading-4 text-[#5E554A]">
                  <Scale size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#8A5A22]" />
                  <span>
                    Los cortes por kg se pesan en balanza al preparar. El peso real puede variar ±10%
                    (entre {formatMoney(total * (1 - WEIGHT_TOLERANCE))} y {formatMoney(total * (1 + WEIGHT_TOLERANCE))}).
                    La diferencia se ajusta en el retiro y la factura sale con el peso real.
                  </span>
                </div>
              )}

              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={submit}
                  disabled={paying}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] text-[14px] font-medium text-white transition-colors hover:bg-[#580617] disabled:opacity-50 shadow-sm"
                >
                  <Lock size={15} strokeWidth={1.8} /> Pagar · {formatMoney(total)}
                </button>
                <button
                  type="button"
                  onClick={onBackToMenu}
                  disabled={paying}
                  className="h-11 w-full rounded-[8px] border border-[#1F1B16]/15 text-[13px] font-medium text-[#5E554A] transition-colors hover:bg-[#EFE9DF]"
                >
                  Volver al menú
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#7B7266]">
                <ShieldCheck size={13} strokeWidth={1.6} className="text-[#206A45]" />
                <span>Pago protegido con encriptación segura</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {paying && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1F1B16]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[420px] rounded-[16px] border border-[#1F1B16]/15 bg-[#FDFBF7] p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#6B091E]/10 text-[#6B091E] mb-4">
              {payStep === 3 ? (
                <CheckCircle2 size={32} strokeWidth={2} className="text-[#206A45]" />
              ) : (
                <RefreshCw size={26} strokeWidth={2} className="animate-spin text-[#6B091E]" />
              )}
            </div>

            <p className="text-[11px] font-medium text-[#7B7266]">Pasarela de pago segura</p>
            <h3 className="mt-1 font-display text-[22px] font-normal text-[#1F1B16]">
              {selectedMethod.gateway || selectedMethod.label}
            </h3>

            <p className="mt-3 font-mono text-[24px] font-medium text-[#1F1B16]">
              {formatMoney(total)}
            </p>

            <div className="mt-5 rounded-[8px] bg-[#EFE9DF]/70 p-3 text-left space-y-1 text-[12px] text-[#5E554A]">
              <div className="flex justify-between">
                <span>Comercio:</span>
                <span className="font-medium text-[#1F1B16]">Frigorífico Novila</span>
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-medium text-[#1F1B16]">{form.name || "Cliente"}</span>
              </div>
              <div className="flex justify-between">
                <span>Medio:</span>
                <span className="font-medium text-[#1F1B16]">{selectedMethod.label}</span>
              </div>
            </div>

            <div className="mt-6">
              {payStep === 1 && (
                <p className="text-[13px] text-[#5E554A] flex items-center justify-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#6B091E] animate-pulse" />
                  {selectedMethod.id === "talo" ? "Generando CVU y alias único de orden (Talo)..." : "Conectando con la pasarela segura..."}
                </p>
              )}
              {payStep === 2 && (
                <p className="text-[13px] text-[#5E554A] flex items-center justify-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#8A5A22] animate-pulse" />
                  {selectedMethod.id === "talo" ? "Conciliando acreditación bancaria instantánea 24/7..." : "Autorizando transacción electrónica..."}
                </p>
              )}
              {payStep === 3 && (
                <p className="text-[13px] font-medium text-[#206A45] flex items-center justify-center gap-2">
                  <Check size={15} strokeWidth={2.5} />
                  ¡Pago aprobado y conciliado! Redirigiendo a tu pedido...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WebSuccess({ order, orders, onWhatsApp, onOpenInvoice, onContinue }) {
  const liveOrder = orders?.find((o) => o.id === order.id) || order;
  const total = orderTotal(liveOrder);
  const chances = calcRaffleChances(total);
  const isReady = liveOrder.status === 3;
  const isDelivered = liveOrder.status === 4 || !!liveOrder.deliveredAt || !!liveOrder.withdrawnAt;

  return (
    <div className="flex min-h-full flex-col bg-[#F7F4EE]">
      <div className="border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-6 py-8 sm:px-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#206A45] text-white">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 font-display text-[32px] sm:text-[36px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">
          {isDelivered ? "Pedido retirado" : isReady ? "Listo para retirar" : "Pedido confirmado"}
        </h1>
        <p className="mt-2 text-[13px] text-[#5E554A]">
          {isDelivered
            ? `Entregado con éxito a las ${liveOrder.deliveredAt || liveOrder.withdrawnAt || nowTime()} hs.`
            : isReady
            ? "Tu pedido está listo: presentá tu código QR o PIN en mostrador para retirar sin fila."
            : "Ya lo estamos preparando en carnicería. Apenas esté listo te llega el Pase de Retiro con QR por WhatsApp."}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span className="text-[12px] text-[#7B7266]">Código de pedido</span>
          <span className="font-mono text-[24px] font-medium tracking-[-0.02em] text-[#6B091E]">#{liveOrder.id}</span>
        </div>
      </div>

      <div className="flex-1 p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          <div className="space-y-5 lg:col-span-7">
            {(isReady || isDelivered) ? (
              <PickupPassCard order={liveOrder} />
            ) : (
              <div className="rounded-[12px] border border-[#B58E3E]/30 bg-[#F7EFD9]/60 p-5 flex items-start gap-3">
                <Clock size={20} className="mt-0.5 text-[#B58E3E] shrink-0" />
                <div>
                  <p className="text-[14px] font-medium text-[#1F1B16]">Preparando bolsa en carnicería</p>
                  <p className="text-[12px] text-[#5E554A] mt-1">
                    Cuando el mostrador marque tu pedido como listo, te enviamos automáticamente tu Pase QR y PIN por WhatsApp (y también aparecerá acá).
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Clock size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#6B091E]" />
                <div>
                  <p className="text-[15px] font-medium text-[#1F1B16]">{liveOrder.pickupSlot}</p>
                  <p className="mt-1 text-[13px] text-[#7B7266]">{BRAND.address}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#1F1B16]/10 pt-4">
                <div>
                  <p className="text-[11px] font-medium text-[#7B7266]">Cliente</p>
                  <p className="mt-1 truncate text-[14px] font-medium text-[#1F1B16]">{liveOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#7B7266]">Total abonado</p>
                  <p className="mt-1 font-mono text-[16px] font-medium text-[#206A45]">{formatMoney(total)}</p>
                </div>
              </div>
              {liveOrder.note && (
                <div className="mt-4 border-t border-[#1F1B16]/10 pt-4">
                  <p className="text-[11px] font-medium text-[#7B7266]">Nota del pedido</p>
                  <p className="mt-1 text-[13px] leading-5 text-[#1F1B16]">{liveOrder.note}</p>
                </div>
              )}
            </div>

            <div className="rounded-[12px] border border-[#8A5A22]/25 bg-[#8A5A22]/[0.06] p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <PartyPopper size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#8A5A22]" />
                <div>
                  <p className="text-[13px] font-medium text-[#1F1B16]">
                    🎟️ Sorteo Novila · {chances > 0 ? `${chances} ${chances === 1 ? "chance digital acreditada" : "chances digitales acreditadas"}` : "Chances digitales por compra web"}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#5E554A]">
                    {chances > 0
                      ? `Quedaron registradas con tu WhatsApp (${order.phone}). Sin cupón de papel.`
                      : "Sumás 1 chance automática cada $25.000 de compra registrada en la Web."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 sm:p-6 shadow-sm">
              <h2 className="text-[14px] font-medium text-[#1F1B16] border-b border-[#1F1B16]/10 pb-3">
                Resumen del pedido
              </h2>
              <div className="mt-3.5 space-y-2.5 max-h-[300px] overflow-y-auto thin-scrollbar pr-1">
                {liveOrder.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-[#5E554A]">
                      {item.pricing === "kg" ? formatKg(item.actualKg ?? item.requestedKg ?? item.qty) : `${item.qty} ×`} {item.name}
                      {item.pricing === "kg" && liveOrder.weighedAt ? <span className="text-[#206A45]"> · pesado</span> : null}
                    </span>
                    <span className="shrink-0 font-mono text-[13px] text-[#1F1B16]">{formatMoney(lineTotal(item))}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-baseline justify-between border-t border-[#1F1B16]/10 pt-4">
                <span className="text-[13px] font-medium text-[#5E554A]">{hasWeighableItems(liveOrder.items) && !liveOrder.weighedAt ? "Total estimado" : "Total"}</span>
                <span className="font-mono text-[22px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(total)}</span>
              </div>
              {hasWeighableItems(liveOrder.items) && (
                <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[#8A5A22]/25 bg-[#F7EFD9]/55 px-3 py-2.5 text-[11px] leading-4 text-[#5E554A]">
                  <Scale size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#8A5A22]" />
                  <span>
                    {liveOrder.weighedAt
                      ? `Pesado en balanza a las ${liveOrder.weighedAt} hs. ${weightAdjustmentText(liveOrder)}`
                      : "Los cortes por kg se pesan en balanza al preparar (±10%). Te avisamos el total real por WhatsApp."}
                  </span>
                </div>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={onContinue}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] text-[14px] font-medium text-white transition-colors hover:bg-[#580617] shadow-sm"
                >
                  Volver al menú
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebApp({
  products, cart, onAdd, onAddPack, onRemove, onUpdateQty, onOpenCart, cartOpen, onCloseCart,
  onConfirm, customers, orders, lastWebOrder, onClearLastOrder, onGoWhatsApp,
  onOpenInvoice, full, onToggleFull,
}) {
  const [category, setCategory] = useState("vacuno");
  const [query, setQuery] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const promoRef = useRef(null);
  const productsRef = useRef(null);

  const cartLines = useMemo(
    () => cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId) })).filter((line) => line.product),
    [cart, products]
  );
  const cartCount = Math.round(cartLines.reduce((sum, line) => sum + line.qty, 0) * 100) / 100;
  const cartTotal = cartLines.reduce((sum, line) => sum + line.qty * line.product.price, 0);

  const featured = products.filter((product) => product.categoryId === "super").slice(0, 8);
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
      <div className={full ? "min-h-[calc(100vh-64px)] bg-[#F7F4EE] p-4 sm:p-6 lg:p-8" : "h-full overflow-y-auto no-scrollbar bg-[#F7F4EE]"}>
        <div className={full ? "mx-auto max-w-[1120px] rounded-[16px] overflow-hidden border border-[#1F1B16]/10 shadow-sm" : "min-h-full"}>
          <WebSuccess
            order={lastWebOrder}
            orders={orders}
            onWhatsApp={onGoWhatsApp}
            onOpenInvoice={onOpenInvoice}
            onContinue={() => { setShowCheckout(false); onClearLastOrder(); }}
          />
        </div>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className={full ? "min-h-[calc(100vh-64px)] bg-[#F7F4EE] p-4 sm:p-6 lg:p-8" : "h-full overflow-y-auto no-scrollbar bg-[#F7F4EE]"}>
        <div className={full ? "mx-auto max-w-[1120px] rounded-[16px] overflow-hidden border border-[#1F1B16]/10 shadow-sm" : "min-h-full"}>
          <WebCheckoutView
            cartLines={cartLines}
            total={cartTotal}
            customers={customers}
            onConfirm={(form) => {
              setShowCheckout(false);
              onConfirm(form);
            }}
            onBackToMenu={() => setShowCheckout(false)}
            onOpenCart={onOpenCart}
          />
        </div>
        <CartSheet
          open={cartOpen}
          onClose={onCloseCart}
          cartLines={cartLines}
          total={cartTotal}
          onUpdateQty={onUpdateQty}
          onRemove={onRemove}
          onProceedToCheckout={() => onCloseCart()}
          full={full}
        />
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
          <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6">
            {full ? (
              <nav className="hidden items-center gap-6 text-[13px] md:flex" aria-label="Tienda">
                <button type="button" onClick={scrollToPromos} className="text-[#1F1B16] transition-colors hover:text-[#6B091E]">Promos</button>
                <button type="button" onClick={() => scrollToProducts("vacuno")} className="text-[#5E554A] transition-colors hover:text-[#1F1B16]">Cortes</button>
                <button type="button" onClick={() => scrollToProducts("mayorista")} className="text-[#5E554A] transition-colors hover:text-[#1F1B16]">Mayorista</button>
              </nav>
            ) : (
              <Logo compact />
            )}

            <div className="flex items-center gap-2 sm:gap-3">
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
              <h1 className="max-w-[420px] font-display text-[44px] font-normal leading-[1.02] tracking-[-0.02em] text-[#1F1B16] sm:text-[58px]">
                Del campo a tu casa
              </h1>
              <button type="button" onClick={scrollToPromos} className="mt-7 flex h-11 w-fit items-center gap-2 rounded-[8px] bg-[#6B091E] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#580617]">
                Ver promos <ArrowRight size={15} strokeWidth={1.5} />
              </button>
            </div>
            <div className={`relative flex flex-col items-center justify-between overflow-hidden px-5 py-6 text-center ${full ? "min-h-[340px] lg:py-8" : "min-h-[256px]"}`}>
              <img
                src={IMAGES.rawbeef}
                alt="Cortes frescos en Frigorífico Novila"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#1F1B16]/90 via-[#3B0612]/65 to-[#1F1B16]/45"
                aria-hidden="true"
              />
              <div className="relative z-10 my-auto flex flex-col items-center">
                <div className="h-28 w-28 overflow-hidden rounded-full bg-white p-1.5 shadow-2xl ring-2 ring-[#C59B40]/70 sm:h-36 sm:w-36">
                  <img
                    src={IMAGES.logo}
                    alt="Logo oficial de Frigorífico Novila"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <p className="mt-3 font-mono text-[11px] font-medium tracking-[0.18em] text-[#F5EFE6]/95 uppercase">
                  FRIGORÍFICO NOVILA · CÓRDOBA
                </p>
              </div>
              <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#1F1B16]/70 px-2.5 py-1 text-[11px] font-medium text-[#FAF8F5] backdrop-blur-sm">
                  <MapPin size={12} strokeWidth={1.75} className="text-[#C59B40]" />
                  {BRAND.address}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-[#1F1B16]/70 px-2.5 py-1 text-[11px] font-medium text-[#FAF8F5] backdrop-blur-sm">
                  Playa de estacionamiento propia
                </span>
              </div>
            </div>
          </div>
        </section>

        <section ref={promoRef} className="mx-auto max-w-[1180px] scroll-mt-20 px-4 pt-10 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-[30px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Super promos</h2>
            <span className="font-mono text-[11px] text-[#7B7266]">{featured.length} combos</span>
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
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[26px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Para tu asado</h2>
              <p className="mt-1 text-[12px] text-[#7B7266]">Combos pensados para la parrilla</p>
            </div>
          </div>
          <div className={`mt-4 grid gap-3 ${full ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}`}>
            {ASADO_PACKS.map((pack) => {
              const packTotal = pack.items.reduce((sum, entry) => {
                const prod = products.find((p) => p.id === entry.productId);
                return sum + (prod ? prod.price * entry.qty : 0);
              }, 0);
              const allInStock = pack.items.every((entry) => products.find((p) => p.id === entry.productId)?.stock);
              return (
                <article key={pack.id} className="flex flex-col justify-between overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[15px] font-medium text-[#1F1B16]">{pack.title}</h3>
                      <span className="shrink-0 rounded-[4px] bg-[#EFE9DF] px-2 py-0.5 text-[11px] font-medium text-[#5E554A]">{pack.weightLabel}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-5 text-[#7B7266]">{pack.detail}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#1F1B16]/8 pt-3">
                    <span className="font-mono text-[16px] font-medium tabular-nums text-[#1F1B16]">{formatMoney(packTotal)}</span>
                    <button
                      type="button"
                      disabled={!allInStock}
                      onClick={() => onAddPack(pack, packTotal)}
                      className="flex h-8 items-center gap-1.5 rounded-[7px] bg-[#6B091E] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#580617] disabled:opacity-40"
                    >
                      <Plus size={14} strokeWidth={1.8} /> Agregar
                    </button>
                  </div>
                </article>
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

      <CartSheet
        open={cartOpen}
        onClose={onCloseCart}
        cartLines={cartLines}
        total={cartTotal}
        onUpdateQty={onUpdateQty}
        onRemove={onRemove}
        onProceedToCheckout={() => {
          onCloseCart();
          setShowCheckout(true);
        }}
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

function WebView({
  products, cart, customers, orders, lastWebOrder, onAdd, onAddPack, onRemove, onUpdateQty,
  onOpenCart, cartOpen, onCloseCart, onConfirm, onClearLastOrder, onGoWhatsApp, onOpenInvoice,
}) {
  const [full, setFull] = useState(true);

  const app = (
    <WebApp
      products={products}
      cart={cart}
      customers={customers}
      orders={orders}
      lastWebOrder={lastWebOrder}
      onAdd={onAdd}
      onAddPack={onAddPack}
      onRemove={onRemove}
      onUpdateQty={onUpdateQty}
      onOpenCart={onOpenCart}
      cartOpen={cartOpen}
      onCloseCart={onCloseCart}
      onConfirm={onConfirm}
      onClearLastOrder={onClearLastOrder}
      onGoWhatsApp={onGoWhatsApp}
      onOpenInvoice={onOpenInvoice}
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
            <div className="phone-shell h-[min(820px,calc(100vh-112px))] w-[min(420px,calc(100vw-32px))]">
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

function WaMessage({ msg, onQuickReply, products, onPayLink, payLinkActive, orders }) {
  const isOut = msg.side === "out";
  const ready = msg.kind === "ready";
  const campaign = msg.kind === "campaign";
  const confirmation = msg.kind === "order_confirmed";
  const review = msg.kind === "review";
  const receipt = msg.kind === "receipt";

  const readyOrder = useMemo(() => {
    if (!ready && !msg.orderCode) return null;
    return orders?.find((o) => o.id === msg.orderCode) ||
      orders?.find((o) => o.pickupToken && o.pickupToken === msg.pickupToken) ||
      orders?.find((o) => o.id === "NV-104") ||
      null;
  }, [ready, msg.orderCode, msg.pickupToken, orders]);

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
                <span className="text-[11px] font-medium text-[#206A45]">Pedido listo para retiro</span>
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
            {review && (
              <div className="mb-2 flex items-center gap-1.5 border-b border-[#1F1B16]/[0.08] pb-2">
                <Star size={12} strokeWidth={1.8} className="fill-[#8A5A22] text-[#8A5A22]" />
                <span className="text-[11px] font-medium text-[#8A5A22]">Pedido entregado · Tu opinión</span>
              </div>
            )}
            {msg.kind === "audio" ? (
              <AudioBubble msg={msg} />
            ) : receipt ? (
              <ReceiptBubble receipt={msg.receipt} />
            ) : (
              <>
                <p className="whitespace-pre-line">{msg.text}</p>
                {ready && (
                  <div className="mt-3">
                    <PickupPassCard
                      order={readyOrder || {
                        id: msg.orderCode || "NV-104",
                        customerName: "Diego Bustos",
                        phone: "351 444 9021",
                        pickupSlot: "Hoy 12:30 - 13:00 hs",
                        payment: "Transferencia bancaria acreditada",
                        paymentStatus: "approved",
                        status: 3,
                        pickupToken: msg.pickupToken || "pickup_nv104_8f92a1b4",
                        pickupPin: msg.pickupPin || "482910",
                        items: [],
                      }}
                      compact
                    />
                  </div>
                )}
                {msg.kind === "transfer" && <TransferDetails transfer={msg.transfer} />}
                {msg.kind === "invoice" && (
                  <div className="mt-2.5 overflow-hidden rounded-[8px] border border-[#1F1B16]/10 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#1F1B16]/10 bg-[#F7F4EE] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} strokeWidth={1.8} className="text-[#6B091E]" />
                        <span className="font-mono text-[11px] font-bold text-[#1F1B16]">Factura C · Simulación ARCA</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#7B7266]">#{msg.orderCode || "NV-104"}</span>
                    </div>
                    <div className="p-3 text-[12px] space-y-1.5 font-mono">
                      <div className="flex justify-between text-[#5E554A]">
                        <span className="font-sans text-[11px]">Comprobante:</span>
                        <span className="font-bold text-[#1F1B16] text-[11px]">{msg.invoiceData?.invoiceNumber || "fac-C-00003-00000104"}</span>
                      </div>
                      <div className="flex justify-between text-[#5E554A]">
                        <span className="font-sans text-[11px]">Total:</span>
                        <span className="font-bold text-[#1F1B16] text-[12px]">{formatMoney(msg.invoiceData?.total || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#7B7266]">
                        <span className="font-sans">CAE:</span>
                        <span>{msg.invoiceData?.cae || "74200169287271"}</span>
                      </div>
                    </div>
                    <div className="border-t border-[#1F1B16]/10 bg-[#FDFBF7] px-3 py-1.5 text-center text-[11px] font-medium text-[#206A45] flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={13} /> Comprobante fiscal emitido
                    </div>
                  </div>
                )}
                {msg.kind === "payment_link" && msg.payLink && (
                  <div className="mt-2.5 overflow-hidden rounded-[8px] border border-[#1F1B16]/10 bg-white">
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#6B091E] text-white">
                        <CreditCard size={15} strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-[#1F1B16]">Pago seguro · Frigorífico Novila</p>
                        <p className="text-[11px] text-[#7B7266]">{msg.payLink.provider}</p>
                      </div>
                      <span className="font-mono text-[13px] font-medium text-[#1F1B16]">{formatMoney(msg.payLink.amount)}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!payLinkActive}
                      onClick={() => onPayLink?.(msg.payLink)}
                      className="flex h-10 w-full items-center justify-center gap-1.5 border-t border-[#1F1B16]/10 text-[13px] font-medium text-[#075E54] transition-colors hover:bg-[#075E54]/[0.05] disabled:cursor-not-allowed disabled:text-[#7B7266] disabled:hover:bg-transparent"
                    >
                      {payLinkActive ? (
                        <><Lock size={13} strokeWidth={1.8} /> Pagar {formatMoney(msg.payLink.amount)}</>
                      ) : (
                        <><Check size={13} strokeWidth={1.8} /> Link utilizado</>
                      )}
                    </button>
                  </div>
                )}
                {review && msg.reviewLink && (
                  <div className="mt-2.5 overflow-hidden rounded-[8px] border border-[#1F1B16]/10 bg-white">
                    <div className="p-3">
                      <div className="flex items-center gap-1 text-[#8A5A22]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className="fill-[#8A5A22]" />
                        ))}
                      </div>
                      <p className="mt-1.5 text-[12px] font-medium text-[#1F1B16]">Calificar Frigorífico Novila en Google</p>
                      <p className="mt-0.5 text-[11px] text-[#7B7266]">Tu opinión nos ayuda a seguir brindando la mejor carne de Córdoba.</p>
                    </div>
                    <a
                      href={msg.reviewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 w-full items-center justify-center gap-1.5 border-t border-[#1F1B16]/10 text-[13px] font-medium text-[#075E54] transition-colors hover:bg-[#075E54]/[0.05]"
                    >
                      <ExternalLink size={13} strokeWidth={1.8} /> Dejar reseña en Google Maps
                    </a>
                  </div>
                )}
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

function WhatsAppView({ messages, typing, onSend, onAudio, waFlow, orders, onLinkPaid }) {
  const [input, setInput] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [payLink, setPayLink] = useState(null);
  const [payStep, setPayStep] = useState(1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const chatOrder = orders?.find((order) => order.id === waFlow.orderId)
    || orders?.find((order) => order.status === 3)
    || orders?.find((order) => order.channel === "whatsapp")
    || orders?.[0]
    || null;
  const lastPayLinkId = [...messages].reverse().find((msg) => msg.kind === "payment_link")?.id;
  const linkPayable = waFlow.mode === "awaiting_link_payment";

  const openPayLink = (link) => {
    if (!linkPayable || payLink) return;
    setPayLink(link);
    setPayStep(1);
    window.setTimeout(() => setPayStep(2), 800);
    window.setTimeout(() => setPayStep(3), 1600);
    window.setTimeout(() => {
      setPayLink(null);
      onLinkPaid?.();
    }, 2400);
  };

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
          <h1 className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">NovilaBot</h1>
          <p className="mt-2 text-[13px] text-[#5E554A]">Atención y pedidos automáticos por WhatsApp las 24 hs.</p>
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
              {chatOrder.status >= 3 && (
                <div className="mt-4 border-t border-[#1F1B16]/10 pt-4">
                  <PickupPassCard order={chatOrder} compact showDetails={false} />
                </div>
              )}
            </div>
          ) : null}
        </aside>

        <div className="flex w-full flex-col items-center xl:w-auto">
          <div className="phone-shell h-[min(800px,calc(100vh-112px))] w-[min(440px,calc(100vw-32px))]">
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
                      <span className="mt-1 block text-[11px] font-normal text-white/75">en línea · API oficial de Meta</span>
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
                      <Lock size={10} strokeWidth={1.5} className="mr-1 inline" />Los mensajes y pagos en este chat están cifrados de extremo a extremo.
                    </div>
                  </div>
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <WaMessage
                        key={msg.id}
                        msg={msg}
                        onQuickReply={onSend}
                        products={[]}
                        onPayLink={openPayLink}
                        payLinkActive={linkPayable && msg.id === lastPayLinkId}
                        orders={orders}
                      />
                    ))}
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

      {payLink && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1F1B16]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[400px] rounded-[16px] border border-[#1F1B16]/15 bg-[#FDFBF7] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#6B091E]/10">
              {payStep === 3 ? (
                <CheckCircle2 size={32} strokeWidth={2} className="text-[#206A45]" />
              ) : (
                <RefreshCw size={26} strokeWidth={2} className="animate-spin text-[#6B091E]" />
              )}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B7266]">Link de pago seguro</p>
            <h3 className="mt-1 font-display text-[22px] font-normal text-[#1F1B16]">{payLink.provider}</h3>
            <p className="mt-3 font-mono text-[24px] font-medium text-[#1F1B16]">{formatMoney(payLink.amount)}</p>
            <div className="mt-5 space-y-1 rounded-[8px] bg-[#EFE9DF]/70 p-3 text-left text-[12px] text-[#5E554A]">
              <div className="flex justify-between"><span>Comercio:</span><span className="font-medium text-[#1F1B16]">Frigorífico Novila</span></div>
              <div className="flex justify-between"><span>Cliente:</span><span className="font-medium text-[#1F1B16]">{payLink.customerName || "Cliente"}</span></div>
              <div className="flex justify-between"><span>Origen:</span><span className="font-medium text-[#1F1B16]">WhatsApp · NovilaBot</span></div>
            </div>
            <div className="mt-6 text-[13px]">
              {payStep === 1 && (
                <p className="flex items-center justify-center gap-2 text-[#5E554A]">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#6B091E]" /> Abriendo la pasarela de pago...
                </p>
              )}
              {payStep === 2 && (
                <p className="flex items-center justify-center gap-2 text-[#5E554A]">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#8A5A22]" /> Autorizando el pago...
                </p>
              )}
              {payStep === 3 && (
                <p className="flex items-center justify-center gap-2 font-medium text-[#206A45]">
                  <Check size={15} strokeWidth={2.5} /> ¡Pago aprobado! Volviendo a WhatsApp...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA 3 · PANEL DEL FRIGORÍFICO
// ─────────────────────────────────────────────────────────────────────────────

function OrderSteps({ status }) {
  const steps = [
    { key: 1, label: "Por preparar" },
    { key: 3, label: "Listo para retirar" },
    { key: 4, label: "Retirado" },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {steps.map((step) => {
        const active = status >= step.key;
        return (
          <div key={step.key}>
            <div className={`h-1 rounded-full ${active ? "bg-[#6B091E]" : "bg-[#1F1B16]/10"}`} />
            <p className={`mt-2 text-[11px] leading-tight ${active ? "font-medium text-[#1F1B16]" : "text-[#7B7266]"}`}>{step.label}</p>
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
    onToast?.({
      type: "success",
      title: `Comanda #${order.id} enviada a impresión`,
      message: "Formato térmico 80mm listo para pegar en bolsa (sin fila en el corralito).",
      icon: "ReceiptText",
      duration: 3600,
    });
    window.print?.();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F1B16]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible !important;
          }
          #printable-ticket {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 12px !important;
            box-shadow: none !important;
            border: 1px dashed #000 !important;
            z-index: 999999 !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex max-h-[92vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[14px] border border-[#1F1B16]/15 bg-[#F7F4EE] shadow-2xl">
        <div className="no-print flex items-center justify-between border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1F1B16]">
            <ReceiptText size={16} strokeWidth={1.6} className="text-[#6B091E]" /> Comanda térmica 80mm
          </div>
          <button type="button" onClick={onClose} className="rounded-[6px] p-1.5 text-[#5E554A] hover:bg-[#EFE9DF]" aria-label="Cerrar comanda">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto p-4">
          <div
            id="printable-ticket"
            className="mx-auto w-full rounded-[8px] border border-dashed border-[#1F1B16]/25 bg-white p-4 font-mono text-[12px] text-[#1F1B16] shadow-sm"
          >
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
                        ? `Pedido: ${formatKg(item.requestedKg ?? item.qty)} · Balanza: ${formatKg(item.actualKg ?? item.requestedKg ?? item.qty)}`
                        : `${item.qty} × ${item.unitLabel}`}
                    </p>
                  </div>
                ))}
              </div>
              {order.note && (
                <div className="mt-3 rounded-[4px] border border-dashed border-[#8A5A22]/40 bg-[#F7EFD9]/60 p-2 text-[10px] leading-4 text-[#1F1B16]">
                  <span className="font-bold uppercase text-[#8A5A22]">Nota: </span>
                  <span className="break-words">{order.note}</span>
                </div>
              )}
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

        <div className="no-print flex gap-2 border-t border-[#1F1B16]/10 bg-[#FDFBF7] px-4 py-3">
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

function InvoiceModal({ order, onClose, onToast, onSendWhatsApp }) {
  if (!order) return null;
  const total = orderTotal(order);
  const invoiceData = buildInvoiceData(order);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    onSendWhatsApp?.(order);
  };

  return (
    <div
      id="printable-invoice-modal-overlay"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F1B16]/60 p-2 sm:p-4 backdrop-blur-[2px] overflow-y-auto"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
            z-index: 999999 !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex max-h-[96vh] w-full max-w-[780px] flex-col overflow-hidden rounded-[14px] border border-[#1F1B16]/15 bg-[#F7F4EE] shadow-2xl my-auto">
        {/* Modal Top Actions Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1F1B16]">
            <FileText size={16} strokeWidth={1.6} className="text-[#6B091E]" />
            <span>Comprobante Electrónico AFIP / ARCA</span>
            <span className="font-mono text-[11px] text-[#7B7266]">#{order.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex h-8 items-center gap-1.5 rounded-[7px] border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 text-[11px] font-medium text-[#075E54] transition-colors hover:bg-[#25D366]/20"
              title="Enviar copia simulada por WhatsApp al cliente"
            >
              <MessageCircle size={13} strokeWidth={1.8} />
              <span>Enviar por WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-8 items-center gap-1.5 rounded-[7px] bg-[#6B091E] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#580617]"
              title="Imprimir o Guardar como PDF"
            >
              <Printer size={13} strokeWidth={1.8} />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] p-1.5 text-[#5E554A] transition-colors hover:bg-[#EFE9DF]"
              aria-label="Cerrar factura"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Scrollable sheet container */}
        <div className="thin-scrollbar flex-1 overflow-y-auto p-3 sm:p-6 bg-[#EBE7DF]/40">
          {/* THE ARCA FACTURA C INVOICE SHEET */}
          <div
            id="printable-invoice"
            className="mx-auto w-full max-w-[680px] bg-white p-5 sm:p-7 text-black border border-black shadow-sm font-sans"
            style={{ minHeight: "760px" }}
          >
            {/* 1. ORIGINAL HEADER BANNER */}
            <div className="border border-black text-center py-1 text-[11px] font-bold tracking-[0.2em] uppercase mb-[-1px]">
              ORIGINAL
            </div>

            {/* 2. EMISOR / TIPO COMPROBANTE / METADATOS FISCALES */}
            <div className="border border-black grid grid-cols-12 relative">
              {/* Emisor (Izquierda) */}
              <div className="col-span-5 p-3 sm:p-4 border-r border-black flex flex-col justify-between">
                <div>
                  <h2 className="text-[17px] sm:text-[19px] font-black tracking-tight uppercase leading-tight text-black">
                    {invoiceData.emisor.name}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-medium text-gray-700 mt-1">
                    Razón Social: <span className="font-semibold text-black">{invoiceData.emisor.businessName}</span>
                  </p>
                </div>
                <div className="mt-4 space-y-0.5 text-[10px] sm:text-[11px] text-gray-800">
                  <p><span className="font-semibold">Domicilio:</span> {invoiceData.emisor.address}</p>
                  <p><span className="font-semibold">Localidad:</span> {invoiceData.emisor.city}</p>
                  <p><span className="font-semibold">Condición IVA:</span> {invoiceData.emisor.vatCondition}</p>
                </div>
              </div>

              {/* Caja Central C */}
              <div className="col-span-2 flex flex-col items-center justify-start border-r border-black bg-white pt-1">
                <div className="flex h-13 w-14 sm:h-15 sm:w-16 flex-col items-center justify-center border-b border-x border-black bg-white shadow-xs">
                  <span className="font-serif text-[28px] sm:text-[32px] font-black leading-none text-black">C</span>
                  <span className="text-[8px] sm:text-[9px] font-bold tracking-tighter uppercase leading-none mt-0.5 text-black">
                    COD. 011
                  </span>
                </div>
              </div>

              {/* Metadatos Factura (Derecha) */}
              <div className="col-span-5 p-3 sm:p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-[15px] sm:text-[17px] font-black tracking-tight uppercase text-black">
                    FACTURA <span className="text-[11px] font-bold text-gray-700">(cod.011)</span>
                  </h3>
                  <p className="mt-1 font-mono text-[11px] sm:text-[12px] font-bold text-black">
                    Factura: {invoiceData.invoiceNumber}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-gray-800">
                    <span className="font-semibold">Fecha Emisión:</span> {invoiceData.emissionDate}
                  </p>
                </div>
                <div className="mt-3 space-y-0.5 text-[10px] sm:text-[11px] text-gray-800 font-mono">
                  <p><span className="font-sans font-semibold">CUIT:</span> {invoiceData.emisor.cuit}</p>
                  <p><span className="font-sans font-semibold">Ingresos Brutos:</span> {invoiceData.emisor.grossIncome}</p>
                  <p><span className="font-sans font-semibold">Inicio Actividades:</span> {invoiceData.emisor.startDate}</p>
                </div>
              </div>
            </div>

            {/* 3. DATOS DEL CLIENTE */}
            <div className="border-x border-b border-black p-3 sm:p-3.5 text-[11px] sm:text-[12px] space-y-1.5">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-gray-700">Cliente:</span>{" "}
                  <span className="font-bold text-black">{order.customerName}</span>
                </div>
                <div className="shrink-0 text-right font-mono text-[11px]">
                  <span className="font-sans font-semibold text-gray-700">CUIT/DNI:</span>{" "}
                  <span>{order.customerDni || "0"}</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] sm:text-[11px]">
                <div>
                  <span className="font-semibold text-gray-700">Domicilio:</span>{" "}
                  <span className="text-gray-800">{order.customerAddress || ". CÓRDOBA"}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-semibold text-gray-700">Condición IVA:</span>{" "}
                  <span className="font-medium text-black">Consumidor Final</span>
                </div>
              </div>
            </div>

            {/* 4. TABLA DETALLE DE PRODUCTOS */}
            <div className="border-x border-b border-black overflow-hidden">
              <table className="w-full text-left text-[10px] sm:text-[11px]">
                <thead>
                  <tr className="border-b border-black bg-[#E5E7EB] font-bold text-gray-900">
                    <th className="px-2.5 py-1.5 text-left">Código</th>
                    <th className="px-2.5 py-1.5 text-left">Descripción</th>
                    <th className="px-2.5 py-1.5 text-right">Cantidad</th>
                    <th className="px-2.5 py-1.5 text-right">Precio Unit</th>
                    <th className="px-2.5 py-1.5 text-right">Descuento</th>
                    <th className="px-2.5 py-1.5 text-right">Alícuota %</th>
                    <th className="px-2.5 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono">
                  {invoiceData.items.map((item, idx) => (
                    <tr key={`${item.code}-${idx}`} className="text-gray-900">
                      <td className="px-2.5 py-1.5">{item.code}</td>
                      <td className="px-2.5 py-1.5 font-sans font-medium">{item.description}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{item.qty.toFixed(2)}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{item.unitPrice.toFixed(2)}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">0.00</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">21.00</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold">{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. MEDIO DE PAGO E IMPORTE TOTAL */}
            <div className="border-x border-b border-black p-3 sm:p-4 flex items-center justify-between text-[11px] sm:text-[12px]">
              <div>
                <p className="font-bold uppercase tracking-wider text-gray-700 text-[10px]">Pagos</p>
                <p className="mt-0.5 font-medium text-gray-900 font-mono">
                  {order.payment || "Efectivo"} $ {Number(total).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-800 text-[13px] sm:text-[15px]">Importe Total:$</span>{" "}
                <span className="font-mono text-[16px] sm:text-[19px] font-black text-black ml-2">
                  {Number(total).toFixed(2)}
                </span>
              </div>
            </div>

            {/* 6. PIE FISCAL (ARCA / AFIP) */}
            <div className="border-x border-b border-black p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4 bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="rounded-[4px] border border-black p-1 bg-white">
                  <QRCodeSVG value={invoiceData.qrUrl} size={64} level="M" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black tracking-tight text-[16px] sm:text-[18px] text-gray-900 font-sans">
                      ARCA
                    </span>
                    <span className="text-[10px] font-bold text-gray-600 uppercase">
                      / AFIP
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-800">Comprobante Autorizado</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-tight mt-0.5">
                    Comprobante Fiscal Simulado
                  </p>
                </div>
              </div>

              <div className="text-right space-y-0.5 font-mono text-[10px] sm:text-[11px]">
                <p className="text-gray-900">
                  <span className="font-sans font-semibold text-gray-700">CAE Nro:</span>{" "}
                  <span className="font-bold">{invoiceData.cae}</span>
                </p>
                <p className="text-gray-900">
                  <span className="font-sans font-semibold text-gray-700">Fecha Vto CAE:</span>{" "}
                  <span>{invoiceData.caeVto}</span>
                </p>
                <p className="font-sans text-[9px] text-gray-400 pt-1">
                  Facturalo Simple by Novila Carnes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="no-print flex items-center justify-between border-t border-[#1F1B16]/10 bg-[#FDFBF7] px-4 py-3">
          <p className="text-[11px] text-[#7B7266]">
            Simulación fiscal visual y operativa · Estética ARCA RG 4291
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#6B091E] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#580617]"
            >
              <Printer size={14} strokeWidth={1.8} />
              <span>Imprimir / Descargar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-[8px] border border-[#1F1B16]/15 px-3 text-[12px] text-[#5E554A] hover:bg-[#EFE9DF]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightInput({ item, onCommit }) {
  const current = item.actualKg ?? item.requestedKg ?? item.qty;
  const [value, setValue] = useState(String(current));
  useEffect(() => { setValue(String(current)); }, [current]);
  const commit = () => {
    const kg = Math.round(Number(String(value).replace(",", ".")) * 1000) / 1000;
    if (!Number.isFinite(kg) || kg <= 0) { setValue(String(current)); return; }
    if (kg !== Number(current) || !item.weighed) onCommit(kg);
  };
  return (
    <div className="flex items-center gap-1">
      <Scale size={13} strokeWidth={1.6} className="text-[#8A5A22]" />
      <input
        value={value}
        inputMode="decimal"
        onChange={(event) => setValue(event.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        className={`input-ring h-7 w-[64px] rounded-[6px] border px-1.5 text-right font-mono text-[12px] text-[#1F1B16] ${item.weighed ? "border-[#1F6F43]/40 bg-[#E8F4EC]" : "border-[#8A5A22]/40 bg-[#FDFBF7]"}`}
        aria-label={`Peso de balanza para ${item.name}`}
        title="Peso real de balanza (kg)"
      />
      <span className="text-[11px] text-[#7B7266]">kg</span>
      {!item.weighed && (
        <button
          type="button"
          onClick={commit}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#8A5A22]/35 bg-[#FDF0E0] text-[#8A5A22] transition-colors hover:bg-[#1F6F43] hover:border-[#1F6F43] hover:text-white"
          title="Confirmar peso en balanza"
          aria-label={`Confirmar peso de ${item.name}`}
        >
          <Check size={12} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

function OrderCard({ order, onMarkReady, onWithdraw, onConfirmPayment, onRequestSlot, onOpenInvoice, onOpenTicket, onVerifyPickup, onSetWeight, allowScan = true }) {
  const total = orderTotal(order);
  const status = ORDER_STATUS[order.status] || ORDER_STATUS[1];
  const paymentStatus = order.paymentStatus || "approved";
  const isReview = paymentStatus === "review";
  const waitingSlot = !isReview && !order.pickupSlot;
  const paymentReference = order.paymentReference || "TRF-PENDIENTE";
  const canWeigh = !isReview && order.status < 3 && typeof onSetWeight === "function";
  const weighable = hasWeighableItems(order.items);
  const pendingWeigh = canWeigh && order.items.some((item) => item.pricing === "kg" && !item.weighed);
  const adjustment = weightAdjustment(order);
  const substitution = SUBSTITUTION_OPTIONS.find((option) => option.id === order.substitution);

  return (
    <article className="overflow-hidden rounded-[14px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
      <div className="h-[2px]" style={{ background: status.color }} />
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] text-[#7B7266]">#{order.id}</span>
            <span className="flex items-center gap-1 text-[11px] text-[#7B7266]">
              <Icon name={order.channel === "web" ? "ShoppingBag" : "MessageCircle"} size={13} strokeWidth={1.5} />
              {order.channel === "web" ? "Web" : "WhatsApp"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenInvoice(order)}
              className="flex h-7 items-center gap-1.5 rounded-[6px] border border-[#1F1B16]/15 bg-white px-2 text-[11px] font-medium text-[#1F1B16] transition-colors hover:border-[#6B091E]/30 hover:bg-[#EFE9DF]"
              title="Ver Factura Electrónica AFIP / ARCA"
            >
              <FileText size={12} strokeWidth={1.6} className="text-[#6B091E]" /> Factura
            </button>
            <button
              type="button"
              onClick={() => onOpenTicket?.(order)}
              className="flex h-7 items-center gap-1.5 rounded-[6px] border border-[#1F1B16]/15 bg-white px-2 text-[11px] font-medium text-[#1F1B16] transition-colors hover:border-[#6B091E]/30 hover:bg-[#EFE9DF]"
              title="Vista previa de comanda térmica 80mm"
            >
              <ReceiptText size={12} strokeWidth={1.5} className="text-[#6B091E]" /> Comanda 80mm
            </button>
            <span className="flex items-center gap-2 text-[12px] font-medium text-[#5E554A]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
              {status.full}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[23px] font-medium leading-tight tracking-[-0.01em] text-[#1F1B16]" title={order.customerName}>{order.customerName}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#7B7266]">
              <span>{order.phone}</span>
              <span>{order.createdAt}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-[#7B7266]">{isReview ? "Transferido" : "Total"}</p>
            <p className="mt-1 font-mono text-[21px] font-medium tabular-nums leading-none text-[#1F1B16]">{formatMoney(total)}</p>
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
            <span className="text-[#206A45]">Listo {order.readyAt}</span>
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
          <div className="border-t border-[#1F1B16]/10">
            {order.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 border-b border-[#1F1B16]/8 py-2.5 last:border-b-0">
                {item.pricing === "kg" ? (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1F1B16]">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#7B7266]">
                        {formatMoney(item.unitPrice)}/kg · Pidió {formatKg(item.requestedKg ?? item.qty)}
                        {item.weighed && Math.abs((item.actualKg - (item.requestedKg ?? item.qty)) / ((item.requestedKg ?? item.qty) || 1)) > WEIGHT_TOLERANCE
                          ? <span className="font-medium text-[#9B1C1C]"> · fuera de ±10%</span>
                          : null}
                      </p>
                    </div>
                    {canWeigh ? (
                      <WeightInput item={item} onCommit={(kg) => onSetWeight(order.id, index, kg)} />
                    ) : (
                      <span className="font-mono text-[12px] font-medium text-[#1F1B16]">{formatKg(item.actualKg ?? item.requestedKg ?? item.qty)}</span>
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
          {substitution && (
            <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-[#1F1B16]/10 bg-[#F7F4EE] px-3 py-2 text-[12px] text-[#5E554A]">
              <Icon name={substitution.icon} size={14} strokeWidth={1.6} className="shrink-0 text-[#6B091E]" />
              <span><span className="font-medium text-[#1F1B16]">Si falta un corte:</span> {substitution.short}</span>
            </div>
          )}
          {weighable && !isReview && (order.weighedAt || canWeigh) && (
            <div className={`mt-3 rounded-[8px] border px-3 py-2.5 text-[12px] ${pendingWeigh ? "border-[#8A5A22]/30 bg-[#F7EFD9]/55" : "border-[#1F6F43]/25 bg-[#E8F4EC]/70"}`}>
              {pendingWeigh ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[#8A5A22]">
                    <Scale size={14} strokeWidth={1.6} className="shrink-0" /> Cargá el peso real de balanza en cada corte por kg.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      order.items.forEach((item, index) => {
                        if (item.pricing === "kg" && !item.weighed) {
                          const kg = Number(item.actualKg ?? item.requestedKg ?? item.qty);
                          if (kg > 0) onSetWeight(order.id, index, kg);
                        }
                      });
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-[#8A5A22]/40 bg-white px-2.5 text-[11px] font-medium text-[#8A5A22] transition-colors hover:bg-[#8A5A22] hover:text-white"
                  >
                    <Check size={12} strokeWidth={2.2} /> Confirmar pesos actuales
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-[#5E554A]">Abonado (estimado): <span className="font-mono text-[#1F1B16]">{formatMoney(adjustment.paid)}</span></span>
                  <span className="text-[#5E554A]">Real balanza: <span className="font-mono text-[#1F1B16]">{formatMoney(adjustment.real)}</span></span>
                  <span className={`font-medium ${adjustment.diff > 0 ? "text-[#8A5A22]" : adjustment.diff < 0 ? "text-[#1F6F43]" : "text-[#5E554A]"}`}>
                    {adjustment.diff > 0 ? `Cobrar en retiro ${formatMoney(adjustment.diff)}` : adjustment.diff < 0 ? `Reintegrar ${formatMoney(-adjustment.diff)}` : "Sin diferencia"}
                  </span>
                </div>
              )}
            </div>
          )}
          {order.note && (
            <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[#8A5A22]/25 bg-[#F7EFD9]/55 px-3 py-2.5 text-[12px] text-[#1F1B16]">
              <MessageSquareText size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#8A5A22]" />
              <div className="min-w-0">
                <span className="font-medium text-[#8A5A22]">Nota: </span>
                <span className="text-[#5E554A] break-words">{order.note}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#1F1B16]/10 pt-4">
          <div>
            <p className="text-[11px] text-[#7B7266]">{isReview ? "Total a acreditar" : "Total"}</p>
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
            <button
              type="button"
              onClick={() => onMarkReady(order)}
              disabled={pendingWeigh}
              title={pendingWeigh ? "Primero cargá el peso real de balanza" : undefined}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#580617] shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Check size={16} strokeWidth={2} />
              <span>{pendingWeigh ? "Pesá los cortes para continuar" : weighable ? "Marcar listo y enviar total real por WhatsApp" : "Marcar listo y enviar WhatsApp"}</span>
            </button>
          ) : order.status === 3 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-medium text-[#206A45]">Listo para retiro · Avisado {order.readyAt || "--:--"}</p>
                <p className="text-[11px] text-[#5E554A] mt-0.5 font-mono">
                  PIN: <span className="font-bold text-[#6B091E] tracking-wider">{formatPin(order.pickupPin || "482910")}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {allowScan && (
                  <button
                    type="button"
                    onClick={() => onVerifyPickup?.(order)}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#6B091E] px-3.5 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#580617]"
                  >
                    <QrCode size={14} strokeWidth={2} /> Validar QR / PIN
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onWithdraw(order)}
                  className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#1F1B16]/15 bg-white px-3 text-[12px] font-medium text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]"
                  title="Marcar como retirado directamente"
                >
                  <ShoppingBag size={14} strokeWidth={1.5} /> Retiro directo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#206A45]">
                <Check size={16} strokeWidth={2.2} />
                <span>Retirado</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#1F1B16]/10 bg-[#F7F4EE] px-3.5 py-2 text-[12px]">
                <span className="flex items-center gap-1.5 text-[#5E554A]">
                  <Star size={13} strokeWidth={1.5} className="fill-[#8A5A22] text-[#8A5A22]" /> Reseña en Google Maps solicitada
                </span>
                <a
                  href="https://share.google/pKBwJpIdpgRDsuLcH"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#6B091E] hover:underline"
                >
                  Ver link en Google Maps <ExternalLink size={12} strokeWidth={1.5} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CustomerHistoryModal({ customer, orders, onClose, onOpenInvoice }) {
  if (!customer) return null;
  const customerOrders = orders.filter(
    (order) => normalizePhone(order.phone) === normalizePhone(customer.phone) || order.customerId === customer.id
  ).sort((a, b) => (b.number || 0) - (a.number || 0));

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-[#1F1B16]/55 p-3 sm:p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[14px] border border-[#1F1B16]/15 bg-[#F7F4EE] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F1B16]/10 bg-[#FDFBF7] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1F1B16]/10 bg-[#EFE9DF] font-mono text-[13px] font-semibold text-[#5E554A]">
              {initials(customer.name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[20px] font-medium text-[#1F1B16] leading-none">
                  {customer.name}
                </h3>
                <span className="inline-flex items-center rounded-full bg-[#6B091E]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#6B091E]">
                  {customerOrders.length} {customerOrders.length === 1 ? "pedido" : "pedidos"}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[#7B7266] flex items-center gap-2">
                <span>WhatsApp: {customer.phone}</span>
                {customer.joined && <span>· Cliente desde {customer.joined}</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] p-1.5 text-[#5E554A] transition-colors hover:bg-[#EFE9DF]"
            aria-label="Cerrar historial"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content list */}
        <div className="thin-scrollbar flex-1 overflow-y-auto p-5 space-y-3.5">
          {customerOrders.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#1F1B16]/15 bg-white p-8 text-center text-[#7B7266]">
              <Package size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-[13px] font-medium text-[#1F1B16]">No hay pedidos registrados</p>
              <p className="text-[11px] mt-1">Este cliente todavía no tiene pedidos registrados en el sistema.</p>
            </div>
          ) : (
            customerOrders.map((order) => {
              const status = ORDER_STATUS[order.status] || ORDER_STATUS[1];
              const total = orderTotal(order);
              return (
                <div
                  key={order.id}
                  className="rounded-[10px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-4 transition-all hover:border-[#1F1B16]/20 shadow-xs"
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1B16]/8 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-[#6B091E]">#{order.id}</span>
                      <span className="text-[11px] text-[#7B7266]">
                        {order.date || "17/11/2026"} · {order.createdAt || "Hoy"} hs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: status.soft, color: status.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(order)}
                        className="flex h-6 items-center gap-1 rounded-[5px] border border-[#1F1B16]/15 bg-white px-2 text-[11px] font-medium text-[#1F1B16] transition-colors hover:border-[#6B091E]/30 hover:bg-[#F7F4EE]"
                        title="Ver comprobante fiscal emitido"
                      >
                        <FileText size={11} className="text-[#6B091E]" /> Factura C
                      </button>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="py-2.5 space-y-1 text-[12px]">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[#1F1B16]">
                        <span className="truncate pr-2">
                          <span className="font-medium">{item.name}</span>{" "}
                          <span className="text-[11px] text-[#7B7266]">
                            ({item.pricing === "kg" ? formatKg(item.actualKg || item.requestedKg || item.qty) : `${item.qty} ${item.unitLabel}`})
                          </span>
                        </span>
                        <span className="font-mono text-[12px] text-[#5E554A] shrink-0">
                          {formatMoney(lineTotal(item))}
                        </span>
                      </div>
                    ))}
                  </div>
                  {order.note && (
                    <div className="mb-2.5 flex items-start gap-1.5 rounded-[7px] border border-[#8A5A22]/20 bg-[#F7EFD9]/50 px-2.5 py-2 text-[11px] text-[#5E554A]">
                      <MessageSquareText size={13} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#8A5A22]" />
                      <span className="break-words"><strong className="font-medium text-[#8A5A22]">Nota:</strong> {order.note}</span>
                    </div>
                  )}

                  {/* Bottom row */}
                  <div className="flex items-center justify-between border-t border-[#1F1B16]/8 pt-2.5 text-[11px] text-[#7B7266]">
                    <span>Pago: <strong className="font-normal text-[#1F1B16]">{order.payment || "Efectivo"}</strong></span>
                    <span className="font-mono text-[13px] font-bold text-[#1F1B16]">
                      Total: {formatMoney(total)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1F1B16]/10 bg-[#FDFBF7] px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[7px] border border-[#1F1B16]/15 bg-white px-4 text-[12px] font-medium text-[#5E554A] hover:bg-[#EFE9DF]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerTable({ customers, orders, raffleEnabled, onToggleRaffle, onReminder, onOpenInvoice }) {
  const [query, setQuery] = useState("");
  const [historyCustomer, setHistoryCustomer] = useState(null);

  const rows = customers
    .map((customer) => {
      const ownOrders = orders.filter((order) => normalizePhone(order.phone) === normalizePhone(customer.phone) || order.customerId === customer.id);
      const currentSpent = ownOrders.filter((order) => (order.paymentStatus || "approved") === "approved").reduce((sum, order) => sum + orderTotal(order), 0);
      return {
        ...customer,
        orderCount: ownOrders.length,
        ownOrders,
        spent: currentSpent,
        lastOrder: ownOrders[0] || null,
      };
    })
    .filter((customer) => normalizeText(`${customer.name} ${customer.phone}`).includes(normalizeText(query)))
    .sort((a, b) => b.orderCount - a.orderCount);

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Clientes</h2>
          <p className="mt-2 text-[12px] text-[#7B7266]">{rows.length} registrados</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onToggleRaffle && (
            <button
              type="button"
              onClick={() => onToggleRaffle(!raffleEnabled)}
              className={`flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-medium transition-all ${
                raffleEnabled
                  ? "border-[#8A5A22]/30 bg-[#8A5A22]/10 text-[#8A5A22]"
                  : "border-[#1F1B16]/10 bg-[#FDFBF7] text-[#7B7266] hover:text-[#1F1B16]"
              }`}
              title="Activar o desactivar chances del Sorteo Novila"
            >
              <span>🎟️ Sorteo: {raffleEnabled ? "Activado" : "Desactivado"}</span>
            </button>
          )}
          <div className="relative">
            <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre o tel" className="h-9 w-[220px] rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] pl-9 pr-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
        <div className="thin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1F1B16]/10 text-[11px] text-[#7B7266]">
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">WhatsApp</th>
                <th className="px-4 py-3 text-center font-normal">Pedidos</th>
                {raffleEnabled && <th className="px-4 py-3 text-center font-normal">Chances Sorteo</th>}
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
                        <p className="mt-0.5 truncate text-[11px] text-[#7B7266]">{customer.favorite || "Sin preferencia"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#5E554A]">{customer.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setHistoryCustomer(customer)}
                      className="inline-flex h-7 min-w-[32px] items-center justify-center rounded-[6px] border border-[#1F1B16]/15 bg-white px-2 font-mono text-[12px] font-bold text-[#6B091E] shadow-2xs transition-all hover:border-[#6B091E]/50 hover:bg-[#F7F4EE] active:scale-95 cursor-pointer"
                      title={`Ver historial de pedidos de ${customer.name}`}
                    >
                      {customer.orderCount}
                    </button>
                  </td>
                  {raffleEnabled && (
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#8A5A22]/10 px-2.5 py-0.5 font-mono text-[11px] text-[#8A5A22]">
                        🎟️ {calcRaffleChances(customer.spent)}
                      </span>
                    </td>
                  )}
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
                    <button type="button" onClick={() => onReminder(customer)} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[#1F1B16]/12 px-2.5 text-[12px] text-[#1F1B16] transition-colors hover:bg-[#EFE9DF]">
                      <MessageCircle size={14} strokeWidth={1.5} /> Recordar
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={raffleEnabled ? 6 : 5} className="px-4 py-12 text-center text-[12px] text-[#7B7266]">No hay clientes con ese criterio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerHistoryModal
        customer={historyCustomer}
        orders={orders}
        onClose={() => setHistoryCustomer(null)}
        onOpenInvoice={onOpenInvoice}
      />
    </div>
  );
}

function PriceCell({ product, onCommit }) {
  const [value, setValue] = useState(String(product.price));
  useEffect(() => { setValue(String(product.price)); }, [product.price]);

  const commit = () => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      if (parsed !== product.price) onCommit(parsed);
    } else {
      setValue(String(product.price));
    }
  };

  return (
    <div className="relative w-[108px]">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#141414]/35">$</span>
      <input
        type="number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        className="price-input w-full rounded-[4px] border border-[#1F1B16]/12 bg-white py-1 pl-5 pr-1 text-right text-[12px] font-medium text-[#1F1B16] transition-colors hover:border-[#6B091E]/35 focus:border-[#6B091E] focus:outline-none"
        aria-label={`Precio de ${product.name}`}
      />
    </div>
  );
}

function CatalogTable({ products, onUpdatePrice, onToggleStock, onAddProduct, allowCreate = false, onToast }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProd, setNewProd] = useState({
    name: "",
    categoryId: "vacuno",
    kind: "kg",
    unitLabel: "kg",
    price: "",
    note: "",
    stock: true,
  });

  const visible = products.filter((product) => {
    const inCategory = category === "all" || product.categoryId === category;
    const inSearch = normalizeText(`${product.name} ${product.category} ${product.note || ""}`).includes(normalizeText(query));
    return inCategory && inSearch;
  });

  const handleKindChange = (kind) => {
    setNewProd((prev) => ({
      ...prev,
      kind,
      unitLabel: kind === "kg" ? "kg" : kind === "promo" ? "4 kg" : "unidad",
    }));
  };

  const handleCreateProduct = (event) => {
    event.preventDefault();
    const parsedPrice = Math.round(Number(newProd.price));
    if (!newProd.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) return;
    onAddProduct?.({
      name: newProd.name.trim(),
      categoryId: newProd.categoryId,
      price: parsedPrice,
      kind: newProd.kind,
      unitLabel: newProd.kind === "kg" ? "kg" : (newProd.unitLabel.trim() || "unidad"),
      note: newProd.note.trim(),
      stock: newProd.stock,
    });
    setNewProd({ name: "", categoryId: "vacuno", kind: "kg", unitLabel: "kg", price: "", note: "", stock: true });
    setShowAddForm(false);
  };

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Catálogo</h2>
          <p className="mt-2 text-[12px] text-[#7B7266]">{visible.length} productos · Editá precios y stock en vivo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {allowCreate && (
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#6B091E] px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-[#580617]"
            >
              <Plus size={15} strokeWidth={1.8} />
              <span>Nuevo producto</span>
            </button>
          )}
          <div className="relative">
            <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar corte" className="h-9 w-[220px] rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] pl-9 pr-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none" />
          </div>
        </div>
      </div>

      {allowCreate && showAddForm && (
        <form onSubmit={handleCreateProduct} className="mb-5 rounded-[12px] border border-[#1F1B16]/12 bg-[#FDFBF7] p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-b border-[#1F1B16]/10 pb-3">
            <div>
              <h3 className="text-[15px] font-medium text-[#1F1B16]">Nuevo producto</h3>
              <p className="mt-0.5 text-[11px] text-[#7B7266]">Se publica de inmediato en el catálogo y en la Web cliente.</p>
            </div>
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-[6px] p-1.5 text-[#7B7266] hover:bg-[#EFE9DF] hover:text-[#1F1B16]" aria-label="Cerrar formulario">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-[#5E554A]">Nombre del producto *</label>
              <input
                value={newProd.name}
                onChange={(e) => setNewProd((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Asado de Novillito Especial"
                className="input-ring h-9 w-full rounded-[7px] border border-[#1F1B16]/15 bg-white px-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#5E554A]">Categoría</label>
              <select
                value={newProd.categoryId}
                onChange={(e) => setNewProd((p) => ({ ...p, categoryId: e.target.value }))}
                className="input-ring h-9 w-full rounded-[7px] border border-[#1F1B16]/15 bg-white px-2.5 text-[12px] text-[#1F1B16]"
              >
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#5E554A]">Precio ($) *</label>
              <input
                type="number"
                min="1"
                value={newProd.price}
                onChange={(e) => setNewProd((p) => ({ ...p, price: e.target.value }))}
                placeholder="15900"
                className="input-ring h-9 w-full rounded-[7px] border border-[#1F1B16]/15 bg-white px-3 font-mono text-[12px] text-[#1F1B16] placeholder:text-[#7B7266]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#5E554A]">Tipo de venta</label>
              <select
                value={newProd.kind}
                onChange={(e) => handleKindChange(e.target.value)}
                className="input-ring h-9 w-full rounded-[7px] border border-[#1F1B16]/15 bg-white px-2.5 text-[12px] text-[#1F1B16]"
              >
                <option value="kg">Por kilo (kg)</option>
                <option value="promo">Combo / Promo</option>
                <option value="unit">Por unidad</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#5E554A]">Unidad / Presentación</label>
              <input
                value={newProd.unitLabel}
                onChange={(e) => setNewProd((p) => ({ ...p, unitLabel: e.target.value }))}
                disabled={newProd.kind === "kg"}
                placeholder="Ej: 4 kg o bandeja"
                className="input-ring h-9 w-full rounded-[7px] border border-[#1F1B16]/15 bg-white px-3 text-[12px] text-[#1F1B16] disabled:bg-[#F7F4EE] disabled:text-[#7B7266]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-[#5E554A]">Descripción breve (opcional)</label>
              <input
                value={newProd.note}
                onChange={(e) => setNewProd((p) => ({ ...p, note: e.target.value }))}
                placeholder="Ej: Corte tierno seleccionado listo para la parrilla"
                className="input-ring h-9 w-full rounded-[7px] border border-[#1F1B16]/15 bg-white px-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266]"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#1F1B16]/8 pt-3.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-9 rounded-[8px] border border-[#1F1B16]/15 bg-white px-3.5 text-[12px] text-[#5E554A] hover:bg-[#EFE9DF]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#6B091E] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#580617]"
            >
              <Plus size={14} strokeWidth={1.8} /> Guardar producto
            </button>
          </div>
        </form>
      )}

      <div className="no-scrollbar mb-4 flex gap-5 overflow-x-auto border-b border-[#1F1B16]/10">
        <button type="button" onClick={() => setCategory("all")} className={`shrink-0 border-b-2 pb-2.5 text-[12px] transition-colors ${category === "all" ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}>Todos</button>
        {CATEGORIES.map((entry) => (
          <button key={entry.id} type="button" onClick={() => setCategory(entry.id)} className={`shrink-0 border-b-2 pb-2.5 text-[12px] transition-colors ${category === entry.id ? "border-[#6B091E] text-[#1F1B16]" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}>
            {entry.short}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
        <div className="thin-scrollbar max-h-[calc(100vh-380px)] min-h-[400px] overflow-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#FDFBF7] text-[11px] text-[#7B7266]">
              <tr className="border-b border-[#1F1B16]/10">
                <th className="px-4 py-3 font-normal">Producto</th>
                <th className="px-4 py-3 font-normal">Categoría</th>
                <th className="px-4 py-3 text-right font-normal">Precio</th>
                <th className="px-4 py-3 text-center font-normal">Disponibilidad (1 toque)</th>
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
                        <p className="mt-0.5 text-[11px] text-[#7B7266]">
                          {product.kind === "promo" ? `Combo ${product.unitLabel}` : product.kind === "unit" ? product.unitLabel : "Por kg"}
                          {product.note ? ` · ${product.note}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#5E554A]">{product.category}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <PriceCell product={product} onCommit={(price) => { onUpdatePrice(product.id, price); onToast({ type: "success", title: `${product.name} actualizado`, message: `Nuevo precio ${formatMoney(price)}.`, icon: "Tag", duration: 2600 }); }} />
                      <span className="w-10 text-[11px] text-[#7B7266]">/{product.unitLabel === "kg" ? "kg" : product.unitLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {(() => {
                      const level = stockLevelOf(product);
                      const meta = STOCK_LEVEL_META[level];
                      return (
                        <button
                          type="button"
                          onClick={() => onToggleStock(product.id)}
                          className="inline-flex h-7 min-w-[124px] items-center justify-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors hover:brightness-95"
                          style={{ background: meta.soft, color: meta.text, borderColor: `${meta.dot}33` }}
                          aria-label={`Stock de ${product.name}: ${meta.label}. Tocar para cambiar`}
                          title="Tocar para cambiar: Disponible → Pocas unidades → Agotado"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} />
                          {meta.label}
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-[12px] text-[#7B7266]">No encontramos productos con ese filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#1F1B16]/10 px-4 py-3">
          <p className="text-[11px] text-[#7B7266]">Los cambios impactan directo en la Web</p>
          <p className="font-mono text-[11px] text-[#7B7266]">{visible.length} productos</p>
        </div>
      </div>
    </div>
  );
}

function MetricsSection({ orders, customers, products, raffleEnabled }) {
  const approvedOrders = orders.filter((o) => (o.paymentStatus || "approved") === "approved");
  const reviewOrders = orders.filter((o) => o.paymentStatus === "review");
  const totalRevenue = approvedOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const avgTicket = approvedOrders.length > 0 ? totalRevenue / approvedOrders.length : 0;

  const webOrders = approvedOrders.filter((o) => o.channel === "web");
  const waOrders = approvedOrders.filter((o) => o.channel === "whatsapp");
  const webRevenue = webOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const waRevenue = waOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const webPct = totalRevenue > 0 ? Math.round((webRevenue / totalRevenue) * 100) : 0;
  const waPct = totalRevenue > 0 ? Math.max(0, 100 - webPct) : 0;

  const pendingPreparation = orders.filter((o) => (o.paymentStatus || "approved") === "approved" && o.status < 3).length;
  const readyCount = orders.filter((o) => o.status === 3).length;
  const deliveredCount = orders.filter((o) => o.status === 4).length;
  const totalChances = approvedOrders.reduce((sum, o) => sum + calcRaffleChances(orderTotal(o)), 0);

  const productStats = {};
  approvedOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const prev = productStats[item.name] || { revenue: 0, qtyLabel: 0, pricing: item.pricing };
      const qty = item.pricing === "kg" ? Number(item.actualKg || item.requestedKg || item.qty || 0) : Number(item.qty || 0);
      productStats[item.name] = {
        revenue: prev.revenue + lineTotal(item),
        qtyLabel: prev.qtyLabel + qty,
        pricing: item.pricing,
      };
    });
  });
  const topProducts = Object.entries(productStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);
  const maxProductVal = topProducts[0]?.[1]?.revenue || 1;
  const inStockCount = products.filter((p) => p.stock).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-normal leading-none tracking-[-0.01em] text-[#1F1B16]">Métricas</h2>
        <p className="mt-2 text-[12px] text-[#7B7266]">Resumen operativo y ventas en vivo del día</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <p className="text-[12px] text-[#7B7266]">Ingresos acreditados</p>
          <p className="mt-3 font-mono text-[30px] font-medium leading-none tabular-nums text-[#1F1B16]">{formatMoney(totalRevenue)}</p>
          <p className="mt-2 text-[12px] text-[#206A45]">{approvedOrders.length} pedidos acreditados</p>
        </div>
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <p className="text-[12px] text-[#7B7266]">Pedidos totales</p>
          <p className="mt-3 font-mono text-[30px] font-medium leading-none tabular-nums text-[#1F1B16]">{orders.length}</p>
          <p className="mt-2 text-[12px] text-[#5E554A]">{deliveredCount} retirados · {readyCount} listos</p>
        </div>
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <p className="text-[12px] text-[#7B7266]">Ticket promedio</p>
          <p className="mt-3 font-mono text-[30px] font-medium leading-none tabular-nums text-[#6B091E]">{formatMoney(avgTicket)}</p>
          <p className="mt-2 text-[12px] text-[#5E554A]">Por compra acreditada</p>
        </div>
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <p className="text-[12px] text-[#7B7266]">Clientes registrados</p>
          <p className="mt-3 font-mono text-[30px] font-medium leading-none tabular-nums text-[#1F1B16]">{customers.length}</p>
          <p className="mt-2 text-[12px] text-[#5E554A]">{raffleEnabled ? `${totalChances} chances de sorteo` : `${inStockCount}/${products.length} productos en stock`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-[15px] font-medium text-[#1F1B16]">Ventas por canal</h3>
            <span className="font-mono text-[11px] text-[#7B7266]">{approvedOrders.length} operaciones</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between gap-2 text-[13px] mb-1.5">
                <span className="flex items-center gap-2 font-medium text-[#1F1B16]">
                  <span className="h-2 w-2 rounded-full bg-[#6B091E]" /> Web cliente ({webOrders.length})
                </span>
                <span className="font-mono text-[#1F1B16]">{formatMoney(webRevenue)} <span className="text-[#7B7266]">({webPct}%)</span></span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFE9DF] overflow-hidden">
                <div className="h-full rounded-full bg-[#6B091E]" style={{ width: `${webRevenue > 0 ? Math.max(6, webPct) : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2 text-[13px] mb-1.5">
                <span className="flex items-center gap-2 font-medium text-[#1F1B16]">
                  <span className="h-2 w-2 rounded-full bg-[#075E54]" /> WhatsApp NovilaBot ({waOrders.length})
                </span>
                <span className="font-mono text-[#1F1B16]">{formatMoney(waRevenue)} <span className="text-[#7B7266]">({waPct}%)</span></span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFE9DF] overflow-hidden">
                <div className="h-full rounded-full bg-[#075E54]" style={{ width: `${waRevenue > 0 ? Math.max(6, waPct) : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#1F1B16]/10 pt-4 text-[12px]">
            <div>
              <p className="text-[#7B7266]">Ticket Web</p>
              <p className="mt-1 font-mono text-[15px] font-medium text-[#1F1B16]">
                {formatMoney(webOrders.length ? webRevenue / webOrders.length : 0)}
              </p>
            </div>
            <div>
              <p className="text-[#7B7266]">Ticket WhatsApp</p>
              <p className="mt-1 font-mono text-[15px] font-medium text-[#1F1B16]">
                {formatMoney(waOrders.length ? waRevenue / waOrders.length : 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-[15px] font-medium text-[#1F1B16]">Productos más vendidos</h3>
            <span className="font-mono text-[11px] text-[#7B7266]">Top {topProducts.length}</span>
          </div>
          {topProducts.length ? (
            <div className="space-y-3.5">
              {topProducts.map(([name, stat]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-[12px] mb-1 gap-2">
                    <span className="font-medium text-[#1F1B16] truncate">{name}</span>
                    <span className="shrink-0 font-mono text-[#1F1B16]">
                      <span className="text-[#7B7266] mr-2">
                        {stat.pricing === "kg" ? `${stat.qtyLabel.toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg` : `×${stat.qtyLabel}`}
                      </span>
                      {formatMoney(stat.revenue)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#EFE9DF] overflow-hidden">
                    <div className="h-full rounded-full bg-[#6B091E]" style={{ width: `${Math.max(8, Math.round((stat.revenue / maxProductVal) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-[#7B7266]">Aún no hay ventas acreditadas.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5">
          <h3 className="text-[15px] font-medium text-[#1F1B16] mb-4">Estado de la operación</h3>
          <div className="divide-y divide-[#1F1B16]/8 text-[13px]">
            {[
              { label: "Pagos en revisión", count: reviewOrders.length, color: ORDER_STATUS[0].color },
              { label: "Por preparar", count: pendingPreparation, color: ORDER_STATUS[1].color },
              { label: "Listos para retirar", count: readyCount, color: ORDER_STATUS[3].color },
              { label: "Retirados", count: deliveredCount, color: ORDER_STATUS[4].color },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-2 text-[#5E554A]">
                  <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="font-mono font-medium text-[#1F1B16]">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-medium text-[#1F1B16] mb-4">Estado del catálogo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[8px] bg-[#F7F4EE] p-3.5">
                <p className="text-[11px] text-[#7B7266]">Activos en Web</p>
                <p className="mt-1 font-mono text-[22px] font-medium text-[#206A45]">{inStockCount}</p>
              </div>
              <div className="rounded-[8px] bg-[#F7F4EE] p-3.5">
                <p className="text-[11px] text-[#7B7266]">Sin stock</p>
                <p className="mt-1 font-mono text-[22px] font-medium text-[#5E554A]">{products.length - inStockCount}</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-[#7B7266]">
            {products.length} cortes y combos cargados en {CATEGORIES.length} categorías.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Escáner de Cámara QR en Vivo (jsQR + <video> + <canvas>)
// ─────────────────────────────────────────────────────────────────────────────

function LiveQrScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState({ loading: true, error: null, hasMultipleCameras: false });
  const [facingMode, setFacingMode] = useState("environment");
  const requestRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  useEffect(() => {
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setCameraState({ loading: true, error: null, hasMultipleCameras: false });

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("El navegador o entorno no soporta acceso directo a la cámara.");
        }

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((device) => device.kind === "videoinput");
          if (isMounted) {
            setCameraState((prev) => ({ ...prev, hasMultipleCameras: videoInputs.length > 1 }));
          }
        } catch (e) {}

        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setCameraState((prev) => ({ ...prev, loading: false, error: null }));

        function tick() {
          if (!isMounted) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && video.readyState >= 2 && canvas) {
            const now = Date.now();
            if (now - lastScanTimeRef.current > 110) {
              lastScanTimeRef.current = now;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              canvas.width = video.videoWidth || 320;
              canvas.height = video.videoHeight || 240;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
                });
                if (code && code.data && code.data.trim()) {
                  onScan(code.data.trim());
                  return;
                }
              } catch (e) {}
            }
          }
          requestRef.current = requestAnimationFrame(tick);
        }

        requestRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!isMounted) return;
        setCameraState({
          loading: false,
          error: err.name === "NotAllowedError"
            ? "Permiso de cámara denegado en el navegador."
            : err.message || "No se pudo iniciar la cámara del dispositivo.",
          hasMultipleCameras: false,
        });
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [active, facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="relative overflow-hidden rounded-[14px] bg-[#14120E] text-white aspect-[4/3] max-h-[320px] sm:max-h-[340px] flex items-center justify-center border border-[#1F1B16]/20 shadow-inner">
      <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {!cameraState.error && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-3.5">
          <div className="w-full flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#206A45] animate-ping" />
              Cámara activa
            </span>
            {cameraState.hasMultipleCameras && (
              <button
                type="button"
                onClick={toggleCamera}
                className="pointer-events-auto rounded-full bg-black/65 p-1.5 text-white/80 hover:text-white backdrop-blur-sm transition-colors"
                title="Cambiar de cámara"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          {/* Mira de escaneo */}
          <div className="relative h-44 w-44 sm:h-48 sm:w-48 rounded-[16px] border-2 border-dashed border-white/40 flex items-center justify-center">
            <span className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-[#6B091E] rounded-tl-md" />
            <span className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-[#6B091E] rounded-tr-md" />
            <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-[#6B091E] rounded-bl-md" />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-[#6B091E] rounded-br-md" />
            <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#FF3B30] to-transparent shadow-[0_0_8px_#FF3B30] animate-bounce" />
          </div>

          <p className="rounded-full bg-black/65 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            Apuntá con la cámara al código QR del cliente
          </p>
        </div>
      )}

      {cameraState.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-[#1F1B16]/95">
          <Camera size={34} className="text-[#B58E3E] mb-2 opacity-80" />
          <p className="text-[13px] font-medium text-white">Cámara no disponible en este dispositivo</p>
          <p className="text-[11px] text-[#A69C8E] mt-1 max-w-[280px]">
            {cameraState.error}
          </p>
          <p className="text-[11px] text-[#D8B56A] mt-2.5 font-medium">
            Usá la pestaña de Ingreso de PIN para validar el retiro.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingreso / Teclado de PIN de 6 dígitos
// ─────────────────────────────────────────────────────────────────────────────

function PinKeypadInput({ pinValue, onPinChange, onValidate }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDigit = (digit) => {
    if (pinValue.length < 6) {
      const next = pinValue + digit;
      onPinChange(next);
      if (next.length === 6) {
        onValidate(next);
      }
    }
  };

  const handleDelete = () => {
    onPinChange(pinValue.slice(0, -1));
  };

  const handleClear = () => {
    onPinChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Contenedor interactivo: los 6 casilleros reciben el tipeo directo */}
      <div
        className="relative cursor-pointer py-1"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={pinValue}
          onChange={(e) => {
            const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
            onPinChange(clean);
            if (clean.length === 6) onValidate(clean);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pinValue.length === 6) {
              onValidate(pinValue);
            }
          }}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-10"
          aria-label="Ingreso de PIN de 6 dígitos"
        />

        {/* 6 Casilleros visuales de PIN con cursor activo */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const char = pinValue[index] || "";
            const isFocused = pinValue.length === index;
            return (
              <div
                key={index}
                className={`flex h-13 w-10 sm:h-15 sm:w-13 items-center justify-center rounded-[10px] border-2 font-mono text-[22px] sm:text-[26px] font-bold transition-all shadow-sm ${
                  char
                    ? "border-[#6B091E] bg-white text-[#6B091E]"
                    : isFocused
                    ? "border-[#B58E3E] bg-[#FDFBF7] ring-2 ring-[#B58E3E]/20"
                    : "border-[#1F1B16]/15 bg-[#F7F4EE] text-[#7B7266]"
                }`}
              >
                {char ? (
                  char
                ) : isFocused ? (
                  <span className="h-5 w-0.5 animate-pulse bg-[#6B091E]" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-[#1F1B16]/20" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Teclado numérico táctil para pantalla táctil o mouse */}
      <div className="grid grid-cols-3 gap-2 max-w-[270px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(String(digit))}
            className="flex h-11 items-center justify-center rounded-[8px] border border-[#1F1B16]/10 bg-white font-mono text-[18px] font-medium text-[#1F1B16] shadow-sm transition-all hover:bg-[#F7F4EE] active:scale-95"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="flex h-11 items-center justify-center rounded-[8px] border border-[#1F1B16]/10 bg-[#F7F4EE] text-[11px] font-medium uppercase tracking-wider text-[#7B7266] transition-all hover:bg-[#EFE9DF]"
        >
          Borrar
        </button>
        <button
          type="button"
          onClick={() => handleDigit("0")}
          className="flex h-11 items-center justify-center rounded-[8px] border border-[#1F1B16]/10 bg-white font-mono text-[18px] font-medium text-[#1F1B16] shadow-sm transition-all hover:bg-[#F7F4EE] active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-11 items-center justify-center rounded-[8px] border border-[#1F1B16]/10 bg-[#F7F4EE] text-[#7B7266] transition-all hover:bg-[#EFE9DF]"
          aria-label="Retroceso"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {/* Botón de acción Validar */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          disabled={pinValue.length !== 6}
          onClick={() => onValidate(pinValue)}
          className="flex h-10 w-full max-w-[270px] items-center justify-center gap-1.5 rounded-[8px] bg-[#6B091E] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#580617] disabled:opacity-40 shadow-sm"
        >
          <Check size={15} strokeWidth={2.5} /> Validar PIN
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Verificación de Retiro en Mostrador (Escáner QR + PIN de 6 dígitos)
// ─────────────────────────────────────────────────────────────────────────────

function PickupVerificationModal({ open, initialOrder, onClose, orders, onVerifyAndDeliver, onMarkReady, onToast }) {
  const [tab, setTab] = useState("scanner");
  const [pinValue, setPinValue] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [deliveredSuccess, setDeliveredSuccess] = useState(null);

  useEffect(() => {
    if (open) {
      if (initialOrder) {
        const res = resolvePickupOrder(initialOrder.pickupToken || initialOrder.id, orders);
        setVerificationResult(res);
      } else {
        setVerificationResult(null);
        setDeliveredSuccess(null);
        setPinValue("");
      }
    } else {
      setVerificationResult(null);
      setDeliveredSuccess(null);
      setPinValue("");
    }
  }, [open, initialOrder]);

  if (!open) return null;

  const handleResolve = (rawInput) => {
    const res = resolvePickupOrder(rawInput, orders);
    setVerificationResult(res);
  };

  const handleConfirmDelivery = (orderId) => {
    const res = onVerifyAndDeliver(orderId);
    if (res && res.success) {
      setDeliveredSuccess(res.order);
      setVerificationResult(null);
    } else if (res && res.status === "ALREADY_DELIVERED") {
      setVerificationResult({
        status: "ALREADY_DELIVERED",
        order: res.order,
        message: res.message || "Este pedido ya fue retirado anteriormente.",
      });
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setDeliveredSuccess(null);
    setPinValue("");
  };

  const readyOrder = orders.find((o) => o.status === 3);
  const deliveredOrder = orders.find((o) => o.status === 4 || !!o.deliveredAt);
  const prepOrder = orders.find((o) => o.status < 3);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F1B16]/60 p-4 backdrop-blur-[3px] overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[560px] my-6 overflow-hidden rounded-[16px] border border-[#1F1B16]/15 bg-[#FDFBF7] shadow-2xl">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-[#1F1B16]/10 bg-[#FAF8F5] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#6B091E] text-white">
              <QrCode size={18} strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-display text-[19px] font-semibold text-[#1F1B16] leading-tight">
                Verificación de Retiro en Mostrador
              </h2>
              <p className="text-[11px] text-[#7B7266]">
                Ventanilla Express · Sabattini 3480
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] p-1.5 text-[#7B7266] transition-colors hover:bg-[#EFE9DF] hover:text-[#1F1B16]"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido según el estado */}
        <div className="p-5">
          {/* 1. Éxito de entrega confirmada */}
          {deliveredSuccess && (
            <div className="rounded-[14px] border-2 border-[#206A45] bg-[#F4F9F5] p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#206A45] text-white shadow-lg animate-bounce">
                <Check size={36} strokeWidth={2.8} />
              </div>
              <div>
                <h3 className="font-display text-[23px] font-bold text-[#206A45]">
                  ¡Pedido Entregado con Éxito!
                </h3>
                <p className="mt-1 text-[14px] text-[#1F1B16] font-medium">
                  Pedido #{deliveredSuccess.id} · {deliveredSuccess.customerName}
                </p>
                <p className="mt-0.5 text-[12px] text-[#5E554A]">
                  Retirado hoy a las {deliveredSuccess.deliveredAt || deliveredSuccess.withdrawnAt || nowTime()} hs en Mostrador Central.
                </p>
              </div>
              <div className="rounded-[10px] bg-white p-3 text-[12px] text-[#206A45] border border-[#206A45]/20 flex items-center justify-center gap-2">
                <MessageCircle size={15} /> Notificación y solicitud de reseña de Google enviada al WhatsApp del cliente.
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetVerification}
                  className="flex-1 flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] text-[13px] font-medium text-white hover:bg-[#580617]"
                >
                  <Scan size={15} /> Verificar otro retiro
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 rounded-[8px] border border-[#1F1B16]/15 text-[13px] font-medium text-[#1F1B16] hover:bg-[#EFE9DF]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* 2. Control de Idempotencia: Pedido ya retirado */}
          {!deliveredSuccess && verificationResult?.status === "ALREADY_DELIVERED" && (
            <div className="rounded-[14px] border-2 border-[#DC2626] bg-[#FEF2F2] p-5 sm:p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DC2626]/10 text-[#DC2626]">
                <ShieldAlert size={38} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="font-display text-[21px] sm:text-[23px] font-bold text-[#DC2626]">
                  {verificationResult.message}
                </h3>
                <p className="mt-2 text-[12px] sm:text-[13px] text-[#991B1B] max-w-[420px] mx-auto leading-relaxed">
                  Control de Idempotencia y Anti-Fraude: este código QR y PIN de 6 dígitos ya fueron canjeados en mostrador y no pueden volver a utilizarse.
                </p>
              </div>
              <div className="rounded-[10px] bg-white/90 p-3.5 text-left text-[12px] border border-[#DC2626]/20 space-y-1.5">
                <div className="flex justify-between"><span className="text-[#7B7266]">Pedido:</span><strong className="text-[#1F1B16]">#{verificationResult.order?.id}</strong></div>
                <div className="flex justify-between"><span className="text-[#7B7266]">Cliente:</span><strong className="text-[#1F1B16]">{verificationResult.order?.customerName}</strong></div>
                <div className="flex justify-between"><span className="text-[#7B7266]">Teléfono:</span><strong className="text-[#1F1B16]">{verificationResult.order?.phone}</strong></div>
                <div className="flex justify-between"><span className="text-[#7B7266]">Retirado el:</span><strong className="text-[#DC2626]">{verificationResult.order?.deliveredAt || verificationResult.order?.withdrawnAt || "Hoy"} hs</strong></div>
              </div>
              <button
                type="button"
                onClick={resetVerification}
                className="w-full flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#DC2626] text-[13px] font-medium text-white hover:bg-[#B91C1C]"
              >
                <ArrowLeft size={16} /> Volver a escanear otro pedido
              </button>
            </div>
          )}

          {/* 3. Advertencia: Pedido todavía en preparación */}
          {!deliveredSuccess && verificationResult?.status === "IN_PREPARATION" && (
            <div className="rounded-[14px] border-2 border-[#D97706] bg-[#FFFBEB] p-5 sm:p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D97706]/10 text-[#D97706]">
                <Clock size={36} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-display text-[21px] font-bold text-[#B45309]">
                  {verificationResult.message}
                </h3>
                <p className="mt-2 text-[13px] text-[#92400E] max-w-[420px] mx-auto leading-relaxed">
                  El pedido #{verificationResult.order?.id} ({verificationResult.order?.customerName}) todavía está en estado "Por preparar".
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onMarkReady(verificationResult.order);
                    const updated = {
                      ...verificationResult.order,
                      status: 3,
                      readyAt: nowTime(),
                      pickupToken: verificationResult.order?.pickupToken || generatePickupToken(verificationResult.order?.id),
                      pickupPin: verificationResult.order?.pickupPin || generatePickupPin(),
                    };
                    setVerificationResult({ status: "READY", order: updated });
                  }}
                  className="flex-1 flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#6B091E] text-[13px] font-medium text-white hover:bg-[#580617]"
                >
                  <Check size={16} strokeWidth={2} /> Marcar listo ahora y continuar
                </button>
                <button
                  type="button"
                  onClick={resetVerification}
                  className="h-11 px-4 rounded-[8px] border border-[#1F1B16]/15 text-[13px] text-[#5E554A] hover:bg-[#EFE9DF]"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* 4. Error: Código no reconocido */}
          {!deliveredSuccess && verificationResult?.status === "NOT_FOUND" && (
            <div className="rounded-[14px] border border-[#EF4444]/30 bg-[#FEF2F2] p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444]">
                <AlertCircle size={32} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-display text-[20px] font-bold text-[#991B1B]">
                  Código QR o PIN no reconocido
                </h3>
                <p className="mt-1.5 text-[12px] text-[#7F1D1D]">
                  No encontramos ningún pedido activo asociado a este token o PIN de 6 dígitos. Verificá los datos e intentá de nuevo.
                </p>
              </div>
              <button
                type="button"
                onClick={resetVerification}
                className="w-full flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1F1B16] text-[13px] font-medium text-white hover:bg-[#3E3830]"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* 5. Ficha de Confirmación de Entrega (Pedido READY) */}
          {!deliveredSuccess && verificationResult?.status === "READY" && verificationResult.order && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F1B16]/10 pb-3">
                <div>
                  <span className="font-mono text-[12px] font-bold text-[#6B091E]">#{verificationResult.order.id}</span>
                  <h3 className="text-[17px] font-semibold text-[#1F1B16]">{verificationResult.order.customerName}</h3>
                  <p className="text-[12px] text-[#7B7266]">{verificationResult.order.phone} · {verificationResult.order.pickupSlot}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#7B7266] uppercase tracking-wider block">PIN validado</span>
                  <span className="font-mono text-[16px] font-bold text-[#6B091E] tracking-wider">
                    {formatPin(verificationResult.order.pickupPin)}
                  </span>
                </div>
              </div>

              {/* Badge GIGANTE del Estado del Pago (Requerimiento 4) */}
              {(verificationResult.order.paymentStatus || "approved") === "approved" ? (
                <div className="rounded-[12px] border-2 border-[#206A45] bg-[#206A45]/15 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[20px] font-bold tracking-wide text-[#206A45]">
                    <CheckCircle2 size={26} strokeWidth={2.4} />
                    PAGADO · ACREDITADO
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-[#206A45]">
                    {verificationResult.order.payment || "Acreditado"} · No cobrar nada al cliente en mostrador
                  </p>
                </div>
              ) : (
                <div className="rounded-[12px] border-2 border-[#B45309] bg-[#B45309]/15 p-4 text-center animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-[19px] font-bold tracking-wide text-[#B45309]">
                    <AlertTriangle size={24} strokeWidth={2.4} />
                    PENDIENTE DE PAGO · COBRAR EN MOSTRADOR
                  </div>
                  <p className="mt-1 font-mono text-[17px] font-bold text-[#1F1B16]">
                    Monto a cobrar: {formatMoney(orderTotal(verificationResult.order))}
                  </p>
                </div>
              )}

              {/* Lista detallada de productos y cantidades a entregar */}
              <div className="rounded-[12px] border border-[#1F1B16]/10 bg-white p-3.5">
                <div className="flex items-center justify-between border-b border-[#1F1B16]/[0.08] pb-2 mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B7266]">
                    Productos para entrega en mano ({verificationResult.order.items.length})
                  </p>
                  <span className="text-[11px] text-[#206A45] font-medium">✓ Paquete verificado</span>
                </div>
                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 thin-scrollbar">
                  {verificationResult.order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-[13px] py-1 border-b border-[#1F1B16]/[0.04] last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#206A45]/15 text-[#206A45]">
                          <Check size={12} strokeWidth={2.5} />
                        </span>
                        <span className="font-medium text-[#1F1B16] truncate">
                          {item.pricing === "kg" ? `${item.actualKg || item.qty} kg` : `${item.qty} ×`} {item.name}
                        </span>
                      </div>
                      <span className="font-mono text-[12px] text-[#5E554A] shrink-0 ml-2">
                        {formatMoney(lineTotal(item))}
                      </span>
                    </div>
                  ))}
                </div>
                {verificationResult.order.note && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-[8px] border border-[#8A5A22]/25 bg-[#F7EFD9]/55 px-3 py-2 text-[12px] text-[#1F1B16]">
                    <MessageSquareText size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#8A5A22]" />
                    <span className="break-words"><strong className="font-medium text-[#8A5A22]">Nota del cliente:</strong> {verificationResult.order.note}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-[#1F1B16]/10 pt-2.5 mt-2">
                  <span className="text-[12px] font-semibold text-[#5E554A]">Total del Pedido</span>
                  <span className="font-mono text-[18px] font-bold text-[#1F1B16]">
                    {formatMoney(orderTotal(verificationResult.order))}
                  </span>
                </div>
              </div>

              {/* Botón principal de Confirmar y Entregar Pedido */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirmDelivery(verificationResult.order.id)}
                  className="flex-1 flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#206A45] font-semibold text-[14px] text-white shadow-md transition-all hover:bg-[#185336] active:scale-98"
                >
                  <CheckCircle2 size={19} strokeWidth={2.4} /> Confirmar y Entregar Pedido
                </button>
                <button
                  type="button"
                  onClick={resetVerification}
                  className="h-12 px-4 rounded-[10px] border border-[#1F1B16]/15 text-[13px] font-medium text-[#5E554A] hover:bg-[#EFE9DF]"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* 6. Vista Inicial: Pestañas de Escáner y Teclado PIN */}
          {!deliveredSuccess && !verificationResult && (
            <div className="space-y-4">
              {/* Pestañas integradas */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-[10px] bg-[#F7F4EE] border border-[#1F1B16]/10">
                <button
                  type="button"
                  onClick={() => setTab("scanner")}
                  className={`flex h-10 items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium transition-all ${
                    tab === "scanner"
                      ? "bg-white text-[#6B091E] shadow-sm font-semibold"
                      : "text-[#7B7266] hover:text-[#1F1B16]"
                  }`}
                >
                  <Camera size={15} strokeWidth={2} />
                  <span>Escáner de Cámara (QR)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("pin")}
                  className={`flex h-10 items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium transition-all ${
                    tab === "pin"
                      ? "bg-white text-[#6B091E] shadow-sm font-semibold"
                      : "text-[#7B7266] hover:text-[#1F1B16]"
                  }`}
                >
                  <KeyRound size={15} strokeWidth={2} />
                  <span>Ingreso de PIN</span>
                </button>
              </div>

              {/* Pestaña 1: Escáner de Cámara en vivo */}
              {tab === "scanner" && (
                <div className="space-y-4">
                  <LiveQrScanner onScan={handleResolve} active={open && tab === "scanner"} />

                  {/* Acceso rápido a PIN de respaldo si la cámara no lee bien */}
                  <div className="flex items-center justify-between rounded-[8px] bg-[#F7F4EE] px-3.5 py-2 text-[12px] text-[#5E554A]">
                    <span>¿Falla la cámara o pantalla rota del cliente?</span>
                    <button
                      type="button"
                      onClick={() => setTab("pin")}
                      className="font-medium text-[#6B091E] hover:underline"
                    >
                      Ingresar PIN →
                    </button>
                  </div>
                </div>
              )}

              {/* Pestaña 2: Teclado numérico / PIN manual */}
              {tab === "pin" && (
                <div className="space-y-3 pt-1">
                  <PinKeypadInput
                    pinValue={pinValue}
                    onPinChange={setPinValue}
                    onValidate={handleResolve}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CarcassStockCard({ products, orders, onApplyLevels }) {
  const [carcassKg, setCarcassKg] = useState("110");
  const [count, setCount] = useState("2");
  const [counterKg, setCounterKg] = useState({});
  const [safety, setSafety] = useState(70);

  const totalKg = (Number(String(carcassKg).replace(",", ".")) || 0) * (Number(count) || 0);
  const rows = HALF_CARCASS_YIELD.map((entry) => {
    const product = products.find((p) => p.id === entry.productId);
    const theoretical = (totalKg * entry.pct) / 100;
    const online = orders.reduce((sum, order) => sum + (order.items || []).reduce((acc, item) => (
      item.productId === entry.productId && item.pricing === "kg" ? acc + Number(item.actualKg ?? item.requestedKg ?? item.qty ?? 0) : acc
    ), 0), 0);
    const counter = Number(String(counterKg[entry.productId] || "0").replace(",", ".")) || 0;
    const remaining = Math.max(0, theoretical - online - counter);
    const onlineCap = theoretical * (safety / 100) - online - counter;
    const level = remaining <= 0.3 || onlineCap <= 0 ? "out" : remaining < theoretical * 0.35 ? "low" : "ok";
    return { ...entry, product, theoretical, online, counter, remaining, level };
  });

  const apply = () => onApplyLevels(Object.fromEntries(rows.filter((row) => row.product).map((row) => [row.productId, row.level])));

  return (
    <section className="mb-6 overflow-hidden rounded-[12px] border border-[#1F1B16]/10 bg-[#FDFBF7]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1F1B16]/10 px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] text-[#7B7266]"><Beef size={14} strokeWidth={1.5} /> Stock por despostada</p>
          <h3 className="mt-1 font-display text-[22px] font-normal leading-none text-[#1F1B16]">Ingreso de medias reses → stock estimado por corte</h3>
          <p className="mt-1.5 max-w-[680px] text-[12px] leading-5 text-[#7B7266]">
            No hace falta contar kilos a mano: con el peso de la media res y la tabla de rendimiento se estima cuánto sale de cada corte.
            Se descuentan los pedidos online y las ventas de mostrador (en producción, vía balanza con etiqueta).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] text-[#5E554A]">
            Medias reses
            <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="input-ring mt-1 block h-9 w-[70px] rounded-[7px] border border-[#1F1B16]/15 bg-white px-2 text-right font-mono text-[13px]" />
          </label>
          <label className="text-[11px] text-[#5E554A]">
            Kg por media res
            <input value={carcassKg} onChange={(e) => setCarcassKg(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" className="input-ring mt-1 block h-9 w-[90px] rounded-[7px] border border-[#1F1B16]/15 bg-white px-2 text-right font-mono text-[13px]" />
          </label>
          <label className="text-[11px] text-[#5E554A]">
            Ofrecer online
            <select value={safety} onChange={(e) => setSafety(Number(e.target.value))} className="input-ring mt-1 block h-9 rounded-[7px] border border-[#1F1B16]/15 bg-white px-2 text-[13px]">
              {[50, 60, 70, 80, 100].map((v) => <option key={v} value={v}>{v}% del stock</option>)}
            </select>
          </label>
          <button type="button" onClick={apply} className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#6B091E] px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-[#580617]">
            <RefreshCw size={14} strokeWidth={1.8} /> Aplicar al semáforo de la Web
          </button>
        </div>
      </div>
      <div className="thin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
          <thead className="bg-[#F7F4EE] text-[11px] text-[#7B7266]">
            <tr>
              <th className="px-4 py-2 font-normal">Corte</th>
              <th className="px-4 py-2 text-right font-normal">Rinde</th>
              <th className="px-4 py-2 text-right font-normal">Estimado</th>
              <th className="px-4 py-2 text-right font-normal">Pedidos online</th>
              <th className="px-4 py-2 text-right font-normal">Mostrador (kg)</th>
              <th className="px-4 py-2 text-right font-normal">Queda</th>
              <th className="px-4 py-2 text-center font-normal">Semáforo sugerido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1B16]/8">
            {rows.map((row) => {
              const meta = STOCK_LEVEL_META[row.level];
              return (
                <tr key={row.productId}>
                  <td className="px-4 py-2 text-[#1F1B16]">{row.label}</td>
                  <td className="px-4 py-2 text-right font-mono text-[#7B7266]">{row.pct.toLocaleString("es-AR")}%</td>
                  <td className="px-4 py-2 text-right font-mono text-[#1F1B16]">{formatKg(row.theoretical)}</td>
                  <td className="px-4 py-2 text-right font-mono text-[#5E554A]">{formatKg(row.online)}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      value={counterKg[row.productId] || ""}
                      onChange={(e) => setCounterKg((prev) => ({ ...prev, [row.productId]: e.target.value.replace(/[^\d.,]/g, "") }))}
                      placeholder="0"
                      inputMode="decimal"
                      className="input-ring h-7 w-[64px] rounded-[6px] border border-[#1F1B16]/15 bg-white px-1.5 text-right font-mono text-[12px]"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-[#1F1B16]">{formatKg(row.remaining)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: meta.soft, color: meta.text }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} /> {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#1F1B16]/10 px-5 py-2.5 text-[11px] text-[#7B7266]">
        Total ingresado: <span className="font-mono text-[#1F1B16]">{formatKg(totalKg)}</span> · Tabla de rendimiento estándar, editable por el frigorífico y ajustable con el rinde real de cada despostada.
      </p>
    </section>
  );
}

function PanelView({
  mode = "operator",
  orders, customers, products, raffleEnabled, onToggleRaffle,
  onMarkReady, onWithdraw, onVerifyAndDeliver, onConfirmPayment, onRequestSlot,
  onUpdatePrice, onAddProduct, onToggleStock, onReminder, onSendInvoiceWhatsApp, onToast,
  onSetWeight, onApplyStockLevels,
}) {
  const isAdmin = mode === "admin";
  const [tab, setTab] = useState("board");
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [ticketOrder, setTicketOrder] = useState(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyPreselectOrder, setVerifyPreselectOrder] = useState(null);

  const activeOrders = orders.filter((order) => order.status < 4);
  const reviewOrders = orders.filter((order) => order.paymentStatus === "review");

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status !== b.status) return a.status - b.status;
    return b.number - a.number;
  });
  const filtered = sortedOrders.filter((order) => {
    const inChannel = filter === "all" || order.channel === filter;
    const inStatus = statusFilter === "all"
      ? true
      : statusFilter === "pending"
        ? order.status < 3
        : statusFilter === "ready"
          ? order.status === 3
          : statusFilter === "withdrawn"
            ? order.status === 4
            : true;
    const inQuery = normalizeText(`${order.id} ${order.customerName} ${order.phone}`).includes(normalizeText(query));
    return inChannel && inStatus && inQuery;
  });

  const tabs = [
    { id: "board", label: "Pedidos", icon: "ClipboardList", count: activeOrders.length },
    { id: "clients", label: "Clientes", icon: "Users", count: customers.length },
    { id: "catalog", label: "Catálogo", icon: "PackageSearch", count: products.length },
    ...(isAdmin ? [{ id: "metrics", label: "Métricas", icon: "BarChart3" }] : []),
  ];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#F7F4EE] pb-16">
      <div className="border-b border-[#1F1B16]/10 bg-[#FDFBF7]">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-end justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-[12px] text-[#7B7266]">{isAdmin ? "Administración" : "Operación"}</p>
            <h1 className="mt-1 font-display text-[32px] font-normal leading-none tracking-[-0.02em] text-[#1F1B16]">
              {isAdmin ? "Panel Admin" : "Panel"}
            </h1>
          </div>
          {!isAdmin && (
            <button
              type="button"
              onClick={() => {
                setVerifyPreselectOrder(null);
                setVerifyOpen(true);
              }}
              className="flex h-10 items-center gap-2 rounded-[8px] bg-[#6B091E] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#580617] active:scale-95"
            >
              <QrCode size={16} strokeWidth={2} />
              <span>Verificar Retiro (QR / PIN)</span>
            </button>
          )}
        </div>
        <div className="mx-auto flex max-w-[1560px] gap-6 px-6">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex h-11 items-center gap-2 border-b-2 text-[13px] transition-colors ${tab === entry.id ? "border-[#6B091E] text-[#1F1B16] font-medium" : "border-transparent text-[#7B7266] hover:text-[#1F1B16]"}`}
            >
              <Icon name={entry.icon} size={15} strokeWidth={1.5} /> {entry.label}
              {entry.count !== undefined && <span className="font-mono text-[11px] text-[#7B7266]">{entry.count}</span>}
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
                    { id: "pending", label: "Por preparar", count: orders.filter((o) => o.status < 3).length },
                    { id: "ready", label: "Listos", count: orders.filter((o) => o.status === 3).length },
                    { id: "withdrawn", label: "Retirados", count: orders.filter((o) => o.status === 4).length },
                  ].map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setStatusFilter(entry.id)}
                      className={`flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[12px] font-medium transition-colors ${statusFilter === entry.id ? "bg-[#1F1B16] text-white" : "text-[#5E554A] hover:text-[#1F1B16]"}`}
                    >
                      {entry.label} <span className="font-mono text-[11px] opacity-75">{entry.count}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] p-1">
                  {[
                    { id: "all", label: "Canal", count: orders.length },
                    { id: "web", label: "Web", count: orders.filter((order) => order.channel === "web").length },
                    { id: "whatsapp", label: "WhatsApp", count: orders.filter((order) => order.channel === "whatsapp").length },
                  ].map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setFilter(entry.id)}
                      className={`flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12px] transition-colors ${filter === entry.id ? "bg-[#6B091E] text-white" : "text-[#5E554A] hover:text-[#1F1B16]"}`}
                    >
                      {entry.label} <span className="font-mono text-[11px] opacity-70">{entry.count}</span>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B7266]" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido..." className="h-9 w-[180px] rounded-[8px] border border-[#1F1B16]/10 bg-[#FDFBF7] pl-9 pr-3 text-[12px] text-[#1F1B16] placeholder:text-[#7B7266] focus:border-[#6B091E]/35 focus:outline-none" />
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
                    allowScan={!isAdmin}
                    onMarkReady={onMarkReady}
                    onWithdraw={onWithdraw}
                    onConfirmPayment={onConfirmPayment}
                    onRequestSlot={onRequestSlot}
                    onOpenInvoice={setInvoiceOrder}
                    onOpenTicket={setTicketOrder}
                    onVerifyPickup={(ord) => {
                      setVerifyPreselectOrder(ord);
                      setVerifyOpen(true);
                    }}
                    onSetWeight={onSetWeight}
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

        {tab === "clients" && (
          <CustomerTable
            customers={customers}
            orders={orders}
            raffleEnabled={raffleEnabled}
            onToggleRaffle={onToggleRaffle}
            onReminder={onReminder}
            onOpenInvoice={setInvoiceOrder}
          />
        )}
        {tab === "catalog" && (
          <>
          {onApplyStockLevels && <CarcassStockCard products={products} orders={orders} onApplyLevels={onApplyStockLevels} />}
          <CatalogTable
            products={products}
            onUpdatePrice={onUpdatePrice}
            onToggleStock={onToggleStock}
            onAddProduct={onAddProduct}
            allowCreate={isAdmin}
            onToast={onToast}
          />
          </>
        )}
        {tab === "metrics" && isAdmin && (
          <MetricsSection
            orders={orders}
            customers={customers}
            products={products}
            raffleEnabled={raffleEnabled}
          />
        )}
      </div>

      <InvoiceModal
        order={invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        onToast={onToast}
        onSendWhatsApp={onSendInvoiceWhatsApp}
      />
      <TicketModal
        order={ticketOrder}
        onClose={() => setTicketOrder(null)}
        onToast={onToast}
      />
      {!isAdmin && (
        <PickupVerificationModal
          open={verifyOpen}
          initialOrder={verifyPreselectOrder}
          onClose={() => {
            setVerifyOpen(false);
            setVerifyPreselectOrder(null);
          }}
          orders={orders}
          onVerifyAndDeliver={onVerifyAndDeliver}
          onMarkReady={onMarkReady}
          onToast={onToast}
        />
      )}
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
  const [webInvoiceOrder, setWebInvoiceOrder] = useState(null);
  const [unread, setUnread] = useState(0);
  const [waTyping, setWaTyping] = useState(false);
  const [waFlow, setWaFlow] = useState({ mode: "idle", orderId: "NV-104" });
  const [campaignState, setCampaignState] = useState(() => Object.fromEntries(CAMPAIGNS.map((campaign) => [campaign.id, { sentAt: null }])));
  const [toasts, setToasts] = useState([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [raffleEnabled, setRaffleEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("novila_raffle_enabled");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleRaffle = (nextVal) => {
    const value = typeof nextVal === "boolean" ? nextVal : !raffleEnabled;
    setRaffleEnabled(value);
    try {
      localStorage.setItem("novila_raffle_enabled", JSON.stringify(value));
    } catch {}
    addToast({
      type: "success",
      title: value ? "Sorteo Activado" : "Sorteo Desactivado",
      message: value ? "La columna de Chances Sorteo ahora está visible en clientes." : "Se ocultó la columna de Chances Sorteo.",
      icon: "Sparkles",
      duration: 3500,
    });
  };

  const handleSendInvoiceWhatsApp = (order) => {
    const invData = buildInvoiceData(order);
    addWaMessage({
      side: "in",
      kind: "invoice",
      orderCode: order.id,
      text: `🧾 *Factura Electrónica C · Frigorífico Novila*\nComprobante: ${invData.invoiceNumber}\nCliente: ${order.customerName}\nTotal: ${formatMoney(invData.total)}\nCAE: ${invData.cae} (Vto: ${invData.caeVto})\n\nTu comprobante fiscal ARCA ya se encuentra registrado y disponible.`,
      invoiceData: invData,
      time: nowTime(),
    });
    bumpUnreadIfNeeded();
    addToast({
      type: "success",
      title: `Factura enviada a ${order.customerName}`,
      message: `${invData.invoiceNumber} remitida por WhatsApp.`,
      icon: "FileText",
      duration: 4500,
    });
  };

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
    customer, customerName, phone, channel, pickupSlot, payment, items, note = "", substitution = "avisar",
    status = 1, paymentStatus = "approved", paymentConfirmedAt = null, paymentReference = null,
  }) => {
    const code = nextOrderCode(ordersRef.current);
    const pickupToken = paymentStatus === "approved" ? generatePickupToken(code) : null;
    const pickupPin = paymentStatus === "approved" ? generatePickupPin() : null;
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
      note: String(note || "").trim(),
      substitution,
      paidAmount: orderRequestedTotal({ items }),
      weighedAt: null,
      status,
      createdAt: nowTime(),
      readyAt: null,
      withdrawnAt: null,
      deliveredAt: null,
      pickupToken,
      pickupPin,
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

  const handleUpdateCartQty = (productId, nextQty) => {
    const qty = Math.round(Number(nextQty) * 100) / 100;
    if (qty <= 0) {
      setCart((prev) => prev.filter((line) => line.productId !== productId));
    } else {
      setCart((prev) => prev.map((line) => line.productId === productId ? { ...line, qty } : line));
    }
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
      note: (form.note || "").trim(),
      substitution: form.substitution || "avisar",
      items,
      paymentStatus: "approved",
      paymentConfirmedAt: nowTime(),
      paymentReference: `WEB-${String(Date.now()).slice(-5)}`,
    });
    const total = orderTotal(order);
    const chances = calcRaffleChances(total);
    const chancesLine = chances > 0 ? `\n🎟️ Sumaste ${chances} ${chances === 1 ? "chance digital" : "chances digitales"} para el Sorteo Novila.` : "";
    const noteLine = order.note ? `\nNota: ${order.note}` : "";

    addWaMessage({
      side: "in",
      kind: "order_confirmed",
      text: `Listo, ${firstName(order.customerName)}. Recibimos tu pedido #${order.id}.\n\nRetiro: ${order.pickupSlot}\nTotal: ${formatMoney(total)}\nPago: ${order.payment}${noteLine}${chancesLine}`,
      time: nowTime(),
    });
    bumpUnreadIfNeeded();
    setCart([]);
    setCartOpen(false);
    setLastWebOrder(order);
    addToast({
      type: "success",
      title: `Pedido #${order.id} confirmado`,
      message: `Ya impactó en el Panel y enviamos confirmación por WhatsApp.`,
      icon: "CheckCircle2",
      duration: 5400,
    });
  };

  const handleAdvanceStatus = (orderId, status) => {
    const next = ordersRef.current.map((order) => {
      if (order.id !== orderId) return order;
      const isReady = status === 3;
      const isDelivered = status === 4;
      const now = nowTime();
      const pickupToken = isReady ? (order.pickupToken || generatePickupToken(order.id)) : order.pickupToken;
      const pickupPin = isReady ? (order.pickupPin || generatePickupPin()) : order.pickupPin;
      return {
        ...order,
        status,
        pickupToken: order.pickupToken || pickupToken || null,
        pickupPin: order.pickupPin || pickupPin || null,
        readyAt: status === 3 ? (order.readyAt || now) : order.readyAt,
        withdrawnAt: isDelivered ? (order.withdrawnAt || now) : order.withdrawnAt,
        deliveredAt: isDelivered ? (order.deliveredAt || now) : order.deliveredAt,
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
    const readyAt = nowTime();
    const pickupToken = order.pickupToken || generatePickupToken(order.id);
    const pickupPin = order.pickupPin || generatePickupPin();
    const next = ordersRef.current.map((entry) => entry.id === order.id ? {
      ...entry,
      status: 3,
      readyAt,
      pickupToken,
      pickupPin,
    } : entry);
    setOrdersState(next);
    const clientFirst = firstName(order.customerName);
    const weighedLines = order.items.filter((item) => item.pricing === "kg");
    const weightBlock = weighedLines.length
      ? `\n\n⚖️ *Peso real de balanza*\n${weighedLines.map((item) => `• ${item.name}: ${formatKg(item.actualKg ?? item.requestedKg ?? item.qty)} (pediste ${formatKg(item.requestedKg ?? item.qty)})`).join("\n")}\nTotal real: ${formatMoney(orderTotal(order))}. ${weightAdjustmentText(order)}`
      : "";
    addWaMessage({
      side: "in",
      kind: "ready",
      orderCode: order.id,
      pickupToken,
      pickupPin,
      time: readyAt,
      text: `Hola ${clientFirst}. Tu pedido #${order.id} ya está listo y preparado en Frigorífico Novila.${weightBlock}\n\nPasá directo a retirarlo por ${BRAND.address} mostrando tu Pase de Retiro digital con QR o dictando tu PIN de 6 dígitos en mostrador.`,
    });
    bumpUnreadIfNeeded();
    playChime();
    addToast({
      type: "success",
      title: `Pedido #${order.id} listo · ${order.customerName}`,
      message: `Pase QR y PIN (${formatPin(pickupPin)}) enviados por WhatsApp a ${clientFirst}.`,
      icon: "QrCode",
      duration: 6500,
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

  const handleVerifyAndDeliver = (orderId) => {
    const order = ordersRef.current.find((o) => o.id === orderId);
    if (!order) return { success: false, status: "NOT_FOUND", message: "Pedido no encontrado" };
    if (order.status === 4 || order.deliveredAt || order.withdrawnAt) {
      return {
        success: false,
        status: "ALREADY_DELIVERED",
        order,
        message: `⚠️ Este pedido ya fue retirado el ${order.deliveredAt || order.withdrawnAt || "anteriormente"} hs`,
      };
    }
    if (order.status < 3) {
      return { success: false, status: "IN_PREPARATION", order, message: "⏳ Este pedido todavía está en preparación" };
    }
    const deliveredAt = nowTime();
    const next = ordersRef.current.map((o) => o.id === orderId ? {
      ...o,
      status: 4,
      deliveredAt,
      withdrawnAt: deliveredAt,
    } : o);
    setOrdersState(next);
    playChime();
    const clientFirst = firstName(order.customerName);
    addWaMessage({
      side: "in",
      kind: "review",
      time: deliveredAt,
      orderCode: order.id,
      text: `¡Muchas gracias por comprar en Frigorífico Novila, ${clientFirst}! Tu pedido #${order.id} fue retirado con éxito en mostrador.\n\n¿Nos dejarías tu reseña en Google? Nos ayuda un montón a seguir mejorando:\nhttps://share.google/pKBwJpIdpgRDsuLcH`,
      reviewLink: "https://share.google/pKBwJpIdpgRDsuLcH",
    });
    bumpUnreadIfNeeded();
    addToast({
      type: "success",
      title: `¡Entrega confirmada! Pedido #${order.id}`,
      message: `Cliente ${order.customerName}. Se registró la entrega en mostrador y se notificó por WhatsApp.`,
      icon: "CheckCircle2",
      duration: 6500,
    });
    return { success: true, status: "DELIVERED", order: { ...order, status: 4, deliveredAt, withdrawnAt: deliveredAt } };
  };

  const handleWithdraw = (order) => {
    handleAdvanceStatus(order.id, 4);
    const clientFirst = firstName(order.customerName);
    addWaMessage({
      side: "in",
      kind: "review",
      time: nowTime(),
      orderCode: order.id,
      text: `¡Muchas gracias por comprar en Frigorífico Novila, ${clientFirst}! Tu pedido #${order.id} fue retirado con éxito en mostrador.\n\n¿Nos dejarías tu reseña en Google? Nos ayuda un montón a seguir mejorando:\nhttps://share.google/pKBwJpIdpgRDsuLcH`,
      reviewLink: "https://share.google/pKBwJpIdpgRDsuLcH",
    });
    bumpUnreadIfNeeded();
    playChime();
    addToast({
      type: "success",
      title: `Pedido #${order.id} retirado · ¡Gracias por comprar!`,
      message: `Enviamos a ${clientFirst} el agradecimiento y solicitud de reseña en Google Maps por WhatsApp.`,
      icon: "Star",
      duration: 6500,
    });
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

  const handleAddProduct = ({ name, categoryId, price, kind, unitLabel, note, stock = true }) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
    const imageMap = { super: "grill", vacuno: "beefcuts", envasado: "rawbeef", cerdo: "pork", pollo: "chicken", elaborados: "sausage", mayorista: "ribs" };
    const created = {
      id: `custom-${Date.now()}`,
      name,
      cut: name,
      category: cat.label,
      categoryId: cat.id,
      price,
      normalPrice: null,
      savings: 0,
      discount: 0,
      unit: unitLabel,
      unitLabel,
      packKg: kind === "promo" ? 4 : null,
      kind,
      stock: stock !== false,
      image: imageMap[cat.id] || "beefcuts",
      note: note || "",
      featured: cat.id === "super",
    };
    setProducts((prev) => [created, ...prev]);
    addToast({
      type: "success",
      title: `${name} publicado`,
      message: `Ya figura en el Catálogo y en la Web a ${formatMoney(price)}.`,
      icon: "Sparkles",
      duration: 3800,
    });
  };

  const handleToggleStock = (productId) => {
    // Ciclo de un toque: Disponible → Pocas unidades → Agotado → Disponible
    setProducts((prev) => prev.map((product) => {
      if (product.id !== productId) return product;
      const level = stockLevelOf(product);
      const nextLevel = level === "ok" ? "low" : level === "low" ? "out" : "ok";
      const meta = STOCK_LEVEL_META[nextLevel];
      addToast({ type: nextLevel === "ok" ? "success" : "gold", title: `${product.name}: ${meta.label}`, message: "La Web, el bot de WhatsApp y el Catálogo ya reflejan el cambio.", icon: nextLevel === "ok" ? "CheckCircle2" : "AlertCircle", duration: 3000 });
      return { ...product, stock: nextLevel !== "out", lowStock: nextLevel === "low" };
    }));
  };

  const handleApplyStockLevels = (levels) => {
    let changed = 0;
    setProducts((prev) => prev.map((product) => {
      const nextLevel = levels[product.id];
      if (!nextLevel || nextLevel === stockLevelOf(product)) return product;
      changed += 1;
      return { ...product, stock: nextLevel !== "out", lowStock: nextLevel === "low" };
    }));
    addToast({ type: "success", title: "Semáforo actualizado desde la despostada", message: "La Web ya muestra la disponibilidad estimada por corte.", icon: "RefreshCw", duration: 3800 });
  };

  const handleSetWeight = (orderId, itemIndex, kg) => {
    const weighedAt = nowTime();
    const next = ordersRef.current.map((order) => {
      if (order.id !== orderId) return order;
      const items = order.items.map((item, index) => (index === itemIndex ? { ...item, actualKg: kg, weighed: true } : item));
      const allWeighed = items.every((item) => item.pricing !== "kg" || item.weighed);
      return { ...order, items, weighedAt: allWeighed ? weighedAt : order.weighedAt || null };
    });
    setOrdersState(next);
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
    addToast({ type: "gold", title: `Recordatorio enviado a ${customer.name}`, message: "Mensaje de muestra disponible en la Pestaña WhatsApp.", icon: "MessageCircle" });
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
    addToast({ type: "success", title: `${campaign.title}: envío simulado`, message: `${audience} clientes en la audiencia. El mensaje ya entró al chat de WhatsApp.`, icon: "Megaphone", duration: 6500 });
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

  const PAY_OPTION_TRANSFER = "Transferencia bancaria";
  const PAY_OPTION_LINK = "Link de pago";

  const paymentMethodPrompt = (items, customerName) => ({
    side: "in",
    text: `${customerName ? `${firstName(customerName)}, ¿` : "¿"}cómo preferís pagar los ${formatMoney(itemsEstimatedTotal(items))}?\n\n🏦 Transferencia bancaria: te paso el alias y me enviás el comprobante.\n💳 Link de pago: pagás al instante con Mercado Pago, débito, crédito o MODO y se confirma solo.`,
    quickReplies: [PAY_OPTION_TRANSFER, PAY_OPTION_LINK],
  });

  const paymentLinkPrompt = (items, customerName) => {
    const total = itemsEstimatedTotal(items);
    return {
      side: "in",
      kind: "payment_link",
      text: `Listo, te generé el link de pago seguro por ${formatMoney(total)}.\n\nTocá el botón, pagá con el medio que quieras y el pedido se confirma automáticamente.`,
      payLink: { amount: total, customerName, provider: "Mercado Pago" },
      quickReplies: ["Prefiero transferencia", "Cancelar pedido"],
    };
  };

  const isTransferChoice = (norm) => /(transfer|alias|cbu)/.test(norm);
  const isLinkChoice = (norm) => /(link|boton|botón|mercado|tarjeta|credito|crédito|debito|débito|modo)/.test(norm);

  const handleWaLinkPaid = () => {
    const flow = waFlow;
    if (flow.mode !== "awaiting_link_payment") return;
    const customer = customersRef.current.find((entry) => entry.id === flow.customerId)
      || customersRef.current.find((entry) => normalizePhone(entry.phone) === normalizePhone(WHATSAPP_DEMO_PHONE));
    if (!customer) return;
    const total = itemsEstimatedTotal(flow.items);
    const order = createOrderRecord({
      customer,
      customerName: customer.name,
      phone: customer.phone,
      channel: "whatsapp",
      pickupSlot: null,
      payment: "Link de pago · Mercado Pago",
      items: flow.items,
      status: 1,
      paymentStatus: "approved",
      paymentConfirmedAt: nowTime(),
      paymentReference: `LNK-${String(Date.now()).slice(-5)}`,
    });
    addWaMessage({ side: "in", kind: "system", text: `Pago aprobado por ${formatMoney(total)} · Ref. ${order.paymentReference}` });
    requestPickupSlot(order, { paymentConfirmed: true, toast: false });
    addToast({
      type: "success",
      title: `Pedido #${order.id} pagado con link`,
      message: `${customer.name} abonó ${formatMoney(total)}. Ya aparece en el Panel.`,
      icon: "CheckCircle2",
      duration: 6000,
    });
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
        flow: { mode: "awaiting_payment_method", items, customerName: registered.name, customerId: registered.id, total },
        messages: [
          {
            side: "in",
            text: `${intro}Perfecto, ${firstName(registered.name)}. Te tomo este pedido:\n\n${summary}\n\nTotal: ${formatMoney(total)}.`,
          },
          paymentMethodPrompt(items, registered.name),
        ],
      };
    }
    return {
      flow: { mode: "awaiting_name", items, customerName: "", customerId: null, total },
      messages: [{
        side: "in",
        text: `${intro}Perfecto, te tomo este pedido:\n\n${summary}\n\nTotal: ${formatMoney(total)}.\n\nAntes de confirmar necesito tu Nombre y Apellido (obligatorio para la orden de retiro). Tu WhatsApp ${WHATSAPP_DEMO_PHONE} ya lo tengo detectado. ✍️`,
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
    const chances = calcRaffleChances(total);
    const chancesLine = chances > 0 ? `\n🎟️ Sumaste ${chances} ${chances === 1 ? "chance digital" : "chances digitales"} automáticas para el Sorteo Novila.` : "";
    return {
      order: { ...order, pickupSlot },
      messages: [{
        side: "in",
        kind: "order_confirmed",
        text: `Listo, ${firstName(order.customerName)}. Tu pedido #${order.id} quedó reservado para retirar ${pickupSlot}.\n\n${BRAND.address}\nTotal: ${formatMoney(total)}.${chancesLine}`,
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
        mode: "awaiting_payment_method",
        items: flowSnapshot.items,
        customerName: name,
        customerId: customer.id,
        total,
      });
      addWaMessage({
        side: "in",
        text: `Gracias, ${name}. Ya registré tu nombre y tu WhatsApp ${WHATSAPP_DEMO_PHONE}.`,
      });
      addWaMessage(paymentMethodPrompt(flowSnapshot.items, name));
      return;
    }

    if (flowSnapshot.mode === "awaiting_payment_method" || flowSnapshot.mode === "awaiting_link_payment") {
      if (norm.includes("cancelar")) {
        setWaFlow({ mode: "idle" });
        addWaMessage({ side: "in", text: "Listo, cancelé el pedido. Cuando quieras retomamos. ¿Te ayudo con algo más?", quickReplies: ["Ver promos", "Asado para 6", "Armar pedido"] });
        return;
      }
      if (isTransferChoice(norm)) {
        setWaFlow({ ...flowSnapshot, mode: "awaiting_transfer" });
        addWaMessage(transferPrompt(flowSnapshot.items, flowSnapshot.customerName));
        return;
      }
      if (flowSnapshot.mode === "awaiting_payment_method" && isLinkChoice(norm)) {
        setWaFlow({ ...flowSnapshot, mode: "awaiting_link_payment" });
        addWaMessage(paymentLinkPrompt(flowSnapshot.items, flowSnapshot.customerName));
        return;
      }
      if (flowSnapshot.mode === "awaiting_link_payment") {
        addWaMessage(paymentLinkPrompt(flowSnapshot.items, flowSnapshot.customerName));
        return;
      }
      addWaMessage(paymentMethodPrompt(flowSnapshot.items, flowSnapshot.customerName));
      return;
    }

    if (flowSnapshot.mode === "awaiting_transfer") {
      if (isLinkChoice(norm) && !/(simular|comprobante)/.test(norm)) {
        setWaFlow({ ...flowSnapshot, mode: "awaiting_link_payment" });
        addWaMessage(paymentLinkPrompt(flowSnapshot.items, flowSnapshot.customerName));
        return;
      }
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
    setWebInvoiceOrder(null);
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
        onOpenGuide={() => setGuideOpen(true)}
      />

      <div className="pt-16">
        {activeView === 1 && (
          <WebView
            products={products}
            cart={cart}
            customers={customers}
            orders={orders}
            lastWebOrder={lastWebOrder}
            onAdd={handleAddToCart}
            onAddPack={handleAddPack}
            onRemove={handleRemoveFromCart}
            onUpdateQty={handleUpdateCartQty}
            onOpenCart={() => setCartOpen(true)}
            cartOpen={cartOpen}
            onCloseCart={() => setCartOpen(false)}
            onConfirm={handleWebConfirm}
            onClearLastOrder={() => setLastWebOrder(null)}
            onGoWhatsApp={() => changeView(2)}
            onOpenInvoice={(ord) => setWebInvoiceOrder(ord)}
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
            onLinkPaid={handleWaLinkPaid}
          />
        )}
        {activeView === 3 && (
          <PanelView
            key="operator"
            mode="operator"
            orders={orders}
            customers={customers}
            products={products}
            raffleEnabled={raffleEnabled}
            onToggleRaffle={handleToggleRaffle}
            onMarkReady={handleMarkReady}
            onSetWeight={handleSetWeight}
            onApplyStockLevels={handleApplyStockLevels}
            onWithdraw={handleWithdraw}
            onVerifyAndDeliver={handleVerifyAndDeliver}
            onConfirmPayment={handleConfirmPayment}
            onRequestSlot={requestPickupSlot}
            onUpdatePrice={handleUpdateProductPrice}
            onAddProduct={handleAddProduct}
            onToggleStock={handleToggleStock}
            onReminder={sendCustomerReminder}
            onSendInvoiceWhatsApp={handleSendInvoiceWhatsApp}
            onToast={addToast}
          />
        )}
        {activeView === 5 && (
          <PanelView
            key="admin"
            mode="admin"
            orders={orders}
            customers={customers}
            products={products}
            raffleEnabled={raffleEnabled}
            onToggleRaffle={handleToggleRaffle}
            onMarkReady={handleMarkReady}
            onSetWeight={handleSetWeight}
            onApplyStockLevels={handleApplyStockLevels}
            onWithdraw={handleWithdraw}
            onVerifyAndDeliver={handleVerifyAndDeliver}
            onConfirmPayment={handleConfirmPayment}
            onRequestSlot={requestPickupSlot}
            onUpdatePrice={handleUpdateProductPrice}
            onAddProduct={handleAddProduct}
            onToggleStock={handleToggleStock}
            onReminder={sendCustomerReminder}
            onSendInvoiceWhatsApp={handleSendInvoiceWhatsApp}
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
      <InvoiceModal
        order={webInvoiceOrder}
        onClose={() => setWebInvoiceOrder(null)}
        onToast={addToast}
        onSendWhatsApp={handleSendInvoiceWhatsApp}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
