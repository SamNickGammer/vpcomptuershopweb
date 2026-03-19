import Link from "next/link";
import { Cpu, Mail, Phone, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/track-order", label: "Track Order" },
];

const SOCIAL_LINKS = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "YouTube", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                V&P <span className="text-primary">Computer</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              V&P Computer Shop, Patna, Bihar. Your trusted destination for
              refurbished & new laptops, motherboards, ICs, chips, and all
              hardware components.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Quick Links
            </h3>
            <ul className="flex flex-col gap-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact Us
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <a
                  href="mailto:contact@vpcomputer.in"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  contact@vpcomputer.in
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <a
                  href="tel:+919876543210"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Patna, Bihar, India
                </span>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Follow Us
            </h3>
            <ul className="flex flex-col gap-2.5">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} V&P Computer Shop. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
