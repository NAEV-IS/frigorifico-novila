// ─────────────────────────────────────────────────────────────────────────────
// FRIGORÍFICO NOVILA · Datos reales de la demo
// Precios en pesos argentinos. Comercio de Córdoba Capital.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = {
  name: "Frigorífico Novila",
  handle: "@frigorificonovila",
  slogan: "DEL CAMPO A TU CASA",
  valueProp: "Carnicería mayorista y minorista. Precio mayorista, llevés lo que llevés. Sin intermediarios.",
  address: "Av. Amadeo Sabattini 3480 (al lado del Hiper Libertad), Córdoba Capital",
  hoursWeek: "Lunes a Sábado · 8:00 a 21:00 hs",
  hoursSunday: "Domingos y Feriados · 9:00 a 13:30 hs",
  phone: "351 700 8842",
  landline: "0351 213-2794",
};

export const WHATSAPP_DEMO_PHONE = "351 700 8842";

export const TRANSFER_DATA = {
  alias: "NOVILA.SABATTINI",
  cbu: "0000003100123456789012",
  titular: "Frigorífico Novila S.R.L.",
  bank: "Banco de Córdoba",
};

export const CATEGORIES = [
  { id: "super", label: "Super promos", short: "Super promos", icon: "Flame" },
  { id: "vacuno", label: "Vacuno", short: "Vacuno", icon: "Beef" },
  { id: "envasado", label: "Envasado al Vacío", short: "Envasado al Vacío", icon: "Package" },
  { id: "cerdo", label: "Cerdo", short: "Cerdo", icon: "PiggyBank" },
  { id: "pollo", label: "Pollo y Achuras", short: "Pollo y Achuras", icon: "Drumstick" },
  { id: "elaborados", label: "Elaborados", short: "Elaborados", icon: "CookingPot" },
  { id: "mayorista", label: "Mayorista (Medias Reses y Cajones)", short: "Mayorista", icon: "Warehouse" },
];

const PROMO_DEFS = [
  { cut: "Aguja", kg: 2, price: 16999, normal: 21000, image: "rawbeef", note: "Ideal milanesas y cazuela" },
  { cut: "Falda", kg: 2, price: 16999, normal: 19998, image: "beefcuts", note: "Para desmenuzar y guisar" },
  { cut: "Bocado Fino", kg: 2, price: 15999, normal: 20998, image: "rawbeef", note: "Tierno para bifes" },
  { cut: "Bocado Ancho", kg: 2, price: 21999, normal: 26000, image: "sliced", note: "Sabor intenso a la parrilla" },
  { cut: "Osobuco", kg: 2, price: 15999, normal: 17998, image: "beefcuts", note: "Para cazuela y guiso" },
  { cut: "Puchero Común", kg: 3, price: 9999, normal: 15000, image: "ribs", note: "Rinde para toda la semana" },
  { cut: "Costeleta Ancha", kg: 2, price: 20999, normal: 25998, image: "grill", note: "La del domingo" },
  { cut: "Costeleta Especial", kg: 2, price: 24999, normal: 27998, image: "ribs", note: "Selección del carnicero" },
  { cut: "Entrecot", kg: 2, price: 25999, normal: 27998, image: "tomahawk", note: "Premium para parrilla" },
  { cut: "Churrasquito Cerdo", kg: 1, price: 9999, normal: 10999, image: "pork", note: "Rápido, rico y rendidor" },
];

const VACUNO = [
  ["Aguja", 10500], ["Arañita", 19000], ["Bife de Chorizo", 20000], ["Bocado Ancho", 13000],
  ["Bocado Fino", 10499], ["Bola de Lomo", 15499], ["Bolsón Canino", 2000], ["Colita de Cuadril", 16500],
  ["Costeleta Ancha", 12999], ["Costeleta Fina", 13999], ["Costilla", 14499], ["Cuadrada", 15499],
  ["Cuadril", 16900], ["Entraña", 19000], ["Entrecot", 13999], ["Falda", 9999],
  ["Falda Deshuesada", 14999], ["Lomo", 23500], ["Marucha", 14499], ["Matambre", 15499],
  ["Molida Común", 6900], ["Molida Especial", 12499], ["Nalga", 16900], ["Osobuco", 8999],
  ["Osobuco del Rey", 10000], ["Paleta", 14499], ["Palomita", 14499], ["Peceto", 17900],
  ["Picaña / Tapa Cuadril", 16900], ["Puchero Común", 5000], ["Roast Beef", 14500], ["Tapa de Asado", 14999],
  ["Tapa de Nalga", 14999], ["T-Bone", 22000], ["Tomahawk", 22000], ["Tortugita", 14999], ["Vacío", 15499],
];

const ENVASADO = [
  ["Arañita", 19000], ["Asado Banderita", 19000], ["Bife Ancho / Ojo de Bife", 24000], ["Bife Angosto", 22000],
  ["Bife de Paleta", 14499], ["Bola de Lomo", 15499], ["Brazuelo", 9999], ["Colita de Cuadril", 16500],
  ["Costilla Ventana", 19000], ["Cuadrada", 15499], ["Cuadril Corazón", 16900], ["Entraña", 21000],
  ["Falda Deshuesada", 16999], ["Garrón", 9999], ["Lomo con Cordón", 23500], ["Marucha", 14499],
  ["Matambre", 16999], ["Nalga", 16900], ["Paleta", 14499], ["Palomita", 14499], ["Peceto", 17900],
  ["Roast Beef", 14499], ["Tapa de Asado", 14999], ["Tapa de Bife", 19000], ["Tapa de Cuadril", 16900],
  ["Tapa de Nalga", 14999], ["Tortuguita", 14499], ["Vacío", 16999],
];

const CERDO = [
  ["Bondiola", 8900], ["Cerdo Trozado", 5300], ["Churrasquito", 10999], ["Costeleta", 7499],
  ["Costilla", 7999], ["Entrecot", 9000], ["Matambre de Cerdo", 18500], ["Medallón", 6200],
  ["Molida de Cerdo", 6300], ["Osobuco de Cerdo", 3999], ["Pulpa", 9500], ["Solomillo", 9000],
  ["Vacío de Cerdo", 11000],
];

const POLLO = [
  ["Alita", 2900], ["Pata Muslo Fresca", 3299], ["Pata Congelada 3 kg", 2999], ["Pechuga", 8999],
  ["Pechuga Congelada x 3 kg", 8599], ["Pollo Entero", 3799], ["Pollo Condimentado", 4500],
  ["Centro de Entraña", 10500], ["Chinchulín", 4999], ["Corazón", 6000], ["Hígado", 4900],
  ["Lengua", 11250], ["Molleja", 28500], ["Mondongo", 8700], ["Nuez", 8550], ["Quijada", 5400],
  ["Rabo", 9300], ["Riñón", 4500],
];

const ELABORADOS = [
  ["Albóndiga de Cerdo", 8999], ["Albóndiga de Pollo", 8999], ["Albóndiga Vacuna", 9999],
  ["Chorigüesa", 8999], ["Chorizo Bombón", 11999], ["Chorizo Colorado", 13000],
  ["Chorizo Parrillero", 8999], ["Chorizo Puro Cerdo", 10999], ["Chorizo Criollo", 8499],
  ["Hamburguesa de Cerdo", 8999], ["Hamburguesa de Pollo", 8999], ["Hamburguesa Vacuna", 9999],
  ["Milanesa de Cerdo", 6999], ["Milanesa de Hígado", 4999], ["Milanesa de Pollo", 7999],
  ["Milanesa Vacuna", 9999], ["Morcilla", 7499], ["Morcilla Bombón", 7999], ["Morcilla Vasca", 13000],
];

const MAYORISTA = [
  ["Media Res Familiar (Despostada - x kg)", 11900], ["Mocho Pierna (x kg)", 12999],
  ["Cuarto Pistola (x kg)", 12999], ["Parrillero (x kg)", 13999], ["Carré s/Lomo (x kg)", 13999],
  ["Carré c/Lomo (x kg)", 15300], ["Costillar del Medio (x kg)", 15499], ["Plancha Asado (x kg)", 13999],
  ["Costillar + Vacío (x kg)", 14499], ["Costillar + Vacío + Matambre (x kg)", 14499],
  ["Cortito Cuarto Delantero (x kg)", 8999], ["Cerdo Completo 2 Medias (x kg)", 4400],
  ["Media Res de Cerdo (x kg)", 4500], ["Media Res Cerdo Familiar (x kg)", 5499], ["Pernil (x kg)", 5900],
  ["Paleta Cerdo Mayorista (x kg)", 5100], ["Cajón Pata Muslo Resistire", 41999],
  ["Cajón Pollo Resistire", 59900], ["Cajón Pollo Soychu/Optimo", 59900], ["Cajón Pollo Noelma", 71999],
];

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const categoryMeta = {
  vacuno: { category: "Vacuno", image: "beefcuts" },
  envasado: { category: "Envasado al Vacío", image: "rawbeef" },
  cerdo: { category: "Cerdo", image: "pork" },
  pollo: { category: "Pollo y Achuras", image: "chicken" },
  elaborados: { category: "Elaborados", image: "sausage" },
  mayorista: { category: "Mayorista", image: "ribs" },
};

function makeProducts() {
  const products = PROMO_DEFS.map((p, index) => ({
    id: `promo-${slugify(p.cut)}-${p.kg}kg`,
    name: `Promo ${p.cut}`,
    cut: p.cut,
    category: "Super promos",
    categoryId: "super",
    price: p.price,
    normalPrice: p.normal,
    savings: p.normal - p.price,
    discount: Math.round(((p.normal - p.price) / p.normal) * 100),
    unit: `${p.kg} kg`,
    unitLabel: `${p.kg} kg`,
    packKg: p.kg,
    kind: "promo",
    stock: true,
    image: p.image,
    note: p.note,
    featured: index < 4,
  }));

  const groups = [
    { id: "vacuno", rows: VACUNO },
    { id: "envasado", rows: ENVASADO },
    { id: "cerdo", rows: CERDO },
    { id: "pollo", rows: POLLO },
    { id: "elaborados", rows: ELABORADOS },
    { id: "mayorista", rows: MAYORISTA },
  ];

  groups.forEach((group) => {
    const meta = categoryMeta[group.id];
    group.rows.forEach(([name, price]) => {
      const isUnit = name.startsWith("Cajón") || name === "Bolsón Canino";
      const unitLabel = name.startsWith("Cajón") ? "cajón" : isUnit ? "unidad" : "kg";
      products.push({
        id: `${group.id}-${slugify(name)}`,
        name,
        cut: name,
        category: meta.category,
        categoryId: group.id,
        price,
        normalPrice: null,
        savings: 0,
        discount: 0,
        unit: unitLabel,
        unitLabel,
        packKg: null,
        kind: isUnit ? "unit" : "kg",
        stock: name !== "Molleja" ? true : true,
        image: meta.image,
        note: "",
        featured: false,
      });
    });
  });

  return products;
}

export const INITIAL_PRODUCTS = makeProducts();

export const INITIAL_CUSTOMERS = [
  {
    id: "cli-1", name: "Lucía Fernández", phone: "351 612 4478", historicOrders: 4, historicSpent: 148500,
    joined: "Oct 2026", tags: ["Web", "Asadora", "Compra del Mes"], favorite: "Media Res Familiar",
  },
  {
    id: "cli-2", name: "Mariana Álvarez", phone: "351 555 0187", historicOrders: 6, historicSpent: 215400,
    joined: "Oct 2026", tags: ["Bot IA", "Recompra", "Compra del Mes"], favorite: "Milanesa Vacuna",
  },
  {
    id: "cli-3", name: "Diego Bustos", phone: "351 444 9021", historicOrders: 3, historicSpent: 68200,
    joined: "Oct 2026", tags: ["Bot IA", "Parrillero"], favorite: "Costilla",
  },
  {
    id: "cli-4", name: "Parador El Durazno (Gastronómico)", phone: "351 333 7712", historicOrders: 5, historicSpent: 342000,
    joined: "Oct 2026", tags: ["Web", "Mayorista", "B2B"], favorite: "Nalga (Envasado al Vacío)",
  },
  {
    id: "cli-5", name: "Pablo Ferreyra", phone: "351 222 6650", historicOrders: 3, historicSpent: 112000,
    joined: "Nov 2026", tags: ["Web", "Compra del Mes"], favorite: "Vacío (Envasado al Vacío)",
  },
];

const orderLine = (overrides) => ({
  productId: "",
  name: "",
  category: "",
  pricing: "kg",
  unitPrice: 0,
  qty: 1,
  requestedKg: null,
  actualKg: null,
  unitLabel: "kg",
  image: "beefcuts",
  ...overrides,
});

export const INITIAL_ORDERS = [
  {
    id: "NV-104",
    number: 104,
    customerId: "cli-3",
    customerName: "Diego Bustos",
    phone: "351 444 9021",
    channel: "whatsapp",
    pickupSlot: "Hoy 12:30 - 13:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "10:48",
    paymentReference: "TRF-8041",
    status: 3,
    createdAt: "11:05",
    readyAt: "12:18",
    withdrawnAt: null,
    items: [
      orderLine({
        productId: "promo-puchero-comun-3kg", name: "Promo Puchero Común", category: "Super promos",
        pricing: "pack", unitPrice: 9999, qty: 1, unitLabel: "3 kg", image: "ribs",
      }),
      orderLine({
        productId: "vacuno-bolson-canino", name: "Bolsón Canino", category: "Vacuno",
        pricing: "unit", unitPrice: 2000, qty: 1, unitLabel: "unidad", image: "beefcuts",
      }),
      orderLine({
        productId: "elaborados-morcilla", name: "Morcilla", category: "Elaborados",
        pricing: "kg", unitPrice: 7499, qty: 0.75, requestedKg: 0.75, actualKg: 0.78,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-103",
    number: 103,
    customerId: "cli-2",
    customerName: "Mariana Álvarez",
    phone: "351 555 0187",
    channel: "whatsapp",
    pickupSlot: "Hoy 18:30 - 19:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "11:32",
    paymentReference: "TRF-8067",
    status: 1,
    createdAt: "12:08",
    readyAt: null,
    withdrawnAt: null,
    items: [
      orderLine({
        productId: "promo-aguja-2kg", name: "Promo Aguja", category: "Super promos",
        pricing: "pack", unitPrice: 16999, qty: 1, unitLabel: "2 kg", image: "rawbeef",
      }),
      orderLine({
        productId: "elaborados-milanesa-vacuna", name: "Milanesa Vacuna", category: "Elaborados",
        pricing: "kg", unitPrice: 9999, qty: 1, requestedKg: 1, actualKg: 1,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-102",
    number: 102,
    customerId: "cli-1",
    customerName: "Lucía Fernández",
    phone: "351 612 4478",
    channel: "web",
    pickupSlot: "Hoy 13:30 - 14:00 hs",
    payment: "Mercado Pago / Transferencia",
    paymentStatus: "approved",
    paymentConfirmedAt: "10:35",
    paymentReference: "MP-55210",
    status: 2,
    createdAt: "11:42",
    readyAt: null,
    withdrawnAt: null,
    items: [
      orderLine({
        productId: "vacuno-vacio", name: "Vacío", category: "Vacuno",
        pricing: "kg", unitPrice: 15499, qty: 1, requestedKg: 1, actualKg: 1.12,
        unitLabel: "kg", image: "rawbeef",
      }),
      orderLine({
        productId: "vacuno-costilla", name: "Costilla", category: "Vacuno",
        pricing: "kg", unitPrice: 14499, qty: 1.5, requestedKg: 1.5, actualKg: 1.48,
        unitLabel: "kg", image: "ribs",
      }),
      orderLine({
        productId: "elaborados-chorizo-bombon", name: "Chorizo Bombón", category: "Elaborados",
        pricing: "kg", unitPrice: 11999, qty: 0.5, requestedKg: 0.5, actualKg: 0.52,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
];

export const INITIAL_WHATSAPP_MESSAGES = [
  {
    id: "wa-1",
    side: "in",
    kind: "text",
    text: "Buenas. Soy NovilaBot, el asistente de Frigorífico Novila. ¿Te ayudo a armar tu pedido?",
    time: "12:31",
    quickReplies: ["Ver promos", "Asado para 6", "Armar pedido"],
  },
  {
    id: "wa-3",
    side: "out",
    kind: "text",
    text: "Hola, ¿dónde están y qué horarios tienen?",
    time: "12:32",
  },
  {
    id: "wa-4",
    side: "in",
    kind: "text",
    text: "Estamos en Av. Sabattini 3480, Córdoba Capital.\n\nLunes a sábado: 8:00 a 21:00 hs.\nDomingos y feriados: 9:00 a 13:30 hs.\n\n¿Te armo un pedido?",
    time: "12:32",
    quickReplies: ["Ver promos", "Armar pedido"],
  },
  {
    id: "wa-5",
    side: "out",
    kind: "text",
    text: "¿Qué me recomendás para un asado para 6 personas?",
    time: "12:33",
  },
  {
    id: "wa-6",
    side: "in",
    kind: "text",
    text: "Para 6 personas calculá unos 500 g por persona. Te recomiendo:\n\n• 2 kg Vacío — $30.998\n• 1,5 kg Costilla — $21.749\n• 1 kg Chorizo Bombón — $11.999\n• 0,5 kg Morcilla — $3.750\n\nTotal estimado: $68.495\nRinde 5 kg de carne + achuras. Si querés, te lo tomo ahora.",
    time: "12:33",
    quickReplies: ["Armar este pedido", "Ver promos"],
  },
];

export const PICKUP_SLOTS = [
  "Hoy 12:30 - 13:00 hs",
  "Hoy 18:30 - 19:00 hs",
  "Hoy 19:30 - 20:00 hs",
  "Mañana 10:00 - 10:30 hs",
];

export const ASADO_PACKS = [
  {
    id: "asado-4",
    title: "Asado para 4 personas",
    weightLabel: "3 kg totales",
    detail: "1,5 kg Vacío + 1 kg Costilla + 0,5 kg Chorizo Bombón",
    items: [
      { productId: "vacuno-vacio", qty: 1.5 },
      { productId: "vacuno-costilla", qty: 1 },
      { productId: "elaborados-chorizo-bombon", qty: 0.5 },
    ],
  },
  {
    id: "asado-6",
    title: "Asado para 6 personas",
    weightLabel: "5 kg totales",
    detail: "2 kg Vacío + 1,5 kg Costilla + 1 kg Chorizo + 0,5 kg Morcilla",
    items: [
      { productId: "vacuno-vacio", qty: 2 },
      { productId: "vacuno-costilla", qty: 1.5 },
      { productId: "elaborados-chorizo-bombon", qty: 1 },
      { productId: "elaborados-morcilla", qty: 0.5 },
    ],
  },
  {
    id: "asado-10",
    title: "Costillar para 10 personas",
    weightLabel: "7,5 kg totales",
    detail: "6 kg Costillar + Vacío + 1,5 kg Chorizo Bombón",
    items: [
      { productId: "mayorista-costillar-vacio-x-kg", qty: 6 },
      { productId: "elaborados-chorizo-bombon", qty: 1.5 },
    ],
  },
];

export const PAYMENT_METHODS = [
  { id: "mp", label: "Transferencia / Mercado Pago (Retiro Express sin fila en las 3 cajas)", short: "Transferencia / MP", icon: "Smartphone" },
  { id: "credito", label: "Tarjeta de Crédito (1 pago) o Débito en Caja Express", short: "Tarjeta 1 pago / Débito", icon: "CreditCard" },
  { id: "caja", label: "Efectivo al retirar en Caja Express", short: "Efectivo", icon: "Banknote" },
];

export const CAMPAIGNS = [
  {
    id: "miercoles",
    eyebrow: "Miércoles · 10:00 hs",
    title: "Miércoles de super promos",
    description: "Las 10 promos de la semana para toda la base registrada.",
    icon: "Flame",
    audience: "Base completa",
    tone: "burgundy",
  },
  {
    id: "viernes",
    eyebrow: "Viernes · 10:00 hs",
    title: "¿Armamos el asado?",
    description: "Mensaje personalizado para reservar temprano.",
    icon: "Beef",
    audience: "Asadores frecuentes",
    tone: "gold",
  },
  {
    id: "recompra",
    eyebrow: "Alerta de Stock · Elaborados",
    title: "Salieron Milanesas recién hechas ($9.999/kg)",
    description: "Aviso prioritario antes de que se agoten en mostrador.",
    icon: "Repeat2",
    audience: "Clientes de recompra",
    tone: "charcoal",
  },
];

export function calcRaffleChances(amount) {
  return Math.max(0, Math.floor((Number(amount) || 0) / 25000));
}

export function formatMoney(value) {
  const rounded = Math.round(Number(value) || 0);
  return "$" + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(rounded);
}

export function formatKg(value) {
  return `${Number(value || 0).toFixed(2)} kg`;
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function orderTotal(order) {
  return (order?.items || []).reduce((total, item) => {
    if (item.pricing === "kg") return total + Number(item.actualKg || 0) * Number(item.unitPrice || 0);
    return total + Number(item.qty || 0) * Number(item.unitPrice || 0);
  }, 0);
}

export function orderRequestedTotal(order) {
  return (order?.items || []).reduce((total, item) => {
    if (item.pricing === "kg") return total + Number(item.requestedKg || 0) * Number(item.unitPrice || 0);
    return total + Number(item.qty || 0) * Number(item.unitPrice || 0);
  }, 0);
}

export function nextOrderCode(orders) {
  const highest = (orders || []).reduce((max, order) => Math.max(max, Number(order.number) || 0), 104);
  return `NV-${highest + 1}`;
}

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

export function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

export function nowTime() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function todayDate() {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function isValidPhone(phone) {
  return normalizePhone(phone).length >= 10;
}

export function isValidFullName(name) {
  const clean = String(name || "").trim();
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{3,}$/.test(clean) && clean.split(/\s+/).length >= 2;
}
