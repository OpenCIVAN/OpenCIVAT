const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");
const webpack = require("webpack");
require("dotenv").config();

// Allow HTTP mode for local voice chat testing (LiveKit without TLS)
const useHttps = process.env.USE_HTTP !== "true";

// Build server config based on protocol preference
const getServerConfig = () => {
  if (!useHttps) {
    console.log("🔓 Running in HTTP mode (USE_HTTP=true)");
    return undefined; // HTTP mode
  }

  // HTTPS mode - check for certificates
  const keyPath = "./certs/key.pem";
  const certPath = "./certs/cert.pem";

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log("🔒 Running in HTTPS mode with certificates");
    return {
      type: "https",
      options: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    };
  }

  console.log("⚠️  Certificates not found, falling back to HTTP");
  return undefined;
};

module.exports = {
  entry: {
    main: "./src/index.js",
    embed: "./src/embed.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  mode: "development",
  // eval-cheap-module-source-map is much faster than source-map for dev
  devtool: "eval-cheap-module-source-map",
  // Filesystem cache dramatically speeds up cold starts after first build
  cache: {
    type: "filesystem",
    buildDependencies: {
      config: [__filename],
    },
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, "dist"),
      },
      {
        directory: path.join(__dirname, "public"),
      },
    ],
    compress: true,
    port: 8081,
    host: "0.0.0.0",
    hot: true,
    // Server config (HTTPS or HTTP based on USE_HTTP env var)
    server: getServerConfig(),
    allowedHosts: "all",
    // SPA fallback: serve in-memory index.html for any non-asset, non-proxy 404.
    // Must be `true` (not a rewrite object) — the rewrite form looks for the file
    // on disk, but in dev mode index.html is generated in memory by HtmlWebpackPlugin.
    historyApiFallback: true,
    // Proxy API requests to the backend - eliminates CORS issues
    proxy: [
      // Render server WebSocket (must be before /render-api to match /render-ws exactly)
      {
        context: ["/render-ws"],
        target: "ws://localhost:7001",
        ws: true,
        changeOrigin: true,
        pathRewrite: { "^/render-ws": "/ws" },
      },
      // Render server HTTP API
      {
        context: ["/render-api"],
        target: "http://localhost:7001",
        changeOrigin: true,
        pathRewrite: { "^/render-api": "" },
      },
      // Node.js API server
      {
        context: ["/api"],
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    ],
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader", // Injects CSS into the DOM
          "css-loader", // Translates CSS into CommonJS modules
          {
            loader: "sass-loader",
            options: {
              api: "modern",
              sassOptions: {
                loadPaths: [path.resolve(__dirname, "src/ui/react/styles")],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-react"],
            cacheDirectory: true, // Cache transpilation results for faster rebuilds
          },
        },
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true, // Faster builds, type checking via npm run typecheck
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      chunks: ["main"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/embed.html",
      filename: "embed.html",
      chunks: ["embed"],
    }),
    new webpack.DefinePlugin({
      "process.env.YJS_WEBSOCKET_URL": JSON.stringify(
        process.env.YJS_WEBSOCKET_URL || "ws://localhost:9001"
      ),
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "development"
      ),
      __API_BASE_URL__: JSON.stringify(
        process.env.API_BASE_URL || "http://localhost:3001/api"
      ),
      __YJS_WS_URL__: JSON.stringify(
        process.env.YJS_WEBSOCKET_URL || "ws://localhost:9001"
      ),
      __KEYCLOAK_URL__: JSON.stringify(
        process.env.KEYCLOAK_URL || "http://localhost:8080"
      ),
      __KEYCLOAK_REALM__: JSON.stringify(
        process.env.KEYCLOAK_REALM || "cia-web"
      ),
      __KEYCLOAK_CLIENT_ID__: JSON.stringify(
        process.env.KEYCLOAK_CLIENT_ID || "cia-web-app"
      ),
      __LIVEKIT_URL__: JSON.stringify(
        process.env.LIVEKIT_URL || "ws://localhost:7880"
      ),
      __LIVEKIT_TOKEN_URL__: JSON.stringify(
        process.env.LIVEKIT_TOKEN_URL || "http://localhost:3002"
      ),
      __DEV_BYPASS_AUTH__: JSON.stringify(
        process.env.DEV_BYPASS_AUTH === "true"
      ),
      // Server-side rendering
      __RENDER_MODE__: JSON.stringify(
        process.env.RENDER_MODE || "local"
      ),
      __RENDER_SERVER_URL__: JSON.stringify(
        process.env.RENDER_SERVER_URL || "http://localhost:7000"
      ),
      __RENDER_WS_URL__: JSON.stringify(
        process.env.RENDER_WS_URL || "/render-ws"
      ),
    }),
  ],
  // Ignore controller.html
  externals: {
    "./controller.html": "controller.html",
  },
  resolve: {
    extensions: [".ts", ".js", ".jsx"],
    // allow absolute imports from "src" too (e.g., "ui/..." if you want)
    modules: [path.resolve(__dirname, "src"), "node_modules"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@Algorithms": path.resolve(__dirname, "src/algorithms"),
      "@Collaboration": path.resolve(__dirname, "src/collaboration"),
      "@Config": path.resolve(__dirname, "src/config"),
      "@Core": path.resolve(__dirname, "src/core"),
      "@Init": path.resolve(__dirname, "src/init"),
      "@Services": path.resolve(__dirname, "src/services"),
      "@UI": path.resolve(__dirname, "src/ui"),
      "@Utils": path.resolve(__dirname, "src/utils"),
      "@VR": path.resolve(__dirname, "src/vr"),
      "@VTK": path.resolve(__dirname, "src/core/instances/types/vtk"),
    },
  },
};
