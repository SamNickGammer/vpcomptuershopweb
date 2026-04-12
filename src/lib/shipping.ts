import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { shiprocket } from "@/lib/shiprocket";
import type {
  OrderShippingQuote,
  ProductShippingDimensions,
} from "@/lib/db/schema";

export type ShippingQuoteItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

type CourierRate = {
  courierId: number;
  courierName: string;
  shippingAmount: number;
  estimatedDays: number;
  etd: string;
  codCharge: number;
  freightCharge: number;
  rtoCharge: number;
  rating: number;
};

const DEFAULT_PICKUP_PINCODE = process.env.SHIPROCKET_PICKUP_PINCODE || "824120";
const FALLBACK_WEIGHT_GRAMS = 500;
const FALLBACK_DIMENSIONS: ProductShippingDimensions = {
  lengthCm: 20,
  breadthCm: 15,
  heightCm: 10,
};

function normalizeProductId(productId: string) {
  return productId.includes("__") ? productId.split("__")[0] : productId;
}

function roundDimension(value: number) {
  return Math.max(1, Math.ceil(value));
}

function sanitizeDimensions(
  dimensions?: Partial<ProductShippingDimensions> | null
): ProductShippingDimensions {
  const length = Number(dimensions?.lengthCm || 0);
  const breadth = Number(dimensions?.breadthCm || 0);
  const height = Number(dimensions?.heightCm || 0);

  if (length <= 0 || breadth <= 0 || height <= 0) {
    return FALLBACK_DIMENSIONS;
  }

  return {
    lengthCm: roundDimension(length),
    breadthCm: roundDimension(breadth),
    heightCm: roundDimension(height),
  };
}

function volumetricWeightGrams(dimensions: ProductShippingDimensions) {
  const volume = dimensions.lengthCm * dimensions.breadthCm * dimensions.heightCm;
  return Math.ceil((volume / 5000) * 1000);
}

function combinePackageDimensions(
  packageUnits: Array<{
    dimensions: ProductShippingDimensions;
    quantity: number;
  }>
) {
  if (packageUnits.length === 0) {
    return FALLBACK_DIMENSIONS;
  }

  let maxLength = 0;
  let maxBreadth = 0;
  let maxHeight = 0;
  let totalVolume = 0;

  for (const unit of packageUnits) {
    const { dimensions, quantity } = unit;
    maxLength = Math.max(maxLength, dimensions.lengthCm);
    maxBreadth = Math.max(maxBreadth, dimensions.breadthCm);
    maxHeight = Math.max(maxHeight, dimensions.heightCm);
    totalVolume +=
      dimensions.lengthCm *
      dimensions.breadthCm *
      dimensions.heightCm *
      quantity;
  }

  const baseArea = Math.max(1, maxLength * maxBreadth);
  const stackedHeight = Math.ceil(totalVolume / baseArea);

  return {
    lengthCm: roundDimension(maxLength),
    breadthCm: roundDimension(maxBreadth),
    heightCm: roundDimension(Math.max(maxHeight, stackedHeight)),
  };
}

function mapCourierRates(
  availableCouriers: Array<{
    courier_company_id: number;
    courier_name: string;
    rate: number;
    etd: string;
    estimated_delivery_days: number;
    cod_charges: number;
    freight_charge: number;
    rto_charges?: number;
    rating?: number;
  }>
) {
  return availableCouriers
    .map(
      (courier): CourierRate => ({
        courierId: courier.courier_company_id,
        courierName: courier.courier_name,
        shippingAmount: Math.ceil(courier.rate * 100),
        estimatedDays: courier.estimated_delivery_days,
        etd: courier.etd,
        codCharge: Math.ceil((courier.cod_charges || 0) * 100),
        freightCharge: Math.ceil((courier.freight_charge || 0) * 100),
        rtoCharge: Math.ceil((courier.rto_charges || 0) * 100),
        rating: courier.rating || 0,
      })
    )
    .sort((a, b) => a.shippingAmount - b.shippingAmount);
}

export function buildQuoteFromPackage(params: {
  deliveryPincode: string;
  isCod: boolean;
  packageWeightGrams: number;
  packageDimensions: ProductShippingDimensions;
  fallbackApplied?: boolean;
  couriers: CourierRate[];
}): OrderShippingQuote {
  const chargeableWeightGrams = Math.max(
    params.packageWeightGrams,
    volumetricWeightGrams(params.packageDimensions)
  );
  const cheapestCourier = params.couriers[0] || null;

  return {
    available: Boolean(cheapestCourier),
    provider: "shiprocket",
    pickupPincode: DEFAULT_PICKUP_PINCODE,
    deliveryPincode: params.deliveryPincode,
    paymentMode: params.isCod ? "cod" : "prepaid",
    packageWeightGrams: params.packageWeightGrams,
    chargeableWeightGrams,
    packageDimensions: params.packageDimensions,
    shippingAmount: cheapestCourier?.shippingAmount || 0,
    estimatedDays: cheapestCourier?.estimatedDays ?? null,
    courierId: cheapestCourier?.courierId || null,
    courierName: cheapestCourier?.courierName || null,
    freightCharge: cheapestCourier?.freightCharge || 0,
    codCharge: cheapestCourier?.codCharge || 0,
    fallbackApplied: Boolean(params.fallbackApplied),
  };
}

export async function quoteShippingForItems(params: {
  items: ShippingQuoteItemInput[];
  deliveryPincode: string;
  isCod: boolean;
}) {
  const productIds = [
    ...new Set(
      params.items
        .map((item) => normalizeProductId(item.productId))
        .filter(Boolean)
    ),
  ];

  const productRows =
    productIds.length > 0
      ? await db.select().from(products).where(inArray(products.id, productIds))
      : [];

  const productMap = new Map(productRows.map((product) => [product.id, product]));
  let fallbackApplied = false;
  let packageWeightGrams = 0;
  const packageUnits: Array<{
    dimensions: ProductShippingDimensions;
    quantity: number;
  }> = [];

  for (const item of params.items) {
    const normalizedId = normalizeProductId(item.productId);
    const product = productMap.get(normalizedId);
    if (!product) {
      throw new Error(`Product not found for shipping quote: ${normalizedId}`);
    }

    const rawWeight = Number(product.shippingWeightGrams || 0);
    const resolvedWeight =
      rawWeight > 0 ? Math.ceil(rawWeight) : FALLBACK_WEIGHT_GRAMS;
    const resolvedDimensions = sanitizeDimensions(product.shippingDimensions);

    if (rawWeight <= 0) {
      fallbackApplied = true;
    }

    const configuredDimensions = product.shippingDimensions as
      | ProductShippingDimensions
      | null;
    if (
      !configuredDimensions ||
      configuredDimensions.lengthCm <= 0 ||
      configuredDimensions.breadthCm <= 0 ||
      configuredDimensions.heightCm <= 0
    ) {
      fallbackApplied = true;
    }

    packageWeightGrams += resolvedWeight * item.quantity;
    packageUnits.push({
      dimensions: resolvedDimensions,
      quantity: item.quantity,
    });
  }

  const packageDimensions = combinePackageDimensions(packageUnits);
  const chargeableWeightGrams = Math.max(
    packageWeightGrams,
    volumetricWeightGrams(packageDimensions)
  );
  const chargeableWeightKg = Math.max(
    0.1,
    Number((chargeableWeightGrams / 1000).toFixed(3))
  );

  const serviceability = await shiprocket.checkServiceability({
    pickupPincode: DEFAULT_PICKUP_PINCODE,
    deliveryPincode: params.deliveryPincode,
    weight: chargeableWeightKg,
    cod: params.isCod,
  });

  const availableCouriers = serviceability?.data?.available_courier_companies;
  const couriers = Array.isArray(availableCouriers)
    ? mapCourierRates(availableCouriers)
    : [];

  return {
    quote: buildQuoteFromPackage({
      deliveryPincode: params.deliveryPincode,
      isCod: params.isCod,
      packageWeightGrams,
      packageDimensions,
      fallbackApplied,
      couriers,
    }),
    couriers,
    packageDimensions,
    packageWeightGrams,
    chargeableWeightGrams,
    fallbackApplied,
  };
}
