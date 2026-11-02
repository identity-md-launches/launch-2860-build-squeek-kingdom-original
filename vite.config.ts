// Optional external dependency directory keeps worker-installed packages outside the submission.
const dependencyRoot = process.env.SQUEEK_DEPS_DIR;
export default {
  base: "./",
  resolve: dependencyRoot
    ? {
        alias: [
          ...[
            "react",
            "react-dom",
            "wagmi",
            "viem",
            "@tanstack/react-query",
            "lucide-react",
          ].map((name) => ({
            find: new RegExp("^" + name.replace("/", "\\/") + "(?=\\/|$)"),
            replacement: `${dependencyRoot}/node_modules/${name}`,
          })),
        ],
      }
    : undefined,
  build: { sourcemap: false, chunkSizeWarningLimit: 800 },
};
