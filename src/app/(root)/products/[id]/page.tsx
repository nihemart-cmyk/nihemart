import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
   fetchStoreProductById,
   fetchAllProductIds,
} from "@/integrations/supabase/store";
import ProductClientPage from "./product-client-page";

export const revalidate = 3600; // Revalidate every hour

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nihemart.rw";

export async function generateMetadata({ params }: any): Promise<Metadata> {
   const resolved = (await params) as { id?: string } | undefined;
   const id = resolved?.id;

   if (!id) notFound();

   const isValidUUID =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
         id
      );
   if (!isValidUUID) notFound();

   const productData = await fetchStoreProductById(id);

   if (!productData || !productData.product) {
      notFound();
   }

   const product = productData.product;
   const title = product.name || "Ibicuruzwa";
   const description =
      product.short_description ||
      product.description ||
      "Reba iyi saha ku bicuruzwa bitandukanye kuri Nihemart.";

   // Resolve image URL (if relative, prefix with BASE_URL)
   let imageUrl = product.main_image_url || `${BASE_URL}/open-graph.png`;
   if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      // Trim leading slashes to avoid double slashes
      imageUrl = imageUrl.replace(/^\/+/, "");
      imageUrl = `${BASE_URL}/${imageUrl}`;
   }

   const canonical = `${BASE_URL}/products/${id}`;

   return {
      title,
      description,
      openGraph: {
         title,
         description,
         url: canonical,
         type: "website",
         images: [
            {
               url: imageUrl,
               alt: title,
               width: 1200,
               height: 630,
            },
         ],
      },
      twitter: {
         card: "summary_large_image",
         title,
         description,
         images: [imageUrl],
      },
      alternates: {
         canonical,
      },
   };
}

// Generate static params for all products
export async function generateStaticParams() {
   try {
      const productIds = await fetchAllProductIds();
      return productIds.map((id) => ({
         id: id,
      }));
   } catch (error) {
      console.error("Failed to generate static params for products:", error);
      return [];
   }
}

export default async function ProductPage({ params }: any) {
   // Next may provide params as a Promise or undefined during some checks.
   const resolved = (await params) as { id?: string } | undefined;
   const id = resolved?.id;

   if (!id) notFound();

   const isValidUUID =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
         id
      );

   if (!isValidUUID) {
      notFound();
   }

   const productData = await fetchStoreProductById(id);
   console.log({ productData });

   if (!productData) {
      notFound();
   }

   return <ProductClientPage initialData={productData} />;
}
