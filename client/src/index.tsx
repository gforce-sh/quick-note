import { render } from "solid-js/web";
import "md-live-editor/styles.css";
import "./styles.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

render(() => <App />, root);
