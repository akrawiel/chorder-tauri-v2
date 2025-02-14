/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";

import "@unocss/reset/tailwind.css";
import "virtual:uno.css";

import "./global.css";

render(() => <App />, document.getElementById("root") as HTMLElement);
