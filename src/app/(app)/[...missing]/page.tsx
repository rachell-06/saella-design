import NotFound from "../not-found";

// Any address no screen matches: the not-found screen inside the app frame, so the sidebar and the agent stay.
// Rendered directly rather than through notFound(): throwing here breaks Next's dev-time prerender check for this
// catch-all route.
export default function Missing() {
  return <NotFound />;
}
