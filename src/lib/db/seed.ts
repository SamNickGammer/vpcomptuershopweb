import { db } from "./index";
import {
  admins,
  categories,
  products,
  inventoryHistory,
  orders,
  orderItems,
  trackingEvents,
  shipments,
} from "./schema";
import { hashPassword } from "../auth/admin";

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function paise(rupees: number): number {
  return rupees * 100;
}

function placeholderImage(name: string): string {
  const encoded = encodeURIComponent(name.substring(0, 30));
  return `https://placehold.co/600x400/1a1a2e/818cf8?text=${encoded}`;
}

function generateSku(prefix: string, index: number): string {
  return `VP-${prefix}-${String(index).padStart(4, "0")}`;
}

// ── Types for seed data ─────────────────────────────────────────────────────

type VariantSpec = { key: string; value: string };
type VariantImage = { url: string; altText?: string };

type OptionDef = {
  name: string; // e.g. "Color", "RAM"
  values: string[]; // e.g. ["Silver", "Black"]
};

type VariantDef = {
  name: string; // e.g. "Silver / 8GB" or "Default"
  price: number; // in rupees
  compareAtPrice?: number; // in rupees
  stock: number;
  lowStockThreshold?: number;
  isDefault?: boolean;
  specs: VariantSpec[];
  images: VariantImage[];
  optionValues?: Record<string, string>; // { "Color": "Silver", "RAM": "8GB" }
};

type ProductSeed = {
  name: string;
  description: string;
  condition: "new" | "refurbished" | "used";
  categoryKey: string;
  isFeatured?: boolean;
  options?: OptionDef[];
  variants: VariantDef[];
};

// ── Seed Function ────────────────────────────────────────────────────────────

async function seed() {
  console.log("=== V&P Computer Shop — Database Seed ===\n");

  // Check if data already exists (skip with --force flag)
  const force = process.argv.includes("--force");
  if (!force) {
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length > 0) {
      console.log("Database already has products. Use --force to re-seed.");
      process.exit(0);
    }
  } else {
    console.log("Force mode: clearing existing data...");
    await db.delete(shipments);
    await db.delete(trackingEvents);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(inventoryHistory);
    await db.delete(products);
    await db.delete(categories);
    console.log("   Existing data cleared.\n");
  }

  // ── 1. Admin User ───────────────────────────────────────────────────────

  console.log("1/8  Creating admin user...");
  const existingAdmin = await db.select().from(admins).limit(1);
  let adminId: string;

  if (existingAdmin.length > 0) {
    console.log("     Admin already exists, skipping.");
    adminId = existingAdmin[0].id;
  } else {
    const passwordHash = await hashPassword("Admin@1234");
    const [admin] = await db
      .insert(admins)
      .values({
        name: "V&P Admin",
        email: "admin@vpcomputer.in",
        passwordHash,
        role: "admin",
        isActive: true,
      })
      .returning();
    adminId = admin.id;
    console.log("     Admin created: admin@vpcomputer.in / Admin@1234");
  }

  // ── 2. Categories ──────────────────────────────────────────────────────

  console.log("2/8  Creating categories...");

  const parentCatData = [
    { name: "Laptops", description: "New and refurbished laptops from top brands", sortOrder: 1 },
    { name: "Processors", description: "Intel and AMD processors for desktop builds", sortOrder: 2 },
    { name: "Motherboards", description: "Desktop motherboards from Gigabyte, ASUS, MSI, and ASRock", sortOrder: 3 },
    { name: "RAM & Memory", description: "DDR4 and DDR5 RAM modules for desktops and laptops", sortOrder: 4 },
    { name: "Storage", description: "SSDs, HDDs, and NVMe drives for all your storage needs", sortOrder: 5 },
    { name: "Graphics Cards", description: "NVIDIA and AMD graphics cards for gaming and professional work", sortOrder: 6 },
    { name: "ICs & Components", description: "Integrated circuits, microcontrollers, electronic components, and development boards", sortOrder: 7 },
    { name: "Accessories", description: "Keyboards, mice, cables, bags, and other computer accessories", sortOrder: 8 },
  ];

  const parentCats = await db
    .insert(categories)
    .values(
      parentCatData.map((c) => ({
        name: c.name,
        slug: slugify(c.name),
        description: c.description,
        isActive: true,
        sortOrder: c.sortOrder,
      }))
    )
    .returning();

  const catMap: Record<string, string> = {};
  for (const c of parentCats) {
    catMap[c.name] = c.id;
  }

  const childCatData = [
    { name: "Refurbished Laptops", description: "Quality-checked refurbished laptops with warranty", parentName: "Laptops", sortOrder: 1 },
    { name: "New Laptops", description: "Brand new laptops from ASUS, HP, Lenovo, Dell, and Acer", parentName: "Laptops", sortOrder: 2 },
    { name: "SSD", description: "SATA and NVMe solid state drives", parentName: "Storage", sortOrder: 1 },
    { name: "HDD", description: "Traditional hard disk drives for bulk storage", parentName: "Storage", sortOrder: 2 },
  ];

  const childCats = await db
    .insert(categories)
    .values(
      childCatData.map((c) => ({
        name: c.name,
        slug: slugify(c.name),
        description: c.description,
        parentId: catMap[c.parentName],
        isActive: true,
        sortOrder: c.sortOrder,
      }))
    )
    .returning();

  for (const c of childCats) {
    catMap[c.name] = c.id;
  }

  console.log(`     Created ${parentCats.length + childCats.length} categories.`);

  // ── 3. Products ────────────────────────────────────────────────────────

  console.log("3/8  Creating products with variants...");

  // Helper to build laptop variants with options
  function laptopVariants(
    baseSpecs: VariantSpec[],
    configs: Array<{
      color: string;
      ram: string;
      storage: string;
      price: number;
      compareAt?: number;
      stock: number;
    }>,
    productName: string
  ): { options: OptionDef[]; variants: VariantDef[] } {
    const colors = [...new Set(configs.map((c) => c.color))];
    const rams = [...new Set(configs.map((c) => c.ram))];
    const options: OptionDef[] = [];
    if (colors.length > 1) options.push({ name: "Color", values: colors });
    if (rams.length > 1) options.push({ name: "RAM", values: rams });
    // If only one color and one RAM, we still use options if there are multiple configs
    if (options.length === 0 && configs.length > 1) {
      // Use storage as option
      const storages = [...new Set(configs.map((c) => c.storage))];
      options.push({ name: "Configuration", values: storages });
    }

    const variants: VariantDef[] = configs.map((c) => {
      const optionValues: Record<string, string> = {};
      if (colors.length > 1) optionValues["Color"] = c.color;
      if (rams.length > 1) optionValues["RAM"] = c.ram;
      if (options.length === 1 && options[0].name === "Configuration") {
        optionValues["Configuration"] = c.storage;
      }

      const nameparts: string[] = [];
      if (colors.length > 1) nameparts.push(c.color);
      if (rams.length > 1) nameparts.push(c.ram);
      if (nameparts.length === 0) nameparts.push(c.storage);

      return {
        name: nameparts.join(" / "),
        price: c.price,
        compareAtPrice: c.compareAt,
        stock: c.stock,
        lowStockThreshold: 2,
        specs: [
          ...baseSpecs,
          { key: "RAM", value: c.ram },
          { key: "Storage", value: c.storage },
          ...(colors.length > 1 ? [{ key: "Color", value: c.color }] : []),
        ],
        images: [
          {
            url: placeholderImage(`${productName} ${c.color}`),
            altText: `${productName} ${c.color}`,
          },
        ],
        optionValues: Object.keys(optionValues).length > 0 ? optionValues : undefined,
      };
    });

    return { options: options.length > 0 ? options : undefined as unknown as OptionDef[], variants };
  }

  // Helper for simple single-variant products
  function singleVariant(
    price: number,
    stock: number,
    specs: VariantSpec[],
    productName: string,
    compareAt?: number
  ): VariantDef {
    return {
      name: "Default",
      price,
      compareAtPrice: compareAt,
      stock,
      lowStockThreshold: 2,
      isDefault: true,
      specs,
      images: [{ url: placeholderImage(productName), altText: productName }],
    };
  }

  const allProductData: ProductSeed[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // REFURBISHED LAPTOPS (20) — with Color/RAM options
    // ═══════════════════════════════════════════════════════════════════════

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6300U" }, { key: "Display", value: "14 inch FHD" }, { key: "Graphics", value: "Intel HD 520" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 18000, compareAt: 22000, stock: 12 },
          { color: "Silver", ram: "16GB", storage: "256GB SSD", price: 22000, compareAt: 27000, stock: 8 },
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 18500, compareAt: 22500, stock: 10 },
          { color: "Black", ram: "16GB", storage: "256GB SSD", price: 23000, compareAt: 28000, stock: 5 },
        ],
        "Dell Latitude E7470"
      );
      return {
        name: "Dell Latitude E7470 (Refurbished)", description: "14-inch business ultrabook, Intel Core i5 6th Gen. Grade A refurbished with 6-month warranty.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", isFeatured: true, options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-7300U" }, { key: "Display", value: "14 inch FHD IPS" }, { key: "Weight", value: "1.36 kg" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 21000, compareAt: 26000, stock: 9 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 26000, compareAt: 32000, stock: 6 },
        ],
        "Dell Latitude E7480"
      );
      return {
        name: "Dell Latitude E7480 (Refurbished)", description: "14-inch ultrabook with 7th Gen Intel i5, thin and light. Refurbished Grade A.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6200U" }, { key: "Display", value: "14 inch HD (1366x768)" }, { key: "Ports", value: "USB 3.0, HDMI, VGA, RJ45" }],
        [
          { color: "Black", ram: "4GB", storage: "500GB HDD", price: 15000, compareAt: 19000, stock: 15 },
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 18000, compareAt: 22000, stock: 10 },
        ],
        "Dell Latitude E5470"
      );
      return {
        name: "Dell Latitude E5470 (Refurbished)", description: "14-inch rugged business laptop. Ideal for office use. Comes with charger and 3-month warranty.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-7200U" }, { key: "Display", value: "14 inch FHD" }, { key: "Battery", value: "Good backup (4+ hours)" }],
        [
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 19500, compareAt: 24000, stock: 11 },
          { color: "Black", ram: "8GB", storage: "512GB SSD", price: 22000, compareAt: 27000, stock: 7 },
        ],
        "Dell Latitude E5480"
      );
      return {
        name: "Dell Latitude E5480 (Refurbished)", description: "14-inch business laptop with 7th Gen Intel. Grade A refurbished.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6300U" }, { key: "Display", value: "15.6 inch FHD" }, { key: "Keyboard", value: "Full-size with numpad" }],
        [
          { color: "Black", ram: "4GB", storage: "500GB HDD", price: 17000, compareAt: 21000, stock: 8 },
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 20500, compareAt: 25000, stock: 12 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 24500, compareAt: 30000, stock: 4 },
        ],
        "Dell Latitude E5570"
      );
      return {
        name: "Dell Latitude E5570 (Refurbished)", description: "15.6-inch business laptop with numeric keypad. Great for accounts and data work.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6300U" }, { key: "Display", value: "14 inch FHD Anti-Glare" }, { key: "Build", value: "Aluminum chassis" }, { key: "Security", value: "Fingerprint reader" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 19000, compareAt: 24000, stock: 14 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 24500, compareAt: 30000, stock: 6 },
        ],
        "HP EliteBook 840 G3"
      );
      return {
        name: "HP EliteBook 840 G3 (Refurbished)", description: "14-inch premium business ultrabook. Aluminum chassis, fingerprint reader. Grade A.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", isFeatured: true, options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-8350U" }, { key: "Display", value: "14 inch FHD IPS" }, { key: "Ports", value: "USB-C, USB 3.0, HDMI" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 26000, compareAt: 32000, stock: 10 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 32000, compareAt: 39000, stock: 5 },
        ],
        "HP EliteBook 840 G5"
      );
      return {
        name: "HP EliteBook 840 G5 (Refurbished)", description: "14-inch 8th Gen i5 ultrabook. Slim, modern design with USB-C. 6-month warranty.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", isFeatured: true, options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-8250U" }, { key: "Display", value: "15.6 inch FHD IPS" }, { key: "Graphics", value: "Intel UHD 620" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 28000, compareAt: 34000, stock: 7 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 33500, compareAt: 40000, stock: 4 },
        ],
        "HP EliteBook 850 G5"
      );
      return {
        name: "HP EliteBook 850 G5 (Refurbished)", description: "15.6-inch premium business laptop. 8th Gen Intel i5 with larger display for productivity.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-10210U" }, { key: "Display", value: "15.6 inch FHD" }, { key: "OS", value: "Windows 11 Pro" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 30000, compareAt: 38000, stock: 9 },
          { color: "Silver", ram: "8GB", storage: "512GB SSD", price: 32000, compareAt: 40000, stock: 6 },
          { color: "Silver", ram: "16GB", storage: "1TB SSD", price: 38000, compareAt: 47000, stock: 3 },
        ],
        "HP ProBook 450 G7"
      );
      return {
        name: "HP ProBook 450 G7 (Refurbished)", description: "15.6-inch everyday business laptop with 10th Gen Intel i5. Clean condition.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6200U" }, { key: "Display", value: "14 inch HD" }, { key: "Durability", value: "MIL-STD-810G tested" }],
        [
          { color: "Black", ram: "4GB", storage: "256GB SSD", price: 17500, compareAt: 22000, stock: 13 },
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 20000, compareAt: 25000, stock: 9 },
          { color: "Black", ram: "8GB", storage: "512GB SSD", price: 22000, compareAt: 27500, stock: 5 },
        ],
        "Lenovo ThinkPad T460"
      );
      return {
        name: "Lenovo ThinkPad T460 (Refurbished)", description: "14-inch legendary ThinkPad with military-grade durability. Famous keyboard and TrackPoint.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-7200U" }, { key: "Display", value: "14 inch FHD IPS" }, { key: "Battery", value: "Dual battery, 8+ hours" }],
        [
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 21000, compareAt: 26000, stock: 11 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 27000, compareAt: 33000, stock: 7 },
        ],
        "Lenovo ThinkPad T470"
      );
      return {
        name: "Lenovo ThinkPad T470 (Refurbished)", description: "14-inch ThinkPad with 7th Gen i5. Dual battery system for all-day use. Grade A.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", isFeatured: true, options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-8250U" }, { key: "Display", value: "14 inch FHD IPS" }, { key: "Ports", value: "Thunderbolt 3, USB-C" }],
        [
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 27500, compareAt: 34000, stock: 8 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 32500, compareAt: 40000, stock: 5 },
          { color: "Black", ram: "16GB", storage: "1TB SSD", price: 36500, compareAt: 45000, stock: 3 },
        ],
        "Lenovo ThinkPad T480"
      );
      return {
        name: "Lenovo ThinkPad T480 (Refurbished)", description: "14-inch ThinkPad with 8th Gen quad-core i5. USB-C with Thunderbolt 3. Top-tier.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i7-8565U" }, { key: "Display", value: "14 inch FHD IPS narrow bezel" }, { key: "Weight", value: "1.46 kg" }],
        [
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 35000, compareAt: 44000, stock: 6 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 40000, compareAt: 50000, stock: 4 },
        ],
        "Lenovo ThinkPad T490"
      );
      return {
        name: "Lenovo ThinkPad T490 (Refurbished)", description: "14-inch modern ThinkPad with 8th Gen i7. Slim bezels, improved display. Near-new condition.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6200U" }, { key: "Display", value: "12.5 inch HD" }, { key: "Weight", value: "1.34 kg" }],
        [
          { color: "Black", ram: "4GB", storage: "128GB SSD", price: 16000, compareAt: 20000, stock: 10 },
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 19000, compareAt: 24000, stock: 7 },
        ],
        "Lenovo ThinkPad X260"
      );
      return {
        name: "Lenovo ThinkPad X260 (Refurbished)", description: "12.5-inch ultraportable ThinkPad. Perfect for travel and on-the-go work.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-7200U" }, { key: "Display", value: "12.5 inch HD IPS" }, { key: "Battery", value: "Hot-swappable dual battery" }],
        [
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 19000, compareAt: 24000, stock: 8 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 24000, compareAt: 30000, stock: 5 },
        ],
        "Lenovo ThinkPad X270"
      );
      return {
        name: "Lenovo ThinkPad X270 (Refurbished)", description: "12.5-inch compact ThinkPad with 7th Gen i5. Hot-swappable battery. Ideal for students.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i3-1115G4" }, { key: "Display", value: "14 inch FHD" }],
        [
          { color: "Silver", ram: "4GB", storage: "256GB SSD", price: 20000, compareAt: 25000, stock: 14 },
          { color: "Silver", ram: "8GB", storage: "512GB SSD", price: 24000, compareAt: 30000, stock: 8 },
        ],
        "Dell Inspiron 14 3420"
      );
      return {
        name: "Dell Inspiron 14 3420 (Refurbished)", description: "14-inch budget-friendly refurbished Dell Inspiron. 11th Gen Intel i3, suitable for students.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6300U" }, { key: "Display", value: "14 inch QHD (2560x1440)" }, { key: "Build", value: "Carbon fiber and magnesium" }, { key: "Weight", value: "1.43 kg" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 22000, compareAt: 28000, stock: 6 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 27500, compareAt: 34000, stock: 4 },
        ],
        "HP EliteBook Folio 1040 G3"
      );
      return {
        name: "HP EliteBook Folio 1040 G3 (Refurbished)", description: "14-inch ultra-slim EliteBook. Carbon fiber chassis. Premium build.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-6200U" }, { key: "Display", value: "14 inch HD" }],
        [
          { color: "Black", ram: "4GB", storage: "500GB HDD", price: 14500, compareAt: 18000, stock: 16 },
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 17500, compareAt: 22000, stock: 9 },
        ],
        "Lenovo ThinkPad L460"
      );
      return {
        name: "Lenovo ThinkPad L460 (Refurbished)", description: "14-inch budget ThinkPad with i5 6th Gen. Great keyboard, reliable performance.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-8365U" }, { key: "Display", value: "13.3 inch FHD" }, { key: "Weight", value: "1.24 kg" }],
        [
          { color: "Black", ram: "8GB", storage: "256GB SSD", price: 25000, compareAt: 31000, stock: 7 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 31000, compareAt: 38000, stock: 4 },
        ],
        "Dell Latitude 5300"
      );
      return {
        name: "Dell Latitude 5300 (Refurbished)", description: "13.3-inch compact Dell business laptop. 8th Gen i5. Very portable.", condition: "refurbished" as const, categoryKey: "Refurbished Laptops", options, variants,
      };
    })(),

    {
      name: "HP EliteBook 820 G4 (Refurbished)",
      description: "12.5-inch ultra-portable HP EliteBook. 7th Gen i5, compact for travel.",
      condition: "refurbished" as const,
      categoryKey: "Refurbished Laptops",
      variants: [{
        name: "Default",
        price: 18000,
        compareAtPrice: 23000,
        stock: 11,
        isDefault: true,
        specs: [
          { key: "Processor", value: "Intel Core i5-7200U" },
          { key: "Display", value: "12.5 inch HD" },
          { key: "RAM", value: "8GB" },
          { key: "Storage", value: "256GB SSD" },
          { key: "Weight", value: "1.33 kg" },
        ],
        images: [{ url: placeholderImage("HP EliteBook 820 G4"), altText: "HP EliteBook 820 G4" }],
      }],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // NEW LAPTOPS (10) — with Configuration options
    // ═══════════════════════════════════════════════════════════════════════

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-1235U" }, { key: "Display", value: "15.6 inch FHD IPS" }, { key: "OS", value: "Windows 11 Home" }, { key: "Battery", value: "42Wh, up to 7 hours" }],
        [
          { color: "Silver", ram: "8GB", storage: "512GB SSD", price: 45000, stock: 20 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 50000, stock: 12 },
        ],
        "ASUS VivoBook 15 X1504ZA"
      );
      return {
        name: "ASUS VivoBook 15 X1504ZA", description: "15.6-inch with 12th Gen Intel i5. Slim NanoEdge display, long battery. Perfect for students and professionals.", condition: "new" as const, categoryKey: "New Laptops", isFeatured: true, options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i3-1215U" }, { key: "Display", value: "14 inch FHD" }, { key: "Weight", value: "1.5 kg" }],
        [
          { color: "Silver", ram: "8GB", storage: "256GB SSD", price: 35000, stock: 15 },
          { color: "Silver", ram: "8GB", storage: "512GB SSD", price: 37500, stock: 10 },
        ],
        "ASUS VivoBook 14 X1402ZA"
      );
      return {
        name: "ASUS VivoBook 14 X1402ZA", description: "14-inch compact ASUS VivoBook. 12th Gen i3, lightweight for daily commute.", condition: "new" as const, categoryKey: "New Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-1335U" }, { key: "Display", value: "15.6 inch FHD IPS" }, { key: "Audio", value: "Bang & Olufsen" }, { key: "Backlit Keyboard", value: "Yes" }],
        [
          { color: "Silver", ram: "8GB", storage: "512GB SSD", price: 55000, stock: 18 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 59000, stock: 8 },
        ],
        "HP Pavilion 15-eg3032TU"
      );
      return {
        name: "HP Pavilion 15-eg3032TU", description: "15.6-inch HP Pavilion with 13th Gen Intel i5. Sleek design with B&O audio.", condition: "new" as const, categoryKey: "New Laptops", isFeatured: true, options, variants,
      };
    })(),

    {
      name: "HP Pavilion 14-dv2014TU",
      description: "14-inch thin HP Pavilion with 12th Gen i5. Elegant natural silver finish.",
      condition: "new" as const,
      categoryKey: "New Laptops",
      variants: [singleVariant(52000, 10, [
        { key: "Processor", value: "Intel Core i5-1235U" },
        { key: "Display", value: "14 inch FHD IPS" },
        { key: "RAM", value: "16GB" },
        { key: "Storage", value: "512GB SSD" },
        { key: "Weight", value: "1.41 kg" },
      ], "HP Pavilion 14-dv2014TU")],
    },

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-1235U" }, { key: "Display", value: "15.6 inch FHD Anti-Glare" }, { key: "Audio", value: "Dolby Audio" }],
        [
          { color: "Grey", ram: "8GB", storage: "256GB SSD", price: 42000, stock: 14 },
          { color: "Grey", ram: "8GB", storage: "512GB SSD", price: 44000, stock: 10 },
        ],
        "Lenovo IdeaPad 3 15IAU7"
      );
      return {
        name: "Lenovo IdeaPad 3 15IAU7", description: "15.6-inch IdeaPad with 12th Gen Intel i5. Dolby Audio, anti-glare display. Excellent value.", condition: "new" as const, categoryKey: "New Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "AMD Ryzen 5 5500U" }, { key: "Display", value: "15.6 inch FHD IPS 300 nits" }, { key: "Build", value: "Aluminum top cover" }],
        [
          { color: "Grey", ram: "8GB", storage: "512GB SSD", price: 50000, stock: 11 },
          { color: "Grey", ram: "16GB", storage: "512GB SSD", price: 55000, stock: 6 },
        ],
        "Lenovo IdeaPad 5 15ALC05"
      );
      return {
        name: "Lenovo IdeaPad 5 15ALC05", description: "15.6-inch premium IdeaPad with AMD Ryzen 5. All-metal body, narrow bezels.", condition: "new" as const, categoryKey: "New Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-1235U" }, { key: "Display", value: "15.6 inch FHD WVA" }, { key: "OS", value: "Windows 11 Home + Office 2021" }],
        [
          { color: "Black", ram: "8GB", storage: "512GB SSD", price: 48000, stock: 16 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 52000, stock: 9 },
        ],
        "Dell Inspiron 15 3520"
      );
      return {
        name: "Dell Inspiron 15 3520", description: "15.6-inch Dell Inspiron with 12th Gen i5. Carbon black finish, ComfortView display.", condition: "new" as const, categoryKey: "New Laptops", options, variants,
      };
    })(),

    {
      name: "Dell Inspiron 14 5430",
      description: "14-inch premium Dell Inspiron with 13th Gen i5. Slim, lightweight, 16:10 display.",
      condition: "new" as const,
      categoryKey: "New Laptops",
      variants: [singleVariant(62000, 8, [
        { key: "Processor", value: "Intel Core i5-1340P" },
        { key: "Display", value: "14 inch 2.5K (2560x1600) IPS" },
        { key: "RAM", value: "16GB" },
        { key: "Storage", value: "512GB SSD" },
        { key: "Weight", value: "1.48 kg" },
      ], "Dell Inspiron 14 5430")],
    },

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-1235U" }, { key: "Display", value: "15.6 inch FHD IPS" }, { key: "Ports", value: "Thunderbolt 4, USB 3.2, HDMI 2.0" }],
        [
          { color: "Silver", ram: "8GB", storage: "512GB SSD", price: 43000, stock: 13 },
          { color: "Silver", ram: "16GB", storage: "512GB SSD", price: 47500, stock: 7 },
        ],
        "Acer Aspire 5 A515-57"
      );
      return {
        name: "Acer Aspire 5 A515-57", description: "15.6-inch Acer Aspire with 12th Gen i5. Best value for money in the mid-range.", condition: "new" as const, categoryKey: "New Laptops", options, variants,
      };
    })(),

    (() => {
      const { options, variants } = laptopVariants(
        [{ key: "Processor", value: "Intel Core i5-12450H" }, { key: "Graphics", value: "NVIDIA GTX 1650 4GB" }, { key: "Display", value: "15.6 inch FHD IPS 144Hz" }],
        [
          { color: "Black", ram: "8GB", storage: "512GB SSD", price: 58000, stock: 10 },
          { color: "Black", ram: "16GB", storage: "512GB SSD", price: 63000, stock: 5 },
        ],
        "Acer Aspire 7 A715-76G"
      );
      return {
        name: "Acer Aspire 7 A715-76G", description: "15.6-inch with dedicated NVIDIA GTX 1650 GPU. Gaming and creative workloads.", condition: "new" as const, categoryKey: "New Laptops", isFeatured: true, options, variants,
      };
    })(),

    // ═══════════════════════════════════════════════════════════════════════
    // PROCESSORS (10) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Intel Core i3-10100", description: "10th Gen Intel Core i3. 4 cores, 8 threads. Excellent for basic builds and office PCs.", condition: "new" as const, categoryKey: "Processors",
      options: [{ name: "Packaging", values: ["Tray", "Box"] }],
      variants: [
        { name: "Tray (without cooler)", price: 7500, stock: 25, specs: [{ key: "Cores / Threads", value: "4 / 8" }, { key: "Base Clock", value: "3.6 GHz" }, { key: "Socket", value: "LGA 1200" }, { key: "TDP", value: "65W" }, { key: "Packaging", value: "Tray" }], images: [{ url: placeholderImage("Intel i3-10100 Tray"), altText: "Intel i3-10100 Tray" }], optionValues: { Packaging: "Tray" } },
        { name: "Box (with cooler)", price: 8300, stock: 18, specs: [{ key: "Cores / Threads", value: "4 / 8" }, { key: "Base Clock", value: "3.6 GHz" }, { key: "Socket", value: "LGA 1200" }, { key: "TDP", value: "65W" }, { key: "Packaging", value: "Box" }], images: [{ url: placeholderImage("Intel i3-10100 Box"), altText: "Intel i3-10100 Box" }], optionValues: { Packaging: "Box" } },
      ],
    },

    {
      name: "Intel Core i5-10400", description: "10th Gen Intel Core i5, 6 cores, 12 threads. Sweet spot for gaming and productivity.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(10500, 30, [{ key: "Cores / Threads", value: "6 / 12" }, { key: "Base Clock", value: "2.9 GHz" }, { key: "Boost Clock", value: "4.3 GHz" }, { key: "Socket", value: "LGA 1200" }], "Intel Core i5-10400")],
    },

    {
      name: "Intel Core i5-12400", description: "12th Gen Alder Lake i5 with P and E cores. Great single-core performance.", condition: "new" as const, categoryKey: "Processors", isFeatured: true,
      variants: [singleVariant(15000, 22, [{ key: "Cores / Threads", value: "6P+0E / 12" }, { key: "Base Clock", value: "2.5 GHz" }, { key: "Boost Clock", value: "4.4 GHz" }, { key: "Socket", value: "LGA 1700" }], "Intel Core i5-12400")],
    },

    {
      name: "Intel Core i7-10700", description: "10th Gen Intel Core i7 with 8 cores. High-performance for demanding tasks.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(22000, 15, [{ key: "Cores / Threads", value: "8 / 16" }, { key: "Base Clock", value: "2.9 GHz" }, { key: "Boost Clock", value: "4.8 GHz" }, { key: "Socket", value: "LGA 1200" }], "Intel Core i7-10700")],
    },

    {
      name: "Intel Core i7-12700", description: "12th Gen i7 powerhouse with 12 cores (8P+4E). Dominate in both single and multi-threaded.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(30000, 10, [{ key: "Cores / Threads", value: "8P+4E / 20" }, { key: "Boost Clock", value: "4.9 GHz" }, { key: "Socket", value: "LGA 1700" }, { key: "TDP", value: "65W (PBP)" }], "Intel Core i7-12700")],
    },

    {
      name: "AMD Ryzen 3 3200G", description: "AMD Ryzen 3 APU with Radeon Vega 8 integrated graphics. Budget PC without a dedicated GPU.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(6500, 20, [{ key: "Cores / Threads", value: "4 / 4" }, { key: "Base Clock", value: "3.6 GHz" }, { key: "iGPU", value: "Radeon Vega 8" }, { key: "Socket", value: "AM4" }], "AMD Ryzen 3 3200G")],
    },

    {
      name: "AMD Ryzen 5 3600", description: "6-core Zen 2 processor. Legendary value king for gaming and productivity.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(10000, 28, [{ key: "Cores / Threads", value: "6 / 12" }, { key: "Base Clock", value: "3.6 GHz" }, { key: "Boost Clock", value: "4.2 GHz" }, { key: "Socket", value: "AM4" }], "AMD Ryzen 5 3600")],
    },

    {
      name: "AMD Ryzen 5 5600X", description: "Zen 3 architecture with massive IPC gains. Best gaming CPU in the mid-range.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(16000, 18, [{ key: "Cores / Threads", value: "6 / 12" }, { key: "Base Clock", value: "3.7 GHz" }, { key: "Boost Clock", value: "4.6 GHz" }, { key: "Socket", value: "AM4" }], "AMD Ryzen 5 5600X")],
    },

    {
      name: "AMD Ryzen 7 5800X", description: "8-core Zen 3 beast. Top-tier for gaming and content creation.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(24000, 12, [{ key: "Cores / Threads", value: "8 / 16" }, { key: "Base Clock", value: "3.8 GHz" }, { key: "Boost Clock", value: "4.7 GHz" }, { key: "Socket", value: "AM4" }, { key: "TDP", value: "105W" }], "AMD Ryzen 7 5800X")],
    },

    {
      name: "AMD Ryzen 9 5900X", description: "12-core Zen 3 flagship. Unmatched multi-threaded performance for creators.", condition: "new" as const, categoryKey: "Processors",
      variants: [singleVariant(35000, 6, [{ key: "Cores / Threads", value: "12 / 24" }, { key: "Base Clock", value: "3.7 GHz" }, { key: "Boost Clock", value: "4.8 GHz" }, { key: "Socket", value: "AM4" }, { key: "TDP", value: "105W" }], "AMD Ryzen 9 5900X")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MOTHERBOARDS (8) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Gigabyte B450M DS3H V2", description: "Micro-ATX AM4 motherboard. Budget-friendly for Ryzen builds.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(5500, 20, [{ key: "Socket", value: "AM4" }, { key: "Form Factor", value: "Micro-ATX" }, { key: "RAM Slots", value: "2x DDR4 (up to 64GB)" }, { key: "M.2 Slot", value: "1x NVMe" }], "Gigabyte B450M DS3H V2")],
    },

    {
      name: "Gigabyte B550M DS3H", description: "B550 Micro-ATX with PCIe 4.0 support. Great mid-range board for Ryzen 5000.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(8500, 15, [{ key: "Socket", value: "AM4" }, { key: "Form Factor", value: "Micro-ATX" }, { key: "PCIe", value: "PCIe 4.0 x16" }, { key: "RAM Slots", value: "4x DDR4 (up to 128GB)" }], "Gigabyte B550M DS3H")],
    },

    {
      name: "Gigabyte H510M H", description: "Intel H510 Micro-ATX board for 10th/11th Gen Intel CPUs. Basic yet reliable.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(5800, 22, [{ key: "Socket", value: "LGA 1200" }, { key: "Form Factor", value: "Micro-ATX" }, { key: "RAM Slots", value: "2x DDR4" }, { key: "Audio", value: "Realtek ALC887" }], "Gigabyte H510M H")],
    },

    {
      name: "ASUS Prime B450M-A II", description: "Reliable AM4 Micro-ATX board. LED lighting, Aura Sync, solid VRM.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(6800, 18, [{ key: "Socket", value: "AM4" }, { key: "Form Factor", value: "Micro-ATX" }, { key: "RAM Slots", value: "4x DDR4" }, { key: "Features", value: "Aura Sync RGB, M.2 slot" }], "ASUS Prime B450M-A II")],
    },

    {
      name: "ASUS Prime B550M-A", description: "B550 Micro-ATX with PCIe 4.0 and dual M.2 slots. Excellent for Ryzen 5000.", condition: "new" as const, categoryKey: "Motherboards", isFeatured: true,
      options: [{ name: "Variant", values: ["Standard", "WiFi Edition"] }],
      variants: [
        { name: "Standard", price: 9500, stock: 14, specs: [{ key: "Socket", value: "AM4" }, { key: "PCIe", value: "PCIe 4.0" }, { key: "M.2 Slots", value: "2x (1x PCIe 4.0)" }, { key: "USB", value: "USB 3.2 Gen 2 Type-A & Type-C" }], images: [{ url: placeholderImage("ASUS Prime B550M-A"), altText: "ASUS Prime B550M-A" }], optionValues: { Variant: "Standard" } },
        { name: "WiFi Edition", price: 12000, stock: 8, specs: [{ key: "Socket", value: "AM4" }, { key: "PCIe", value: "PCIe 4.0" }, { key: "M.2 Slots", value: "2x (1x PCIe 4.0)" }, { key: "USB", value: "USB 3.2 Gen 2 Type-A & Type-C" }, { key: "WiFi", value: "WiFi 6" }], images: [{ url: placeholderImage("ASUS Prime B550M-A WiFi"), altText: "ASUS Prime B550M-A WiFi" }], optionValues: { Variant: "WiFi Edition" } },
      ],
    },

    {
      name: "MSI B450M PRO-VDH MAX", description: "Budget B450 by MSI with Ryzen 5000 support out of the box.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(5800, 20, [{ key: "Socket", value: "AM4" }, { key: "Form Factor", value: "Micro-ATX" }, { key: "RAM Slots", value: "4x DDR4 (up to 128GB)" }, { key: "VRM", value: "Core Boost, DDR4 Boost" }], "MSI B450M PRO-VDH MAX")],
    },

    {
      name: "MSI B550M PRO-VDH WiFi", description: "B550 with built-in WiFi 6 and Bluetooth 5.1. Great all-rounder.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(10500, 12, [{ key: "Socket", value: "AM4" }, { key: "WiFi", value: "WiFi 6 (802.11ax)" }, { key: "Bluetooth", value: "5.1" }, { key: "M.2 Slots", value: "2x" }], "MSI B550M PRO-VDH WiFi")],
    },

    {
      name: "ASRock B450M Steel Legend", description: "Stylish Micro-ATX with Steel Legend aesthetics. Good VRM and RGB.", condition: "new" as const, categoryKey: "Motherboards",
      variants: [singleVariant(7200, 16, [{ key: "Socket", value: "AM4" }, { key: "Form Factor", value: "Micro-ATX" }, { key: "Features", value: "Polychrome Sync RGB" }, { key: "Networking", value: "Gigabit LAN" }], "ASRock B450M Steel Legend")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RAM & MEMORY (8) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Kingston ValueRAM 4GB DDR4 2666MHz", description: "4GB DDR4 desktop RAM. Budget option for basic builds.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(1200, 40, [{ key: "Capacity", value: "4GB" }, { key: "Type", value: "DDR4" }, { key: "Speed", value: "2666 MHz" }, { key: "Form Factor", value: "DIMM (Desktop)" }], "Kingston ValueRAM 4GB DDR4")],
    },

    {
      name: "Kingston ValueRAM 8GB DDR4 3200MHz", description: "8GB DDR4 desktop RAM at 3200MHz. Mainstream choice for most builds.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(2200, 35, [{ key: "Capacity", value: "8GB" }, { key: "Speed", value: "3200 MHz" }, { key: "CAS Latency", value: "CL22" }], "Kingston ValueRAM 8GB DDR4")],
    },

    {
      name: "Kingston ValueRAM 16GB DDR4 3200MHz", description: "16GB DDR4 for power users. Great for multitasking and creative work.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(4000, 25, [{ key: "Capacity", value: "16GB" }, { key: "Speed", value: "3200 MHz" }, { key: "Voltage", value: "1.2V" }], "Kingston ValueRAM 16GB DDR4")],
    },

    {
      name: "Corsair Vengeance LPX 8GB DDR4 3200MHz", description: "Premium 8GB DDR4 with low-profile heatspreader. XMP 2.0 for easy overclocking.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(2600, 30, [{ key: "Capacity", value: "8GB" }, { key: "Speed", value: "3200 MHz" }, { key: "Heatspreader", value: "Aluminum, low profile" }], "Corsair Vengeance LPX 8GB")],
    },

    {
      name: "Corsair Vengeance LPX 16GB DDR4 3200MHz", description: "16GB DDR4 high-performance memory. Ideal for gaming rigs and workstations.", condition: "new" as const, categoryKey: "RAM & Memory", isFeatured: true,
      variants: [singleVariant(4800, 20, [{ key: "Capacity", value: "16GB" }, { key: "Speed", value: "3200 MHz" }, { key: "XMP", value: "XMP 2.0 supported" }], "Corsair Vengeance LPX 16GB")],
    },

    {
      name: "Corsair Vengeance LPX 32GB DDR4 3200MHz", description: "32GB kit (2x16GB) for heavy workloads. Video editing, 3D rendering, and VMs.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(8000, 10, [{ key: "Capacity", value: "32GB (2x16GB)" }, { key: "Speed", value: "3200 MHz" }, { key: "CAS Latency", value: "CL16" }], "Corsair Vengeance LPX 32GB")],
    },

    {
      name: "Crucial 8GB DDR4 2666MHz", description: "Crucial 8GB DDR4 desktop memory. Reliable and affordable.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(2000, 35, [{ key: "Capacity", value: "8GB" }, { key: "Speed", value: "2666 MHz" }, { key: "Warranty", value: "Lifetime limited" }], "Crucial 8GB DDR4 2666MHz")],
    },

    {
      name: "Crucial 16GB DDR4 3200MHz", description: "Crucial 16GB DDR4 desktop memory. Micron quality at competitive pricing.", condition: "new" as const, categoryKey: "RAM & Memory",
      variants: [singleVariant(3800, 22, [{ key: "Capacity", value: "16GB" }, { key: "Speed", value: "3200 MHz" }], "Crucial 16GB DDR4 3200MHz")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SSD (8) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Samsung 870 EVO 250GB SATA SSD", description: "250GB 2.5-inch SATA SSD. Legendary reliability and V-NAND technology.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(2800, 30, [{ key: "Capacity", value: "250GB" }, { key: "Interface", value: "SATA III (6 Gbps)" }, { key: "Read Speed", value: "560 MB/s" }, { key: "Write Speed", value: "530 MB/s" }], "Samsung 870 EVO 250GB")],
    },

    {
      name: "Samsung 870 EVO 500GB SATA SSD", description: "500GB Samsung 870 EVO. Best-in-class SATA SSD for OS and applications.", condition: "new" as const, categoryKey: "SSD", isFeatured: true,
      variants: [singleVariant(4200, 25, [{ key: "Capacity", value: "500GB" }, { key: "Interface", value: "SATA III" }, { key: "Read Speed", value: "560 MB/s" }, { key: "Endurance", value: "300 TBW" }], "Samsung 870 EVO 500GB")],
    },

    {
      name: "Samsung 870 EVO 1TB SATA SSD", description: "1TB Samsung 870 EVO for ample storage with SSD speed.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(7000, 15, [{ key: "Capacity", value: "1TB" }, { key: "Interface", value: "SATA III" }, { key: "Read Speed", value: "560 MB/s" }, { key: "Endurance", value: "600 TBW" }], "Samsung 870 EVO 1TB")],
    },

    {
      name: "WD Blue SN570 250GB NVMe SSD", description: "250GB M.2 NVMe SSD. 4x faster than SATA SSDs.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(2500, 28, [{ key: "Capacity", value: "250GB" }, { key: "Interface", value: "M.2 NVMe PCIe Gen 3" }, { key: "Read Speed", value: "3300 MB/s" }, { key: "Write Speed", value: "1200 MB/s" }], "WD Blue SN570 250GB")],
    },

    {
      name: "WD Blue SN570 500GB NVMe SSD", description: "500GB M.2 NVMe SSD. Perfect balance of speed and capacity.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(3500, 22, [{ key: "Capacity", value: "500GB" }, { key: "Interface", value: "M.2 NVMe PCIe Gen 3" }, { key: "Read Speed", value: "3500 MB/s" }, { key: "Write Speed", value: "2300 MB/s" }], "WD Blue SN570 500GB")],
    },

    {
      name: "WD Blue SN570 1TB NVMe SSD", description: "1TB NVMe SSD for power users. Fast boot, fast loads.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(5500, 14, [{ key: "Capacity", value: "1TB" }, { key: "Interface", value: "M.2 NVMe PCIe Gen 3" }, { key: "Read Speed", value: "3500 MB/s" }, { key: "Write Speed", value: "3000 MB/s" }], "WD Blue SN570 1TB")],
    },

    {
      name: "Crucial BX500 240GB SATA SSD", description: "240GB budget SATA SSD. Perfect upgrade from HDD to SSD.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(2000, 35, [{ key: "Capacity", value: "240GB" }, { key: "Interface", value: "SATA III" }, { key: "Read Speed", value: "540 MB/s" }, { key: "Write Speed", value: "500 MB/s" }], "Crucial BX500 240GB")],
    },

    {
      name: "Crucial BX500 480GB SATA SSD", description: "480GB budget SSD. Affordable storage upgrade.", condition: "new" as const, categoryKey: "SSD",
      variants: [singleVariant(3200, 20, [{ key: "Capacity", value: "480GB" }, { key: "Interface", value: "SATA III" }, { key: "Read Speed", value: "540 MB/s" }], "Crucial BX500 480GB")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // HDD (4) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Seagate Barracuda 500GB 3.5\" HDD", description: "500GB 7200RPM desktop hard drive. Reliable storage.", condition: "new" as const, categoryKey: "HDD",
      variants: [singleVariant(2200, 25, [{ key: "Capacity", value: "500GB" }, { key: "RPM", value: "7200" }, { key: "Interface", value: "SATA III" }, { key: "Cache", value: "32MB" }], "Seagate 500GB HDD")],
    },

    {
      name: "Seagate Barracuda 1TB 3.5\" HDD", description: "1TB desktop HDD. Industry-standard reliable storage.", condition: "new" as const, categoryKey: "HDD",
      variants: [singleVariant(3000, 30, [{ key: "Capacity", value: "1TB" }, { key: "RPM", value: "7200" }, { key: "Interface", value: "SATA III" }, { key: "Cache", value: "64MB" }], "Seagate 1TB HDD")],
    },

    {
      name: "Seagate Barracuda 2TB 3.5\" HDD", description: "2TB desktop HDD for bulk storage. Games, movies, backups.", condition: "new" as const, categoryKey: "HDD",
      variants: [singleVariant(4500, 18, [{ key: "Capacity", value: "2TB" }, { key: "RPM", value: "7200" }, { key: "Cache", value: "256MB" }], "Seagate 2TB HDD")],
    },

    {
      name: "WD Blue 1TB 3.5\" HDD", description: "1TB Western Digital Blue. Quiet, reliable, energy-efficient.", condition: "new" as const, categoryKey: "HDD",
      variants: [singleVariant(3200, 22, [{ key: "Capacity", value: "1TB" }, { key: "RPM", value: "7200" }, { key: "Interface", value: "SATA III" }, { key: "Noise", value: "Quiet operation (WhisperDrive)" }], "WD Blue 1TB HDD")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // GRAPHICS CARDS (6) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "NVIDIA GeForce GT 710 2GB DDR3", description: "Entry-level GPU for display output. HDMI, VGA, DVI.", condition: "new" as const, categoryKey: "Graphics Cards",
      variants: [singleVariant(4000, 20, [{ key: "Memory", value: "2GB DDR3" }, { key: "Interface", value: "PCIe 2.0 x8" }, { key: "Outputs", value: "HDMI, VGA, DVI" }, { key: "TDP", value: "19W (no external power)" }], "NVIDIA GT 710 2GB")],
    },

    {
      name: "NVIDIA GeForce GT 1030 2GB GDDR5", description: "Low-profile GPU for compact builds. Light gaming at 720p/1080p.", condition: "new" as const, categoryKey: "Graphics Cards",
      variants: [singleVariant(7000, 14, [{ key: "Memory", value: "2GB GDDR5" }, { key: "Clock", value: "1228 MHz (Boost: 1468 MHz)" }, { key: "TDP", value: "30W" }], "NVIDIA GT 1030 2GB")],
    },

    {
      name: "NVIDIA GeForce GTX 1650 4GB GDDR6", description: "Popular mid-range GPU for 1080p gaming. No external power needed.", condition: "new" as const, categoryKey: "Graphics Cards", isFeatured: true,
      variants: [singleVariant(14000, 10, [{ key: "Memory", value: "4GB GDDR6" }, { key: "CUDA Cores", value: "896" }, { key: "Clock", value: "1410 MHz (Boost: 1590 MHz)" }, { key: "TDP", value: "75W" }], "NVIDIA GTX 1650 4GB")],
    },

    {
      name: "NVIDIA GeForce RTX 3060 12GB", description: "RTX 3060 with ray tracing and DLSS. Excellent 1080p and solid 1440p gaming.", condition: "new" as const, categoryKey: "Graphics Cards",
      variants: [singleVariant(28000, 6, [{ key: "Memory", value: "12GB GDDR6" }, { key: "CUDA Cores", value: "3584" }, { key: "Ray Tracing", value: "2nd Gen RT Cores" }, { key: "TDP", value: "170W" }], "NVIDIA RTX 3060 12GB")],
    },

    {
      name: "AMD Radeon RX 550 4GB", description: "Budget AMD GPU for display and light gaming. Compact single-slot.", condition: "new" as const, categoryKey: "Graphics Cards",
      variants: [singleVariant(6500, 15, [{ key: "Memory", value: "4GB GDDR5" }, { key: "Stream Processors", value: "512" }, { key: "TDP", value: "50W" }], "AMD RX 550 4GB")],
    },

    {
      name: "AMD Radeon RX 580 8GB", description: "8GB RX 580 for 1080p gaming. Good value.", condition: "new" as const, categoryKey: "Graphics Cards",
      variants: [singleVariant(15000, 8, [{ key: "Memory", value: "8GB GDDR5" }, { key: "Stream Processors", value: "2304" }, { key: "Clock", value: "1257 MHz (Boost: 1340 MHz)" }, { key: "TDP", value: "185W" }], "AMD RX 580 8GB")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ICs & COMPONENTS (8) — single variant (Default)
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Arduino Uno R3 Compatible Board", description: "ATmega328P based dev board. Compatible with Arduino IDE. Great for learning.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(450, 50, [{ key: "MCU", value: "ATmega328P" }, { key: "Clock", value: "16 MHz" }, { key: "I/O Pins", value: "14 digital, 6 analog" }], "Arduino Uno R3")],
    },

    {
      name: "Raspberry Pi Pico W", description: "RP2040 microcontroller with WiFi. Dual-core ARM Cortex-M0+. Affordable IoT.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(750, 35, [{ key: "MCU", value: "RP2040 (Dual ARM Cortex-M0+)" }, { key: "Clock", value: "133 MHz" }, { key: "WiFi", value: "802.11n" }], "Raspberry Pi Pico W")],
    },

    {
      name: "ESP32 Development Board", description: "WiFi + Bluetooth dual-core ESP32. Popular for IoT projects.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(350, 60, [{ key: "MCU", value: "ESP32-WROOM-32" }, { key: "WiFi", value: "802.11 b/g/n" }, { key: "Bluetooth", value: "v4.2 BR/EDR + BLE" }], "ESP32 Dev Board")],
    },

    {
      name: "Resistor Kit 600pcs (1/4W)", description: "600 pieces assorted resistor kit, 30 values. Essential for electronics.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(200, 45, [{ key: "Quantity", value: "600 pieces (30 values x 20)" }, { key: "Power Rating", value: "1/4 Watt" }, { key: "Tolerance", value: "1%" }], "Resistor Kit 600pcs")],
    },

    {
      name: "Ceramic Capacitor Kit 300pcs", description: "300 pieces assorted ceramic capacitors. Common values for PCB repair.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(250, 40, [{ key: "Quantity", value: "300 pieces (15 values)" }, { key: "Voltage", value: "50V" }, { key: "Type", value: "Multilayer ceramic (MLCC)" }], "Capacitor Kit 300pcs")],
    },

    {
      name: "LM7805 Voltage Regulator IC (5-pack)", description: "5V 1A linear voltage regulator. Essential for power supply circuits.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(150, 80, [{ key: "Output Voltage", value: "5V" }, { key: "Max Current", value: "1A" }, { key: "Package", value: "TO-220" }], "LM7805 5-pack")],
    },

    {
      name: "NE555 Timer IC (10-pack)", description: "Classic 555 timer IC for timing, pulse generation, and oscillators.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(120, 90, [{ key: "Type", value: "Timer/Oscillator" }, { key: "Package", value: "DIP-8" }, { key: "Voltage", value: "4.5V - 16V" }], "NE555 Timer 10-pack")],
    },

    {
      name: "Breadboard 830-point + Jumper Wire Kit", description: "Full-size 830-point breadboard with 65 jumper wires. Must-have for prototyping.", condition: "new" as const, categoryKey: "ICs & Components",
      variants: [singleVariant(250, 55, [{ key: "Points", value: "830 tie-points" }, { key: "Jumper Wires", value: "65 pcs (M-M)" }, { key: "Dimensions", value: "165 x 55 mm" }], "Breadboard + Jumper Kit")],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ACCESSORIES (8) — some with color options, most single variant
    // ═══════════════════════════════════════════════════════════════════════

    {
      name: "Logitech K120 Wired Keyboard", description: "Full-size wired USB keyboard. Spill-resistant, quiet keys. India's most popular office keyboard.", condition: "new" as const, categoryKey: "Accessories",
      variants: [singleVariant(500, 40, [{ key: "Type", value: "Membrane, Full-size" }, { key: "Connection", value: "USB" }, { key: "Layout", value: "Indian (QWERTY)" }], "Logitech K120")],
    },

    {
      name: "Logitech M185 Wireless Mouse", description: "Compact wireless mouse with nano receiver. 12-month battery life.", condition: "new" as const, categoryKey: "Accessories",
      options: [{ name: "Color", values: ["Grey", "Blue", "Red"] }],
      variants: [
        { name: "Grey", price: 600, stock: 30, specs: [{ key: "Connection", value: "2.4 GHz wireless" }, { key: "Battery", value: "1x AA (up to 12 months)" }, { key: "DPI", value: "1000" }, { key: "Color", value: "Grey" }], images: [{ url: placeholderImage("Logitech M185 Grey"), altText: "Logitech M185 Grey" }], optionValues: { Color: "Grey" } },
        { name: "Blue", price: 600, stock: 25, specs: [{ key: "Connection", value: "2.4 GHz wireless" }, { key: "Battery", value: "1x AA (up to 12 months)" }, { key: "DPI", value: "1000" }, { key: "Color", value: "Blue" }], images: [{ url: placeholderImage("Logitech M185 Blue"), altText: "Logitech M185 Blue" }], optionValues: { Color: "Blue" } },
        { name: "Red", price: 600, stock: 20, specs: [{ key: "Connection", value: "2.4 GHz wireless" }, { key: "Battery", value: "1x AA (up to 12 months)" }, { key: "DPI", value: "1000" }, { key: "Color", value: "Red" }], images: [{ url: placeholderImage("Logitech M185 Red"), altText: "Logitech M185 Red" }], optionValues: { Color: "Red" } },
      ],
    },

    {
      name: "Laptop Bag 15.6\" - Nylon", description: "Water-resistant nylon laptop bag. Fits up to 15.6 inch. Multiple compartments.", condition: "new" as const, categoryKey: "Accessories",
      options: [{ name: "Color", values: ["Black", "Grey"] }],
      variants: [
        { name: "Black", price: 800, stock: 35, specs: [{ key: "Fits", value: "Up to 15.6 inch laptops" }, { key: "Material", value: "Water-resistant nylon" }, { key: "Color", value: "Black" }], images: [{ url: placeholderImage("Laptop Bag Black"), altText: "Laptop Bag Black" }], optionValues: { Color: "Black" } },
        { name: "Grey", price: 800, stock: 25, specs: [{ key: "Fits", value: "Up to 15.6 inch laptops" }, { key: "Material", value: "Water-resistant nylon" }, { key: "Color", value: "Grey" }], images: [{ url: placeholderImage("Laptop Bag Grey"), altText: "Laptop Bag Grey" }], optionValues: { Color: "Grey" } },
      ],
    },

    {
      name: "USB 3.0 Hub 4-Port", description: "4-port USB 3.0 hub. Compact and portable.", condition: "new" as const, categoryKey: "Accessories",
      variants: [singleVariant(450, 30, [{ key: "Ports", value: "4x USB 3.0 Type-A" }, { key: "Speed", value: "5 Gbps" }, { key: "Compatibility", value: "Windows, Mac, Linux" }], "USB 3.0 Hub 4-Port")],
    },

    {
      name: "HDMI Cable 1.5m (4K)", description: "1.5-meter HDMI 2.0 cable supporting 4K@60Hz. Gold-plated connectors.", condition: "new" as const, categoryKey: "Accessories",
      options: [{ name: "Length", values: ["1.5 meter", "3 meter", "5 meter"] }],
      variants: [
        { name: "1.5 meter", price: 300, stock: 45, specs: [{ key: "Version", value: "HDMI 2.0" }, { key: "Resolution", value: "4K@60Hz" }, { key: "Length", value: "1.5m" }], images: [{ url: placeholderImage("HDMI Cable 1.5m"), altText: "HDMI Cable 1.5m" }], optionValues: { Length: "1.5 meter" } },
        { name: "3 meter", price: 450, stock: 30, specs: [{ key: "Version", value: "HDMI 2.0" }, { key: "Resolution", value: "4K@60Hz" }, { key: "Length", value: "3m" }], images: [{ url: placeholderImage("HDMI Cable 3m"), altText: "HDMI Cable 3m" }], optionValues: { Length: "3 meter" } },
        { name: "5 meter", price: 650, stock: 20, specs: [{ key: "Version", value: "HDMI 2.0" }, { key: "Resolution", value: "4K@60Hz" }, { key: "Length", value: "5m" }], images: [{ url: placeholderImage("HDMI Cable 5m"), altText: "HDMI Cable 5m" }], optionValues: { Length: "5 meter" } },
      ],
    },

    {
      name: "USB Webcam 1080p with Mic", description: "Full HD 1080p USB webcam with built-in microphone. Auto-focus, plug and play.", condition: "new" as const, categoryKey: "Accessories",
      variants: [singleVariant(1200, 18, [{ key: "Resolution", value: "1080p Full HD" }, { key: "Microphone", value: "Built-in noise cancelling" }, { key: "Focus", value: "Auto-focus" }], "USB Webcam 1080p")],
    },

    {
      name: "Zebronics Zeb-Thunder Headset", description: "Over-ear wired headset with mic. Padded ear cushions, adjustable headband.", condition: "new" as const, categoryKey: "Accessories",
      variants: [singleVariant(500, 25, [{ key: "Type", value: "Over-ear wired" }, { key: "Driver", value: "40mm" }, { key: "Mic", value: "Flexible boom mic" }, { key: "Connection", value: "3.5mm jack" }], "Zebronics Zeb-Thunder")],
    },

    {
      name: "Adjustable Laptop Stand (Aluminum)", description: "Ergonomic aluminum laptop stand. Adjustable height and angle. Fits 10-17 inch.", condition: "new" as const, categoryKey: "Accessories",
      options: [{ name: "Color", values: ["Silver", "Space Grey"] }],
      variants: [
        { name: "Silver", price: 1500, stock: 15, specs: [{ key: "Material", value: "Aluminum alloy" }, { key: "Fits", value: "10-17 inch laptops" }, { key: "Color", value: "Silver" }], images: [{ url: placeholderImage("Laptop Stand Silver"), altText: "Laptop Stand Silver" }], optionValues: { Color: "Silver" } },
        { name: "Space Grey", price: 1500, stock: 12, specs: [{ key: "Material", value: "Aluminum alloy" }, { key: "Fits", value: "10-17 inch laptops" }, { key: "Color", value: "Space Grey" }], images: [{ url: placeholderImage("Laptop Stand Grey"), altText: "Laptop Stand Space Grey" }], optionValues: { Color: "Space Grey" } },
      ],
    },
  ];

  // ── Insert products with variants as JSONB ──────

  let skuCounter = 1;
  const allProductIds: string[] = [];
  const allProductPrices: number[] = [];
  const allProductNames: string[] = [];
  const allVariantNames: string[] = [];
  let totalVariantCount = 0;

  for (const p of allProductData) {
    // Build variants JSONB array
    const variantsJson = p.variants.map((v, vi) => {
      const catPrefix = p.categoryKey.substring(0, 3).toUpperCase();
      const sku = generateSku(catPrefix, skuCounter++);
      return {
        variantId: crypto.randomUUID(),
        name: v.name,
        sku,
        price: paise(v.price),
        compareAtPrice: v.compareAtPrice ? paise(v.compareAtPrice) : null,
        images: v.images,
        specs: v.specs,
        stock: v.stock,
        isDefault: v.isDefault ?? vi === 0,
        isActive: true,
      };
    });

    // Use default variant (or first) for product-level fields
    const defaultVariant = variantsJson.find((v) => v.isDefault) ?? variantsJson[0];
    const totalStock = variantsJson.reduce((sum, v) => sum + v.stock, 0);

    const [product] = await db
      .insert(products)
      .values({
        categoryId: catMap[p.categoryKey],
        name: p.name,
        slug: slugify(p.name),
        description: p.description,
        condition: p.condition,
        sku: defaultVariant.sku,
        basePrice: defaultVariant.price,
        compareAtPrice: defaultVariant.compareAtPrice,
        images: defaultVariant.images,
        specs: defaultVariant.specs,
        stock: totalStock,
        lowStockThreshold: 2,
        variants: variantsJson,
        isFeatured: p.isFeatured ?? false,
        isActive: true,
      })
      .returning();

    // Track for order seeding
    for (const v of variantsJson) {
      allProductIds.push(product.id);
      allProductPrices.push(v.price);
      allProductNames.push(p.name);
      allVariantNames.push(v.name);
      totalVariantCount++;
    }
  }

  console.log(`     Created ${allProductData.length} products with ${totalVariantCount} variants (JSONB).`);

  // ── 4. Inventory History ──────────────────────────────────────────────

  console.log("4/8  Creating inventory history records...");

  let historyCount = 0;
  for (let i = 0; i < allProductIds.length; i++) {
    const stock = allProductData
      .flatMap((p) => p.variants)
      [i]?.stock;

    if (stock && stock > 0) {
      await db.insert(inventoryHistory).values({
        productId: allProductIds[i],
        changeQuantity: stock,
        reason: "purchase",
        note: "Initial stock from supplier",
      });
      historyCount++;
    }
  }

  console.log(`     Created ${historyCount} inventory history records.`);

  // ── 5. Orders ──────────────────────────────────────────────────────────

  console.log("5/8  Creating orders...");

  const customerData = [
    { name: "Rahul Sharma", city: "Patna", pincode: "800001" },
    { name: "Priya Singh", city: "Patna", pincode: "800020" },
    { name: "Amit Kumar", city: "Patna", pincode: "800004" },
    { name: "Sneha Patel", city: "Gaya", pincode: "823001" },
    { name: "Vikash Yadav", city: "Muzaffarpur", pincode: "842001" },
    { name: "Anjali Kumari", city: "Bhagalpur", pincode: "812001" },
    { name: "Rajesh Prasad", city: "Patna", pincode: "800014" },
    { name: "Pooja Verma", city: "Darbhanga", pincode: "846004" },
    { name: "Sunil Gupta", city: "Patna", pincode: "800025" },
    { name: "Neha Sinha", city: "Gaya", pincode: "823002" },
    { name: "Manish Tiwari", city: "Bhagalpur", pincode: "812002" },
    { name: "Ritu Devi", city: "Muzaffarpur", pincode: "842002" },
    { name: "Arun Jha", city: "Patna", pincode: "800006" },
    { name: "Kavita Kumari", city: "Patna", pincode: "800008" },
    { name: "Deepak Ranjan", city: "Sasaram", pincode: "821115" },
    { name: "Sunita Devi", city: "Chapra", pincode: "841301" },
    { name: "Rohit Mishra", city: "Patna", pincode: "800013" },
    { name: "Meena Kumari", city: "Bettiah", pincode: "845438" },
    { name: "Sanjay Rao", city: "Patna", pincode: "800003" },
    { name: "Nisha Gupta", city: "Nalanda", pincode: "803101" },
    { name: "Pankaj Singh", city: "Patna", pincode: "800010" },
    { name: "Shilpa Das", city: "Gaya", pincode: "823003" },
    { name: "Vivek Anand", city: "Patna", pincode: "800015" },
    { name: "Sakshi Tiwari", city: "Muzaffarpur", pincode: "842003" },
    { name: "Alok Rajan", city: "Patna", pincode: "800027" },
    { name: "Simran Kaur", city: "Patna", pincode: "800005" },
    { name: "Manoj Kumar", city: "Bhagalpur", pincode: "812005" },
    { name: "Aarti Sharma", city: "Patna", pincode: "800002" },
    { name: "Nikhil Verma", city: "Darbhanga", pincode: "846001" },
    { name: "Divya Kumari", city: "Patna", pincode: "800016" },
  ];

  const statusDistribution: Array<
    "pending" | "confirmed" | "processing" | "ready_to_ship" | "shipped" | "delivered" | "cancelled" | "returned"
  > = [
    "pending", "pending", "pending", "pending", "pending",
    "confirmed", "confirmed", "confirmed", "confirmed", "confirmed",
    "processing", "processing", "processing", "processing", "processing",
    "ready_to_ship", "ready_to_ship", "ready_to_ship",
    "shipped", "shipped", "shipped", "shipped", "shipped",
    "delivered", "delivered", "delivered", "delivered",
    "cancelled", "cancelled",
    "returned",
  ];

  const paymentForStatus: Record<string, "pending" | "paid" | "failed" | "refunded"> = {
    pending: "pending",
    confirmed: "paid",
    processing: "paid",
    ready_to_ship: "paid",
    shipped: "paid",
    delivered: "paid",
    cancelled: "paid",
    returned: "refunded",
  };

  const orderIds: string[] = [];
  const orderStatuses: string[] = [];

  const streets = [
    "MG Road", "Boring Road", "Bailey Road", "Fraser Road", "Exhibition Road",
    "Kankarbagh Main Road", "Rajendra Nagar", "Danapur Road", "Station Road", "College Road",
    "Gandhi Maidan", "Ashok Rajpath", "Budh Marg", "Patliputra Colony", "Shastri Nagar",
  ];

  for (let i = 0; i < 30; i++) {
    const customer = customerData[i];
    const status = statusDistribution[i];
    let paymentStatus = paymentForStatus[status];
    if (i === 0) paymentStatus = "pending";
    if (i === 1) paymentStatus = "pending";
    if (i === 3) paymentStatus = "failed";

    const email =
      customer.name.toLowerCase().split(" ").join(".") + "@gmail.com";
    const phone = `+91 ${rand(70, 99)}${rand(10, 99)}${rand(100, 999)}${rand(100, 999)}`;

    const itemCount = rand(1, 4);
    const chosenIndices = pickN(
      Array.from({ length: allProductIds.length }, (_, idx) => idx),
      itemCount
    );

    let totalAmount = 0;
    const items: {
      productId: string;
      productName: string;
      variantName: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    for (const idx of chosenIndices) {
      const qty = rand(1, 2);
      const unitPrice = allProductPrices[idx];
      totalAmount += unitPrice * qty;
      items.push({
        productId: allProductIds[idx],
        productName: allProductNames[idx],
        variantName: allVariantNames[idx],
        quantity: qty,
        unitPrice,
      });
    }

    const day = Math.min(1 + i, 19);
    const orderDate = new Date(2026, 2, day, rand(9, 20), rand(0, 59));
    const orderNum = `VP-ORD-202603${String(day).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`;

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: orderNum,
        customerName: customer.name,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: {
          line1: `${rand(1, 500)}, ${pick(streets)}`,
          line2: `Near ${pick(["State Bank", "Post Office", "Bus Stand", "Railway Station", "Petrol Pump", "Temple", "Market"])}`,
          city: customer.city,
          state: "Bihar",
          pincode: customer.pincode,
        },
        status,
        paymentStatus,
        totalAmount,
        notes: i % 5 === 0 ? "Please deliver before 6 PM" : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      })
      .returning();

    orderIds.push(order.id);
    orderStatuses.push(status);

    await db.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    );
  }

  console.log(`     Created 30 orders with items.`);

  // ── 6. Tracking Events ─────────────────────────────────────────────────

  console.log("6/8  Creating tracking events...");

  const statusFlow: Array<
    "pending" | "confirmed" | "processing" | "ready_to_ship" | "shipped" | "delivered"
  > = ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "delivered"];

  const statusTitles: Record<string, string> = {
    pending: "Order Placed",
    confirmed: "Order Confirmed",
    processing: "Order Being Processed",
    ready_to_ship: "Ready to Ship",
    shipped: "Order Shipped",
    delivered: "Order Delivered",
    cancelled: "Order Cancelled",
    returned: "Order Returned",
  };

  const statusDescriptions: Record<string, string> = {
    pending: "Your order has been received and is awaiting confirmation.",
    confirmed: "Payment verified. Your order has been confirmed.",
    processing: "Your order is being packed and prepared for dispatch.",
    ready_to_ship: "Your package is ready and waiting for courier pickup.",
    shipped: "Your order is on its way! Track with the provided tracking number.",
    delivered: "Your order has been delivered successfully. Thank you for shopping with V&P Computer!",
    cancelled: "This order has been cancelled.",
    returned: "Customer return processed. Refund initiated.",
  };

  let trackingCount = 0;

  for (let i = 0; i < 30; i++) {
    const orderStatus = orderStatuses[i];
    if (orderStatus === "pending") continue;

    let flowEnd = statusFlow.indexOf(orderStatus as (typeof statusFlow)[number]);

    if (orderStatus === "cancelled") {
      flowEnd = 1; // up to confirmed, then cancelled
    } else if (orderStatus === "returned") {
      flowEnd = 5; // went through delivery, then returned
    }

    const orderDate = new Date(2026, 2, Math.min(1 + i, 19), rand(9, 20), rand(0, 59));

    for (let s = 0; s <= flowEnd; s++) {
      const eventDate = new Date(orderDate.getTime() + s * 3600000 * rand(2, 12));
      await db.insert(trackingEvents).values({
        orderId: orderIds[i],
        status: statusFlow[s],
        title: statusTitles[statusFlow[s]],
        description: statusDescriptions[statusFlow[s]],
        createdByAdminId: adminId,
        createdAt: eventDate,
      });
      trackingCount++;
    }

    if (orderStatus === "cancelled") {
      await db.insert(trackingEvents).values({
        orderId: orderIds[i],
        status: "cancelled",
        title: statusTitles["cancelled"],
        description: "Customer requested cancellation.",
        createdByAdminId: adminId,
        createdAt: new Date(orderDate.getTime() + 86400000),
      });
      trackingCount++;
    } else if (orderStatus === "returned") {
      await db.insert(trackingEvents).values({
        orderId: orderIds[i],
        status: "returned",
        title: statusTitles["returned"],
        description: "Customer returned the product. Refund in progress.",
        createdByAdminId: adminId,
        createdAt: new Date(orderDate.getTime() + 86400000 * 3),
      });
      trackingCount++;
    }
  }

  console.log(`     Created ${trackingCount} tracking events.`);

  // ── 7. Shipments ───────────────────────────────────────────────────────

  console.log("7/8  Creating shipments...");

  const providers = ["India Post", "DTDC", "Blue Dart", "Delhivery", "Self"];
  const trackingPrefixes: Record<string, string> = {
    "India Post": "EE",
    DTDC: "D",
    "Blue Dart": "BD",
    Delhivery: "DL",
    Self: "VP-SELF-",
  };

  let shipmentCount = 0;

  for (let i = 0; i < 30; i++) {
    const st = orderStatuses[i];
    if (st !== "shipped" && st !== "delivered" && st !== "returned") continue;

    const provider = pick(providers);
    const prefix = trackingPrefixes[provider];
    const trackingNumber =
      provider === "Self"
        ? `${prefix}${rand(1000, 9999)}`
        : `${prefix}${rand(100000000, 999999999)}IN`;

    const orderDate = new Date(2026, 2, Math.min(1 + i, 19));
    const shippedDate = new Date(orderDate.getTime() + 86400000 * rand(1, 3));
    const estDelivery = new Date(shippedDate.getTime() + 86400000 * rand(2, 7));

    const trackingUrl =
      provider === "India Post"
        ? "https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx"
        : provider === "DTDC"
          ? "https://www.dtdc.in/tracking.asp"
          : provider === "Blue Dart"
            ? "https://www.bluedart.com/tracking"
            : provider === "Delhivery"
              ? `https://www.delhivery.com/track/package/${trackingNumber}`
              : null;

    await db.insert(shipments).values({
      orderId: orderIds[i],
      provider,
      externalTrackingNumber: provider === "Self" ? null : trackingNumber,
      trackingUrl,
      shippedAt: shippedDate,
      estimatedDelivery: estDelivery,
    });
    shipmentCount++;
  }

  console.log(`     Created ${shipmentCount} shipments.`);

  // ── Done ───────────────────────────────────────────────────────────────

  console.log("\n=== Seed completed successfully! ===");
  console.log(`Summary: ${allProductData.length} products, ${totalVariantCount} variants, 30 orders, ${trackingCount} tracking events, ${shipmentCount} shipments`);
  console.log("Admin login: admin@vpcomputer.in / Admin@1234");
  console.log("Change the password after first login.");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
