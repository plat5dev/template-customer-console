// The app's name, in the header, the tab, and on the home page. plat5 init writes
// the project's name into fromInit; run from this repo, it is the fallback.
const fromInit = "{{project_id}}"
export const appName = fromInit.startsWith("{{") ? "Plat5 starter" : fromInit
