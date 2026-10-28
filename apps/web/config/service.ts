/** Called only by server route handlers; never serialize the binding into client props. */
export const readApiServiceUrl = (): URL => {
  const value = process.env.API_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) throw new Error("API service binding is unavailable");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid API service URL");
  return url;
};
