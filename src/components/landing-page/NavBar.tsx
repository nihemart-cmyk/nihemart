"use client";

import Image from "next/image";
import { FC, useState } from "react";
import logo from "@/assets/logo.png";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { cn } from "@/lib/utils";
import {
   Globe,
   Menu,
   Search,
   ShoppingCart,
   User,
   UserRound,
   LogOut,
} from "lucide-react";
import { Button } from "../ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { redirect } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth"; // <-- update this import
import { useRouter } from "next/navigation";

interface NavBarProps {}

// Use translation keys for route names
export const routes = [
   { name: "nav.home", url: "/" },
   { name: "nav.products", url: "/products" },
   { name: "nav.about", url: "/about" },
   { name: "nav.contact", url: "/contact" },
] as const;

const NavBar: FC<NavBarProps> = ({}) => {
   const { items, initialized } = useCart();
   const { user, hasRole, signOut } = useAuth();
   const router = useRouter();

   const { language, setLanguage, t } = useLanguage();
   const [searchQuery, setSearchQuery] = useState("");

   const handleLanguageChange = (lang: Language) => {
      setLanguage(lang);
   };

   const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
         redirect(`/products?search=${encodeURIComponent(searchQuery)}`);
      }
   };

   const handleLogout = async () => {
      try {
         await signOut();
         toast.success("Successfully logged out");
         router.push("/");
      } catch (error) {
         toast.error("Error logging out");
      }
   };

   return (
      <div className="sticky top-0 w-full z-[999] bg-white border shadow-md">
         <MaxWidthWrapper
            size={"lg"}
            className="w-full flex items-center justify-between py-6"
         >
            <Image
               src={logo}
               alt="ilead logo"
               priority
               height={50}
               width={200}
               className="w-32 sm:w-40 object-contain"
            />

            {/* Desktop navigation */}
            <div className="hidden lg:flex items-center gap-4">
               {routes.map(({ url, name }, i) => (
                  <a
                     key={i}
                     href={url}
                     className={cn(
                        "relative text-slate-500 font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-brand-orange after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100"
                     )}
                  >
                     {t(name)}
                  </a>
               ))}
            </div>
            <form
               onSubmit={handleSearch}
               className="hidden md:flex items-center flex-1 max-w-xs md:max-w-sm mx-2 md:mx-6"
            >
               <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                     type="search"
                     placeholder={t("products.search")}
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-10 text-xs sm:text-sm py-2"
                     aria-label={t("products.search")}
                  />
               </div>
            </form>
            {/* Right side controls */}
            <div className="flex items-center md:gap-2 gap-1">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        aria-label={t("nav.language") || "Select language"}
                        className="bg-orange-500 hover:bg-orange-500/90"
                     >
                        <Globe className="h-4 w-4" />
                        <span className=" hidden sm:inline text-xs">
                           {language.toUpperCase()}
                        </span>
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="end"
                     className="z-[9999]"
                  >
                     <DropdownMenuItem
                        onClick={() => handleLanguageChange("en")}
                     >
                        English
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => handleLanguageChange("rw")}
                     >
                        Kinyarwanda
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
               <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  aria-label="Cart"
                  className="hover:bg-blue-500 group"
               >
                  <Link
                     href={"/cart"}
                     className="relative"
                  >
                     <ShoppingCart className="h-5 w-5 text-slate-700 group-hover:text-white transition-colors duration-200" />
                     {initialized && items.length > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full text-xs p-0 flex items-center justify-center bg-orange-400 outline-none z-10">
                           {items.length}
                        </Badge>
                     )}
                  </Link>
               </Button>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon"
                        aria-label="User menu"
                     >
                        <User className="h-5 w-5" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="end"
                     className="z-[9999]"
                  >
                     {!user && (
                        <>
                           <DropdownMenuItem asChild>
                              <Link href={"/signin"}>{t("nav.login")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/signup"}>{t("nav.register")}</Link>
                           </DropdownMenuItem>
                        </>
                     )}
                     {user && (
                        <>
                           <DropdownMenuItem asChild>
                              <Link href={"/profile"}>{t("nav.profile")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/orders"}>{t("nav.orders")}</Link>
                           </DropdownMenuItem>
                           {hasRole("admin") && (
                              <DropdownMenuItem asChild>
                                 <Link href={"/admin"}>{t("nav.admin")}</Link>
                              </DropdownMenuItem>
                           )}
                           <DropdownMenuItem onClick={handleLogout}>
                              <LogOut className="h-4 w-4 mr-2" />
                              {t("nav.logout")}
                           </DropdownMenuItem>
                        </>
                     )}
                  </DropdownMenuContent>
               </DropdownMenu>
               {/* Mobile menu */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button className="relative px-2 lg:hidden bg-brand-blue hover:bg-brand-blue/90 ml-1">
                        <Menu />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     className="w-56 z-[9999]"
                     align="end"
                     sideOffset={10}
                     forceMount
                  >
                     {routes.map(({ name, url }, index) => (
                        <DropdownMenuItem
                           key={index}
                           asChild
                        >
                           <Link href={url}>{t(name)}</Link>
                        </DropdownMenuItem>
                     ))}
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </MaxWidthWrapper>
      </div>
   );
};

export default NavBar;
