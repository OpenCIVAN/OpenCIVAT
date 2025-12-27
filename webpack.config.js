const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");
const webpack = require("webpack");

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
  devtool: "source-map",
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
    // Proxy API requests to the backend - eliminates CORS issues
    proxy: [
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
      __DEV_BYPASS_AUTH__: JSON.stringify(
        process.env.DEV_BYPASS_AUTH === "true"
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
