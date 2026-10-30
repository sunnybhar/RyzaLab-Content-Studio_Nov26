"use client";

import {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  type TextareaHTMLAttributes,
} from "react";
import { confirmationMarkers } from "@/lib/studio/input-requirements";
import "./highlighted-textarea.css";

export const HighlightedTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }
>((props, ref) => {
  const mirror = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => input.current!);
  useEffect(() => {
    const area = input.current;
    if (!area) return;
    const sync = () => {
      if (mirror.current) {
        mirror.current.style.width = `${area.clientWidth + 2}px`;
        mirror.current.scrollTop = area.scrollTop;
      }
    };
    const observer = new ResizeObserver(sync);
    observer.observe(area);
    sync();
    return () => observer.disconnect();
  }, []);
  const markers = confirmationMarkers(props.value);
  let end = 0;
  const fragments = markers.flatMap((marker, i) => {
    const before = props.value.slice(end, marker.start);
    end = marker.end;
    return [before, <mark key={i}>{marker.text}</mark>];
  });
  fragments.push(props.value.slice(end) + "\n");
  return (
    <div
      className={`s-highlighted-editor ${props.rows && props.rows < 6 ? "s-highlighted-short" : ""}`}
    >
      <div className="s-highlighted-mirror" ref={mirror} aria-hidden="true">
        {fragments}
      </div>
      <textarea
        {...props}
        ref={input}
        onScroll={(event) => {
          if (mirror.current) {
            mirror.current.scrollTop = event.currentTarget.scrollTop;
            mirror.current.scrollLeft = event.currentTarget.scrollLeft;
          }
          props.onScroll?.(event);
        }}
        onInput={(event) => {
          if (mirror.current)
            mirror.current.style.width = `${event.currentTarget.clientWidth + 2}px`;
          props.onInput?.(event);
        }}
      />
    </div>
  );
});
HighlightedTextarea.displayName = "HighlightedTextarea";
