const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  mode: "development",
  devtool: "source-map",
  devServer: {
    static: [{
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
    server: {
      type: "https",
      options: {
        key: fs.readFileSync("./certs/key.pem"),
        cert: fs.readFileSync("./certs/cert.pem"),
      },
    },
    allowedHosts: "all",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
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
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
  ],
  // Ignore controller.html
  externals: {
    "./controller.html": "controller.html",
  },
  resolve: {
    extensions: [".js", ".jsx"], // Add .jsx
  },
};
