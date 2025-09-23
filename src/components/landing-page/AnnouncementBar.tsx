"use client";

import { BadgePercent, Globe } from "lucide-react";
import Link from "next/link";
import { FC } from "react";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Icons } from "../icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useLanguage, Language } from "@/contexts/LanguageContext";

interface AnnouncementBarProps {}

const AnnouncementBar: FC<AnnouncementBarProps> = ({}) => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };
  return (
    <div className="w-full bg-brand-orange text-white py-2">
      <MaxWidthWrapper
        size={"lg"}
        className="flex items-center justify-cener md:justify-between"
      >
        <div className="flex items-center gap-3">
          <BadgePercent className="h-5 sm:h-7 w-5 sm:w-7" />
          <p className="font-semibold  text-sm md:text-base">
            Due to Rainy season it will affect delivery{" "}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t("nav.language") || "Select language"}
              className="hidden lg:flex items-center bg-white text-orange-500 hover:bg-white/90 outline-none border-none"
            >
              <Globe className="h-4 w-4" />
              <span className="">
                {/* {language.toUpperCase()} */}
                Language
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[9999]">
            <DropdownMenuItem onClick={() => handleLanguageChange("en")}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange("rw")}>
              Kinyarwanda
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden items-center gap-1 md:flex">
          <Link href={"#"}>
            <Icons.landingPage.instagram className="h-6 w-6" />
          </Link>
          <Link href={"#"}>
            <Icons.landingPage.facebook className="h-6 w-6" />
          </Link>
          <Link href={"#"}></Link>
          <Link href={"#"}>
            <Icons.landingPage.tiktok className="h-6 w-6" />
          </Link>
          <Link href={"#"}>
            <Icons.landingPage.youtube className="h-6 w-6" />
          </Link>
        </div>
      </MaxWidthWrapper>
    </div>
  );
};

export default AnnouncementBar;
