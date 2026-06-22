import { Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container px-4 mx-auto py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* About Section */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">About ABSENS</h3>
            <p className="text-xs sm:text-sm text-primary-foreground/80">
              A Government of India initiative for locating and reuniting missing persons using advanced AI technology.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Quick Links</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-1 sm:gap-2 text-xs sm:text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Contact Us</h3>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-1 sm:gap-2 text-primary-foreground/80">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-accent" />
                <span>Toll Free: 1800-XXX-XXXX</span>
              </li>
              <li className="flex items-center gap-1 sm:gap-2 text-primary-foreground/80">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-accent" />
                <span>help@absens.gov.in</span>
              </li>
              <li className="flex items-center gap-1 sm:gap-2 text-primary-foreground/80">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-accent" />
                <span>New Delhi, India</span>
              </li>
            </ul>
          </div>

          {/* Official Seal */}
          <div className="space-y-3 sm:space-y-4 flex flex-col items-center sm:items-start">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
              alt="Government of India Seal"
              className="h-12 sm:h-16 dark:invert-[0.85]"
            />
            <p className="text-xs sm:text-sm text-primary-foreground/80">
              Government of India
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-6 sm:mt-8 sm:pt-8 border-t border-primary-foreground/20">
          <div className="text-center text-xs sm:text-sm text-primary-foreground/70">
            <p>© {new Date().getFullYear()} ABSENS - Government of India. All rights reserved.</p>
            <p className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/privacy" className="hover:text-primary-foreground">Privacy Policy</Link>
              <span className="hidden sm:inline text-primary-foreground/50">|</span>
              <Link href="/terms" className="hover:text-primary-foreground">Terms of Use</Link>
              <span className="hidden sm:inline text-primary-foreground/50">|</span>
              <Link href="/accessibility" className="hover:text-primary-foreground">Accessibility</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

const quickLinks = [
  { href: "/report", label: "Report Missing Person" },
  { href: "/search", label: "Search Database" },
  { href: "/alerts", label: "Alerts" },
  { href: "/volunteer", label: "Become a Volunteer" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact Us" },
];