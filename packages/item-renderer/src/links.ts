import type { CargoItem } from "./payload/codec.ts";
import { encodePayload } from "./payload/codec.ts";

const DEFAULT_WEBSITE_BASE = "https://shiploadgame.com";
const DEFAULT_IMAGE_BASE = "https://item.shiploadgame.com";

export function linkToItemPage(item: CargoItem, baseUrl = DEFAULT_WEBSITE_BASE): string {
  const payload = encodePayload(item);
  return `${baseUrl}/guide/item/${payload}`;
}

export function linkToItemImage(
  item: CargoItem,
  ext: "png" | "svg",
  baseUrl = DEFAULT_IMAGE_BASE,
): string {
  const payload = encodePayload(item);
  return `${baseUrl}/item/${payload}.${ext}`;
}

export function linkToItemSocial(item: CargoItem, baseUrl = DEFAULT_IMAGE_BASE): string {
  const payload = encodePayload(item);
  return `${baseUrl}/social/${payload}.png`;
}
