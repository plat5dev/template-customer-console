// Sidebar icons: 16px, stroked with the text color.
const paths = {
  projects: "M2 3.5h12v9.5H2zM2 6.5h12",
  envs: "M8 2l6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3",
  members:
    "M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.6-2.4 2.3-3.5 4.5-3.5s3.9 1.1 4.5 3.5M11 3a2.5 2.5 0 0 1 0 5M12.5 10.3c1 .5 1.7 1.6 2 3.2",
  access: "M8 1.5l5 2v4c0 3-2.2 5.3-5 6.5-2.8-1.2-5-3.5-5-6.5v-4zM5.8 8l1.6 1.6 2.9-3",
  bots: "M3 5h10v8H3zM6 9h.01M10 9h.01M8 2.5V5",
  invites: "M6.5 9.5l3-3M7 4.5l1.3-1.3a2.8 2.8 0 0 1 4 4L11 8.5M9 11.5l-1.3 1.3a2.8 2.8 0 0 1-4-4L5 7.5",
  audit: "M3 2.5h7l3 3v8H3zM5.5 7.5h5M5.5 10h5",
  settings:
    "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4",
  profile: "M8 8.3a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.5 14c.8-2.8 2.8-4 5.5-4s4.7 1.2 5.5 4",
  keys: "M5.5 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7.7 8.3L13.5 2.5M11.5 4.5l1.5 1.5",
  orgs: "M2 3h5v10H2zM9 6h5v7H9z",
  help: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM6.3 6.2a1.8 1.8 0 0 1 3.4.8c0 1.2-1.7 1.5-1.7 2.5M8 11.5h.01",
  menu: "M2.5 4.5h11M2.5 8h11M2.5 11.5h11",
  close: "M4 4l8 8M12 4l-8 8",
} as const

export type IconName = keyof typeof paths

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
