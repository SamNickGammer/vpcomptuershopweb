export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};
