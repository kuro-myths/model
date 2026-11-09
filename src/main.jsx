import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

class BootBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error("Kuro Model Lab render failure:", error);
  }
  render() {
    if (this.state.error) {
      return React.createElement("main", { className: "boot-error" },
        React.createElement("div", { className: "boot-error-card" },
          React.createElement("strong", null, "Kuro Model Lab gagal memuat komponen"),
          React.createElement("p", null, this.state.error?.message || String(this.state.error)),
          React.createElement("button", { onClick: () => window.location.reload() }, "Muat ulang")
        )
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root tidak ditemukan.");
const root = createRoot(rootElement);
root.render(React.createElement("div", { className: "boot-state" }, "Memuat Kuro Model Lab..."));

const showFatal = (error) => {
  console.error("Kuro Model Lab startup failure:", error);
  root.render(React.createElement("main", { className: "boot-error" },
    React.createElement("div", { className: "boot-error-card" },
      React.createElement("strong", null, "Aplikasi gagal diinisialisasi"),
      React.createElement("p", null, error?.message || String(error)),
      React.createElement("button", { onClick: () => window.location.reload() }, "Muat ulang")
    )
  ));
};

import("./App.jsx")
  .then(({ default: App }) => {
    root.render(React.createElement(BootBoundary, null, React.createElement(App)));
  })
  .catch(showFatal);