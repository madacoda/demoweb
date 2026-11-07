import { useId, type ReactNode } from "react";
import type { Product } from "./_lib/catalog";

export function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "bag"
    | "heart"
    | "user"
    | "search"
    | "check"
    | "plus"
    | "minus"
    | "close"
    | "box"
    | "download"
    | "leaf";
  size?: number;
}) {
  const paths: Record<typeof name, ReactNode> = {
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    heart: (
      <path d="M20.5 4.8a5.2 5.2 0 0 0-7.3 0L12 6l-1.2-1.2a5.2 5.2 0 0 0-7.3 7.4L12 21l8.5-8.8a5.2 5.2 0 0 0 0-7.4Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M5 12h14M12 5v14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="M6 6l12 12M6 18 18 6" />,
    box: <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v9M7 5l10 5" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    leaf: (
      <>
        <path d="M20 3c0 15-8 18-13 13S5 3 20 3Z" />
        <path d="M4 21 15 9" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function ProductArt({
  product,
  color,
  className,
}: {
  product: Product;
  color?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const paint =
    product.colors.find((c) => c.name === color)?.hex || product.colors[0].hex;
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="5"
            dy="15"
            stdDeviation="12"
            floodColor="#3c392b"
            floodOpacity=".16"
          />
        </filter>
      </defs>
      <ellipse
        cx="200"
        cy="330"
        rx="126"
        ry="16"
        fill="#71664b"
        opacity=".07"
      />
      <g filter={`url(#${id})`}>
        {(product.kind === "notebook" || product.kind === "planner") && (
          <g transform="rotate(-13 200 200)">
            <rect
              x="99"
              y="64"
              width="209"
              height="278"
              rx="8"
              fill="#f2ead9"
            />
            <path d="M105 330h194m-194 4h194" stroke="#d2c8b3" />
            <rect x="95" y="57" width="209" height="275" rx="7" fill={paint} />
            <path d="M107 58v272" stroke="#000" opacity=".13" strokeWidth="3" />
            <rect x="134" y="129" width="133" height="109" fill="#eee7d3" />
            <text
              x="200"
              y="160"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="14"
              fill="#3e4a39"
            >
              form &amp; field
            </text>
            <path d="M174 173h52" stroke="#a4ad8e" />
            <text
              x="200"
              y="196"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize="9"
              letterSpacing="2"
              fill="#46523f"
            >
              {product.kind === "planner" ? "SLOW DAYS" : "GOOD IDEAS"}
            </text>
            <text
              x="200"
              y="214"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize="9"
              letterSpacing="2"
              fill="#46523f"
            >
              START HERE.
            </text>
            <path d="M282 58v274" stroke="#596442" strokeWidth="7" />
          </g>
        )}
        {product.kind === "pen" && (
          <g transform="rotate(28 200 200)">
            <rect x="188" y="54" width="24" height="268" rx="10" fill={paint} />
            <path d="M190 104h20" stroke="#bdbca7" strokeWidth="4" />
            <path
              d="M205 68v51"
              stroke="#c3c6b0"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path d="m190 322 10 23 10-23Z" fill="#b4a285" />
            <path d="m198 341 2 9 2-9Z" fill="#314333" />
            <path
              d="M193 123v167"
              stroke="#fff"
              opacity=".15"
              strokeWidth="2"
            />
          </g>
        )}
        {product.kind === "mug" && (
          <g transform="rotate(-8 200 220)">
            <path
              d="M273 155c80-20 81 117 0 94"
              fill="none"
              stroke={paint}
              strokeWidth="24"
            />
            <path d="M108 140h173v136c-3 56-166 56-173 0Z" fill={paint} />
            <ellipse cx="194" cy="141" rx="87" ry="26" fill="#ebe7d9" />
            <ellipse cx="194" cy="142" rx="73" ry="17" fill="#ad9a7c" />
            <ellipse cx="194" cy="144" rx="69" ry="13" fill="#72634e" />
            <path
              d="M121 178v81"
              stroke="#fff"
              strokeWidth="9"
              opacity=".19"
              strokeLinecap="round"
            />
            <text
              x="193"
              y="246"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="14"
              fill="#45513e"
            >
              f &amp; f
            </text>
          </g>
        )}
        {product.kind === "tote" && (
          <g transform="rotate(-6 200 210)">
            <path
              d="M147 156V91a53 53 0 0 1 106 0v65"
              fill="none"
              stroke={paint}
              strokeWidth="18"
            />
            <path d="M104 130h192l13 202H91Z" fill={paint} />
            <path
              d="M112 140 101 322h196l-11-182"
              fill="none"
              stroke="#7e765e"
              opacity=".3"
            />
            <text
              x="200"
              y="224"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="23"
              fill="#46533c"
            >
              form &amp; field
            </text>
            <text
              x="200"
              y="250"
              textAnchor="middle"
              fontSize="8"
              letterSpacing="3"
              fill="#46533c"
            >
              TAKE THE SLOW WAY
            </text>
          </g>
        )}
        {product.kind === "tray" && (
          <g transform="rotate(-18 200 210)">
            <rect
              x="58"
              y="130"
              width="282"
              height="170"
              rx="38"
              fill={paint}
            />
            <rect
              x="75"
              y="145"
              width="248"
              height="135"
              rx="27"
              fill="#000"
              opacity=".09"
            />
            <path
              d="M88 166h220M88 181h220M88 199h220M88 216h220M88 235h220M88 251h220"
              stroke="#704d32"
              opacity=".15"
            />
            <rect
              x="106"
              y="184"
              width="159"
              height="12"
              rx="5"
              fill="#35513e"
            />
            <circle
              cx="270"
              cy="239"
              r="16"
              fill="none"
              stroke="#cfb56f"
              strokeWidth="5"
            />
            <path d="m258 249-27 15m9-2-5-7" stroke="#cfb56f" strokeWidth="5" />
          </g>
        )}
        {product.kind === "clips" && (
          <g stroke={paint} strokeWidth="9" fill="none">
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                transform={`translate(${(i % 2) * 115 - 35} ${Math.floor(i / 2) * 120 - 20}) rotate(${i % 2 ? 12 : -12} 170 140)`}
                d="M150 98v75c0 25 44 25 44 0v-62c0-20-30-20-30 0v54"
              />
            ))}
          </g>
        )}
        {product.kind === "pouch" && (
          <g transform="rotate(-9 200 200)">
            <path d="M80 129h240l20 172H60Z" fill={paint} />
            <path d="M82 132h236" stroke="#c6b471" strokeWidth="9" />
            <path
              d="M89 132h224"
              stroke="#635a37"
              strokeWidth="2"
              strokeDasharray="2 3"
            />
            <path d="m308 133 19 21" stroke="#b39f5e" strokeWidth="6" />
            <rect x="151" y="195" width="100" height="50" fill="#e8deca" />
            <text
              x="201"
              y="225"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="14"
              fill="#48503b"
            >
              form &amp; field
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
