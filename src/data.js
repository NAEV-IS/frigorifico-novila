// ─────────────────────────────────────────────────────────────────────────────
// FRIGORÍFICO NOVILA · Datos reales de la demo
// Precios en pesos argentinos. Comercio de Córdoba Capital.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = {
  name: "Frigorífico Novila",
  handle: "@frigorificonovila",
  slogan: "DEL CAMPO A TU CASA",
  valueProp: "Carnicería mayorista y minorista. Precio mayorista, llevés lo que llevés. Sin intermediarios.",
  address: "Av. Amadeo Sabattini 3480, Córdoba Capital",
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
  { cut: "Bocado Ancho", kg: 2, price: 21999, normal: 26000, image: "beefcuts", note: "Sabor intenso a la parrilla" },
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
    joined: "Oct 2026", tags: ["Web", "Mayorista", "B2B"], favorite: "",
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
    date: "17/11/2026",
    pickupSlot: "Hoy 12:30 - 13:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "10:48",
    paymentReference: "TRF-8041",
    status: 3,
    createdAt: "11:05",
    readyAt: "12:18",
    withdrawnAt: null,
    deliveredAt: null,
    pickupToken: "pickup_nv104_8f92a1b4",
    pickupPin: "482910",
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
        pricing: "kg", unitPrice: 7499, qty: 0.75, requestedKg: 0.75, actualKg: 0.75,
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
    date: "17/11/2026",
    pickupSlot: "Hoy 18:30 - 19:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "11:32",
    paymentReference: "TRF-8067",
    status: 1,
    createdAt: "12:08",
    readyAt: null,
    withdrawnAt: null,
    deliveredAt: null,
    pickupToken: null,
    pickupPin: null,
    substitution: "similar",
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
    date: "17/11/2026",
    pickupSlot: "Hoy 13:30 - 14:00 hs",
    payment: "Mercado Pago / Transferencia",
    paymentStatus: "approved",
    paymentConfirmedAt: "10:35",
    paymentReference: "MP-55210",
    status: 1,
    createdAt: "11:42",
    readyAt: null,
    withdrawnAt: null,
    deliveredAt: null,
    pickupToken: null,
    pickupPin: null,
    substitution: "avisar",
    items: [
      orderLine({
        productId: "vacuno-vacio", name: "Vacío", category: "Vacuno",
        pricing: "kg", unitPrice: 15499, qty: 1, requestedKg: 1, actualKg: 1,
        unitLabel: "kg", image: "rawbeef",
      }),
      orderLine({
        productId: "vacuno-costilla", name: "Costilla", category: "Vacuno",
        pricing: "kg", unitPrice: 14499, qty: 1.5, requestedKg: 1.5, actualKg: 1.5,
        unitLabel: "kg", image: "ribs",
      }),
      orderLine({
        productId: "elaborados-chorizo-bombon", name: "Chorizo Bombón", category: "Elaborados",
        pricing: "kg", unitPrice: 11999, qty: 0.5, requestedKg: 0.5, actualKg: 0.5,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-101",
    number: 101,
    customerId: "cli-5",
    customerName: "Pablo Ferreyra",
    phone: "351 222 6650",
    channel: "web",
    date: "17/11/2026",
    pickupSlot: "Hoy 10:00 - 10:30 hs",
    payment: "Mercado Pago",
    paymentStatus: "approved",
    paymentConfirmedAt: "09:30",
    paymentReference: "MP-55198",
    status: 4,
    createdAt: "09:15",
    readyAt: "09:55",
    withdrawnAt: "10:15",
    deliveredAt: "10:15",
    pickupToken: "pickup_nv101_c4d21e",
    pickupPin: "112233",
    items: [
      orderLine({
        productId: "vacuno-vacio", name: "Vacío", category: "Vacuno",
        pricing: "kg", unitPrice: 15499, qty: 1.5, requestedKg: 1.5, actualKg: 1.5,
        unitLabel: "kg", image: "rawbeef",
      }),
      orderLine({
        productId: "elaborados-chorizo-bombon", name: "Chorizo Bombón", category: "Elaborados",
        pricing: "kg", unitPrice: 11999, qty: 1, requestedKg: 1, actualKg: 1,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-098",
    number: 98,
    customerId: "cli-4",
    customerName: "Parador El Durazno (Gastronómico)",
    phone: "351 333 7712",
    channel: "web",
    date: "15/11/2026",
    pickupSlot: "15/11 11:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "10:10",
    paymentReference: "TRF-7912",
    status: 4,
    createdAt: "09:40",
    readyAt: "10:45",
    withdrawnAt: "11:15",
    deliveredAt: "11:15",
    items: [
      orderLine({
        productId: "vacuno-vacio", name: "Vacío", category: "Vacuno",
        pricing: "kg", unitPrice: 15499, qty: 10, requestedKg: 10, actualKg: 10,
        unitLabel: "kg", image: "rawbeef",
      }),
      orderLine({
        productId: "vacuno-costilla", name: "Costilla", category: "Vacuno",
        pricing: "kg", unitPrice: 14499, qty: 8, requestedKg: 8, actualKg: 8,
        unitLabel: "kg", image: "ribs",
      }),
    ],
  },
  {
    id: "NV-097",
    number: 97,
    customerId: "cli-4",
    customerName: "Parador El Durazno (Gastronómico)",
    phone: "351 333 7712",
    channel: "web",
    date: "08/11/2026",
    pickupSlot: "08/11 10:30 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "09:50",
    paymentReference: "TRF-7801",
    status: 4,
    createdAt: "09:10",
    readyAt: "10:15",
    withdrawnAt: "10:45",
    deliveredAt: "10:45",
    items: [
      orderLine({
        productId: "vacuno-molida-esp", name: "Molida Especial", category: "Vacuno",
        pricing: "kg", unitPrice: 12499, qty: 6, requestedKg: 6, actualKg: 6,
        unitLabel: "kg", image: "rawbeef",
      }),
      orderLine({
        productId: "elaborados-chorizo-bombon", name: "Chorizo Bombón", category: "Elaborados",
        pricing: "kg", unitPrice: 11999, qty: 4, requestedKg: 4, actualKg: 4,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-096",
    number: 96,
    customerId: "cli-1",
    customerName: "Lucía Fernández",
    phone: "351 612 4478",
    channel: "web",
    date: "12/11/2026",
    pickupSlot: "12/11 13:00 hs",
    payment: "Mercado Pago",
    paymentStatus: "approved",
    paymentConfirmedAt: "11:20",
    paymentReference: "MP-54901",
    status: 4,
    createdAt: "11:00",
    readyAt: "12:30",
    withdrawnAt: "13:05",
    deliveredAt: "13:05",
    items: [
      orderLine({
        productId: "promo-asado-amigos-4kg", name: "Promo Asado con Amigos", category: "Super promos",
        pricing: "pack", unitPrice: 28999, qty: 1, unitLabel: "4 kg", image: "grill",
      }),
    ],
  },
  {
    id: "NV-095",
    number: 95,
    customerId: "cli-2",
    customerName: "Mariana Álvarez",
    phone: "351 555 0187",
    channel: "whatsapp",
    date: "10/11/2026",
    pickupSlot: "10/11 18:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "16:45",
    paymentReference: "TRF-7740",
    status: 4,
    createdAt: "16:20",
    readyAt: "17:40",
    withdrawnAt: "18:10",
    deliveredAt: "18:10",
    items: [
      orderLine({
        productId: "elaborados-milanesa-vacuna", name: "Milanesa Vacuna", category: "Elaborados",
        pricing: "kg", unitPrice: 9999, qty: 2, requestedKg: 2, actualKg: 2,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-094",
    number: 94,
    customerId: "cli-3",
    customerName: "Diego Bustos",
    phone: "351 444 9021",
    channel: "whatsapp",
    date: "06/11/2026",
    pickupSlot: "06/11 12:00 hs",
    payment: "Transferencia bancaria acreditada",
    paymentStatus: "approved",
    paymentConfirmedAt: "10:30",
    paymentReference: "TRF-7612",
    status: 4,
    createdAt: "10:00",
    readyAt: "11:30",
    withdrawnAt: "12:05",
    deliveredAt: "12:05",
    items: [
      orderLine({
        productId: "vacuno-costilla", name: "Costilla", category: "Vacuno",
        pricing: "kg", unitPrice: 14499, qty: 2.5, requestedKg: 2.5, actualKg: 2.5,
        unitLabel: "kg", image: "ribs",
      }),
      orderLine({
        productId: "elaborados-chorizo-bombon", name: "Chorizo Bombón", category: "Elaborados",
        pricing: "kg", unitPrice: 11999, qty: 1, requestedKg: 1, actualKg: 1,
        unitLabel: "kg", image: "sausage",
      }),
    ],
  },
  {
    id: "NV-093",
    number: 93,
    customerId: "cli-5",
    customerName: "Pablo Ferreyra",
    phone: "351 222 6650",
    channel: "web",
    date: "04/11/2026",
    pickupSlot: "04/11 10:30 hs",
    payment: "Mercado Pago",
    paymentStatus: "approved",
    paymentConfirmedAt: "09:40",
    paymentReference: "MP-54312",
    status: 4,
    createdAt: "09:15",
    readyAt: "10:10",
    withdrawnAt: "10:35",
    deliveredAt: "10:35",
    items: [
      orderLine({
        productId: "vacuno-peceto", name: "Peceto", category: "Vacuno",
        pricing: "kg", unitPrice: 17900, qty: 1.5, requestedKg: 1.5, actualKg: 1.5,
        unitLabel: "kg", image: "rawbeef",
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
  {
    id: "wa-ready-104",
    side: "in",
    kind: "ready",
    orderCode: "NV-104",
    pickupToken: "pickup_nv104_8f92a1b4",
    pickupPin: "482910",
    time: "12:18",
    text: "Hola Diego. Tu pedido #NV-104 ya está listo y preparado en Frigorífico Novila. Pasá directo a retirarlo por Av. Sabattini 3480 mostrando tu Pase de Retiro digital con QR o dictando tu PIN de 6 dígitos en mostrador.",
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
    image: "sliced",
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
    image: "grill",
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
    image: "grill",
    items: [
      { productId: "mayorista-costillar-vacio-x-kg", qty: 6 },
      { productId: "elaborados-chorizo-bombon", qty: 1.5 },
    ],
  },
];

export const PAYMENT_METHODS = [
  {
    id: "talo",
    label: "Transferencia bancaria instantánea (Talo)",
    short: "Talo Transferencia",
    icon: "Banknote",
    description: "Alias y CVU único por orden · Acreditación y conciliación automática 24/7 sin enviar comprobante",
    gateway: "Talo Pay",
  },
  {
    id: "credito",
    label: "Tarjeta de Crédito (Mobbex)",
    short: "Crédito Mobbex",
    icon: "CreditCard",
    description: "Visa, Mastercard, Amex · Hasta 3 cuotas · Pasarela segura Mobbex",
    gateway: "Mobbex Gateway",
  },
  {
    id: "debito",
    label: "Tarjeta de Débito (Mobbex)",
    short: "Débito Mobbex",
    icon: "CreditCard",
    description: "Débito directo Visa Débito, Maestro, Cabal · Acreditación inmediata",
    gateway: "Mobbex Gateway",
  },
  {
    id: "mp",
    label: "Mercado Pago",
    short: "Mercado Pago",
    icon: "Smartphone",
    description: "Dinero en cuenta de Mercado Pago o saldo disponible al instante",
    gateway: "Mercado Pago Checkout Pro",
  },
  {
    id: "mostrador",
    label: "Pago al retirar en mostrador (según peso real de balanza)",
    short: "Pago en mostrador",
    icon: "Scale",
    description: "Pagás el importe exacto que marque la balanza al retirar (efectivo, débito o QR, sin diferencias ni devoluciones)",
    gateway: "Caja Mostrador Novila",
  },
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

// ─────────────────────────────────────────────────────────────────────────────
// Retiro en Mostrador · QR & PIN Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function generatePickupToken(orderId = "") {
  const cleanId = String(orderId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const hash = Math.random().toString(36).substring(2, 10);
  return `pickup_${cleanId ? `${cleanId}_` : ""}${hash}`;
}

export function generatePickupPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function formatPin(pin) {
  const clean = String(pin || "").replace(/\D/g, "").slice(0, 6);
  if (clean.length > 3) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return clean;
}

export function buildPickupQrPayload(order) {
  if (!order) return "";
  const token = order.pickupToken || `pickup_${order.id}`;
  const pin = order.pickupPin || "000000";
  return `https://novila.ar/pickup?token=${encodeURIComponent(token)}&order=${encodeURIComponent(order.id)}&pin=${encodeURIComponent(pin)}`;
}

export function parsePickupScan(rawInput) {
  if (!rawInput) return { type: "empty" };
  const str = String(rawInput).trim();

  // 1. PIN de 6 dígitos
  const cleanDigits = str.replace(/\s+/g, "");
  if (/^\d{6}$/.test(cleanDigits)) {
    return { type: "pin", pin: cleanDigits };
  }

  // 2. URL de retiro
  if (str.includes("novila.ar/pickup") || str.startsWith("http://") || str.startsWith("https://")) {
    try {
      const url = new URL(str, "https://novila.ar");
      return {
        type: "qr_url",
        token: url.searchParams.get("token"),
        orderId: url.searchParams.get("order"),
        pin: url.searchParams.get("pin"),
      };
    } catch (e) {
      const tokenMatch = str.match(/[?&]token=([^&]+)/);
      const orderMatch = str.match(/[?&]order=([^&]+)/);
      const pinMatch = str.match(/[?&]pin=([^&]+)/);
      return {
        type: "qr_url",
        token: tokenMatch ? decodeURIComponent(tokenMatch[1]) : null,
        orderId: orderMatch ? decodeURIComponent(orderMatch[1]) : null,
        pin: pinMatch ? decodeURIComponent(pinMatch[1]) : null,
      };
    }
  }

  // 3. JSON estructurado
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const json = JSON.parse(str);
      return {
        type: "qr_json",
        token: json.token || json.pickupToken,
        orderId: json.orderId || json.id || json.order,
        pin: json.pin || json.pickupPin,
      };
    } catch (e) {}
  }

  // 4. Token directo
  if (str.startsWith("pickup_")) {
    return { type: "token", token: str };
  }

  // 5. Código de pedido NV-xxx
  if (/^NV-\d+$/i.test(str)) {
    return { type: "order_id", orderId: str.toUpperCase() };
  }

  return { type: "raw", raw: str };
}

export function resolvePickupOrder(rawInput, orders = []) {
  const parsed = parsePickupScan(rawInput);
  let order = null;

  if (parsed.pin) {
    order = orders.find((o) => o.pickupPin === parsed.pin);
  }
  if (!order && parsed.token) {
    order = orders.find((o) => o.pickupToken === parsed.token);
  }
  if (!order && parsed.orderId) {
    order = orders.find((o) => o.id.toLowerCase() === parsed.orderId.toLowerCase());
  }
  if (!order && parsed.raw) {
    const rawClean = parsed.raw.toLowerCase();
    order = orders.find((o) =>
      (o.pickupToken && o.pickupToken.toLowerCase() === rawClean) ||
      (o.pickupPin && o.pickupPin === rawClean) ||
      (o.id.toLowerCase() === rawClean)
    );
  }

  if (!order) {
    return {
      status: "NOT_FOUND",
      parsed,
      message: "Código QR o PIN no reconocido. Verificá los datos e intentá nuevamente.",
    };
  }

  // Control de Idempotencia y Anti-Fraude
  if (order.status === 4 || order.deliveredAt || order.withdrawnAt) {
    const time = order.deliveredAt || order.withdrawnAt || "anteriormente";
    return {
      status: "ALREADY_DELIVERED",
      order,
      message: `⚠️ Este pedido ya fue retirado el ${time} hs`,
    };
  }

  if (order.status < 3) {
    return {
      status: "IN_PREPARATION",
      order,
      message: "⏳ Este pedido todavía está en preparación",
    };
  }

  return {
    status: "READY",
    order,
  };
}

export function lineTotal(item) {
  if (!item) return 0;
  if (item.pricing === "kg") {
    const kg = Number(item.actualKg || item.requestedKg || item.qty || 0);
    return kg * Number(item.unitPrice || 0);
  }
  return Number(item.qty || 0) * Number(item.unitPrice || 0);
}

export function buildInvoiceData(order) {
  if (!order) return null;
  const num = order.number || parseInt(String(order.id).replace(/\D/g, "") || "104", 10);
  const ptoVta = 3;
  const invoiceNumber = `fac-C-00003-${String(num).padStart(8, "0")}`;
  const total = orderTotal(order);
  const emissionDate = order.date || "17/11/2026";
  const cae = `74200169${String(num).padStart(6, "0")}`;
  const caeVto = "27/11/2026";

  const fiscalPayload = {
    ver: 1,
    fecha: "2026-11-17",
    cuit: 30716492819,
    ptoVta,
    tipoCmp: 11,
    nroCmp: num,
    importe: total,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: 99,
    nroDocRec: 0,
    tipoCodAut: "E",
    codAut: Number(cae),
  };

  let payloadBase64 = "simulated_arca_qr";
  try {
    const jsonStr = JSON.stringify(fiscalPayload);
    if (typeof btoa === "function") {
      payloadBase64 = btoa(unescape(encodeURIComponent(jsonStr)));
    } else if (typeof Buffer !== "undefined") {
      payloadBase64 = Buffer.from(jsonStr).toString("base64");
    }
  } catch (e) {
    payloadBase64 = "simulated_arca_qr";
  }

  const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${payloadBase64}`;

  return {
    invoiceNumber,
    emissionDate,
    cae,
    caeVto,
    total,
    qrUrl,
    fiscalPayload,
    emisor: {
      name: "FRIGORÍFICO NOVILA",
      businessName: "FRIGORÍFICO NOVILA S.A.S.",
      address: "Av. Amadeo Sabattini 3480",
      city: "CÓRDOBA",
      vatCondition: "Responsable Inscripto",
      cuit: "30-71649281-9",
      grossIncome: "30716492819",
      startDate: "01/10/2018",
    },
    client: {
      name: order.customerName || "Consumidor Final",
      dni: order.customerDni || "0",
      address: order.customerAddress || ". CÓRDOBA (Retiro en Mostrador)",
      vatCondition: "Consumidor Final",
    },
    items: (order.items || []).map((item, idx) => {
      const qty = item.pricing === "kg" ? (item.actualKg || item.requestedKg || item.qty || 1) : (item.qty || 1);
      const unitPrice = Number(item.unitPrice) || 0;
      const subtotal = Number(qty) * unitPrice;
      return {
        code: item.productId ? item.productId.slice(0, 6) : String(1040 + idx),
        description: item.name,
        qty: Number(qty) || 1,
        unitPrice,
        discount: 0,
        vatRate: 21.0,
        total: subtotal,
      };
    }),
  };
}
