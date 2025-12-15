const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");
const webpack = require("webpack");

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
    // HTTPS for secure contexts (WebRTC, service workers, etc.)
    server: {
      type: "https",
      options: {
        key: fs.readFileSync("./certs/key.pem"),
        cert: fs.readFileSync("./certs/cert.pem"),
      },
    },
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
      "@Core": path.resolve(__dirname, "src/core"),
      "@Debug": path.resolve(__dirname, "src/debug"),
      "@Init": path.resolve(__dirname, "src/init"),
      "@Services": path.resolve(__dirname, "src/services"),
      "@Tests": path.resolve(__dirname, "src/__tests__"),
      "@UI": path.resolve(__dirname, "src/ui"),
      "@Utils": path.resolve(__dirname, "src/utils"),
      "@VR": path.resolve(__dirname, "src/vr"),
      "@VTK": path.resolve(__dirname, "src/core/instances/types/vtk"),
    },
  },
};
