import { gzipSync } from "node:zlib";

const CORE_LIMIT_BYTES = 50 * 1024;

async function main() {
  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    target: "browser",
    format: "esm",
    minify: true,
    external: ["@shipload/sdk", "@wharfkit/antelope"],
  });

  if (!result.success) {
    for (const msg of result.logs) console.error(msg);
    process.exit(1);
  }

  let totalBytes = 0;
  let totalGzipped = 0;
  for (const out of result.outputs) {
    const text = await out.text();
    const bytes = new TextEncoder().encode(text).length;
    const gz = gzipSync(new TextEncoder().encode(text)).length;
    console.log(`${out.path}: ${bytes} bytes (${gz} gzipped)`);
    totalBytes += bytes;
    totalGzipped += gz;
  }

  console.log(`core bundle total: ${totalBytes} bytes, ${totalGzipped} gzipped`);
  if (totalGzipped > CORE_LIMIT_BYTES) {
    console.error(`FAIL: core bundle is ${totalGzipped} gzipped, limit is ${CORE_LIMIT_BYTES}`);
    process.exit(1);
  }
}

main();
