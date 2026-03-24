import { NextRequest, NextResponse } from "next/server";
import { shiprocket } from "@/lib/shiprocket";

// Public API — estimate shipping cost at checkout
// Uses Shiprocket serviceability API to get rates for customer's pincode
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deliveryPincode, weight = 0.5, cod = true } = body;

    if (!deliveryPincode || deliveryPincode.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Valid 6-digit delivery pincode is required" },
        { status: 400 }
      );
    }

    // Your pickup pincode (from Shiprocket pickup location)
    const pickupPincode = "824120"; // Aurangabad, Bihar

    const data = await shiprocket.checkServiceability({
      pickupPincode,
      deliveryPincode,
      weight,
      cod,
    });

    if (!data?.data?.available_courier_companies || data.data.available_courier_companies.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          message: "Delivery not available to this pincode",
          couriers: [],
        },
      });
    }

    const couriers = data.data.available_courier_companies.map(
      (c: {
        courier_company_id: number;
        courier_name: string;
        rate: number;
        etd: string;
        estimated_delivery_days: number;
        cod_charges: number;
        freight_charge: number;
      }) => ({
        courierId: c.courier_company_id,
        courierName: c.courier_name,
        rate: Math.ceil(c.rate), // total rate in rupees
        etd: c.etd,
        estimatedDays: c.estimated_delivery_days,
        codCharges: c.cod_charges,
        freightCharge: c.freight_charge,
      })
    );

    // Sort by rate (cheapest first)
    couriers.sort(
      (a: { rate: number }, b: { rate: number }) => a.rate - b.rate
    );

    // Cheapest rate for display to customer
    const cheapestRate = couriers[0]?.rate || 0;

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        cheapestRate,
        estimatedDays: couriers[0]?.estimatedDays || 5,
        couriers,
      },
    });
  } catch (error) {
    console.error("Shipping rates error:", error);
    // Don't block checkout if shipping estimation fails
    return NextResponse.json({
      success: true,
      data: {
        available: true,
        cheapestRate: 0, // free if can't estimate
        estimatedDays: 5,
        couriers: [],
        error: "Could not estimate shipping. Charges may apply.",
      },
    });
  }
}
