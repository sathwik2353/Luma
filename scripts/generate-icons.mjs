
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = "public/icons/luma.svg";
const output = "public/icons";

await mkdir(output, { recursive: true });

const icons = [
  {
    name: "luma-192.png",
    size: 192,
  },
  {
    name: "luma-512.png",
    size: 512,
  },
  {
    name: "luma-maskable-512.png",
    size: 512,
  },
];

for (const icon of icons) {
  await sharp(source)
    .resize(icon.size, icon.size, {
      fit: "contain",
      background: "#050608",
    })
    .png()
    .toFile(`${output}/${icon.name}`);

  console.log(`Created ${output}/${icon.name}`);
}

console.log("Luma PNG icons generated successfully.");
