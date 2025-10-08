import Link from "next/link";
import { FC } from "react";
import { Icons } from "../icons";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface FooterProps {}

const footerLinks = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Journal", href: "/journal" },
      { label: "Careers", href: "/careers" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
  {
    title: "Shop",
    links: [
      { label: "Headphones", href: "/category/headphones" },
      { label: "Speakers", href: "/category/speakers" },
      { label: "Charging Stations", href: "/category/charging-stations" },
      { label: "Phones", href: "/category/phones" },
      { label: "Portable Chargers", href: "/category/portable-chargers" },
    ],
  },
  {
    title: "Customer Service",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Returns & Exchanges", href: "/returns" },
      { label: "Shipping Info", href: "/shipping" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

const socialLinks = [
  {
    icon: Icons.landingPage.instagram,
    href: "https://instagram.com",
    label: "Instagram",
  },
  {
    icon: Icons.landingPage.facebook,
    href: "https://facebook.com",
    label: "Facebook",
  },
  {
    icon: Icons.landingPage.tiktok,
    href: "https://tiktok.com",
    label: "TikTok",
  },
  {
    icon: Icons.landingPage.youtube,
    href: "https://youtube.com",
    label: "YouTube",
  },
];

const Footer: FC<FooterProps> = ({}) => {
  return (
    <footer className="bg-neutral-950 text-white pt-16 pb-8 mt-24 border-t border-neutral-800">
      <MaxWidthWrapper size="lg" className="flex flex-col gap-12">
        {/* Top: Newsletter & Social */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h5 className="text-2xl font-semibold mb-3">Stay in the loop</h5>
            <p className="text-neutral-400 mb-4 max-w-md">
              Subscribe to our newsletter for exclusive offers, new arrivals,
              and the latest updates.
            </p>
            <form className="flex gap-2 max-w-md">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-neutral-900 border-neutral-800 h-12 placeholder:text-lg text-base"
                required
              />
              <Button variant="secondary" className="h-12 px-6 font-semibold">
                Subscribe
              </Button>
            </form>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            <span className="font-semibold text-lg mb-1">Follow us</span>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="hover:text-brand-orange transition-colors"
                >
                  <Icon className="h-7 w-7" />
                </Link>
              ))}
            </div>
          </div>
        </div>
        {/* Middle: Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 border-t border-neutral-800 pt-10">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h6 className="text-lg font-bold mb-4">{section.title}</h6>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-neutral-300 hover:text-brand-orange transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom: Copyright */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-neutral-800 pt-8 text-neutral-400 text-sm">
          <span>
            © {new Date().getFullYear()} NiheMart. All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand-orange">
              Privacy Policy
            </Link>
            <span className="hidden md:inline">|</span>
            <Link href="/terms" className="hover:text-brand-orange">
              Terms of Service
            </Link>
          </div>
        </div>
      </MaxWidthWrapper>
    </footer>
  );
};

export default Footer;
