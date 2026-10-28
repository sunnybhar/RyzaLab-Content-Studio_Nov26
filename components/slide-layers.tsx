"use client";
import { useRef } from "react";
import type { SlideLayer } from "@/lib/studio/types";
import { moveSlideLayer } from "@/lib/studio/layers";
export function SlideLayerPreview({
  layer,
  selected,
  onSelect,
  onMove,
  readOnly,
}: {
  layer: SlideLayer;
  selected: boolean;
  onSelect: () => void;
  onMove: (layer: SlideLayer) => void;
  readOnly: boolean;
}) {
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);
  return (
    <div
      className={`s-design-layer ${selected && !readOnly ? "s-design-layer-selected" : ""}`}
      data-layer-id={layer.id}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
      aria-label={readOnly ? undefined : `Select ${layer.kind} layer`}
      onKeyDown={(e) => {
        if (readOnly) return;
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
        if (delta[e.key]) {
          e.preventDefault();
          onSelect();
          onMove(
            moveSlideLayer(
              layer,
              layer.x + delta[e.key][0],
              layer.y + delta[e.key][1],
            ),
          );
        }
      }}
      onPointerDown={(e) => {
        if (readOnly || e.button !== 0) return;
        onSelect();
        const box = e.currentTarget.parentElement!.getBoundingClientRect();
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          startX: layer.x,
          startY: layer.y,
          width: box.width,
          height: box.height,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (!drag.current || readOnly) return;
        const d = drag.current;
        onMove(
          moveSlideLayer(
            layer,
            d.startX + ((e.clientX - d.x) / d.width) * 100,
            d.startY + ((e.clientY - d.y) / d.height) * 100,
          ),
        );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.width}%`,
        height: `${layer.height}%`,
        opacity: layer.opacity,
        ...(layer.kind === "shape"
          ? {
              background: layer.fill,
              borderRadius: layer.shape === "ellipse" ? "50%" : 0,
            }
          : {
              color: layer.color,
              fontSize: `calc(${layer.fontSize} / 1080 * 100cqw)`,
              fontWeight: layer.weight,
              textAlign: layer.align,
            }),
      }}
    >
      {layer.kind === "text" ? layer.text : null}
    </div>
  );
}
export function SlideLayerEditor({
  layers,
  onChange,
  selectedId,
  onSelect,
  readOnly,
}: {
  layers: SlideLayer[];
  onChange: (layers: SlideLayer[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  readOnly: boolean;
}) {
  const current = layers.find((l) => l.id === selectedId) || layers[0];
  const update = (patch: Partial<SlideLayer>) => {
    if (!current) return;
    const updated = { ...current, ...patch } as SlideLayer;
    onChange(layers.map((l) => (l.id === current.id ? updated : l)));
  };
  function add(kind: "text" | "shape") {
    const base = {
      id: crypto.randomUUID(),
      x: 10,
      y: 65,
      width: 70,
      height: 20,
      opacity: 1,
    };
    const layer: SlideLayer =
      kind === "text"
        ? {
            ...base,
            kind,
            text: "New text layer",
            fontSize: 40,
            weight: 400,
            align: "left",
            color: "#0B3A42",
          }
        : { ...base, kind, shape: "rectangle", fill: "#42D6C0" };
    onChange([...layers, layer]);
    onSelect(layer.id);
  }
  function reorder(delta: number) {
    if (!current) return;
    const index = layers.findIndex((l) => l.id === current.id),
      other = index + delta;
    if (other < 0 || other >= layers.length) return;
    const next = [...layers];
    [next[index], next[other]] = [next[other], next[index]];
    onChange(next);
  }
  return (
    <section className="s-slide-layer-controls" aria-label="Slide layers">
      <h3>Text and shape layers ({layers.length}/20)</h3>
      <p>
        Layers appear above base slide copy. Drag a layer, use arrow keys, or
        enter coordinates. Later layers render on top. Export clips text at its
        layer bounds.
      </p>
      <div className="s-actions">
        <button
          className="s-btn"
          disabled={readOnly || layers.length >= 20}
          onClick={() => add("text")}
        >
          Add text layer
        </button>
        <button
          className="s-btn"
          disabled={readOnly || layers.length >= 20}
          onClick={() => add("shape")}
        >
          Add shape layer
        </button>
      </div>
      {current && (
        <>
          <label>
            Selected layer
            <select
              aria-label="Selected layer"
              value={current.id}
              onChange={(e) => onSelect(e.target.value)}
            >
              {layers.map((l, i) => (
                <option key={l.id} value={l.id}>
                  {i + 1}.{" "}
                  {l.kind === "text" ? l.text.slice(0, 40) || "Text" : l.shape}
                </option>
              ))}
            </select>
          </label>
          {current.kind === "text" ? (
            <>
              <label>
                Layer text
                <textarea
                  aria-label="Layer text"
                  disabled={readOnly}
                  maxLength={2000}
                  value={current.text}
                  onChange={(e) => update({ text: e.target.value })}
                />
              </label>
              <div className="s-form-grid">
                <label>
                  Layer font size
                  <input
                    aria-label="Layer font size"
                    disabled={readOnly}
                    type="number"
                    min={12}
                    max={180}
                    value={current.fontSize}
                    onChange={(e) =>
                      update({
                        fontSize: Math.max(
                          12,
                          Math.min(180, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Layer text color
                  <input
                    aria-label="Layer text color"
                    disabled={readOnly}
                    type="color"
                    value={current.color}
                    onChange={(e) => update({ color: e.target.value })}
                  />
                </label>
                <label>
                  Layer alignment
                  <select
                    disabled={readOnly}
                    value={current.align}
                    onChange={(e) =>
                      update({
                        align: e.target.value as "left" | "center" | "right",
                      })
                    }
                  >
                    {["left", "center", "right"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Layer weight
                  <select
                    disabled={readOnly}
                    value={current.weight}
                    onChange={(e) =>
                      update({ weight: Number(e.target.value) as 400 | 700 })
                    }
                  >
                    <option value={400}>Regular</option>
                    <option value={700}>Bold</option>
                  </select>
                </label>
              </div>
            </>
          ) : (
            <div className="s-form-grid">
              <label>
                Shape
                <select
                  aria-label="Layer shape"
                  disabled={readOnly}
                  value={current.shape}
                  onChange={(e) =>
                    update({ shape: e.target.value as "rectangle" | "ellipse" })
                  }
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="ellipse">Ellipse</option>
                </select>
              </label>
              <label>
                Layer fill
                <input
                  aria-label="Layer fill"
                  disabled={readOnly}
                  type="color"
                  value={current.fill}
                  onChange={(e) => update({ fill: e.target.value })}
                />
              </label>
            </div>
          )}
          <div className="s-form-grid">
            {(["x", "y", "width", "height", "opacity"] as const).map((prop) => (
              <label key={prop}>
                {`Layer ${prop}`}
                <input
                  aria-label={`Layer ${prop}`}
                  type="number"
                  disabled={readOnly}
                  step={prop === "opacity" ? 0.1 : 1}
                  min={prop === "width" || prop === "height" ? 1 : 0}
                  max={prop === "opacity" ? 1 : 100}
                  value={current[prop]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (prop === "x" || prop === "y")
                      onChange(
                        layers.map((l) =>
                          l.id === current.id
                            ? moveSlideLayer(
                                current,
                                prop === "x" ? value : current.x,
                                prop === "y" ? value : current.y,
                              )
                            : l,
                        ),
                      );
                    else if (prop === "width" || prop === "height")
                      update({
                        [prop]: Math.max(
                          1,
                          Math.min(
                            prop === "width"
                              ? 100 - current.x
                              : 100 - current.y,
                            value,
                          ),
                        ),
                      });
                    else update({ opacity: Math.max(0, Math.min(1, value)) });
                  }}
                />
              </label>
            ))}
          </div>
          <div className="s-actions">
            <button
              className="s-btn"
              disabled={readOnly || layers[0]?.id === current.id}
              onClick={() => reorder(-1)}
            >
              Send backward
            </button>
            <button
              className="s-btn"
              disabled={readOnly || layers.at(-1)?.id === current.id}
              onClick={() => reorder(1)}
            >
              Bring forward
            </button>
            <button
              className="s-btn"
              disabled={readOnly || layers.length >= 20}
              onClick={() => {
                const copy = { ...current, id: crypto.randomUUID() };
                onChange([...layers, copy]);
                onSelect(copy.id);
              }}
            >
              Duplicate layer
            </button>
            <button
              className="s-btn"
              disabled={readOnly}
              onClick={() =>
                onChange(layers.filter((l) => l.id !== current.id))
              }
            >
              Remove layer
            </button>
          </div>
        </>
      )}
    </section>
  );
}
