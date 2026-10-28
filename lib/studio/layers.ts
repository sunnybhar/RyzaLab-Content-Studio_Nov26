import { z } from "zod";
import type { SlideLayer } from "./types";
const common = {
  id: z.string().min(1).max(150),
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  width: z.number().finite().min(1).max(100),
  height: z.number().finite().min(1).max(100),
  opacity: z.number().finite().min(0).max(1),
};
const color = z.string().regex(/^#[\da-f]{6}$/i);
export const slideLayerSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...common,
        kind: z.literal("text"),
        text: z.string().max(2000),
        color,
        fontSize: z.number().finite().min(12).max(180),
        weight: z.union([z.literal(400), z.literal(700)]),
        align: z.enum(["left", "center", "right"]),
      })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal("shape"),
        shape: z.enum(["rectangle", "ellipse"]),
        fill: color,
      })
      .strict(),
  ])
  .refine(
    (layer) =>
      layer.x + layer.width <= 100.001 && layer.y + layer.height <= 100.001,
    "Keep layer bounds inside the slide.",
  );
export const slideLayersSchema = z
  .array(slideLayerSchema)
  .max(20)
  .refine(
    (items) => new Set(items.map((i) => i.id)).size === items.length,
    "Layer IDs must be unique within a slide.",
  );
export function moveSlideLayer(
  layer: SlideLayer,
  x: number,
  y: number,
): SlideLayer {
  return {
    ...layer,
    x: Math.max(0, Math.min(100 - layer.width, x)),
    y: Math.max(0, Math.min(100 - layer.height, y)),
  };
}
