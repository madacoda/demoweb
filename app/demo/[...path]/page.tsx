import { notFound } from "next/navigation";
import { catalog } from "../_lib/catalog";
import { Storefront, type StoreView } from "../storefront";

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const titles: Record<string, string> = {
  shop: "Shop the collection",
  cart: "Your bag",
  checkout: "Checkout",
  saved: "Saved favorites",
  account: "Your account",
  login: "Welcome back",
  register: "Create an account",
  orders: "Your orders",
  about: "Our story",
  help: "A little help",
  contact: "Get in touch",
};

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  const title =
    path[0] === "products"
      ? catalog.find((p) => p.slug === path[1])?.name
      : titles[path[0]];
  return {
    title: `${title || "Order details"} — Form & Field`,
    robots: { index: false, follow: false },
  };
}

export default async function StorePage({ params, searchParams }: Props) {
  const { path } = await params;
  const query = await searchParams;
  const first = path[0];
  if (path.length === 1 && first in titles)
    return (
      <Storefront
        view={first as StoreView}
        query={{
          q: typeof query.q === "string" ? query.q : "",
          category: typeof query.category === "string" ? query.category : "All",
          sort: typeof query.sort === "string" ? query.sort : "featured",
        }}
      />
    );
  if (
    path.length === 2 &&
    first === "products" &&
    catalog.some((p) => p.slug === path[1])
  )
    return <Storefront view="product" slug={path[1]} />;
  if (
    path.length === 2 &&
    first === "orders" &&
    /^FF-[A-F0-9]{8}$/.test(path[1])
  )
    return <Storefront view="order" slug={path[1]} />;
  notFound();
}
