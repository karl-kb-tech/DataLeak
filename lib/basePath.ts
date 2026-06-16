// The app is served under a sub-path (kairakau.nz/dataleak), set via `basePath`
// in next.config.ts. Next prefixes next/link, next/image and the router
// automatically, but NOT raw fetch() calls — so our client API calls must
// prepend this manually. Keep this in sync with `basePath` in next.config.ts.
export const BASE_PATH = '/dataleak'
