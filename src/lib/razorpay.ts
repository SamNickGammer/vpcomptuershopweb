import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.LIVE_KEY_ID!,
  key_secret: process.env.LIVE_KEY_SECRET!,
});
