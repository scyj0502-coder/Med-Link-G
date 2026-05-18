export type UiIconName = "alarm" | "bell" | "calendar" | "database" | "help" | "history" | "menu" | "note" | "refresh" | "search" | "star";

type UiIconProps = {
  name: UiIconName;
  className?: string;
};

export function UiIcon({ name, className = "h-5 w-5" }: UiIconProps) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24"
  };

  return (
    <svg aria-hidden="true" {...common}>
      {name === "alarm" ? (
        <>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 10v4l2 2M5 4 3 6M19 4l2 2" />
        </>
      ) : null}
      {name === "bell" ? (
        <>
          <path d="M6 9a6 6 0 1 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8" />
          <path d="M10 21h4" />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </>
      ) : null}
      {name === "database" ? (
        <>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </>
      ) : null}
      {name === "help" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.3c0 2-2.6 2.2-2.6 4M12 18h.01" />
        </>
      ) : null}
      {name === "history" ? (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5M12 7v5l3 2" />
        </>
      ) : null}
      {name === "menu" ? (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      ) : null}
      {name === "note" ? (
        <>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M14 3v4h4M9 12h6M9 16h6" />
        </>
      ) : null}
      {name === "refresh" ? (
        <>
          <path d="M20 11a8 8 0 0 0-14-5l-2 2" />
          <path d="M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2" />
          <path d="M20 20v-4h-4" />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      ) : null}
      {name === "star" ? (
        <>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
        </>
      ) : null}
    </svg>
  );
}
