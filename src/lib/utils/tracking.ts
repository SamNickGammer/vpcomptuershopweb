import { nanoid, customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generate = customAlphabet(alphabet, 6);

export function generateInternalTrackingCode(): string {
  return `VP-${generate()}`;
}
