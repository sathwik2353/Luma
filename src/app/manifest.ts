
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Luma - Your Money. Your Clarity.",
    short_name: "Luma",
    description:
      "Track income, manage expenses, plan budgets, and understand your money.",

    start_url: "/",
    scope: "/",
    display: "standalone",

    background_color: "#050608",
    theme_color: "#050608",

    orientation: "portrait",
    categories: ["finance", "productivity"],

    icons: [
      {
        src: "/icons/luma-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/luma-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/luma-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
