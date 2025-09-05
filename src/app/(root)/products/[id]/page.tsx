import { notFound } from 'next/navigation';
import { fetchStoreProductById } from '@/integrations/supabase/store';
import ProductClientPage from './product-client-page';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  const isValidUUID =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      id
    );

  if (!isValidUUID) {
    notFound();
  }

  const productData = await fetchStoreProductById(id);
  console.log({productData})

  if (!productData) {
    notFound();
  }

  return <ProductClientPage initialData={productData} />;
}
