import type { Metadata } from "next";
import dynamic from "next/dynamic";

const ProductClient = dynamic(() => import("./Client"), { ssr: false });

export const metadata: Metadata = {
  title: "Ibicuruzwa",
  description:
    "Shakisha kandi ugure ibicuruzwa bitandukanye kuri Nihemart — kuva mu myenda, ibikoresho byo mu rugo kugeza kuri elegitoroniki. Duhereza mu Rwanda byihuse.",
};

export default function ProductListingPageContainer() {
  return <ProductClient />;
}
