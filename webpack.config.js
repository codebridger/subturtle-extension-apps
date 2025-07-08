const path = require("path");
const Dotenv = require("dotenv-webpack");
const webpack = require("webpack");

const CopyPlugin = require("copy-webpack-plugin");

const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  mode: "development",
  devtool: false,

  stats: {
    errorDetails: true,
  },

  module: {
    rules: [
      //
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.ts?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true,
        },
      },
      // this will apply to both plain `.css` files
      // AND `<style>` blocks in `.vue` files
      {
        test: /\.css$/,
        use: ["vue-style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.scss$/,
        use: ["vue-style-loader", "css-loader", "sass-loader"],
      },
    ],
  },

  resolve: {
    extensions: [".ts", ".js"],
  },

  plugins: [
    new Dotenv({
      safe: true,
    }),
    new VueLoaderPlugin(),
    new CopyPlugin({
      patterns: ["static"],
    }),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],

  entry: {
    main: "./src/main.ts",
    background: "./src/background.ts",
    popup: "./src/popup.ts",
  },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },

  watchOptions: {
    ignored: /node_modules/,
  },
};
