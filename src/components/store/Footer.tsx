import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Products" },
  { href: "/categories", label: "Categories" },
  { href: "/products?featured=true", label: "Deals & Offers" },
];

const CUSTOMER_SERVICE = [
  { href: "/track-order", label: "Track Order" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/return-policy", label: "Return Policy" },
  { href: "/faq", label: "FAQ" },
];

const SOCIAL_LINKS = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "YouTube", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-[#1a2040] text-white">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: About */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-block">
              <Image
                src="/logo/LOGO_Big.svg"
                alt="V&P Computer"
                width={160}
                height={40}
                className="h-10 w-auto"
                unoptimized
              />
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              V&P Computer Shop, Patna, Bihar. Your trusted destination for
              refurbished & new laptops, motherboards, ICs, chips, and all
              hardware components. Quality tested products at the best prices.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h3>
            <ul className="flex flex-col gap-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-[#EF9822]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Customer Service
            </h3>
            <ul className="flex flex-col gap-2.5">
              {CUSTOMER_SERVICE.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-[#EF9822]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EF9822]" />
                <a
                  href="mailto:contact@vpcomputer.in"
                  className="text-sm text-gray-400 transition-colors hover:text-[#EF9822]"
                >
                  contact@vpcomputer.in
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EF9822]" />
                <a
                  href="tel:+919876543210"
                  className="text-sm text-gray-400 transition-colors hover:text-[#EF9822]"
                >
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EF9822]" />
                <span className="text-sm text-gray-400">
                  Patna, Bihar, India
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          {/* Payment icons placeholder */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">We accept:</span>
            <div className="flex items-center gap-2">
              {["UPI", "Cards", "Net Banking", "COD"].map((method) => (
                <span
                  key={method}
                  className="rounded bg-white/10 px-2 py-1 text-[10px] font-medium text-gray-400"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* Social + Copyright */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 transition-colors hover:text-[#EF9822]"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <span className="text-gray-600">|</span>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} V&P Computer Shop
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
