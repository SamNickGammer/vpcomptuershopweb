class ShiprocketService {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = "https://apiv2.shiprocket.in/v1/external";

  // Auto-login and cache token (valid for 10 days)
  // Supports manual token via SHIPROCKET_TOKEN env var as fallback
  async getToken(): Promise<string> {
    // Use manual token if provided (for plans without API login access)
    if (process.env.SHIPROCKET_TOKEN) {
      this.token = process.env.SHIPROCKET_TOKEN;
      return this.token;
    }
    if (this.token && Date.now() < this.tokenExpiry) return this.token;
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    });
    const data = await res.json();
    if (!data.token)
      throw new Error(
        `Shiprocket login failed: ${JSON.stringify(data)}. ` +
        `If your plan doesn't support API login, generate a token manually from ` +
        `Shiprocket Dashboard → Settings → API, and add SHIPROCKET_TOKEN=xxx to .env.local`
      );
    this.token = data.token as string;
    this.tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
    return this.token!;
  }

  private async request(
    endpoint: string,
    method: string = "GET",
    body?: object
  ) {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  }

  // Create an order on Shiprocket
  async createOrder(params: {
    orderNumber: string;
    orderDate: string; // YYYY-MM-DD HH:MM
    pickupLocation: string; // name of pickup location set in Shiprocket
    billingName: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingPincode: string;
    billingEmail: string;
    billingPhone: string;
    shippingIsBilling: boolean;
    items: Array<{
      name: string;
      sku: string;
      units: number;
      sellingPrice: number; // in rupees (not paise!)
      hsn?: string;
    }>;
    subtotal: number; // rupees
    weight: number; // kg
    length: number; // cm
    breadth: number; // cm
    height: number; // cm
    paymentMethod: "Prepaid" | "COD";
  }) {
    return this.request("/orders/create/adhoc", "POST", {
      order_id: params.orderNumber,
      order_date: params.orderDate,
      pickup_location: params.pickupLocation,
      billing_customer_name: params.billingName.split(" ")[0],
      billing_last_name:
        params.billingName.split(" ").slice(1).join(" ") || "",
      billing_address: params.billingAddress,
      billing_city: params.billingCity,
      billing_state: params.billingState,
      billing_pincode: params.billingPincode,
      billing_email: params.billingEmail,
      billing_phone: params.billingPhone,
      shipping_is_billing: params.shippingIsBilling,
      order_items: params.items.map((item) => ({
        name: item.name,
        sku: item.sku || "DEFAULT",
        units: item.units,
        selling_price: item.sellingPrice,
        hsn: item.hsn || "",
      })),
      sub_total: params.subtotal,
      weight: params.weight,
      length: params.length,
      breadth: params.breadth,
      height: params.height,
      payment_method: params.paymentMethod,
      channel_id: "",
    });
  }

  // Generate AWB (assign courier)
  async assignAWB(shipmentId: number, courierId?: number) {
    return this.request("/courier/assign/awb", "POST", {
      shipment_id: shipmentId,
      ...(courierId ? { courier_id: courierId } : {}),
    });
  }

  // Request pickup
  async requestPickup(shipmentId: number) {
    return this.request("/courier/generate/pickup", "POST", {
      shipment_id: [shipmentId],
    });
  }

  // Generate label
  async generateLabel(shipmentId: number) {
    return this.request("/courier/generate/label", "POST", {
      shipment_id: [shipmentId],
    });
  }

  // Generate invoice
  async generateInvoice(orderIds: number[]) {
    return this.request("/orders/print/invoice", "POST", {
      ids: orderIds,
    });
  }

  // Get tracking data
  async getTracking(shipmentId: number) {
    return this.request(`/courier/track/shipment/${shipmentId}`);
  }

  // Get tracking by AWB
  async getTrackingByAWB(awb: string) {
    return this.request(`/courier/track/awb/${awb}`);
  }

  // Cancel shipment
  async cancelShipment(awbs: string[]) {
    return this.request("/orders/cancel/shipment/awbs", "POST", {
      awbs,
    });
  }

  // Get available couriers for a shipment
  async checkServiceability(params: {
    pickupPincode: string;
    deliveryPincode: string;
    weight: number;
    cod: boolean;
  }) {
    return this.request(
      `/courier/serviceability/?pickup_postcode=${params.pickupPincode}&delivery_postcode=${params.deliveryPincode}&weight=${params.weight}&cod=${params.cod ? 1 : 0}`
    );
  }

  // Get all pickup locations
  async getPickupLocations() {
    return this.request("/settings/company/pickup");
  }
}

// Singleton
export const shiprocket = new ShiprocketService();
