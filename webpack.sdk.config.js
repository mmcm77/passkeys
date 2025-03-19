const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/sdk/index.ts",
  output: {
    path: path.resolve(__dirname, "public/sdk"),
    filename: "payauth.min.js",
    library: "PayAuth",
    libraryTarget: "umd",
    libraryExport: "default",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.sdk.json",
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ),
    }),
  ],
};
